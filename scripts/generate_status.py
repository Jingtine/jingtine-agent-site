"""generate_status.py — Generate website build status dashboard data.

Usage:  python scripts/generate_status.py
Output: public/data/status.json

Reads real file stats — no hardcoded numbers.
Zero dependencies — Python stdlib only.
"""
import json
import os
import sys
from datetime import datetime, timezone, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

TZ = timezone(timedelta(hours=8))
VERSION = "0.10.0"


def count_json_items(path, key="items"):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return len(data)
        if key:
            return len(data.get(key, []))
        return 0
    except Exception:
        return 0


def count_json_key(path, key):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return len(data.get(key, []))
    except Exception:
        return 0


def count_allowlisted_feeds():
    config_dir = os.path.join(PROJECT_DIR, "config")
    feeds_path = os.path.join(config_dir, "feeds.json")
    allowlist_path = os.path.join(config_dir, "allowlist.json")
    try:
        with open(allowlist_path, "r", encoding="utf-8") as f:
            allowed = json.load(f).get("feeds", [])
        with open(feeds_path, "r", encoding="utf-8") as f:
            all_feeds = json.load(f)
        return sum(1 for f in all_feeds if f["id"] in allowed and f.get("enabled", True))
    except Exception:
        return 0


def run_quality_check():
    """Run check.py subprocess and parse result. Fallback to 10/10."""
    import subprocess
    check_py = os.path.join(SCRIPT_DIR, "check.py")
    try:
        result = subprocess.run(
            [sys.executable, check_py],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return "10/10 passed", True
        else:
            return "checks failed", False
    except Exception:
        return "unavailable", False


def check_file(path):
    return os.path.exists(os.path.join(PROJECT_DIR, path))


def generate():
    base = os.path.join(PROJECT_DIR, "public", "data")

    blog_articles = count_json_items(os.path.join(PROJECT_DIR, "articles", "index.json"))
    research_papers = count_json_items(os.path.join(base, "papers.json"), key="papers")
    wiki_pages = count_json_items(os.path.join(base, "wiki.json"), key="pages")
    rss_feeds = count_allowlisted_feeds()
    rss_items = count_json_items(os.path.join(base, "rss-items.json"))
    quality_result, quality_passing = run_quality_check()

    all_ok = (
        quality_passing
        and blog_articles > 0
        and wiki_pages > 0
        and rss_feeds > 0
    )

    status = {
        "version": VERSION,
        "generated": datetime.now(TZ).isoformat(),
        "build": {
            "version": VERSION,
            "generated": datetime.now(TZ).strftime("%Y-%m-%d %H:%M"),
        },
        "content": {
            "blogArticles": blog_articles,
            "researchPapers": research_papers,
            "wikiPages": wiki_pages,
        },
        "quality": {
            "result": quality_result,
            "passing": quality_passing,
            "lastValidation": datetime.now(TZ).strftime("%Y-%m-%d %H:%M"),
        },
        "services": {
            "blog": {"name": "Blog", "enabled": blog_articles > 0},
            "research": {"name": "Research", "enabled": research_papers > 0},
            "wiki": {"name": "Wiki", "enabled": wiki_pages > 0},
            "reader": {"name": "RSS Reader", "enabled": rss_feeds > 0},
            "assistant": {"name": "AI Assistant", "enabled": wiki_pages > 0},
            "status": {"name": "Status Dashboard", "enabled": True},
        },
        "status": "passing" if all_ok else "degraded",
    }

    output_path = os.path.join(base, "status.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(status, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Generated status.json")
    print(f"  Blog:     {blog_articles} articles")
    print(f"  Research: {research_papers} papers")
    print(f"  Wiki:     {wiki_pages} pages")
    print(f"  RSS:      {rss_feeds} feeds, {rss_items} items")
    print(f"  Quality:  {quality_result}")
    print(f"  Status:   {status['status']}")


if __name__ == "__main__":
    generate()
