"""collect_papers.py — Collect research papers from arXiv API.

Usage:  python scripts/collect_papers.py [--limit N]

Reads topics from .opencode/skills/research-paper-collector/references/topics.md
Queries arXiv API, deduplicates, sorts, outputs public/data/papers.json.

Zero dependencies — Python stdlib only.
"""
import hashlib
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from urllib.request import Request, urlopen
from urllib.error import URLError
from urllib.parse import quote
from xml.sax.saxutils import escape as xml_escape

# ── Configuration ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
SKILL_DIR = os.path.join(PROJECT_DIR, ".opencode", "skills", "research-paper-collector")
TOPICS_PATH = os.path.join(SKILL_DIR, "references", "topics.md")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "papers.json")

ARXIV_API = "https://export.arxiv.org/api/query"
DEFAULT_LIMIT = 10
TZ = timezone(timedelta(hours=8))
ATOM_NS = "http://www.w3.org/2005/Atom"
REQUEST_DELAY = 3  # seconds between API calls


# ── Topic parsing ──────────────────────────────────────────────

def parse_topics(path):
    """Extract topic strings from topics.md (lines starting with '- ')."""
    topics = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if stripped.startswith("- "):
                topic = stripped[2:].strip()
                if topic and not topic.startswith("#"):
                    topics.append(topic)
    return topics


# ── arXiv API ──────────────────────────────────────────────────

def fetch_arxiv(query, max_results):
    """Query arXiv API, return list of normalized paper dicts."""
    search_query = f"all:{quote(query)}"
    url = f"{ARXIV_API}?search_query={search_query}&max_results={max_results}&sortBy=submittedDate&sortOrder=descending"

    req = Request(url, headers={"User-Agent": "jingtine-agent-site/1.0"})
    try:
        resp = urlopen(req, timeout=30)
        data = resp.read()
    except URLError as e:
        print(f"  Fetch error: {e.reason}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        return []

    try:
        root = ET.fromstring(data)
    except ET.ParseError as e:
        print(f"  XML parse error: {e}", file=sys.stderr)
        return []

    papers = []
    for entry in root.findall(f"{{{ATOM_NS}}}entry"):
        paper = _parse_entry(entry)
        if paper:
            papers.append(paper)
    return papers


def _parse_entry(entry):
    """Parse a single arXiv Atom entry into a paper dict."""
    # arXiv ID from the <id> element
    raw_id = _atom_text(entry, "id")
    if not raw_id:
        return None
    # Extract ID from URL like http://arxiv.org/abs/2501.12345v1
    arxiv_id = raw_id.strip().split("/")[-1] if "/" in raw_id else raw_id.strip()

    title = strip_html(_atom_text(entry, "title"))
    summary = strip_html(_atom_text(entry, "summary"))

    authors = []
    for author_elem in entry.findall(f"{{{ATOM_NS}}}author"):
        name = _atom_text(author_elem, "name")
        if name:
            authors.append(strip_html(name))

    published_raw = _atom_text(entry, "published")
    published = _parse_published(published_raw)

    url = f"https://arxiv.org/abs/{arxiv_id}"

    return {
        "id": arxiv_id,
        "title": title if title else "",
        "authors": authors,
        "published": published,
        "summary": summary[:500] if summary else "",
        "url": url,
        "source": "arXiv",
    }


def _parse_published(raw):
    """Parse arXiv published date → YYYY-MM-DD."""
    if not raw:
        return ""
    try:
        # e.g. "2026-07-10T12:00:00Z" or "2026-07-10"
        normalized = raw.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        return dt.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return raw.strip()[:10]


def _atom_text(parent, tag):
    child = parent.find(f"{{{ATOM_NS}}}{tag}")
    if child is not None and child.text:
        return child.text
    return ""


HTML_TAG_RE = re.compile(r"<[^>]*>")


def strip_html(text):
    if not text:
        return ""
    text = text.replace("\n", " ").replace("\r", " ")
    text = HTML_TAG_RE.sub("", text)
    return " ".join(text.split())


# ── Main ───────────────────────────────────────────────────────

def main():
    # Parse --limit from CLI
    limit = DEFAULT_LIMIT
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for a in sys.argv[1:]:
        if a.startswith("--limit="):
            limit = int(a.split("=")[1])
        elif a == "--limit":
            idx = sys.argv.index("--limit")
            if idx + 1 < len(sys.argv):
                limit = int(sys.argv[idx + 1])

    if not os.path.exists(TOPICS_PATH):
        print(f"ERROR: {TOPICS_PATH} not found", file=sys.stderr)
        sys.exit(1)

    topics = parse_topics(TOPICS_PATH)
    if not topics:
        print("ERROR: No topics found in topics.md", file=sys.stderr)
        sys.exit(1)

    all_papers = []
    total_fetched = 0

    for topic in topics:
        print(f"QUERY: {topic}")
        papers = fetch_arxiv(topic, limit)
        print(f"  -> {len(papers)} results")
        all_papers.extend(papers)
        total_fetched += len(papers)
        if len(topics) > 1:
            time.sleep(REQUEST_DELAY)

    # Deduplicate by arXiv id
    seen = set()
    unique = []
    for p in all_papers:
        pid = p["id"]
        if pid not in seen:
            seen.add(pid)
            unique.append(p)

    # Sort by published descending
    unique.sort(key=lambda p: p.get("published", ""), reverse=True)

    output = {
        "fetched": datetime.now(TZ).isoformat(),
        "total": len(unique),
        "papers": unique,
    }

    # Save — preserve old data on empty result
    if len(unique) == 0:
        if os.path.exists(OUTPUT_PATH):
            print("WARNING: 0 new papers, keeping existing data.", file=sys.stderr)
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                old = json.load(f)
            old_count = old.get("total", 0)
            print(f"\n{'='*40}")
            print(f"Fetched:  {total_fetched}")
            print(f"New:      {len(unique)}")
            print(f"Saved:    {old_count} (kept existing)")
            print(f"Queries:  {len(topics)}")
            sys.exit(0)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    new_count = len(unique)

    print(f"\n{'='*40}")
    print(f"Fetched:  {total_fetched}")
    print(f"New:      {new_count}")
    print(f"Saved:    {new_count}")
    print(f"Queries:  {len(topics)}")
    print(f"Output:   {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
