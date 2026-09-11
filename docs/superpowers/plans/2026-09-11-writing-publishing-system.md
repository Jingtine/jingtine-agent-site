# Writing Publishing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each Markdown file the single source of truth for a broad personal Writing section with covers, search, filters, archives, reading metadata, related articles, and RSS output.

**Architecture:** A Python 3.11 standard-library generator parses TOML front matter, validates local assets, calculates reading metrics, and writes deterministic `public/data/articles.json` plus `feed.xml`. Small browser modules load that generated index and render the Writing list or one trusted repository-local Markdown article.

**Tech Stack:** Python 3.11 `tomllib`, `json`, `xml.etree`/XML escaping; static HTML; vanilla JavaScript; vendored `marked.min.js`; Playwright; Python `unittest`.

**Spec:** `docs/superpowers/specs/2026-09-11-long-term-personal-site-design.md`

## Global Constraints

- Source articles remain `articles/<slug>.md`; TOML front matter is the only metadata source after migration.
- Required fields are `title`, `date`, `kind`, `category`, `summary`, and `draft`; `tags` defaults to an empty array.
- `kind` accepts exactly `essay`, `note`, or `technical` in the first release.
- `cover` and `cover_alt` are optional together; covers must resolve under `assets/images/covers/`.
- Drafts are excluded from generated indexes, RSS, and related articles; drafts in a public repository are not private.
- Existing `article.html?slug=<slug>` URLs remain valid.
- Remote or generated strings render with DOM construction and `textContent`; only repository-local Markdown uses `innerHTML` through the existing trusted-content exception.
- Generator success exits 0 with a concise stdout summary; validation failure exits 1 with file path and field on stderr.

---

## File Map

- Create `scripts/article_content.py`: front matter parser, validation, metrics, and deterministic records.
- Create `scripts/build_articles.py`: CLI orchestration for JSON and RSS outputs.
- Create `tests/test_build_articles.py`: unit coverage for parsing, validation, drafts, metrics, and determinism.
- Create `public/data/articles.json`: generated public article index.
- Create `config/writing.json`: category display names and optional featured article slug.
- Create `content/templates/article-template.md`: copyable authoring template.
- Create `js/article-data.js`: shared index loading, labels, formatting, and filtering.
- Create `js/writing.js`: Writing search, filters, featured card, grid, and archive.
- Create `js/article-page.js`: article detail, front matter stripping, metadata, related articles, and failure state.
- Modify all `articles/*.md`: add TOML front matter without changing body content.
- Modify `scripts/generate_feed.py`: use generated records and `不驚茶坊`/`Jingtine` metadata.
- Modify `scripts/check.py`: validate source/generated parity and new schema.
- Modify `.github/workflows/refresh-feeds.yml`: pin Python 3.11 and build articles before checking.
- Modify `blog.html`, `article.html`, `index.html`, `wiki.html`: load the new modules and generated path.
- Modify `js/home.js`, `js/wiki.js`, `styles.css`: consume new data and render the new layouts.
- Delete `articles/index.json` and `js/blog.js` after all consumers and checks switch.

### Task 1: Define the article parser contract with unit tests

**Files:**
- Create: `tests/test_build_articles.py`
- Create: `scripts/article_content.py`

**Interfaces:**
- Produces: `parse_article(path: Path, project_dir: Path) -> tuple[dict, str]`.
- Produces: `build_public_records(article_dir: Path, project_dir: Path) -> list[dict]`.
- Produces: `reading_metrics(markdown: str) -> tuple[int, int]`, returning `(word_count, reading_minutes)`.

- [ ] **Step 1: Write tests for valid TOML and computed fields**

```python
def test_parse_article_builds_public_record(self):
    path = self.write_article("morning.md", '''+++
title = "清晨"
date = 2026-09-11
kind = "essay"
category = "life"
tags = ["校园"]
summary = "一次散步。"
draft = false
+++
# 清晨\n\n这是正文。''')
    record, body = parse_article(path, self.root)
    self.assertEqual(record["slug"], "morning")
    self.assertEqual(record["date"], "2026-09-11")
    self.assertEqual(record["tags"], ["校园"])
    self.assertGreaterEqual(record["wordCount"], 1)
    self.assertGreaterEqual(record["readingMinutes"], 1)
    self.assertTrue(body.startswith("# 清晨"))
```

- [ ] **Step 2: Write tests for rejected metadata**

Cover missing fields, an unsupported `kind`, a cover outside `assets/images/covers/`, `cover` without `cover_alt`, duplicate slugs, malformed TOML, and a missing closing `+++`. Assert that each `ArticleError` message contains the source path and field name.

- [ ] **Step 3: Write draft and deterministic-order tests**

```python
def test_public_records_exclude_drafts_and_sort_newest_first(self):
    self.write_article("old.md", article_text("Old", "2026-01-01", draft=False))
    self.write_article("new.md", article_text("New", "2026-09-11", draft=False))
    self.write_article("secret.md", article_text("Secret", "2026-09-12", draft=True))
    records = build_public_records(self.articles, self.root)
    self.assertEqual([item["slug"] for item in records], ["new", "old"])
```

- [ ] **Step 4: Run tests and verify failure**

Run: `python -m unittest tests.test_build_articles -v`

Expected: FAIL because `scripts.article_content` does not exist.

- [ ] **Step 5: Implement `ArticleError`, parsing, validation, and metrics**

Use `tomllib.loads()`, require the document to begin with `+++\n`, split once at the next line containing only `+++`, convert `datetime.date` to ISO text, strip Markdown syntax before counting, count contiguous CJK characters plus whitespace-delimited Latin words, and calculate `max(1, ceil(word_count / 300))`.

Return records with this exact key order:

```python
record = {
    "slug": path.stem,
    "title": metadata["title"],
    "date": metadata["date"].isoformat(),
    "kind": metadata["kind"],
    "category": metadata["category"],
    "tags": metadata.get("tags", []),
    "summary": metadata["summary"],
    "cover": metadata.get("cover", ""),
    "coverAlt": metadata.get("cover_alt", ""),
    "wordCount": word_count,
    "readingMinutes": reading_minutes,
}
```

- [ ] **Step 6: Run unit tests**

Run: `python -m unittest tests.test_build_articles -v`

Expected: PASS.

- [ ] **Step 7: Commit the parser**

```powershell
git add scripts/article_content.py tests/test_build_articles.py
git commit -m "feat: parse article front matter"
```

### Task 2: Migrate all article sources and generate deterministic outputs

**Files:**
- Modify: `articles/*.md`
- Create: `scripts/build_articles.py`
- Create: `public/data/articles.json`
- Create: `config/writing.json`
- Modify: `scripts/generate_feed.py`
- Modify: `feed.xml`
- Test: `tests/test_build_articles.py`

**Interfaces:**
- Consumes: `build_public_records()` from Task 1.
- Produces: `write_article_index(records, output_path) -> None`, deterministic `build_rss(records) -> str`, and CLI `main() -> int`.

- [ ] **Step 1: Add CLI output and idempotence tests**

```python
def test_build_outputs_are_stable(self):
    first = run_build(self.root)
    index_first = (self.root / "public/data/articles.json").read_bytes()
    second = run_build(self.root)
    self.assertEqual(first, 0)
    self.assertEqual(second, 0)
    self.assertEqual(index_first, (self.root / "public/data/articles.json").read_bytes())
```

Normalize generated JSON with `ensure_ascii=False`, `indent=2`, and one trailing newline. Derive RSS `lastBuildDate` from the newest public article date so repeated builds from unchanged sources remain byte-identical.

- [ ] **Step 2: Add front matter to every existing Markdown file**

Preserve the body byte-for-byte below the closing delimiter. Map current categories to `technical`; use `essay` for reflective product/digital-garden pieces. Add `tags`, `summary`, and `draft = false`. Leave `cover` absent until a real local image and accurate alt text are available.

Create `config/writing.json` with an empty `featuredSlug`, display labels for the existing categories, and kind labels `随笔`, `短札`, and `技术`. Unknown category slugs fall back to their slug, so publishing a new subject never requires a program change.

```json
{
  "featuredSlug": "",
  "categories": {
    "ai-agent": "AI Agent",
    "software-engineering": "软件工程",
    "product-thinking": "产品思考",
    "life": "日常",
    "reading": "阅读"
  },
  "kinds": { "essay": "随笔", "note": "短札", "technical": "技术" }
}
```

- [ ] **Step 3: Implement the build CLI**

```python
def main() -> int:
    try:
        records = build_public_records(ARTICLES_DIR, PROJECT_DIR)
        write_article_index(records, ARTICLE_INDEX_PATH)
        FEED_PATH.write_text(build_rss(records), encoding="utf-8")
    except (ArticleError, OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Generated {len(records)} articles: {ARTICLE_INDEX_PATH} and {FEED_PATH}")
    return 0
```

- [ ] **Step 4: Make `generate_feed.py` a compatibility entry point**

Import `main` from `build_articles` and exit with its return value. Keep `build_rss(records)` in one module only; avoid a second metadata loader.

- [ ] **Step 5: Run the generator twice and inspect the diff**

Run: `python scripts/build_articles.py`

Run again: `python scripts/build_articles.py`

Expected: both runs exit 0; the second run produces no Git diff. `public/data/articles.json` and `feed.xml` contain nine public articles newest first.

- [ ] **Step 6: Run parser tests**

Run: `python -m unittest tests.test_build_articles -v`

Expected: PASS.

- [ ] **Step 7: Commit source migration and generated outputs**

```powershell
git add articles config/writing.json scripts/article_content.py scripts/build_articles.py scripts/generate_feed.py tests/test_build_articles.py public/data/articles.json feed.xml
git commit -m "feat: generate Writing metadata from Markdown"
```

### Task 3: Switch every browser consumer to the generated article index

**Files:**
- Create: `js/article-data.js`
- Modify: `index.html`
- Modify: `wiki.html`
- Modify: `js/home.js`
- Modify: `js/wiki.js`
- Modify: `tests/e2e/impl.spec.js`

**Interfaces:**
- Produces: `window.ArticleData.load(): Promise<ArticleRecord[]>`.
- Produces: `window.ArticleData.loadConfig(): Promise<{ featuredSlug: string, categories: object, kinds: object }>`.
- Produces: `window.ArticleData.formatDate(date: string): string`.
- Produces: `window.ArticleData.articleHref(slug: string): string`.
- Article record shape exactly matches Task 1.

- [ ] **Step 1: Change the E2E data path assertion**

```js
const response = await page.request.get('/public/data/articles.json');
expect(response.status()).toBe(200);
const articles = await response.json();
```

Keep `/articles/index.json` as a temporary compatibility file until Task 6 updates the Python quality gate.

- [ ] **Step 2: Implement the shared read-only loader**

```js
(function () {
  'use strict';
  var cache;
  function load() {
    if (cache) return cache;
    cache = fetch('public/data/articles.json').then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (items) {
      if (!Array.isArray(items)) throw new Error('Invalid article index');
      return items.slice();
    });
    return cache;
  }
  function articleHref(slug) { return 'article.html?slug=' + encodeURIComponent(slug); }
  function loadConfig() {
    return fetch('config/writing.json').then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }
  window.ArticleData = { load: load, loadConfig: loadConfig, articleHref: articleHref, formatDate: formatDate };
})();
```

Implement `formatDate` without inserting HTML and return `YYYY-MM-DD` for valid ISO dates.

- [ ] **Step 3: Update Home and Wiki consumers**

Load `js/article-data.js` before `js/home.js` and `js/wiki.js`. Replace direct `fetch('articles/index.json')` calls with `ArticleData.load()`. Preserve Home retry and Wiki related-article behavior.

- [ ] **Step 4: Confirm production consumers no longer read the old index**

Run `rg -n "articles/index.json" *.html js` and expect no matches. Keep the compatibility file until Task 6 so every intermediate commit still passes `scripts/check.py`.

- [ ] **Step 5: Run focused E2E tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/impl.spec.js -g "文章数量|首页|Wiki"`

Expected: PASS with nine cards/data records and working Wiki article links.

- [ ] **Step 6: Commit the consumer switch**

```powershell
git add js/article-data.js js/home.js js/wiki.js index.html wiki.html tests/e2e/impl.spec.js
git commit -m "refactor: use generated article index"
```

### Task 4: Build the Writing list, search, filters, and archive

**Files:**
- Create: `js/writing.js`
- Modify: `blog.html`
- Modify: `styles.css`
- Test: `tests/e2e/writing.spec.js`

**Interfaces:**
- Consumes: `window.ArticleData.load()`, `window.ArticleData.loadConfig()`, and article records.
- Produces: `renderWriting(items)`, `applyWritingFilters(items, state)`, and DOM selectors `#writing-search`, `#writing-kind`, `#writing-category`, `#writing-results`, `#writing-archive`.

- [ ] **Step 1: Write failing interaction tests**

```js
test('Writing searches title, summary, and tags', async ({ page }) => {
  await page.goto('/blog.html');
  await page.locator('#writing-search').fill('digital garden');
  await expect(page.locator('#writing-results .writing-card')).toHaveCount(1);
  await expect(page.locator('#writing-results')).toContainText('Building My Digital Garden');
});

test('Writing exposes kind, category, and archive metadata', async ({ page }) => {
  await page.goto('/blog.html');
  await expect(page.locator('.writing-feature')).toBeVisible();
  await page.locator('#writing-kind').selectOption('technical');
  await expect(page.locator('#writing-results .writing-card')).not.toHaveCount(0);
  await expect(page.locator('#writing-archive')).toContainText('2026');
});
```

- [ ] **Step 2: Replace the Blog header and list markup**

Use title `随笔 / Writing`, a broad description, RSS link, labeled search input, kind/category selects, live result count, featured article container, results grid, and year/month archive. Populate labels from `config/writing.json`, falling back to raw slugs. Remove inline styles.

- [ ] **Step 3: Implement filtering as pure data operations**

```js
function applyWritingFilters(items, state) {
  var query = state.query.trim().toLocaleLowerCase('zh-CN');
  return items.filter(function (item) {
    var haystack = [item.title, item.summary].concat(item.tags || []).join(' ').toLocaleLowerCase('zh-CN');
    return (!query || haystack.indexOf(query) !== -1) &&
      (!state.kind || item.kind === state.kind) &&
      (!state.category || item.category === state.category);
  });
}
```

- [ ] **Step 4: Render all untrusted record strings through DOM APIs**

Build `img`, `time`, headings, tags, and links with `createElement`, `textContent`, and `setAttribute`. Accept cover paths only when they start with `assets/images/covers/`; render a CSS category cover otherwise.

- [ ] **Step 5: Render an archive grouped by ISO year and month**

Create real anchor links to `article.html?slug=…`; use `<time datetime="YYYY-MM-DD">`. The archive remains visible and filterable without creating a second data fetch.

- [ ] **Step 6: Run Writing tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/writing.spec.js`

Expected: PASS for search, filters, empty state, cover fallback, archive links, and keyboard focus.

- [ ] **Step 7: Commit the Writing list**

```powershell
git add blog.html js/writing.js styles.css tests/e2e/writing.spec.js
git commit -m "feat: add searchable Writing archive"
```

### Task 5: Build article metadata, front matter stripping, and related articles

**Files:**
- Create: `js/article-page.js`
- Modify: `article.html`
- Modify: `styles.css`
- Modify: `tests/e2e/writing.spec.js`
- Delete: `js/blog.js`

**Interfaces:**
- Consumes: `window.ArticleData` including `loadConfig()`, `marked.parse`, and `prepareReading(body)`.
- Produces: `stripFrontMatter(markdown: string) -> string`, `selectRelated(current, items, limit) -> ArticleRecord[]`, and `loadArticleDetail() -> Promise<void>`.
- Emits: `document` event `article:ready` with `{ slug, title }` for the later comments module.

- [ ] **Step 1: Add article detail tests**

```js
test('article renders metadata without exposing front matter', async ({ page }) => {
  await page.goto('/article.html?slug=hello-world');
  await expect(page.locator('#article-title')).toHaveText('Hello World');
  await expect(page.locator('#article-meta')).toContainText('分钟');
  await expect(page.locator('#article-body')).not.toContainText('draft = false');
  await expect(page.locator('#related-articles a')).not.toHaveCount(0);
});
```

Add missing-slug, unknown-slug, Markdown-fetch failure, optional-cover, and zero-related-results cases.

- [ ] **Step 2: Expand semantic article markup**

Add optional `#article-cover`, summary, `<time>`, kind/category/tags, word count, reading minutes, trusted body, related section, comments mount, and back link. Keep the article body unframed with a 920px maximum width.

- [ ] **Step 3: Strip front matter before Markdown parsing**

```js
function stripFrontMatter(markdown) {
  if (!markdown.startsWith('+++\n')) throw new Error('Missing article front matter');
  var end = markdown.indexOf('\n+++\n', 4);
  if (end === -1) throw new Error('Unclosed article front matter');
  return markdown.slice(end + 5);
}
```

- [ ] **Step 4: Select related articles deterministically**

Score other articles by `2 × shared tag count + 1 when category matches`; sort by score descending, then date descending, then slug ascending; return the first three with positive scores.

- [ ] **Step 5: Preserve trusted Markdown and Wiki link behavior**

Assign only `marked.parse(stripFrontMatter(markdown))` to `article-body.innerHTML`. Then call `prepareReading(body)` and `renderWikiLinks(body, pages)`. All metadata and related cards use DOM APIs.

- [ ] **Step 6: Emit the comments integration event**

```js
document.dispatchEvent(new CustomEvent('article:ready', {
  detail: { slug: record.slug, title: record.title }
}));
```

- [ ] **Step 7: Run article tests and existing Wiki-link tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/writing.spec.js tests/e2e/impl.spec.js -g "article|文章|Wiki Link"`

Expected: PASS.

- [ ] **Step 8: Remove the obsolete combined module and commit**

```powershell
git add article.html js/article-page.js styles.css tests/e2e/writing.spec.js
git rm js/blog.js
git commit -m "feat: enrich article reading pages"
```

### Task 6: Update validation, automation, and author documentation

**Files:**
- Modify: `scripts/check.py`
- Modify: `.github/workflows/refresh-feeds.yml`
- Create: `content/templates/article-template.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `tests/e2e/impl.spec.js`
- Delete: `articles/index.json`

**Interfaces:**
- Consumes: source and generated schema from Tasks 1–5.
- Produces: `check_article_sources() -> bool` and a nightly deterministic build.

- [ ] **Step 1: Replace manual-index checks with source/generated parity checks**

Have `check_article_sources()` call `build_public_records()` and compare the result to parsed `public/data/articles.json`. Validate exact field names, descending order, local covers, unique slugs, existing Markdown files, `config/writing.json`, Wiki references after front matter removal, and `feed.xml` item count.

Delete `articles/index.json`, change the E2E request to expect 404 for that path, and run `rg -n "articles/index.json" . --glob '!docs/**'` to confirm no production or validation consumer remains.

- [ ] **Step 2: Pin the workflow and build before quality checks**

```yaml
- name: Setup Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'
- name: Build Writing index and feed
  run: python scripts/build_articles.py
```

Add `public/data/articles.json` and `feed.xml` to the auto-commit file pattern.

- [ ] **Step 3: Add a complete authoring template**

Create `content/templates/article-template.md` with all required fields, commented guidance outside the TOML block, an example optional cover pair, and headings for body content. State clearly that `draft` is publication control rather than secrecy.

- [ ] **Step 4: Document the author workflow**

In README, document: copy template, choose a unique slug, write Markdown, add local cover if desired, run `python scripts/build_articles.py`, run `python scripts/check.py`, preview, and commit source plus generated outputs.

- [ ] **Step 5: Update AGENTS source/generated conventions**

Declare `articles/*.md` as the source, `public/data/articles.json` and `feed.xml` as generated, Python 3.11 as the minimum, and forbid hand-editing the generated article index.

- [ ] **Step 6: Run all verification**

Run: `python -m unittest discover -s tests -p "test_*.py" -v`

Run: `python scripts/build_articles.py`

Run: `python scripts/check.py`

Run: `npx playwright test --config tests/playwright.config.js`

Expected: every command exits 0; a second generator run leaves no diff; all old article URLs still open.

- [ ] **Step 7: Commit the completed publishing system**

```powershell
git add scripts/check.py .github/workflows/refresh-feeds.yml content/templates/article-template.md README.md AGENTS.md tests/e2e/impl.spec.js public/data/articles.json feed.xml
git rm articles/index.json
git commit -m "docs: add long-term Writing workflow"
```
