"""build_wiki.py — Scan content/wiki/ and generate public/data/wiki.json.

Usage:  python scripts/build_wiki.py
Output: public/data/wiki.json

Extracts front matter, titles, tags, [[Wiki Links]] from Markdown files.
Zero dependencies — Python stdlib only.
"""
import json
import os
import re
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
WIKI_DIR = os.path.join(PROJECT_DIR, "content", "wiki")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "wiki.json")

WIKI_LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


def parse_front_matter(text):
    """Extract key:value from YAML-like front matter between --- markers."""
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).strip().split("\n"):
        line = line.strip()
        if ":" in line:
            key, _, val = line.partition(":")
            key = key.strip().lower()
            val = val.strip()
            if key == "tags":
                fm[key] = [t.strip() for t in val.split(",") if t.strip()]
            else:
                fm[key] = val
    return fm


def extract_heading(text):
    """Extract the first # heading from Markdown text."""
    m = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    return m.group(1).strip() if m else ""


def extract_wiki_links(text):
    """Find all [[page-name]] style links."""
    return WIKI_LINK_RE.findall(text)


def build():
    pages = []
    errors = []

    for root, dirs, files in os.walk(WIKI_DIR):
        for fname in sorted(files):
            if not fname.endswith(".md"):
                continue
            full_path = os.path.join(root, fname)
            rel_dir = os.path.relpath(root, WIKI_DIR)
            slug = os.path.splitext(fname)[0]
            page_id = os.path.join(rel_dir, slug).replace("\\", "/")
            if page_id.startswith("./"):
                page_id = page_id[2:]

            with open(full_path, "r", encoding="utf-8") as f:
                text = f.read()

            fm = parse_front_matter(text)
            title = fm.get("title") or extract_heading(text) or slug
            category = fm.get("category", rel_dir)
            tags = fm.get("tags", [])
            updated = fm.get("updated", "")
            summary = fm.get("summary", "")

            links = extract_wiki_links(text)
            # Normalize links to page ids
            normalized_links = [l.lower().replace(" ", "-").strip() for l in links]

            pages.append({
                "id": page_id,
                "title": title,
                "category": category,
                "tags": tags,
                "updated": updated,
                "summary": summary,
                "links": normalized_links,
                "path": os.path.relpath(full_path, PROJECT_DIR).replace("\\", "/"),
            })

    # Sort by updated descending
    pages.sort(key=lambda p: p.get("updated", ""), reverse=True)

    output = {
        "generated": datetime.now().isoformat(),
        "total": len(pages),
        "pages": pages,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Built wiki.json: {len(pages)} pages")
    if errors:
        for e in errors:
            print(f"  WARNING: {e}", file=sys.stderr)


if __name__ == "__main__":
    build()
