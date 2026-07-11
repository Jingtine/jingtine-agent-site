# Research Paper Collector

Collect recent research papers from arXiv for specified topics.

## Workflow

1. Read topics from `references/topics.md`
2. Query arXiv API for each topic
3. Deduplicate by arXiv ID
4. Sort by published date descending
5. Save to `public/data/papers.json`

## Usage

```bash
python scripts/collect_papers.py
```

## Validate

```bash
python scripts/check_papers.py
```

## Parameters

- `--limit N`: Max results per topic (default: 10)
- `--query`: Override search term (default: reads topics.md)

## Output Schema

```json
{
  "fetched": "2026-01-01T00:00:00+08:00",
  "total": 25,
  "papers": [
    {
      "id": "2501.12345v1",
      "title": "Paper Title",
      "authors": ["Author One", "Author Two"],
      "published": "2026-01-15",
      "summary": "Abstract text...",
      "url": "https://arxiv.org/abs/2501.12345",
      "source": "arXiv"
    }
  ]
}
```

## Constraints

- Python 3 stdlib only. No pip packages.
- arXiv API over HTTPS only.
- Network failure preserves existing data.
- Papers are preprints — not described as peer-reviewed.
