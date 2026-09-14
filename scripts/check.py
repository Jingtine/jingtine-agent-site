"""check.py — Quality checks for Jingtine Agent Site.

Usage:  python scripts/check.py
Exit:   0 = all checks passed, 1 = at least one check failed

Zero dependencies — Python stdlib only.
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

if __package__:
    from .article_content import build_public_records, parse_article, SUPPORTED_KINDS
else:
    from article_content import build_public_records, parse_article, SUPPORTED_KINDS

# Ensure UTF-8 output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ── Configuration ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

BASE_PATH = "jingtine-agent-site"

REQUIRED_HTML = [
    "index.html", "about.html", "projects.html", "blog.html",
    "papers.html", "wiki.html", "reader.html", "assistant.html", "status.html",
    "links.html",
    "article.html",
    "knowledge.html", "library.html", "contact.html",
]

FEED_XML = os.path.join(PROJECT_DIR, "feed.xml")
ARTICLES_JSON = os.path.join(PROJECT_DIR, "public", "data", "articles.json")
RSS_ITEMS_JSON = os.path.join(PROJECT_DIR, "public", "data", "rss-items.json")
OPML_XML = os.path.join(PROJECT_DIR, "subscriptions.opml")

RSS_REQUIRED_FIELDS = ["id", "title", "link", "description", "pubDate", "source", "category"]

PAPERS_JSON = os.path.join(PROJECT_DIR, "public", "data", "papers.json")
PAPER_REQUIRED_FIELDS = ["id", "title", "authors", "published", "summary", "url", "source"]
PAPER_SCORED_FIELDS = ["topic", "score", "matched_terms"]
PAPER_MIN_SCORE = 3

WIKI_JSON = os.path.join(PROJECT_DIR, "public", "data", "wiki.json")
WIKI_REQUIRED_FIELDS = ["id", "title", "category", "tags", "updated", "summary", "links", "path"]

STATUS_JSON = os.path.join(PROJECT_DIR, "public", "data", "status.json")
GITHUB_STATS_JSON = os.path.join(PROJECT_DIR, "public", "data", "github-stats.json")
SITE_CONFIG_JSON = os.path.join(PROJECT_DIR, "config", "site.json")

PASS = "[PASS]"
FAIL = "[FAIL]"
CROSS = "x"
ARROW = "->"


@dataclass(frozen=True)
class CheckResult:
    """A check outcome that stays compatible with the boolean quality gate."""

    passed: bool

    def __bool__(self):
        return self.passed


# ── Helpers ─────────────────────────────────────────────────────

def p(msg):
    print(msg)


def strip_code_blocks(md):
    """Remove fenced code blocks and inline code from Markdown text."""
    md = re.sub(r'```[\s\S]*?```', '', md)
    md = re.sub(r'`[^`]*`', '', md)
    return md


def resolve_link(href, html_path):
    """Resolve a link href to a local file path, or None if external/skip."""
    if not href:
        return None
    if href.startswith(("http://", "https://", "#", "mailto:", "tel:", "data:", "javascript:")):
        return None

    # Strip query string and fragment
    href = href.split("?")[0].split("#")[0]
    if not href:
        return None

    # Handle absolute paths with base path prefix
    if href.startswith("/"):
        prefix = "/" + BASE_PATH + "/"
        if href.startswith(prefix):
            href = href[len(prefix):]
        else:
            return None  # unknown absolute path, skip

    # Resolve relative to the HTML file's directory
    html_dir = os.path.dirname(html_path)
    return os.path.normpath(os.path.join(html_dir, href))


# ── Link extractor ──────────────────────────────────────────────

class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for attr, value in attrs:
            if attr in ("href", "src") and value:
                self.links.append(value)


def extract_links(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()
    parser = LinkExtractor()
    parser.feed(content)
    return parser.links


# ── Checks ──────────────────────────────────────────────────────

def check_html_pages():
    """Check 1: Required HTML pages exist."""
    missing = []
    for page in REQUIRED_HTML:
        path = os.path.join(PROJECT_DIR, page)
        if not os.path.exists(path):
            missing.append(page)

    if missing:
        p(f"{FAIL} HTML pages:        {len(REQUIRED_HTML) - len(missing)}/{len(REQUIRED_HTML)} found")
        for m in missing:
            p(f"  {CROSS} {m} (not found)")
        return False

    p(f"{PASS} HTML pages:        {len(REQUIRED_HTML)}/{len(REQUIRED_HTML)} found")
    return True


def check_internal_links():
    """Check 2: Internal links point to valid files."""
    total = 0
    valid = 0
    broken = []

    for page in REQUIRED_HTML:
        html_path = os.path.join(PROJECT_DIR, page)
        if not os.path.exists(html_path):
            continue

        links = extract_links(html_path)
        for href in links:
            local_path = resolve_link(href, html_path)
            if local_path is None:
                continue  # external or skip
            total += 1
            if os.path.exists(local_path):
                valid += 1
            else:
                broken.append((page, href, local_path))

    if broken:
        p(f"{FAIL} Internal links:    {valid}/{total} valid")
        for page, href, local in broken:
            p(f"  {CROSS} {page} {ARROW} {href} (not found)")
        return False

    p(f"{PASS} Internal links:    {valid}/{total} valid")
    return True


def check_feed_xml():
    """Check 3: feed.xml can be parsed as XML."""
    if not os.path.exists(FEED_XML):
        p(f"{FAIL} feed.xml:          file not found")
        return False
    try:
        tree = ET.parse(FEED_XML)
        root = tree.getroot()
        items = root.findall(".//item")
        p(f"{PASS} feed.xml:          valid XML, {len(items)} items")
        return True, len(items)
    except ET.ParseError as e:
        p(f"{FAIL} feed.xml:          XML parse error: {e}")
        return False, 0


def check_rss_items_json():
    """Check 5: rss-items.json is valid JSON."""
    if not os.path.exists(RSS_ITEMS_JSON):
        p(f"{FAIL} rss-items.json:    file not found")
        return False, 0
    try:
        with open(RSS_ITEMS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        items = data.get("items", [])
        p(f"{PASS} rss-items.json:    valid JSON, {len(items)} items")
        return True, items
    except json.JSONDecodeError as e:
        p(f"{FAIL} rss-items.json:    JSON parse error: {e}")
        return False, []


def check_rss_fields(items):
    """Check 6: RSS aggregation items contain required fields."""
    if not items:
        p(f"{PASS} RSS item fields:   0/0 complete (no items to check)")
        return True

    complete = 0
    incomplete = []

    for i, item in enumerate(items):
        missing = []
        for field in RSS_REQUIRED_FIELDS:
            if field not in item or not item[field]:
                missing.append(field)
            elif field == "link":
                if not isinstance(item["link"], str) or not item["link"].startswith("https://"):
                    missing.append("link (not https)")
            elif field == "source":
                src = item.get("source")
                if not isinstance(src, dict) or not src.get("id") or not src.get("name"):
                    missing.append("source (missing id/name)")

        if missing:
            incomplete.append((i, missing))
        else:
            complete += 1

    if incomplete:
        p(f"{FAIL} RSS item fields:   {complete}/{len(items)} complete")
        for idx, missing in incomplete:
            p(f"  {CROSS} item[{idx}] missing: {', '.join(missing)}")
        return False

    p(f"{PASS} RSS item fields:   {complete}/{len(items)} complete")
    return True


def check_opml():
    """Check 7: subscriptions.opml can be parsed."""
    if not os.path.exists(OPML_XML):
        p(f"{FAIL} subscriptions.opml: file not found")
        return False
    try:
        tree = ET.parse(OPML_XML)
        root = tree.getroot()
        outlines = root.findall(".//outline")
        p(f"{PASS} subscriptions.opml: valid XML, {len(outlines)} outlines")
        return True
    except ET.ParseError as e:
        p(f"{FAIL} subscriptions.opml: XML parse error: {e}")
        return False


def check_papers_json():
    """Check 8: papers.json is valid JSON with required fields."""
    if not os.path.exists(PAPERS_JSON):
        p(f"{PASS} papers.json:        file not found (skip)")
        return True

    try:
        with open(PAPERS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        p(f"{FAIL} papers.json:        JSON parse error: {e}")
        return False

    papers = data.get("papers", [])
    total = data.get("total", 0)

    if total != len(papers):
        p(f"{FAIL} papers.json:        total={total} but array has {len(papers)} items")
        return False

    complete = 0
    incomplete = []
    for i, paper in enumerate(papers):
        missing = []
        for field in PAPER_REQUIRED_FIELDS:
            if field not in paper or not paper[field]:
                missing.append(field)
            elif field == "url":
                if not isinstance(paper["url"], str) or not paper["url"].startswith("https://"):
                    missing.append("url (not https)")
        # Scored fields (added by the scoped collect_papers.py pipeline)
        for field in PAPER_SCORED_FIELDS:
            if field not in paper or not paper[field]:
                missing.append(field)
            elif field == "score" and not isinstance(paper.get("score"), int):
                missing.append("score (not int)")
            elif field == "score" and paper.get("score", 0) < PAPER_MIN_SCORE:
                missing.append(f"score (<{PAPER_MIN_SCORE})")
            elif field == "matched_terms" and not isinstance(paper.get("matched_terms"), list):
                missing.append("matched_terms (not list)")
        if missing:
            incomplete.append((i, missing))
        else:
            complete += 1

    if incomplete:
        p(f"{FAIL} papers.json:        {complete}/{len(papers)} complete")
        for idx, missing in incomplete:
            p(f"  {CROSS} paper[{idx}] missing: {', '.join(missing)}")
        return False

    # Check no duplicate ids
    ids = [p.get("id") for p in papers]
    if len(ids) != len(set(ids)):
        p(f"{FAIL} papers.json:        duplicate IDs detected")
        return False

    p(f"{PASS} papers.json:        valid JSON, {len(papers)} papers (scored)")
    return True


def check_wiki_json():
    """Check 9: wiki.json is valid JSON with required fields."""
    if not os.path.exists(WIKI_JSON):
        p(f"{PASS} wiki.json:          file not found (skip)")
        return True

    try:
        with open(WIKI_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        p(f"{FAIL} wiki.json:          JSON parse error: {e}")
        return False

    pages = data.get("pages", [])
    total = data.get("total", 0)

    if total != len(pages):
        p(f"{FAIL} wiki.json:          total={total} but array has {len(pages)} items")
        return False

    complete = 0
    incomplete = []
    ids_seen = set()
    for i, page in enumerate(pages):
        missing = []
        for field in WIKI_REQUIRED_FIELDS:
            if field not in page or (field != "tags" and field != "links" and not page.get(field)):
                missing.append(field)
        if missing:
            incomplete.append((i, missing))
        else:
            complete += 1
        pid = page.get("id", "")
        if pid in ids_seen:
            incomplete.append((i, [f"duplicate id: {pid}"]))
        ids_seen.add(pid)

    if incomplete:
        p(f"{FAIL} wiki.json:          {complete}/{len(pages)} complete")
        for idx, missing in incomplete:
            p(f"  {CROSS} page[{idx}]: {', '.join(missing)}")
        return False

    p(f"{PASS} wiki.json:          valid JSON, {len(pages)} pages")
    return True


def check_assistant():
    """Check 10: Assistant page and scripts exist."""
    js_path = os.path.join(PROJECT_DIR, "js", "assistant.js")
    if not os.path.exists(js_path):
        p(f"{FAIL} assistant:          js/assistant.js not found")
        return False

    # Verify wiki.json is readable by assistant
    if os.path.exists(WIKI_JSON):
        try:
            with open(WIKI_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
            pages = data.get("pages", [])
            if not pages:
                p(f"{FAIL} assistant:          wiki.json has 0 pages (assistant has no data)")
                return False
        except Exception:
            p(f"{FAIL} assistant:          wiki.json not readable")
            return False
    else:
        p(f"{FAIL} assistant:          wiki.json not found (assistant has no data)")
        return False

    p(f"{PASS} assistant:          page + script ok, wiki.json readable")
    return True


def check_status_json():
    """Check 11: status.json is valid."""
    if not os.path.exists(STATUS_JSON):
        p(f"{PASS} status.json:        file not found (skip)")
        return True
    try:
        with open(STATUS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        p(f"{FAIL} status.json:        JSON parse error: {e}")
        return False
    for key in ["version", "build", "content", "quality", "services", "status"]:
        if key not in data:
            p(f"{FAIL} status.json:        missing key: {key}")
            return False
    p(f"{PASS} status.json:        valid JSON, status={data.get('status', '?')}")
    return True


def check_github_stats_json():
    """Check that the generated public GitHub snapshot is safe and complete."""
    if not os.path.exists(GITHUB_STATS_JSON):
        p(f"{FAIL} GitHub stats:       github-stats.json not found")
        return False
    try:
        with open(GITHUB_STATS_JSON, "r", encoding="utf-8") as source:
            data = json.load(source)
    except json.JSONDecodeError as error:
        p(f"{FAIL} GitHub stats:       JSON parse error: {error}")
        return False
    required = ["generated", "profile", "summary", "months", "calendar", "repositories"]
    missing = [key for key in required if key not in data]
    if missing:
        p(f"{FAIL} GitHub stats:       missing keys: {', '.join(missing)}")
        return False
    if not isinstance(data["calendar"], list) or not data["calendar"]:
        p(f"{FAIL} GitHub stats:       contribution calendar is empty")
        return False
    if any(
        not isinstance(repo.get("url"), str) or not repo["url"].startswith("https://github.com/")
        for repo in data["repositories"]
    ):
        p(f"{FAIL} GitHub stats:       repository URL is not a GitHub HTTPS URL")
        return False
    p(f"{PASS} GitHub stats:       {len(data['calendar'])} days, {len(data['repositories'])} repositories")
    return True


def check_site_config():
    """Check that site identity and background settings match the local contract."""
    try:
        with open(SITE_CONFIG_JSON, "r", encoding="utf-8") as source:
            data = json.load(source)
    except FileNotFoundError:
        p(f"{FAIL} Site config:        config/site.json not found")
        return False
    except json.JSONDecodeError as error:
        p(f"{FAIL} Site config:        JSON parse error: {error}")
        return False

    if not isinstance(data, dict):
        p(f"{FAIL} Site config:        expected a JSON object")
        return False

    expected_keys = {"name", "author", "handle", "background"}
    if set(data) != expected_keys:
        p(f"{FAIL} Site config:        expected keys: {', '.join(sorted(expected_keys))}")
        return False
    if (data["name"], data["author"], data["handle"]) != ("不驚茶坊", "不驚醴", "Jingtine"):
        p(f"{FAIL} Site config:        identity values do not match")
        return False

    background = data["background"]
    expected_background_keys = {"image", "blur", "saturation", "overlay", "overlayOpacity", "position"}
    if not isinstance(background, dict) or set(background) != expected_background_keys:
        p(f"{FAIL} Site config:        background keys do not match")
        return False
    image = background["image"]
    if not isinstance(image, str) or (image and not re.fullmatch(r"assets/images/backgrounds/[a-zA-Z0-9._/-]+", image)) or ".." in image or "//" in image:
        p(f"{FAIL} Site config:        background image must use the local prefix")
        return False
    numeric_ranges = {
        "blur": (0, 40),
        "saturation": (0, 2),
        "overlayOpacity": (0, 1),
    }
    for key, (minimum, maximum) in numeric_ranges.items():
        value = background[key]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not minimum <= value <= maximum:
            p(f"{FAIL} Site config:        {key} must be between {minimum} and {maximum}")
            return False
    if not isinstance(background["overlay"], str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", background["overlay"]):
        p(f"{FAIL} Site config:        overlay must be a six-digit hex color")
        return False
    if not isinstance(background["position"], str) or not re.fullmatch(r"(center|top|bottom|left|right)( (center|top|bottom|left|right))?", background["position"]):
        p(f"{FAIL} Site config:        position is invalid")
        return False

    p(f"{PASS} Site config:        identity and background contract valid")
    return True


def check_links_config() -> CheckResult:
    """Validate the hand-maintained Links Directory source configuration."""
    source_path = Path(PROJECT_DIR) / "config" / "links.json"
    try:
        data = json.loads(source_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        p(f"{FAIL} Links config:       config/links.json not found")
        return CheckResult(False)
    except (OSError, json.JSONDecodeError) as error:
        p(f"{FAIL} Links config:       invalid JSON: {error}")
        return CheckResult(False)

    if not isinstance(data, dict) or not isinstance(data.get("groups"), list):
        p(f"{FAIL} Links config:       expected an object with a groups array")
        return CheckResult(False)

    group_ids = set()
    images_root = (Path(PROJECT_DIR) / "assets" / "images").resolve()
    for group_index, group in enumerate(data["groups"]):
        if not isinstance(group, dict):
            p(f"{FAIL} Links config:       group[{group_index}] must be an object")
            return CheckResult(False)
        group_id = group.get("id")
        if not isinstance(group_id, str) or not re.fullmatch(r"[a-z0-9-]+", group_id):
            p(f"{FAIL} Links config:       group[{group_index}] has an invalid id")
            return CheckResult(False)
        if group_id in group_ids:
            p(f"{FAIL} Links config:       duplicate group id: {group_id}")
            return CheckResult(False)
        group_ids.add(group_id)
        if not isinstance(group.get("name"), str) or not group["name"].strip():
            p(f"{FAIL} Links config:       group[{group_index}] has an empty name")
            return CheckResult(False)
        links = group.get("links")
        if not isinstance(links, list):
            p(f"{FAIL} Links config:       group[{group_index}] links must be an array")
            return CheckResult(False)

        for link_index, link in enumerate(links):
            label = f"group[{group_index}].links[{link_index}]"
            if not isinstance(link, dict):
                p(f"{FAIL} Links config:       {label} must be an object")
                return CheckResult(False)
            for field in ("name", "description"):
                if not isinstance(link.get(field), str) or not link[field].strip():
                    p(f"{FAIL} Links config:       {label} has an empty {field}")
                    return CheckResult(False)
            url = link.get("url")
            try:
                parsed_url = urlsplit(url) if isinstance(url, str) else None
            except ValueError:
                parsed_url = None
            if not isinstance(url, str) or parsed_url.scheme != "https" or not parsed_url.netloc:
                p(f"{FAIL} Links config:       {label} URL must use HTTPS")
                return CheckResult(False)
            if "tags" in link:
                tags = link["tags"]
                if (not isinstance(tags, list) or not tags
                        or any(not isinstance(tag, str) or not tag.strip() for tag in tags)):
                    p(f"{FAIL} Links config:       {label} tags must be nonempty strings")
                    return CheckResult(False)
            if "avatar" in link:
                avatar = link["avatar"]
                segments = avatar.split("/") if isinstance(avatar, str) else []
                if (not isinstance(avatar, str) or not avatar.startswith("assets/images/")
                        or "?" in avatar or "#" in avatar or "\\" in avatar
                        or any(segment in ("", ".", "..") for segment in segments)):
                    p(f"{FAIL} Links config:       {label} avatar must be a canonical local image path")
                    return CheckResult(False)
                avatar_path = (Path(PROJECT_DIR) / Path(*segments)).resolve()
                try:
                    avatar_path.relative_to(images_root)
                except ValueError:
                    p(f"{FAIL} Links config:       {label} avatar escapes assets/images")
                    return CheckResult(False)
                if not avatar_path.is_file():
                    p(f"{FAIL} Links config:       {label} avatar file not found")
                    return CheckResult(False)

    p(f"{PASS} Links config:       valid JSON, {len(data['groups'])} groups")
    return CheckResult(True)


def check_wiki_hash_routing():
    """Check 12: Wiki hash routing for shareable URLs."""
    wiki_js = os.path.join(PROJECT_DIR, "js", "wiki.js")
    assistant_js = os.path.join(PROJECT_DIR, "js", "assistant.js")
    passed = True

    # 1. wiki.js contains hash routing
    if os.path.exists(wiki_js):
        with open(wiki_js, "r", encoding="utf-8") as f:
            content = f.read()
        if "hashchange" not in content and "location.hash" not in content:
            p(f"{FAIL} Wiki hash routing:  no hash routing in wiki.js")
            passed = False
    else:
        p(f"{FAIL} Wiki hash routing:  wiki.js not found")
        return False

    # 2. wiki.js uses encodeURIComponent for hash generation
    if "encodeURIComponent" not in content:
        p(f"{FAIL} Wiki hash routing:  no encodeURIComponent in wiki.js")
        passed = False

    # 3. assistant.js links to wiki.html# with page id
    if os.path.exists(assistant_js):
        with open(assistant_js, "r", encoding="utf-8") as f:
            acontent = f.read()
        if "wiki.html#" not in acontent:
            p(f"{FAIL} Wiki hash routing:  no wiki.html# links in assistant.js")
            passed = False
    else:
        p(f"{FAIL} Wiki hash routing:  assistant.js not found")
        passed = False

    # 4. wiki.json page ids are non-empty, unique, hash-safe
    if os.path.exists(WIKI_JSON):
        with open(WIKI_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        pages = data.get("pages", [])
        ids_seen = set()
        ids_ok = True
        for page in pages:
            pid = page.get("id", "")
            if not pid:
                p(f"  {CROSS} wiki.json: empty page id")
                ids_ok = False
            if "#" in pid:
                p(f"  {CROSS} wiki.json: page id contains '#': {pid}")
                ids_ok = False
            if pid in ids_seen:
                p(f"  {CROSS} wiki.json: duplicate page id: {pid}")
                ids_ok = False
            ids_seen.add(pid)
        if not ids_ok:
            p(f"{FAIL} Wiki hash routing:  invalid page ids in wiki.json")
            passed = False
    else:
        p(f"{FAIL} Wiki hash routing:  wiki.json not found")
        passed = False

    if passed:
        p(f"{PASS} Wiki hash routing:  hash routing ok")
    return passed


def check_blog_wiki_links():
    """Check 13: Blog articles support [[Wiki Link]] syntax."""
    blog_js = os.path.join(PROJECT_DIR, "js", "wiki-links.js")
    passed = True

    if not os.path.exists(blog_js):
        p(f"{FAIL} Blog wiki links:    js/wiki-links.js not found")
        return False

    with open(blog_js, "r", encoding="utf-8") as f:
        content = f.read()

    if "wiki.json" not in content:
        p(f"{FAIL} Blog wiki links:    wiki-links.js does not read wiki.json")
        passed = False

    if "wiki.html#" not in content:
        p(f"{FAIL} Blog wiki links:    wiki-links.js does not generate wiki.html# links")
        passed = False

    articles_dir = os.path.join(PROJECT_DIR, "articles")
    wiki_link_pattern = re.compile(r'\[\[([^\]]+)\]\]')
    found_articles = []
    referenced_slugs = set()

    if os.path.isdir(articles_dir):
        for fname in os.listdir(articles_dir):
            if not fname.endswith(".md"):
                continue
            fpath = os.path.join(articles_dir, fname)
            try:
                _record, md = parse_article(Path(fpath), Path(PROJECT_DIR))
            except (OSError, ValueError) as error:
                print(f"{FAIL} Blog wiki links:    {error}", file=sys.stderr)
                return False
            md = strip_code_blocks(md)
            matches = wiki_link_pattern.findall(md)
            if matches:
                found_articles.append(fname)
                for m in matches:
                    referenced_slugs.add(m.strip())

    if not found_articles:
        p(f"{FAIL} Blog wiki links:    no articles contain [[...]] syntax")
        passed = False
    else:
        if os.path.exists(WIKI_JSON):
            with open(WIKI_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
            pages = data.get("pages", [])
            wiki_ids = set()
            wiki_slugs = set()
            wiki_titles_lower = set()
            for page in pages:
                wiki_ids.add(page.get("id", ""))
                wiki_slugs.add(page.get("id", "").split("/")[-1])
                wiki_titles_lower.add(page.get("title", "").lower())

            unresolved = []
            for ref in referenced_slugs:
                ref_lower = ref.lower()
                if ref in wiki_ids or ref in wiki_slugs or ref_lower in wiki_titles_lower:
                    continue
                unresolved.append(ref)

            if unresolved:
                p(f"{FAIL} Blog wiki links:    unresolved references: {', '.join(unresolved)}")
                passed = False

    if passed:
        p(f"{PASS} Blog wiki links:    {len(found_articles)} article(s) with wiki links")
    return passed


def check_wiki_related_blog():
    """Check 14: Wiki detail page shows related blog articles."""
    wiki_js = os.path.join(PROJECT_DIR, "js", "wiki.js")
    passed = True

    if not os.path.exists(wiki_js):
        p(f"{FAIL} Wiki related blog:   js/wiki.js not found")
        return False

    with open(wiki_js, "r", encoding="utf-8") as f:
        content = f.read()

    if "ArticleData.load()" not in content:
        p(f"{FAIL} Wiki related blog:   wiki.js does not load the shared article index")
        passed = False

    if "ArticleData.articleHref(" not in content:
        p(f"{FAIL} Wiki related blog:   wiki.js does not generate article links")
        passed = False

    if "[[" not in content or "]]" not in content:
        p(f"{FAIL} Wiki related blog:   wiki.js does not scan for [[...]] patterns")
        passed = False

    pilot_article = os.path.join(PROJECT_DIR, "articles", "building-agent.md")
    if os.path.exists(pilot_article):
        try:
            _record, md = parse_article(Path(pilot_article), Path(PROJECT_DIR))
        except (OSError, ValueError) as error:
            print(f"{FAIL} Wiki related blog:   {error}", file=sys.stderr)
            return False
        md = strip_code_blocks(md)
        wiki_link_pattern = re.compile(r'\[\[([^\]]+)\]\]')
        matches = wiki_link_pattern.findall(md)

        if len(matches) < 3:
            p(f"{FAIL} Wiki related blog:   pilot article has {len(matches)} wiki links (expected >= 3)")
            passed = False
        else:
            if os.path.exists(WIKI_JSON):
                with open(WIKI_JSON, "r", encoding="utf-8") as f:
                    data = json.load(f)
                pages = data.get("pages", [])
                wiki_ids = set()
                wiki_slugs = set()
                wiki_titles_lower = set()
                for page in pages:
                    wiki_ids.add(page.get("id", ""))
                    wiki_slugs.add(page.get("id", "").split("/")[-1])
                    wiki_titles_lower.add(page.get("title", "").lower())

                unresolved = []
                for ref in matches:
                    ref = ref.strip()
                    ref_lower = ref.lower()
                    if ref in wiki_ids or ref in wiki_slugs or ref_lower in wiki_titles_lower:
                        continue
                    unresolved.append(ref)

                if unresolved:
                    p(f"{FAIL} Wiki related blog:   unresolved references in pilot: {', '.join(unresolved)}")
                    passed = False

    if passed:
        p(f"{PASS} Wiki related blog:   related articles configured")
    return passed


def check_article_sources():
    """Validate Writing sources, public index parity, config, Wiki links and RSS."""
    try:
        project = Path(PROJECT_DIR)
        records = build_public_records(project / "articles", project)
        articles = json.loads(Path(ARTICLES_JSON).read_text(encoding="utf-8"))
        fields = {"slug", "title", "date", "kind", "category", "tags", "summary",
                  "cover", "coverAlt", "wordCount", "readingMinutes"}
        if not isinstance(articles, list) or any(
            not isinstance(article, dict) or set(article) != fields for article in articles
        ):
            raise ValueError("public/data/articles.json: invalid public record fields")
        # JSON comparison is type-sensitive (Python otherwise treats True == 1).
        # Rebuilding validates dates, kinds, metadata, covers and duplicate source
        # slugs; exact parity also enforces date-descending / slug-ascending order.
        if json.dumps(articles, sort_keys=True) != json.dumps(records, sort_keys=True):
            raise ValueError("public/data/articles.json is stale; run python scripts/build_articles.py")

        config = json.loads((project / "config/writing.json").read_text(encoding="utf-8"))
        if not isinstance(config, dict) or set(config) != {"featuredSlug", "categories", "kinds"}:
            raise ValueError("config/writing.json: expected featuredSlug, categories and kinds")
        if not isinstance(config["featuredSlug"], str):
            raise ValueError("config/writing.json: featuredSlug must be a string")
        for field in ("categories", "kinds"):
            labels = config[field]
            if not isinstance(labels, dict) or any(
                not key.strip() or not isinstance(value, str) or not value.strip()
                for key, value in labels.items()
            ):
                raise ValueError(f"config/writing.json: {field} must map non-empty keys to labels")
        if set(config["kinds"]) != SUPPORTED_KINDS:
            raise ValueError("config/writing.json: kinds must label essay, note and technical")
        # Unknown categories and stale featured slugs intentionally use UI fallbacks.

        wiki = json.loads(Path(WIKI_JSON).read_text(encoding="utf-8"))
        if not isinstance(wiki, dict) or not isinstance(wiki.get("pages"), list):
            raise ValueError("public/data/wiki.json: expected a pages array")
        wiki_ids = set()
        wiki_slugs = []
        wiki_titles = []
        for page in wiki["pages"]:
            if not isinstance(page, dict) or not all(
                isinstance(page.get(key), str) and page[key] for key in ("id", "title")
            ):
                raise ValueError("public/data/wiki.json: pages require id and title")
            wiki_ids.add(page["id"])
            wiki_slugs.append(page["id"].split("/")[-1])
            wiki_titles.append(page["title"].lower())
        for article in articles:
            source = project / "articles" / (article["slug"] + ".md")
            if not source.is_file():
                raise ValueError(f"articles/{article['slug']}.md: public source file not found")
            _record, body = parse_article(source, project)
            for match in re.findall(r'\[\[([^\]]+)\]\]', strip_code_blocks(body)):
                ref = match.strip()
                if (ref not in wiki_ids and wiki_slugs.count(ref) != 1
                        and wiki_titles.count(ref.lower()) != 1):
                    raise ValueError(f"{source.name}: unresolved or ambiguous Wiki reference: {ref}")

        feed_items = ET.parse(FEED_XML).findall(".//item")
        if len(feed_items) != len(articles):
            raise ValueError(f"feed.xml: {len(feed_items)} items != {len(articles)} public articles")
    except (OSError, ValueError, ET.ParseError) as error:
        print(f"{FAIL} Article sources:    {error}", file=sys.stderr)
        return False
    p(f"{PASS} Article sources:    {len(articles)} public articles; source/index/feed parity, config and Wiki refs ok")
    return True


def check_wiki_content():
    """Check 16: Wiki page content completeness."""
    wiki_dir = os.path.join(PROJECT_DIR, "content", "wiki")
    required_sections = [
        "## Overview", "## Core Concepts", "## How It Works",
        "## Advantages", "## Limitations", "## Example",
        "## Related Blogs", "## Related Projects", "## Further Reading",
    ]
    passed = True
    total_pages = 0
    incomplete = []

    if not os.path.isdir(wiki_dir):
        p(f"{FAIL} Wiki content:       content/wiki/ not found")
        return False

    for root, dirs, files in os.walk(wiki_dir):
        for fname in sorted(files):
            if not fname.endswith(".md"):
                continue
            total_pages += 1
            fpath = os.path.join(root, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            missing = [s for s in required_sections if s not in content]
            if missing:
                rel = os.path.relpath(fpath, PROJECT_DIR).replace("\\", "/")
                incomplete.append((rel, missing))

    if total_pages < 30:
        p(f"{FAIL} Wiki content:       {total_pages} pages (expected >= 30)")
        passed = False

    if incomplete:
        p(f"{FAIL} Wiki content:       {len(incomplete)} page(s) missing sections")
        for rel, missing in incomplete:
            p(f"  {CROSS} {rel}: missing {', '.join(missing)}")
        passed = False

    if passed:
        p(f"{PASS} Wiki content:       {total_pages} pages, all sections present")
    return passed


# ── Main ────────────────────────────────────────────────────────

def main():
    p("")
    results = []

    # Check 1
    results.append(check_html_pages())

    # Check 2
    results.append(check_internal_links())

    # Check 3
    feed_result = check_feed_xml()
    if isinstance(feed_result, tuple):
        results.append(feed_result[0])
    else:
        results.append(feed_result)

    # Check 5
    rss_result = check_rss_items_json()
    if isinstance(rss_result, tuple):
        results.append(rss_result[0])
        rss_items = rss_result[1]
    else:
        results.append(rss_result)
        rss_items = []

    # Check 6
    results.append(check_rss_fields(rss_items))

    # Check 7
    results.append(check_opml())

    # Check 8
    results.append(check_papers_json())

    # Check 9
    results.append(check_wiki_json())

    # Check 10
    results.append(check_assistant())

    # Check 11
    results.append(check_status_json())

    # Check 12
    results.append(check_github_stats_json())

    # Check 13
    results.append(check_wiki_hash_routing())

    # Check 14
    results.append(check_blog_wiki_links())

    # Check 15
    results.append(check_wiki_related_blog())

    # Check 16
    results.append(check_article_sources())

    # Check 17
    results.append(check_wiki_content())

    # Check 18
    results.append(check_site_config())

    # Check 19
    results.append(check_links_config())

    # Summary
    passed = sum(1 for r in results if r)
    total = len(results)

    p("")
    p("=" * 40)
    if passed == total:
        p(f"All checks passed ({passed}/{total})")
    else:
        p(f"Checks failed ({total - passed}/{total} failed)")

    if passed == total:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
