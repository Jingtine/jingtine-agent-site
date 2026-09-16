# Links Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, repository-configured “茶友与去处” page and expose it through the existing Chinese navigation.

**Architecture:** Human-maintained entries live in `config/links.json`. `js/links.js` validates the loaded structure and constructs an editorial directory using DOM APIs; Python checks enforce the same source contract before deployment.

**Tech Stack:** Static HTML, shared CSS, vanilla JavaScript, Python 3.11 standard library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-14-links-and-guestbook-design.md`

## Global Constraints

- Production remains static HTML, CSS, and vanilla JavaScript with no build step, framework, server, or database.
- Configuration strings are untrusted and are rendered only through DOM construction and `textContent`.
- External links must use HTTPS and `rel="noopener noreferrer"`.
- Local avatar paths must resolve below `assets/images/`; remote avatars and escaping paths are rejected.
- Python scripts require Python 3.11+ and the standard library only.
- Existing article, Wiki, Reader, Status, custom-background, and mobile navigation behavior must remain intact.

---

### Task 1: Define and validate the links source

**Files:**
- Create: `config/links.json`
- Create: `tests/test_check_links.py`
- Modify: `scripts/check.py`

**Interfaces:**
- Consumes: repository root and the existing `CheckResult` shape in `scripts/check.py`.
- Produces: `check_links_config() -> CheckResult` and the JSON contract `{ "groups": LinkGroup[] }`, where `LinkGroup` has `id`, `name`, and `links`.

- [ ] **Step 1: Write failing configuration tests**

Create temporary roots in `tests/test_check_links.py`, patch `scripts.check.PROJECT_DIR` in `setUp`, restore it with cleanup, and cover valid data, duplicate group IDs, empty text, HTTP/`javascript:` URLs, escaping/remote avatars, missing avatar files, invalid tags, and non-object JSON.

```python
def test_rejects_http_url(self):
    self.write_links({"groups": [{"id": "places", "name": "常去看看", "links": [{
        "name": "Example", "url": "http://example.com", "description": "个人站点。"
    }]}]})
    self.assertFalse(check.check_links_config().passed)

def test_rejects_escaping_avatar(self):
    self.write_links({"groups": [{"id": "places", "name": "常去看看", "links": [{
        "name": "Example", "url": "https://example.com", "description": "个人站点。",
        "avatar": "assets/images/../../config/links.json"
    }]}]})
    self.assertFalse(check.check_links_config().passed)
```

- [ ] **Step 2: Run the test and verify RED**

Run `python -m unittest tests.test_check_links -v`.

Expected: `AttributeError` because `check_links_config` does not exist.

- [ ] **Step 3: Add the initial source configuration**

Create `config/links.json` with an empty groups array. The example sites supplied earlier were visual references, so do not publish them as personal recommendations without a separate owner choice:

```json
{
  "groups": []
}
```

- [ ] **Step 4: Implement `check_links_config`**

Require a top-level object and a `groups` array; an empty array is valid and drives the intentional empty state. For populated data, require unique IDs matching `[a-z0-9-]+`, nonempty names, and link objects with nonempty `name`, `description`, and HTTPS `url`. Accept optional `tags` only as nonempty strings. Accept optional avatars only when canonical POSIX paths start with `assets/images/`, contain no query, fragment, backslash, empty segment, `.` or `..`, and resolve to an existing file below that directory.

Add the result to `main()` immediately after site configuration validation so failures contribute to the numbered quality gate.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
python -m unittest tests.test_check_links -v
python scripts/check.py
```

Expected: all new cases pass and the checker gains one passing row.

Commit:

```powershell
git add config/links.json scripts/check.py tests/test_check_links.py
git commit -m "feat: define links directory data"
```

---

### Task 2: Render the editorial links page

**Files:**
- Create: `links.html`
- Create: `js/links.js`
- Create: `tests/e2e/links.spec.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `config/links.json` from Task 1.
- Produces: `window.LinksPage.load() -> Promise<void>`, `window.LinksPage.isSafeExternalUrl(value) -> boolean`, `window.LinksPage.normalizeAvatarPath(value) -> string|null`, and `#links-groups`.

- [ ] **Step 1: Write failing page tests**

Create `tests/e2e/links.spec.js`. Route `config/links.json` with deterministic fixtures. Assert grouped rendering, safe link attributes, local avatar behavior, initial fallback, and status text.

```javascript
test('renders safe grouped links as text', async ({ page }) => {
  await page.route('**/config/links.json', route => route.fulfill({ json: fixture }));
  await page.goto('/links.html');
  await expect(page.locator('.links-group')).toHaveCount(2);
  await expect(page.locator('.link-entry a').first()).toHaveAttribute('target', '_blank');
  await expect(page.locator('.link-entry a').first()).toHaveAttribute('rel', 'noopener noreferrer');
});
```

Add separate tests for empty groups, fetch failure plus retry, `<img onerror>` text, rejected HTTP/`javascript:` links, `../` avatars, image-load fallback, keyboard access, no JavaScript content, and 375px overflow.

- [ ] **Step 2: Run tests and verify RED**

Run `npx playwright test tests/e2e/links.spec.js --config tests/playwright.config.js`.

Expected: `/links.html` returns 404 or required hooks are missing.

- [ ] **Step 3: Create the page shell**

Create `links.html` from an existing root-page shell. Include skip link, sidebar, `main`, footer, `site-theme.js`, `nav.js`, and `links.js`. The main area contains:

```html
<header class="page-header links-intro">
  <div class="section-label">Links</div>
  <h1>茶友与去处</h1>
  <p>一些常去的站点，也留一张继续认识彼此的地图。</p>
</header>
<section class="section links-directory" aria-labelledby="links-heading">
  <h2 id="links-heading" class="sr-only">链接目录</h2>
  <div id="links-status" role="status" aria-live="polite">正在取出茶单……</div>
  <div id="links-groups"></div>
</section>
<noscript><p class="empty-state">链接目录需要 JavaScript 读取，页面导航仍然可用。</p></noscript>
```

- [ ] **Step 4: Implement safe rendering**

In `js/links.js`, fetch `config/links.json` with `{ cache: 'no-store' }`; validate every collection defensively; render only accepted entries with `document.createElement`, `textContent`, and explicit attributes. Clear stale output before each load. On failure, create a `<button type="button">重试</button>` and wire it with `addEventListener`.

Use a text initial when no avatar exists. If a local avatar fires `error`, replace it with the same text initial without moving focus. Export the three interfaces on `window.LinksPage` and call `load()` on `DOMContentLoaded`.

- [ ] **Step 5: Add visual rules**

Add `.links-directory`, `.links-group`, `.links-grid`, `.link-entry`, `.link-avatar`, `.link-copy`, and `.link-tags` using existing design tokens. Use open rows with hairline separators and two columns above 900px; use one column below 900px. Preserve readable paper surfaces while custom backgrounds are active and respect reduced-motion preferences.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```powershell
node --check js/links.js
npx playwright test tests/e2e/links.spec.js --config tests/playwright.config.js
python scripts/check.py
```

Commit:

```powershell
git add links.html js/links.js styles.css tests/e2e/links.spec.js
git commit -m "feat: add links directory"
```

---

### Task 3: Add the links entry across the site

**Files:**
- Modify: every root `*.html` file containing `.nav-links`
- Modify: `scripts/check.py`
- Modify: `tests/e2e/impl.spec.js`
- Modify: `tests/e2e/links.spec.js`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: existing `js/nav.js` behavior and `links.html` from Task 2.
- Produces: a real-HTML “来坐坐 / 友链” navigation group on all pages.

- [ ] **Step 1: Write failing navigation tests**

Update navigation consistency tests to expect a final `links.html` link on every root page. Add assertions that `links.html` uses `aria-current="page"`, the link remains available with JavaScript disabled, and all legacy routes still return 200.

- [ ] **Step 2: Run tests and verify RED**

Run `npx playwright test tests/e2e/links.spec.js tests/e2e/impl.spec.js --grep "links|navigation" --config tests/playwright.config.js`.

Expected: existing pages lack the new navigation entry.

- [ ] **Step 3: Update HTML navigation and required pages**

Add a third visible group after the existing navigation sections:

```html
<div class="nav-group-label">来坐坐</div>
<a href="links.html">友链</a>
```

Set `class="active" aria-current="page"` only on `links.html`. Add `links.html` to the required-page collection in `scripts/check.py`. Ensure the sidebar can scroll at short viewport heights without hiding the social icons.

- [ ] **Step 4: Document maintenance**

In `README.md`, document adding, ordering, and grouping entries in `config/links.json` plus the local avatar directory. In `AGENTS.md`, identify `config/links.json` as a human-maintained source and repeat its HTTPS/text rendering/local-avatar constraints.

- [ ] **Step 5: Run full verification**

Run:

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
python scripts/check.py
node --check js/links.js
npx playwright test tests/e2e/links.spec.js --config tests/playwright.config.js
npx playwright test --config tests/playwright.config.js
git diff --check
git status --short
```

Expected: every command passes, no unexpected test is skipped, and only the planned files changed.

- [ ] **Step 6: Commit Task 3**

```powershell
git add *.html scripts/check.py tests/e2e/impl.spec.js tests/e2e/links.spec.js README.md AGENTS.md
git commit -m "feat: add links navigation"
```
