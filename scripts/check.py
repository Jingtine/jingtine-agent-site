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
from html.parser import HTMLParser

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
    "article.html",
    "knowledge.html", "library.html", "contact.html",
]

FEED_XML = os.path.join(PROJECT_DIR, "feed.xml")
ARTICLES_JSON = os.path.join(PROJECT_DIR, "articles", "index.json")
RSS_ITEMS_JSON = os.path.join(PROJECT_DIR, "public", "data", "rss-items.json")
OPML_XML = os.path.join(PROJECT_DIR, "subscriptions.opml")

RSS_REQUIRED_FIELDS = ["id", "title", "link", "description", "pubDate", "source", "category"]

PAPERS_JSON = os.path.join(PROJECT_DIR, "public", "data", "papers.json")
PAPER_REQUIRED_FIELDS = ["id", "title", "authors", "published", "summary", "url", "source"]

WIKI_JSON = os.path.join(PROJECT_DIR, "public", "data", "wiki.json")
WIKI_REQUIRED_FIELDS = ["id", "title", "category", "tags", "updated", "summary", "links", "path"]

STATUS_JSON = os.path.join(PROJECT_DIR, "public", "data", "status.json")

PASS = "[PASS]"
FAIL = "[FAIL]"
CROSS = "x"
ARROW = "->"
NEQ = "!="


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


def check_feed_item_count(feed_items):
    """Check 4: feed.xml item count matches articles/index.json."""
    if not os.path.exists(ARTICLES_JSON):
        p(f"{FAIL} Feed item count:   articles/index.json not found")
        return False

    with open(ARTICLES_JSON, "r", encoding="utf-8") as f:
        articles = json.load(f)

    article_count = len(articles)
    if feed_items == article_count:
        p(f"{PASS} Feed item count:   {feed_items} items = {article_count} articles")
        return True
    else:
        p(f"{FAIL} Feed item count:   {feed_items} items {NEQ} {article_count} articles")
        return False


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

    p(f"{PASS} papers.json:        valid JSON, {len(papers)} papers")
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
    blog_js = os.path.join(PROJECT_DIR, "js", "blog.js")
    passed = True

    if not os.path.exists(blog_js):
        p(f"{FAIL} Blog wiki links:    js/blog.js not found")
        return False

    with open(blog_js, "r", encoding="utf-8") as f:
        content = f.read()

    if "wiki.json" not in content:
        p(f"{FAIL} Blog wiki links:    blog.js does not read wiki.json")
        passed = False

    if "wiki.html#" not in content:
        p(f"{FAIL} Blog wiki links:    blog.js does not generate wiki.html# links")
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
            with open(fpath, "r", encoding="utf-8") as f:
                md = f.read()
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

    if "articles/index.json" not in content:
        p(f"{FAIL} Wiki related blog:   wiki.js does not read articles/index.json")
        passed = False

    if "article.html?slug=" not in content:
        p(f"{FAIL} Wiki related blog:   wiki.js does not generate article.html?slug= links")
        passed = False

    if "[[" not in content or "]]" not in content:
        p(f"{FAIL} Wiki related blog:   wiki.js does not scan for [[...]] patterns")
        passed = False

    pilot_article = os.path.join(PROJECT_DIR, "articles", "building-agent.md")
    if os.path.exists(pilot_article):
        with open(pilot_article, "r", encoding="utf-8") as f:
            md = f.read()
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

    if os.path.exists(ARTICLES_JSON):
        with open(ARTICLES_JSON, "r", encoding="utf-8") as f:
            articles = json.load(f)
        slugs = [a.get("slug", "") for a in articles]
        empty = [i for i, s in enumerate(slugs) if not s]
        if empty:
            p(f"{FAIL} Wiki related blog:   empty article slug at index {empty}")
            passed = False
        if len(slugs) != len(set(slugs)):
            p(f"{FAIL} Wiki related blog:   duplicate article slugs")
            passed = False

    if passed:
        p(f"{PASS} Wiki related blog:   related articles configured")
    return passed


def check_blog_content():
    """Check 15: Blog content completeness and metadata."""
    passed = True

    if not os.path.exists(ARTICLES_JSON):
        p(f"{FAIL} Blog content:       articles/index.json not found")
        return False

    with open(ARTICLES_JSON, "r", encoding="utf-8") as f:
        articles = json.load(f)

    if len(articles) < 9:
        p(f"{FAIL} Blog content:       {len(articles)} articles (expected >= 9)")
        passed = False

    required_fields = ["slug", "title", "date", "category", "summary"]
    incomplete = []
    for i, a in enumerate(articles):
        missing = [f for f in required_fields if f not in a or not a.get(f)]
        if missing:
            incomplete.append((i, missing))

    if incomplete:
        p(f"{FAIL} Blog content:       metadata incomplete")
        for idx, missing in incomplete:
            p(f"  {CROSS} article[{idx}] missing: {', '.join(missing)}")
        passed = False

    articles_dir = os.path.join(PROJECT_DIR, "articles")
    missing_md = []
    for a in articles:
        slug = a.get("slug", "")
        md_path = os.path.join(articles_dir, slug + ".md")
        if not os.path.exists(md_path):
            missing_md.append(slug)

    if missing_md:
        p(f"{FAIL} Blog content:       missing .md files: {', '.join(missing_md)}")
        passed = False

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

        wiki_link_pattern = re.compile(r'\[\[([^\]]+)\]\]')
        unresolved = set()
        article_count_with_wiki = 0

        for a in articles:
            slug = a.get("slug", "")
            md_path = os.path.join(articles_dir, slug + ".md")
            if not os.path.exists(md_path):
                continue
            with open(md_path, "r", encoding="utf-8") as f:
                md = f.read()
            md = strip_code_blocks(md)
            matches = wiki_link_pattern.findall(md)
            if matches:
                article_count_with_wiki += 1
            for m in matches:
                ref = m.strip()
                ref_lower = ref.lower()
                if ref in wiki_ids or ref in wiki_slugs or ref_lower in wiki_titles_lower:
                    continue
                unresolved.add(ref)

        if unresolved:
            p(f"{FAIL} Blog content:       unresolved wiki refs: {', '.join(sorted(unresolved))}")
            passed = False

        if article_count_with_wiki < 2:
            p(f"{FAIL} Blog content:       only {article_count_with_wiki} articles have wiki links (expected >= 2)")
            passed = False

    slugs = [a.get("slug", "") for a in articles]
    if len(slugs) != len(set(slugs)):
        p(f"{FAIL} Blog content:       duplicate article slugs")
        passed = False

    if os.path.exists(FEED_XML):
        tree = ET.parse(FEED_XML)
        feed_items = tree.findall(".//item")
        if len(feed_items) != len(articles):
            p(f"{FAIL} Blog content:       feed.xml has {len(feed_items)} items {NEQ} {len(articles)} articles")
            passed = False

    if passed:
        p(f"{PASS} Blog content:       {len(articles)} articles, metadata ok, wiki refs ok")
    return passed


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
        feed_item_count = feed_result[1]
    else:
        results.append(feed_result)
        feed_item_count = 0

    # Check 4
    results.append(check_feed_item_count(feed_item_count))

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
    results.append(check_wiki_hash_routing())

    # Check 13
    results.append(check_blog_wiki_links())

    # Check 14
    results.append(check_wiki_related_blog())

    # Check 15
    results.append(check_blog_content())

    # Check 16
    results.append(check_wiki_content())

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
