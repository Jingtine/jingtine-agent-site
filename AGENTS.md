# AGENTS.md — Project Constraints for Jingtine Agent Site

## Project Overview

Personal portfolio and technology platform for Jingtine (NJU Software Engineering student).
Static site deployed on GitHub Pages.

## Tech Stack Constraints

- **Frontend**: Pure HTML + CSS + vanilla JS. No React, Vue, Astro, or any framework.
- **Backend scripts**: Python 3, standard library only. No third-party pip packages.
- **Build tools**: None. No npm, no bundlers, no transpilers.
- **Deployment**: GitHub Pages, static files only.

## Directory Structure

```
my-agent-site/
├── *.html              # Pages (index, about, projects, blog, etc.)
├── styles.css          # Global stylesheet (shared by all pages)
├── articles/           # Markdown blog articles + index.json metadata
├── js/                 # Client-side JS (blog.js, reader.js, marked.min.js)
├── config/             # Data source configuration (feeds.json, allowlist.json)
├── public/data/        # Generated data output (rss-items.json)
├── scripts/            # Build and check scripts (Python, stdlib only)
├── assets/images/      # Static image assets
├── feed.xml            # RSS feed for own blog (generated)
└── subscriptions.opml  # OPML export of public feed subscriptions
```

## Security Rules

1. **External RSS data is untrusted.** All titles, descriptions, and source names
   from aggregated feeds must be rendered with `textContent` — never `innerHTML`.
2. **External links** must use `https://` only and include `rel="noopener noreferrer"`.
3. **No inline event handlers** (onclick, onload, etc.) in HTML.

## GitHub Pages

- Base path: `/jingtine-agent-site/`
- All absolute links in HTML must be prefixed with this base path.
- `feed.xml` and `subscriptions.opml` are served from the project root.

## Script Conventions

- Scripts live in `scripts/`.
- All scripts use Python 3 standard library only — zero dependencies.
- Exit code 0 = success, 1 = failure.
- Scripts print a summary to stdout; errors go to stderr.

## Config Conventions

- `config/feeds.json` — feed source definitions (id, name, url, category, enabled, public)
- `config/allowlist.json` — approved feed IDs for aggregation
- Only feeds with `enabled=true` and `public=true` appear in `subscriptions.opml`.

## CSS Conventions

- All colors, shadows, radii, and fonts defined as CSS custom properties in `:root`.
- No reader-specific or page-specific visual components — reuse shared classes
  (`article-card`, `blog-tag`, `btn`, etc.) across all pages.
- Design language: light purple + light blue + white, Apple/Linear/Notion style.

## Quality Checks

- Run `python scripts/check.py` before every commit.
- Checks: HTML page existence, internal link validity, feed.xml parsing,
  item count consistency, rss-items.json validity, RSS field completeness,
  OPML parsing.
- Exit code 0 required for merge.
