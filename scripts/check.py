"""check.py — Quality checks for Jingtine Agent Site.

Usage:  python scripts/check.py
Exit:   0 = all checks passed, 1 = at least one check failed

Zero dependencies — Python stdlib only.
"""
import json
import os
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
    "papers.html", "wiki.html", "reader.html", "assistant.html",
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

PASS = "[PASS]"
FAIL = "[FAIL]"
CROSS = "x"
ARROW = "->"
NEQ = "!="


# ── Helpers ─────────────────────────────────────────────────────

def p(msg):
    print(msg)


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
