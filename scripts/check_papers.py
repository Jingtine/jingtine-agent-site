"""check_papers.py — Validate public/data/papers.json.

Usage:  python scripts/check_papers.py
Exit:   0 = all valid, 1 = errors found

Zero dependencies — Python stdlib only.
"""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
PAPERS_PATH = os.path.join(PROJECT_DIR, "public", "data", "papers.json")

REQUIRED = ["id", "title", "authors", "published", "summary", "url", "source"]


def main():
    if not os.path.exists(PAPERS_PATH):
        print(f"FAIL: {PAPERS_PATH} not found")
        sys.exit(1)

    try:
        with open(PAPERS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"FAIL: Invalid JSON — {e}")
        sys.exit(1)

    papers = data.get("papers", [])
    total = data.get("total", -1)

    # Check total count matches
    if total != len(papers):
        print(f"FAIL: total={total} but papers array has {len(papers)} items")
        sys.exit(1)

    errors = []
    ids_seen = set()

    for i, p in enumerate(papers):
        # Required fields
        for field in REQUIRED:
            if field not in p or not p[field]:
                errors.append(f"paper[{i}]: missing field '{field}'")

        # authors must be a list
        if not isinstance(p.get("authors"), list):
            errors.append(f"paper[{i}]: authors is not a list")

        # URL must be HTTPS
        url = p.get("url", "")
        if not url.startswith("https://"):
            errors.append(f"paper[{i}]: url not HTTPS — {url}")

        # Check duplicate ids
        pid = p.get("id", "")
        if pid in ids_seen:
            errors.append(f"paper[{i}]: duplicate id '{pid}'")
        ids_seen.add(pid)

    if errors:
        for e in errors:
            print(f"FAIL: {e}")
        print(f"\nErrors: {len(errors)}")
        sys.exit(1)

    print(f"PASS: {len(papers)} papers, all fields valid")
    print(f"PASS: No duplicate ids")
    print(f"PASS: All URLs are HTTPS")
    print(f"PASS: JSON parseable")

    sys.exit(0)


if __name__ == "__main__":
    main()
