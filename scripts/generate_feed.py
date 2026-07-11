"""generate_feed.py — Generate feed.xml from articles/index.json.

Usage:  python scripts/generate_feed.py
Output: feed.xml (in project root)

RSS 2.0 compliant. Uses only Python stdlib, zero dependencies.
"""
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from email.utils import formatdate
from xml.sax.saxutils import escape as xml_escape

# ── Configuration ──────────────────────────────────────────────
BASE_URL = "https://jingtine.github.io/jingtine-agent-site"
SITE_TITLE = "Jingtine's Blog"
SITE_DESC = "Thoughts on AI Agent, Software Engineering, and Product Thinking"
LANGUAGE = "zh-CN"
TZ = timezone(timedelta(hours=8))  # CST +0800

CATEGORY_DISPLAY = {
    "ai-agent": "AI Agent",
    "software-engineering": "Software Engineering",
    "product-thinking": "Product Thinking",
}

# ── Paths ──────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INDEX_PATH = os.path.join(PROJECT_DIR, "articles", "index.json")
FEED_PATH = os.path.join(PROJECT_DIR, "feed.xml")


def load_articles(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_rss(articles, now_dt):
    """Build complete RSS 2.0 XML string."""

    last_build = formatdate(now_dt.timestamp(), usegmt=False)

    items_xml = []
    for a in articles:
        slug = a["slug"]
        title = xml_escape(a["title"])
        summary = xml_escape(a.get("summary", ""))
        category_key = a.get("category", "")
        category_name = CATEGORY_DISPLAY.get(category_key, category_key)
        article_url = f"{BASE_URL}/article.html?slug={slug}"

        # Parse date → RFC 822
        try:
            d = datetime.strptime(a["date"], "%Y-%m-%d").replace(tzinfo=TZ)
        except ValueError:
            d = now_dt
        pub_date = formatdate(d.timestamp(), usegmt=False)

        items_xml.append(
            "    <item>\n"
            f"      <title>{title}</title>\n"
            f"      <link>{xml_escape(article_url)}</link>\n"
            f"      <description>{summary}</description>\n"
            f"      <pubDate>{pub_date}</pubDate>\n"
            f"      <category>{xml_escape(category_name)}</category>\n"
            f"      <guid isPermaLink=\"true\">{xml_escape(article_url)}</guid>\n"
            "    </item>"
        )

    feed_url = f"{BASE_URL}/feed.xml"
    items_block = "\n".join(items_xml)

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        f"    <title>{xml_escape(SITE_TITLE)}</title>\n"
        f"    <link>{xml_escape(BASE_URL)}</link>\n"
        f"    <description>{xml_escape(SITE_DESC)}</description>\n"
        f"    <language>{LANGUAGE}</language>\n"
        f"    <lastBuildDate>{last_build}</lastBuildDate>\n"
        f"    <atom:link href=\"{xml_escape(feed_url)}\" rel=\"self\" type=\"application/rss+xml\"/>\n"
        f"{items_block}\n"
        "  </channel>\n"
        "</rss>\n"
    )


def main():
    if not os.path.exists(INDEX_PATH):
        print(f"ERROR: {INDEX_PATH} not found", file=sys.stderr)
        sys.exit(1)

    articles = load_articles(INDEX_PATH)

    # Sort by date descending
    articles.sort(key=lambda a: a.get("date", ""), reverse=True)

    now = datetime.now(TZ)
    feed = build_rss(articles, now)

    with open(FEED_PATH, "w", encoding="utf-8") as f:
        f.write(feed)

    print(f"Generated {FEED_PATH}  ({len(articles)} articles)")


if __name__ == "__main__":
    main()
