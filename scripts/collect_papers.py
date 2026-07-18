"""collect_papers.py — Collect research papers from arXiv API.

Usage:  python scripts/collect_papers.py

Reads topic + filter config from config/papers.json, queries arXiv API
using phrase + category-scoped queries, scores and filters results against
a whitelist/blacklist, deduplicates by arXiv id, and writes
public/data/papers.json.

Zero dependencies — Python stdlib only.
"""
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

# ── Configuration ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
CONFIG_DIR = os.path.join(PROJECT_DIR, "config")
CONFIG_PATH = os.path.join(CONFIG_DIR, "papers.json")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "papers.json")

ARXIV_API = "https://export.arxiv.org/api/query"
DEFAULT_MAX_PER_TOPIC = 8
DEFAULT_MAX_TOTAL = 40
FETCH_BUFFER = 20  # over-fetch per topic so post-filter cap has room
TZ = timezone(timedelta(hours=8))
ATOM_NS = "http://www.w3.org/2005/Atom"
REQUEST_DELAY = 3  # seconds between API calls


# ── Config loading ─────────────────────────────────────────────

def load_config(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Query construction ─────────────────────────────────────────

def build_search_query(topic):
    """Build an arXiv search_query string for one topic.

    Uses phrase queries in title/abstract + category filter:
        (abs:"<query>" OR ti:"<query>") AND (cat:cs.AI OR cat:cs.CL)
    """
    phrase = topic["query"]
    quoted = f'"{phrase}"'
    field_clause = f"(abs:{quoted} OR ti:{quoted})"

    cats = topic.get("categories", [])
    if cats:
        cat_clause = " OR ".join(f"cat:{c}" for c in cats)
        cat_clause = f"({cat_clause})"
        return f"{field_clause} AND {cat_clause}"
    return field_clause


# ── arXiv API ──────────────────────────────────────────────────

def fetch_arxiv(search_query, max_results):
    """Query arXiv API, return list of normalized paper dicts (raw, unscored)."""
    url = (
        f"{ARXIV_API}?search_query={quote(search_query)}"
        f"&max_results={max_results}"
        f"&sortBy=submittedDate&sortOrder=descending"
    )

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
    """Parse a single arXiv Atom entry into a raw paper dict."""
    raw_id = _atom_text(entry, "id")
    if not raw_id:
        return None
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
    if not raw:
        return ""
    try:
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


# ── Scoring & filtering ────────────────────────────────────────

def score_paper(paper, filters):
    """Return (score, matched_terms, excluded) for a paper.

    score: int (0 if excluded by blacklist or no whitelist hit)
    matched_terms: list of whitelist terms hit
    excluded: True if a blacklist term hit
    """
    title = paper.get("title", "").lower()
    abstract = paper.get("summary", "").lower()
    haystack_title = title
    haystack_abs = abstract

    # Blacklist: any hit → excluded
    for term in filters.get("exclude_any", []):
        if term.lower() in haystack_title or term.lower() in haystack_abs:
            return 0, [], True

    # Whitelist scoring: title ×2, abstract ×1, each term once
    matched = []
    score = 0
    for term in filters.get("require_any", []):
        tl = term.lower()
        in_title = tl in haystack_title
        in_abs = tl in haystack_abs
        if in_title:
            score += 2
            matched.append(term)
        elif in_abs:
            score += 1
            matched.append(term)

    return score, matched, False


# ── Main ───────────────────────────────────────────────────────

def main():
    if not os.path.exists(CONFIG_PATH):
        print(f"ERROR: {CONFIG_PATH} not found", file=sys.stderr)
        sys.exit(1)

    config = load_config(CONFIG_PATH)
    topics = config.get("topics", [])
    filters = config.get("filters", {})
    min_score = filters.get("min_score", 3)
    max_per_topic = config.get("max_per_topic", DEFAULT_MAX_PER_TOPIC)
    max_total = config.get("max_total", DEFAULT_MAX_TOTAL)

    if not topics:
        print("ERROR: No topics in config/papers.json", file=sys.stderr)
        sys.exit(1)

    # Per-topic collection: id -> list of scored papers
    by_topic = {}
    total_fetched = 0
    total_excluded = 0

    for topic in topics:
        tid = topic["id"]
        search_query = build_search_query(topic)
        print(f"QUERY: {tid}  ({topic['query']})")
        print(f"  search_query: {search_query}")

        raw = fetch_arxiv(search_query, max_per_topic + FETCH_BUFFER)
        total_fetched += len(raw)
        print(f"  -> {len(raw)} raw results")

        kept = []
        for paper in raw:
            score, matched, excluded = score_paper(paper, filters)
            if excluded:
                total_excluded += 1
                continue
            if score < min_score or not matched:
                continue
            paper["topic"] = tid
            paper["score"] = score
            paper["matched_terms"] = matched
            kept.append(paper)

        # Per-topic cap: sort by score desc then date desc, take top N
        kept.sort(key=lambda p: (p["score"], p.get("published", "")), reverse=True)
        kept = kept[:max_per_topic]
        by_topic[tid] = kept
        print(f"  -> {len(kept)} kept after filter+cap")

        time.sleep(REQUEST_DELAY)

    # Cross-topic merge + dedup by arxiv id (keep higher score, merge terms)
    merged = {}  # id -> paper
    for tid, papers in by_topic.items():
        for p in papers:
            pid = p["id"]
            if pid in merged:
                existing = merged[pid]
                if p["score"] > existing["score"]:
                    base = p
                    other = existing
                else:
                    base = existing
                    other = p
                # Merge matched_terms + topic
                terms = list(dict.fromkeys(base["matched_terms"] + other["matched_terms"]))
                base["matched_terms"] = terms
                base["score"] = max(base["score"], other["score"])
                topics_set = list(dict.fromkeys(
                    [base.get("topic", ""), other.get("topic", "")]
                ))
                base["topic"] = topics_set[0] if topics_set else base.get("topic", "")
                merged[pid] = base
            else:
                merged[pid] = p

    unique = list(merged.values())
    # Global sort: score desc, then published desc
    unique.sort(key=lambda p: (p["score"], p.get("published", "")), reverse=True)

    # Global cap
    if len(unique) > max_total:
        unique = unique[:max_total]

    output = {
        "fetched": datetime.now(TZ).isoformat(),
        "total": len(unique),
        "papers": unique,
    }

    # Preserve old data on empty result
    if len(unique) == 0 and os.path.exists(OUTPUT_PATH):
        print("WARNING: 0 papers passed filter, keeping existing data.", file=sys.stderr)
        with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
            old = json.load(f)
        old_count = old.get("total", 0)
        print(f"\n{'='*40}")
        print(f"Fetched:   {total_fetched}")
        print(f"Excluded:  {total_excluded}")
        print(f"Kept:      0 (kept existing {old_count})")
        sys.exit(0)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"\n{'='*40}")
    print(f"Fetched:   {total_fetched}")
    print(f"Excluded:  {total_excluded}")
    print(f"Kept:      {len(unique)}")
    print(f"Topics:    {len(topics)}")
    print(f"Output:    {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
