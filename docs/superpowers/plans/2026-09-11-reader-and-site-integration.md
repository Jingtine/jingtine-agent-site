# Reader and Site Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the RSS Reader into the same publication language, align every remaining page and document, and finish with full responsive, accessibility, data, and deployment verification.

**Architecture:** Preserve the nightly feed aggregation and untrusted-data boundary. Reader rendering stays in a standalone browser module that consumes generated JSON through DOM APIs; final integration consolidates shared CSS tokens and checks all static routes without adding a production build step.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, Python 3.11 standard-library scripts, GitHub Actions, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-11-long-term-personal-site-design.md`

## Global Constraints

- `reader.html` consumes `public/data/rss-items.json`; source configuration remains `config/feeds.json` and `config/allowlist.json`.
- RSS strings are untrusted and render only with `textContent`, DOM construction, and validated HTTPS `href` assignment.
- Friends remain separate from subscriptions; no automatic feed discovery or import is added.
- Source search, keyboard activation, return focus, retry, OPML export, and external-link security remain available.
- Shared design tokens stay in `:root`; page-only rules are added only when shared components cannot express the layout.
- The final site fits at 360, 390, 768, 1024, and 1440 pixels and respects `prefers-reduced-motion`.
- Footer copyright and content attribution remain `Jingtine`.

---

## File Map

- Modify `reader.html`: semantic publication header, source tools, states, and article view without inline styles.
- Modify `js/reader.js`: normalized source model, date formatting, safe URLs, retry, and focus-preserving view state.
- Modify `styles.css`: Reader components and final shared-token cleanup.
- Create `tests/e2e/reader-publication.spec.js`: metadata, filtering, keyboard, security, failures, and responsive behavior.
- Modify remaining root HTML pages: consistent titles, descriptions, Chinese headings, navigation, and script versions.
- Modify `README.md`, `AGENTS.md`: long-term purpose, content workflow, generated data, community setup, and Python 3.11 floor.
- Modify `scripts/generate_status.py`, `scripts/check.py`: final article path/count and required-page integration.
- Modify `.github/workflows/refresh-feeds.yml`: deterministic output list and command order.
- Modify all existing E2E suites: final route list, labels, counts, and selectors.

### Task 1: Define the Reader publication contract

**Files:**
- Create: `tests/e2e/reader-publication.spec.js`
- Modify: `tests/e2e/redesign.spec.js`
- Modify: `tests/e2e/requirements.spec.js`

**Interfaces:**
- Consumes: `public/data/rss-items.json` with top-level `generated`, `total`, and `items`, plus source descriptions from `config/feeds.json`.
- Produces: selectors `#reader-source-view`, `#reader-article-view`, `.reader-source-card`, `.reader-entry`, `#source-search`, `#source-feedback`, `#source-clear`.

- [ ] **Step 1: Add source metadata and filtering tests**

```js
test('Reader presents publication-style source metadata', async ({ page }) => {
  await page.goto('/reader.html');
  await expect(page.locator('h1')).toHaveText('订阅阅读');
  await expect(page.locator('.reader-source-card').first()).toBeVisible();
  await expect(page.locator('.reader-source-card').first()).toContainText(/篇文章/);
  await expect(page.locator('#reader-updated')).not.toBeEmpty();
});

test('Reader search reports and clears an empty result', async ({ page }) => {
  await page.goto('/reader.html');
  await page.locator('#source-search').fill('no-source-can-match-this');
  await expect(page.locator('#source-feedback')).toHaveText('没有匹配的来源。');
  await page.locator('#source-clear').click();
  await expect(page.locator('.reader-source-card').first()).toBeVisible();
});
```

- [ ] **Step 2: Add keyboard and return-focus tests**

Focus the first source card, press Enter, assert the article view appears and `#reader-back` receives focus. Activate the return button, assert the source view appears and the originating card regains focus.

- [ ] **Step 3: Add external-link and failure tests**

Assert every `.reader-entry a[target="_blank"]` has an HTTPS URL and `rel="noopener noreferrer"`. Abort the JSON request and assert `订阅数据加载失败。` plus a real `重试` button. Fulfill with `{ "generated": "", "total": 0, "items": [] }` and assert `暂无订阅文章`.

- [ ] **Step 4: Run the suite and verify failure**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/reader-publication.spec.js`

Expected: FAIL because the new selectors and Chinese heading do not exist.

- [ ] **Step 5: Commit the failing Reader contract**

```powershell
git add tests/e2e/reader-publication.spec.js tests/e2e/redesign.spec.js tests/e2e/requirements.spec.js
git commit -m "test: define Reader publication behavior"
```

### Task 2: Refactor Reader markup and view state

**Files:**
- Modify: `reader.html`
- Modify: `js/reader.js`
- Modify: `styles.css`
- Test: `tests/e2e/reader-publication.spec.js`

**Interfaces:**
- Produces: `normalizeItems(data) -> Array<Source>`, where `Source = { id, name, category, description, items, latestDate }`.
- Produces: `showSourceList(restoreFocus)`, `showArticleList(source, trigger)`, and `renderSourceList(sources)`.

- [ ] **Step 1: Replace inline styles with semantic Reader classes**

Use a page header titled `订阅阅读`, a broad description, an always-visible `subscriptions.opml` link, compact statistics, labeled search, source grid, hidden article view, and real button `#reader-back`.

- [ ] **Step 2: Normalize flat items into stable sources**

```js
function normalizeItems(data) {
  var grouped = new Map();
  (Array.isArray(data.items) ? data.items : []).forEach(function (item) {
    var id = String(item.source && item.source.id || '');
    if (!grouped.has(id)) grouped.set(id, {
      id: id, name: item.source && item.source.name || id, category: item.category || '',
      description: '', items: []
    });
    grouped.get(id).items.push(item);
  });
  return Array.from(grouped.values()).map(function (source) {
    source.items.sort(function (a, b) { return String(b.pubDate).localeCompare(String(a.pubDate)); });
    source.latestDate = source.items[0] ? source.items[0].pubDate : '';
    return source;
  }).sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });
}
```

Build a description map from `config/feeds.json` by stable feed ID and assign it after grouping. Preserve the existing generated schema: each item has `source: { id, name }`, and the top-level timestamp key is `generated`.

- [ ] **Step 3: Preserve origin focus between views**

Store the activated card in `lastSourceTrigger`. When returning, show the list, hide the article view, and call `lastSourceTrigger.focus()`.

- [ ] **Step 4: Render all source and article data safely**

Use `textContent` for names, descriptions, dates, titles, and excerpts. Before assigning an article URL, parse it and require `protocol === 'https:'`; render plain text when invalid.

- [ ] **Step 5: Use concise Chinese interface labels**

Use `最近更新`, `篇文章`, `约 N 分钟`, `阅读原文`, `全部来源`, `暂无订阅文章`, and `订阅数据加载失败。`. Preserve proper names in their original language.

- [ ] **Step 6: Run focused Reader tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/reader-publication.spec.js`

Expected: PASS.

- [ ] **Step 7: Commit the Reader refactor**

```powershell
git add reader.html js/reader.js styles.css tests/e2e/reader-publication.spec.js
git commit -m "feat: refine subscription Reader"
```

### Task 3: Give Reader a lighter publication layout

**Files:**
- Modify: `styles.css`
- Test: `tests/e2e/reader-publication.spec.js`

**Interfaces:**
- Consumes: semantic classes from Task 2.
- Produces: responsive `.reader-toolbar`, `.reader-source-grid`, `.reader-source-card`, `.reader-entry-list`, `.reader-entry` styles.

- [ ] **Step 1: Add computed-style and overflow assertions**

At 1440px, assert the source grid has at least two columns. At 360px, assert one column, no transform on source cards, and `scrollWidth <= clientWidth + 1`. Under reduced motion, assert view changes have no non-zero transition duration.

- [ ] **Step 2: Implement loose index-card styling**

```css
.reader-source-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:clamp(18px,3vw,34px); }
.reader-source-card { border-top:1px solid var(--line); padding:22px 4px 18px; background:transparent; text-align:left; }
.reader-source-card:nth-child(even) { background:color-mix(in srgb,var(--blue-paper) 55%,transparent); padding-inline:18px; }
.reader-entry { display:grid; grid-template-columns:minmax(110px,.28fr) minmax(0,1fr); gap:24px; border-top:1px solid var(--line); padding:24px 0; }
```

- [ ] **Step 3: Add mobile rules**

```css
@media (max-width:767px) {
  .reader-source-grid { grid-template-columns:1fr; }
  .reader-source-card:nth-child(even) { padding-inline:12px; }
  .reader-entry { grid-template-columns:1fr; gap:8px; }
}
```

- [ ] **Step 4: Run layout tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/reader-publication.spec.js -g "layout|overflow|motion"`

Expected: PASS at every required width.

- [ ] **Step 5: Commit Reader styling**

```powershell
git add styles.css tests/e2e/reader-publication.spec.js
git commit -m "style: lighten Reader layout"
```

### Task 4: Align remaining pages and metadata with the long-term identity

**Files:**
- Modify: `projects.html`
- Modify: `papers.html`
- Modify: `wiki.html`
- Modify: `assistant.html`
- Modify: `knowledge.html`
- Modify: `library.html`
- Modify: `contact.html`
- Modify: `links.html`
- Modify: `guestbook.html`
- Modify: `tests/e2e/site-shell.spec.js`
- Modify: `tests/e2e/impl.spec.js`

**Interfaces:**
- Consumes: shared shell and CSS from prior plans.
- Produces: unique page title/description, one `h1`, correct active link, and consistent footer on each route.

- [ ] **Step 1: Add a page metadata matrix test**

```js
const pages = [
  ['/projects.html', '作品'], ['/papers.html', '研究'],
  ['/wiki.html', '知识库'], ['/assistant.html', '问答助手'],
  ['/reader.html', '订阅阅读'], ['/links.html', '友邻'],
  ['/guestbook.html', '来客簿']
];
for (const [path, label] of pages) {
  test(`${label} page has current identity`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(new RegExp(`${label}.*不驚茶坊`));
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.nav-links a[aria-current="page"]')).toHaveText(label);
  });
}
```

- [ ] **Step 2: Update titles and descriptions**

Use `<title>页面名 — 不驚茶坊</title>`. Describe content broadly enough for a long-term site; remove claims that all writing, research, or interests are AI-only.

- [ ] **Step 3: Translate framework copy**

Translate page labels, loading text, empty states, return links, and buttons. Preserve technology names, paper titles, repository names, and external source names.

- [ ] **Step 4: Remove inline layout styles touched by this project**

Move layout declarations from HTML into named shared or page classes. Leave unrelated trusted Markdown rendering alone.

- [ ] **Step 5: Run metadata and route tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/site-shell.spec.js tests/e2e/impl.spec.js -g "identity|所有页面|导航"`

Expected: PASS.

- [ ] **Step 6: Commit page alignment**

```powershell
git add *.html styles.css tests/e2e/site-shell.spec.js tests/e2e/impl.spec.js
git commit -m "feat: align site pages with 不驚茶坊"
```

### Task 5: Consolidate documentation, status counts, and automation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `scripts/generate_status.py`
- Modify: `scripts/check.py`
- Modify: `.github/workflows/refresh-feeds.yml`
- Modify: `public/data/status.json`

**Interfaces:**
- Consumes: `public/data/articles.json`, links/comments/site configs, and the final route list.
- Produces: accurate status counts and an explicit maintenance guide.

- [ ] **Step 1: Update Status article counting**

Read `public/data/articles.json`, count its top-level array, and preserve the existing `blogArticles` output key so `js/status.js` remains compatible.

- [ ] **Step 2: Rewrite README around the owner workflow**

Lead with `不驚茶坊` and describe it as the long-term personal site of `不驚醴 / Jingtine`. Document Writing, Wiki, Research, Reader, Friends, Guestbook, background configuration, article generation, checks, and GitHub Pages deployment.

- [ ] **Step 3: Update AGENTS source/generated boundaries**

Record `config/site.json`, `config/links.json`, and `config/comments.json` as owner-maintained sources; `public/data/articles.json` as generated; Python 3.11 as the script floor; `links.html` and `guestbook.html` as required pages; Giscus as the one fixed external comment client.

- [ ] **Step 4: Verify workflow command order**

The nightly job order is: checkout, Python 3.11, build articles/feed, aggregate feeds, collect papers, collect GitHub activity, run quality checks, regenerate status, and auto-commit deterministic generated files.

- [ ] **Step 5: Regenerate and verify Status**

Run: `python scripts/build_articles.py`

Run: `python scripts/generate_status.py`

Run: `python scripts/check.py`

Expected: exit 0; status article count equals the length of `public/data/articles.json`.

- [ ] **Step 6: Commit integration documentation and data**

```powershell
git add README.md AGENTS.md scripts/generate_status.py scripts/check.py .github/workflows/refresh-feeds.yml public/data/status.json
git commit -m "docs: document long-term site maintenance"
```

### Task 6: Complete full regression and visual verification

**Files:**
- Modify: E2E tests only when an assertion conflicts with the approved spec.

**Interfaces:**
- Consumes: every output from all four implementation plans.
- Produces: release-ready branch state.

- [ ] **Step 1: Scan for stale names and deleted paths**

Run: `rg -n "articles/index.json|>Home<|>About<|>Projects<|>Blog<|JINGTINE / PERSONAL ARCHIVE" --glob '!docs/**' .`

Expected: no production matches.

- [ ] **Step 2: Check generated output stability**

Run: `python scripts/build_articles.py`

Run: `git diff --exit-code -- public/data/articles.json feed.xml`

Expected: exit 0 with no diff.

- [ ] **Step 3: Run every Python test**

Run: `python -m unittest discover -s tests -p "test_*.py" -v`

Expected: PASS.

- [ ] **Step 4: Run the repository quality gate**

Run: `python scripts/check.py`

Expected: exit 0 and every named check passes.

- [ ] **Step 5: Run the complete Playwright suite once**

Run: `npx playwright test --config tests/playwright.config.js`

Expected: PASS with no unexpected console errors.

- [ ] **Step 6: Perform desktop and mobile visual review**

Inspect Home, About, Writing, one article with a cover fixture, one coverless article, Reader source/list views, Friends empty/populated fixtures, Guestbook fallback, and Status at 360, 390, 768, 1024, and 1440px. Verify no horizontal overflow, no clipped focus ring, readable text over the configured background, and no long sequence of heavy outlined cards.

- [ ] **Step 7: Verify no-JavaScript behavior**

At 390px with JavaScript disabled, verify ten navigation links, RSS link, footer attribution, and page explanations. Article/config-dependent areas may show their static loading or fallback explanation.

- [ ] **Step 8: Review and commit test-only corrections**

Run: `git diff --check`

Run: `git status --short`

Expected: only intentional files are present and no whitespace errors remain.

```powershell
git add tests/e2e
git commit -m "test: verify long-term site upgrade"
```
