#!/usr/bin/env python3
"""Generate the public Writing index and RSS from Markdown front matter."""

from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
import json
from pathlib import Path
import sys
from urllib.parse import quote
from xml.sax.saxutils import escape

if __package__:
    from .article_content import ArticleError, build_public_records
else:
    from article_content import ArticleError, build_public_records


PROJECT_DIR = Path(__file__).resolve().parent.parent
ARTICLES_DIR = PROJECT_DIR / "articles"
ARTICLE_INDEX_PATH = PROJECT_DIR / "public/data/articles.json"
FEED_PATH = PROJECT_DIR / "feed.xml"
BASE_URL = "https://jingtine.github.io/jingtine-agent-site"
SITE_TITLE = "Jingtine's Blog"
SITE_DESC = "Thoughts on AI Agent, Software Engineering, and Product Thinking"
TZ = timezone(timedelta(hours=8))


def write_article_index(records: list[dict], output_path: Path) -> None:
    """Write stable UTF-8 JSON with explicit LF line endings."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8", newline="\n",
    )


def _rss_date(value: str) -> str:
    return format_datetime(datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=TZ))


def build_rss(records: list[dict]) -> str:
    """Build RSS 2.0 without wall-clock or host-timezone dependencies."""
    records = sorted(records, key=lambda record: record["slug"])
    records.sort(key=lambda record: record["date"], reverse=True)
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "  <channel>",
        f"    <title>{escape(SITE_TITLE)}</title>",
        f"    <link>{BASE_URL}</link>",
        f"    <description>{escape(SITE_DESC)}</description>",
        "    <language>zh-CN</language>",
    ]
    if records:
        lines.append(f"    <lastBuildDate>{_rss_date(records[0]['date'])}</lastBuildDate>")
    lines.append(
        f'    <atom:link href="{BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>'
    )
    for record in records:
        article_url = escape(f"{BASE_URL}/article.html?slug={quote(record['slug'], safe='')}")
        lines.extend([
            "    <item>",
            f"      <title>{escape(record['title'])}</title>",
            f"      <link>{article_url}</link>",
            f"      <description>{escape(record['summary'])}</description>",
            f"      <pubDate>{_rss_date(record['date'])}</pubDate>",
            f"      <category>{escape(record['category'])}</category>",
            f'      <guid isPermaLink="true">{article_url}</guid>',
            "    </item>",
        ])
    lines.extend(["  </channel>", "</rss>"])
    return "\n".join(lines) + "\n"


def main() -> int:
    try:
        records = build_public_records(ARTICLES_DIR, PROJECT_DIR)
        feed = build_rss(records)
        write_article_index(records, ARTICLE_INDEX_PATH)
        FEED_PATH.write_text(feed, encoding="utf-8", newline="\n")
    except (ArticleError, OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Generated {len(records)} articles: {ARTICLE_INDEX_PATH} and {FEED_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
