"""check_wiki.py — Validate public/data/wiki.json and all referenced .md files.

Usage:  python scripts/check_wiki.py
Exit:   0 = all valid, 1 = errors found

Checks: JSON parseable, id uniqueness, .md files exist,
        [[Wiki Links]] resolve, categories non-empty.
"""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
WIKI_JSON = os.path.join(PROJECT_DIR, "public", "data", "wiki.json")
WIKI_DIR = os.path.join(PROJECT_DIR, "content", "wiki")


def main():
    if not os.path.exists(WIKI_JSON):
        print(f"FAIL: {WIKI_JSON} not found — run build_wiki.py first")
        sys.exit(1)

    try:
        with open(WIKI_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"FAIL: Invalid JSON — {e}")
        sys.exit(1)

    pages = data.get("pages", [])
    errors = []
    ids_seen = set()

    for i, p in enumerate(pages):
        pid = p.get("id", "")

        # Unique id
        if pid in ids_seen:
            errors.append(f"duplicate id: {pid}")
        ids_seen.add(pid)

        # Required fields
        for field in ["id", "title", "category", "path"]:
            if not p.get(field):
                errors.append(f"page[{i}]: missing '{field}'")

        # Markdown file exists
        path = p.get("path", "")
        if path:
            full = os.path.join(PROJECT_DIR, path)
            if not os.path.exists(full):
                errors.append(f"page[{i}]: .md not found — {path}")

        # Category not empty
        if not p.get("category"):
            errors.append(f"page[{i}]: empty category")

    # Check [[Wiki Links]] resolve
    all_ids = {p["id"] for p in pages if p.get("id")}
    for p in pages:
        for link in p.get("links", []):
            if link not in all_ids:
                # Check if link refers to a page in another category
                # Links are page ids (e.g. "agent-overview")
                found = False
                for pid in all_ids:
                    if pid.endswith("/" + link) or pid == link:
                        found = True
                        break
                if not found:
                    errors.append(f"[{p['id']}]: dead link → [[{link}]]")

    if errors:
        for e in errors:
            print(f"FAIL: {e}")
        print(f"\nErrors: {len(errors)}")
        sys.exit(1)

    print(f"PASS: {len(pages)} pages, all valid")
    print(f"PASS: No duplicate ids")
    print(f"PASS: All .md files exist")
    print(f"PASS: All [[Wiki Links]] resolve")
    print(f"PASS: All categories non-empty")

    sys.exit(0)


if __name__ == "__main__":
    main()
