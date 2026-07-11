"""aggregate-feeds.py — Aggregate RSS/Atom feeds into unified JSON.

Usage:  python scripts/aggregate-feeds.py
Output: public/data/rss-items.json

Reads config/feeds.json, filters by config/allowlist.json,
fetches each feed, detects RSS vs Atom, normalizes to a
single schema, deduplicates, and sorts by date descending.

Zero dependencies — Python stdlib only.
"""
import hashlib
import html
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from urllib.request import Request, urlopen
from urllib.error import URLError
from xml.sax.saxutils import escape as xml_escape

# ── Configuration ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
CONFIG_DIR = os.path.join(PROJECT_DIR, "config")
PUBLIC_DATA_DIR = os.path.join(PROJECT_DIR, "public", "data")

FEEDS_PATH = os.path.join(CONFIG_DIR, "feeds.json")
ALLOWLIST_PATH = os.path.join(CONFIG_DIR, "allowlist.json")
OUTPUT_PATH = os.path.join(PUBLIC_DATA_DIR, "rss-items.json")
OPML_PATH = os.path.join(PROJECT_DIR, "subscriptions.opml")

HTTP_TIMEOUT = 15  # seconds
TZ = timezone(timedelta(hours=8))

# ── Atom namespace ─────────────────────────────────────────────
ATOM_NS = "http://www.w3.org/2005/Atom"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def item_id(link):
    """Generate a stable ID from a link URL."""
    return hashlib.sha256(link.encode()).hexdigest()[:12]


# ── Date Parsing ───────────────────────────────────────────────

def parse_date(raw):
    """Try to parse a date string from RSS (RFC 822) or Atom (ISO 8601)."""
    if not raw:
        return None
    text = raw.strip()

    # RFC 822  (e.g. "Fri, 10 Jul 2026 00:00:00 +0000")
    try:
        return parsedate_to_datetime(text).astimezone(TZ)
    except (ValueError, TypeError):
        pass

    # ISO 8601  (e.g. "2026-07-10T12:00:00+08:00" / "2026-07-10T12:00:00Z")
    try:
        # Replace 'Z' with '+00:00' for fromisoformat
        normalized = text.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=TZ)
        return dt.astimezone(TZ)
    except (ValueError, TypeError):
        pass

    return None


# ── HTML stripping ─────────────────────────────────────────────

HTML_TAG_RE = re.compile(r"<[^>]*>")
MULTI_SPACE_RE = re.compile(r"\s+")
DESC_MAX_LEN = 280


def clean_description(text):
    """Decode HTML entities, strip tags, normalize whitespace, truncate."""
    if not text:
        return ""
    # 1. HTML entity decode
    t = html.unescape(text)
    # 2. Remove all HTML tags
    t = HTML_TAG_RE.sub("", t)
    # 3. Convert \u00A0 to space
    t = t.replace("\u00A0", " ")
    # 4. Collapse consecutive whitespace
    t = MULTI_SPACE_RE.sub(" ", t)
    # 5. Trim
    t = t.strip()
    # 6. Truncate with ellipsis
    if len(t) > DESC_MAX_LEN:
        t = t[:DESC_MAX_LEN].rstrip() + "\u2026"
    return t


def strip_html(text):
    """Legacy alias for clean_description (used by _parse_entry)."""
    return clean_description(text)


# ── HTTPS check ────────────────────────────────────────────────

def check_https(url):
    """Validate URL uses HTTPS."""
    if not url.startswith("https://"):
        print(f"  SKIP (non-HTTPS): {url}", file=sys.stderr)
        return False
    return True


# ── Feed detection & parsing ───────────────────────────────────

def detect_and_parse(xml_bytes, feed_url):
    """Detect RSS vs Atom and return (items, format_str) tuple."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        print(f"  XML parse error: {e}", file=sys.stderr)
        return [], "Unknown"

    tag = root.tag.lower()
    if tag == "rss":
        return _parse_rss(root, feed_url), "RSS 2.0"
    elif tag.endswith("feed") or tag == f"{{{ATOM_NS}}}feed":
        return _parse_atom(root, feed_url), "Atom 1.0"
    else:
        print(f"  Unknown feed format (root tag={root.tag})", file=sys.stderr)
        return [], "Unknown"


def _parse_rss(root, feed_url):
    """Parse RSS 2.0 channel/items."""
    items = []
    channel = root.find("channel")
    if channel is None:
        return items

    for elem in channel.findall("item"):
        title = _text(elem, "title")
        link = _text(elem, "link")
        desc = _text(elem, "description")
        pub_date_raw = _text(elem, "pubDate")

        if not link:
            continue

        items.append({
            "id": item_id(link),
            "title": strip_html(title) if title else "",
            "link": link,
            "description": strip_html(desc)[:300] if desc else "",
            "pubDate": _format_date(parse_date(pub_date_raw)),
        })
    return items


def _parse_atom(root, feed_url):
    """Parse Atom entries."""
    items = []

    # Try to get the base URL from xml:base or the feed link
    for entry in root.findall(f"{{{ATOM_NS}}}entry"):
        title = _atom_text(entry, "title")
        link = _atom_link(entry)
        summary = _atom_text(entry, "summary") or _atom_text(entry, "content")
        updated = _atom_text(entry, "updated") or _atom_text(entry, "published")

        if not link:
            continue

        items.append({
            "id": item_id(link),
            "title": strip_html(title) if title else "",
            "link": link,
            "description": strip_html(summary)[:300] if summary else "",
            "pubDate": _format_date(parse_date(updated)),
        })
    return items


def _text(parent, tag):
    """Get text of first matching child element."""
    child = parent.find(tag)
    return child.text if child is not None and child.text else ""


def _atom_text(parent, tag):
    """Get text from an Atom element (may be plain or typed)."""
    child = parent.find(f"{{{ATOM_NS}}}{tag}")
    if child is None:
        # Try without ns (some feeds omit the default ns)
        child = parent.find(tag)
    if child is not None and child.text:
        return child.text
    return ""


def _atom_link(entry):
    """Extract href from Atom <link> element. Prefer rel=alternate."""
    for link in entry.findall(f"{{{ATOM_NS}}}link"):
        rel = link.get("rel", "alternate")
        href = link.get("href", "")
        if href:
            if rel == "alternate" or rel is None:
                return href
    # fallback: first link with href
    for link in entry.findall(f"{{{ATOM_NS}}}link"):
        href = link.get("href", "")
        if href:
            return href
    return ""


def _format_date(dt):
    """ISO 8601 string or empty."""
    if dt is None:
        return ""
    return dt.isoformat()


# ── Feed fetching ──────────────────────────────────────────────

def fetch_feed(url):
    """Fetch feed XML over HTTPS, return bytes or None."""
    if not check_https(url):
        return None
    try:
        req = Request(url, headers={"User-Agent": "jingtine-agent-site/1.0"})
        resp = urlopen(req, timeout=HTTP_TIMEOUT)
        return resp.read()
    except URLError as e:
        print(f"  Fetch error: {e.reason}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        return None


# ── OPML generation ─────────────────────────────────────────────

def generate_opml(feeds_config, feed_formats, output_path):
    """Generate OPML 2.0 file with enabled+public feeds only.

    Returns the number of outlines written.
    """
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<opml version="2.0">',
        "  <head>",
        "    <title>Jingtine RSS Subscriptions</title>",
        f"    <dateCreated>{datetime.now(TZ).isoformat()}</dateCreated>",
        "  </head>",
        "  <body>",
    ]

    count = 0
    for feed in feeds_config:
        if not feed.get("enabled", True):
            continue
        if not feed.get("public", False):
            continue

        fid = feed["id"]
        name = xml_escape(feed["name"])
        url = xml_escape(feed["url"])
        fmt = feed_formats.get(fid, "")
        opml_type = "atom" if "atom" in fmt.lower() else "rss"

        lines.append(
            f'    <outline text="{name}" title="{name}" '
            f'type="{opml_type}" xmlUrl="{url}" />'
        )
        count += 1

    lines.append("  </body>")
    lines.append("</opml>")
    lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return count


# ── HTTPS upgrade ────────────────────────────────────────────────

def _upgrade_https(link):
    """Upgrade http:// to https:// for links."""
    if link.startswith("http://"):
        return "https://" + link[7:]
    return link


# ── Main ───────────────────────────────────────────────────────

def main():
    if not os.path.exists(FEEDS_PATH):
        print(f"ERROR: {FEEDS_PATH} not found", file=sys.stderr)
        sys.exit(1)

    all_feeds = load_json(FEEDS_PATH)

    allowlist_data = {}
    if os.path.exists(ALLOWLIST_PATH):
        allowlist_data = load_json(ALLOWLIST_PATH)
    allowed_ids = set(allowlist_data.get("feeds", []))

    if not allowed_ids:
        print("WARNING: allowlist is empty — no feeds will be fetched", file=sys.stderr)

    all_items = []
    success = 0
    failed = 0
    feed_formats = {}  # fid → format string
    rss_count = 0
    atom_count = 0

    for feed_cfg in all_feeds:
        fid = feed_cfg["id"]
        if fid not in allowed_ids:
            print(f"SKIP (not in allowlist): {fid}")
            continue
        if not feed_cfg.get("enabled", True):
            print(f"SKIP (disabled): {fid}")
            continue

        name = feed_cfg["name"]
        url = feed_cfg["url"]
        category = feed_cfg.get("category", "")

        print(f"FETCH: {fid}  ({name})")
        xml_bytes = fetch_feed(url)

        if xml_bytes is None:
            failed += 1
            continue

        items, fmt = detect_and_parse(xml_bytes, url)
        feed_formats[fid] = fmt
        print(f"  → {len(items)} items  [{fmt}]")

        if fmt == "RSS 2.0":
            rss_count += 1
        elif fmt == "Atom 1.0":
            atom_count += 1

        # Annotate with source metadata and upgrade HTTP to HTTPS
        for item in items:
            item["link"] = _upgrade_https(item.get("link", ""))
            item["source"] = {"id": fid, "name": name}
            item["category"] = category

        all_items.extend(items)
        success += 1

    # Deduplicate by link
    seen = set()
    unique = []
    for item in all_items:
        link = item.get("link", "")
        if link and link not in seen:
            seen.add(link)
            unique.append(item)

    # Sort by pubDate descending (items without date go last)
    unique.sort(key=lambda x: x.get("pubDate", ""), reverse=True)

    output = {
        "generated": datetime.now(TZ).isoformat(),
        "total": len(unique),
        "items": unique,
    }

    save_json(OUTPUT_PATH, output)

    # Generate OPML (enabled + public only)
    opml_count = generate_opml(all_feeds, feed_formats, OPML_PATH)

    print(f"\n{'='*40}")
    print(f"Feeds:    {success} ok, {failed} failed")
    print(f"  RSS 2.0:   {rss_count}")
    print(f"  Atom 1.0:  {atom_count}")
    print(f"Articles: {len(unique)} unique items")
    print(f"OPML:     {opml_count} subscriptions → {OPML_PATH}")
    print(f"Output:   {OUTPUT_PATH}")

    # Exit with error code if ALL feeds failed
    if success == 0 and failed > 0:
        print(f"\nERROR: All {failed} feeds failed.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
