# Guestbook and Article Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub-authenticated article comments and a public “茶客留言簿” that Jingtine can moderate through GitHub Discussions.

**Architecture:** `config/comments.json` holds trusted Giscus identifiers while `js/comments.js` owns validation, lazy loading, stable discussion mapping, and fallback UI. Article detail mounts only after `article:ready`; the guestbook uses a fixed `guestbook` term.

**Tech Stack:** Static HTML, shared CSS, vanilla JavaScript, Giscus, GitHub Discussions, Python 3.11 standard library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-14-links-and-guestbook-design.md`

## Global Constraints

- Comments require GitHub login, are public, and are moderated in `Jingtine/jingtine-agent-site` Discussions.
- The site stores no GitHub credentials, tokens, email addresses, IP addresses, or session state.
- The only remote runtime URL is the fixed literal `https://giscus.app/client.js`.
- Comment content remains inside the Giscus iframe and is never injected into the site DOM.
- Invalid configuration or network failure must leave content/navigation usable and show the fixed Discussions fallback.
- Production remains static HTML, CSS, and vanilla JavaScript; Python 3.11 standard library is the only scripting runtime.

---

### Task 1: Define the comments configuration contract

**Files:**
- Create: `config/comments.json`
- Create: `tests/test_check_comments.py`
- Modify: `scripts/check.py`

**Interfaces:**
- Consumes: repository root and existing `CheckResult` convention.
- Produces: `check_comments_config() -> CheckResult` and `{ enabled, repo, repoId, category, categoryId, theme, lang }`.

- [ ] **Step 1: Write failing validator tests**

Test valid disabled configuration, enabled configuration with IDs, non-boolean `enabled`, unexpected repository/category, empty enabled IDs, unsupported theme/language, unknown keys, and non-object JSON.

```python
def test_enabled_requires_ids(self):
    self.write_comments({
        "enabled": True,
        "repo": "Jingtine/jingtine-agent-site",
        "repoId": "",
        "category": "茶客留言",
        "categoryId": "",
        "theme": "light",
        "lang": "zh-CN"
    })
    self.assertFalse(check.check_comments_config().passed)
```

- [ ] **Step 2: Run tests and verify RED**

Run `python -m unittest tests.test_check_comments -v`.

Expected: `AttributeError` because the checker is absent.

- [ ] **Step 3: Add the honest pre-provisioning configuration**

Create:

```json
{
  "enabled": false,
  "repo": "Jingtine/jingtine-agent-site",
  "repoId": "",
  "category": "茶客留言",
  "categoryId": "",
  "theme": "light",
  "lang": "zh-CN"
}
```

- [ ] **Step 4: Implement `check_comments_config`**

Require the exact seven keys and exact repository/category. Accept themes only from `light`, `dark`, `preferred_color_scheme`; languages only from `zh-CN`, `en`. When enabled, require both IDs as nonempty strings; when disabled, allow empty IDs. Add the result to `main()`.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
python -m unittest tests.test_check_comments -v
python scripts/check.py
```

Commit:

```powershell
git add config/comments.json scripts/check.py tests/test_check_comments.py
git commit -m "feat: define comments configuration"
```

---

### Task 2: Add the guestbook shell and site navigation

**Files:**
- Create: `guestbook.html`
- Create: `tests/e2e/comments.spec.js`
- Modify: every root `*.html` file containing `.nav-links`
- Modify: `styles.css`
- Modify: `scripts/check.py`
- Modify: `tests/e2e/impl.spec.js`

**Interfaces:**
- Consumes: the “来坐坐 / 友链” group from the Links Directory plan.
- Produces: `#guestbook-comments`, a real-HTML “留言簿” navigation entry, and accessible fallback markup.

- [ ] **Step 1: Write failing route and shell tests**

Assert `guestbook.html` returns 200, contains skip link/nav/main/footer, exposes `#guestbook-comments[aria-live="polite"]`, has a public-visibility notice, marks its nav link current, and remains navigable without JavaScript. Update shared navigation expectations to include both `links.html` and `guestbook.html`.

- [ ] **Step 2: Run tests and verify RED**

Run `npx playwright test tests/e2e/comments.spec.js tests/e2e/impl.spec.js --grep "guestbook|navigation" --config tests/playwright.config.js`.

Expected: guestbook route and navigation assertions fail.

- [ ] **Step 3: Create `guestbook.html`**

Use the shared shell and this semantic content:

```html
<header class="page-header guestbook-intro">
  <div class="section-label">Guestbook</div>
  <h1>茶客留言簿</h1>
  <p>这里的留言公开可见；写下名字之前，需要先用 GitHub 登录。</p>
</header>
<section class="section guestbook-section" aria-labelledby="guestbook-heading">
  <h2 id="guestbook-heading">来坐坐，留句话</h2>
  <div id="guestbook-comments" class="comments-mount" aria-live="polite"></div>
  <noscript><p><a href="https://github.com/Jingtine/jingtine-agent-site/discussions">前往 GitHub Discussions 留言</a></p></noscript>
</section>
```

- [ ] **Step 4: Update navigation and checks**

Add `<a href="guestbook.html">留言簿</a>` after the friend-links entry on all page shells; set current state only on the new page. Add the page to `scripts/check.py` required pages and update shared test counts. Adjust sidebar overflow styles so ten entries and social icons remain reachable at short heights.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
python scripts/check.py
npx playwright test tests/e2e/comments.spec.js tests/e2e/impl.spec.js --grep "guestbook|navigation|overflow" --config tests/playwright.config.js
```

Commit:

```powershell
git add guestbook.html *.html styles.css scripts/check.py tests/e2e/comments.spec.js tests/e2e/impl.spec.js
git commit -m "feat: add guestbook page"
```

---

### Task 3: Build the safe lazy Giscus loader

**Files:**
- Create: `js/comments.js`
- Modify: `article.html`
- Modify: `guestbook.html`
- Modify: `js/article-page.js`
- Modify: `styles.css`
- Modify: `tests/e2e/comments.spec.js`
- Modify: `tests/e2e/writing.spec.js`

**Interfaces:**
- Consumes: `config/comments.json`, `article:ready` detail `{ slug: string, title: string }`, `#article-comments`, and `#guestbook-comments`.
- Produces: `window.SiteComments.mount(element, term) -> Promise<{status: string}>`.

- [ ] **Step 1: Write failing loader tests**

Route local config and intercept `https://giscus.app/client.js`. Assert the article term is `article:hello-world`, guestbook term is `guestbook`, invalid articles never mount, fixed script origin cannot be overridden, disabled/malformed config shows fallback, script error shows fallback, retry works, repeated calls do not duplicate scripts, status is announced, and the load button works by keyboard.

```javascript
await expect.poll(async () => page.locator('#article-comments script').getAttribute('data-term'))
  .toBe('article:hello-world');
await expect(page.locator('#guestbook-comments script'))
  .toHaveAttribute('src', 'https://giscus.app/client.js');
```

- [ ] **Step 2: Run tests and verify RED**

Run `npx playwright test tests/e2e/comments.spec.js tests/e2e/writing.spec.js --grep "comment|guestbook|Giscus" --config tests/playwright.config.js`.

Expected: `window.SiteComments` and Giscus scripts are absent.

- [ ] **Step 3: Implement strict local validation**

Create `js/comments.js` as an IIFE. `validateConfig(value)` returns `null` unless every required field matches the Task 1 contract and enabled IDs are nonempty. `validTerm(term)` accepts only `guestbook` or `/^article:[a-z0-9-]+$/`. The Discussions fallback URL and Giscus client URL are module constants, not config fields.

- [ ] **Step 4: Implement accessible fallback and script mounting**

`createFallback(mount, message)` replaces children with a paragraph and a fixed HTTPS Discussions link constructed with DOM methods. `appendGiscus(mount, config, term)` creates one script and sets explicit attributes:

```javascript
script.src = GISCUS_CLIENT;
script.async = true;
script.crossOrigin = 'anonymous';
script.setAttribute('data-repo', config.repo);
script.setAttribute('data-repo-id', config.repoId);
script.setAttribute('data-category', config.category);
script.setAttribute('data-category-id', config.categoryId);
script.setAttribute('data-mapping', 'specific');
script.setAttribute('data-term', term);
script.setAttribute('data-strict', '1');
```

Also set reactions, metadata, input position, theme, and language attributes from the validated allowlists. Handle `error` by replacing the mount with fallback UI.

- [ ] **Step 5: Implement lazy `mount`**

Create a real `加载留言` button first. Begin loading when it receives focus/click or when an `IntersectionObserver` with `rootMargin: '400px 0px'` reports intersection. If the API is unavailable, retain the button. Cache the configuration promise, clear the cache after rejection, and mark each mount so repeated calls are idempotent.

- [ ] **Step 6: Wire article and guestbook entry points**

Load `js/comments.js` on both pages. Add “茶后闲谈” and a public/GitHub-login notice around the existing article mount. In `js/article-page.js`, register once:

```javascript
document.addEventListener('article:ready', function (event) {
  var slug = event.detail && event.detail.slug;
  window.SiteComments.mount(document.getElementById('article-comments'), 'article:' + slug);
}, { once: true });
```

In `guestbook.html`, call `SiteComments.mount(document.getElementById('guestbook-comments'), 'guestbook')`. Keep normal Discussions links in `<noscript>` blocks.

- [ ] **Step 7: Style and verify**

Add `.comments-section`, `.comments-heading`, `.comments-consent`, `.comments-load`, and `.comments-fallback` as an open reading section separated by a light hand-drawn rule. Preserve custom-background contrast and reduced-motion behavior.

Run:

```powershell
node --check js/comments.js
npx playwright test tests/e2e/comments.spec.js tests/e2e/writing.spec.js --grep "comment|guestbook|Giscus" --config tests/playwright.config.js
```

- [ ] **Step 8: Commit Task 3**

```powershell
git add js/comments.js js/article-page.js article.html guestbook.html styles.css tests/e2e/comments.spec.js tests/e2e/writing.spec.js
git commit -m "feat: add GitHub-authenticated comments"
```

---

### Task 4: Provision Discussions and finish documentation

**Files:**
- Modify: `config/comments.json`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `tests/e2e/comments.spec.js`

**Interfaces:**
- Consumes: verified GitHub repository node ID and verified “茶客留言” Discussion category node ID.
- Produces: enabled production comments plus owner-facing moderation instructions.

- [ ] **Step 1: Inspect prerequisites without mutation**

Use authenticated GitHub tooling to verify Discussions status, Giscus app access, and a general Discussion category named `茶客留言`. Read the repository and category node IDs from GitHub. Do not invent or copy IDs from another repository.

- [ ] **Step 2: Request approval for any missing external setup**

If Discussions, the category, or Giscus installation is missing, present the exact external action. After explicit approval, enable Discussions, create the general category, and install/authorize Giscus only for this repository.

- [ ] **Step 3: Enable verified production configuration**

Set `enabled: true` and store the verified `repoId` and `categoryId`. Store no token, cookie, email, or machine path.

- [ ] **Step 4: Add real-config regression coverage**

Load the committed local configuration while intercepting only the fixed Giscus client. Assert `enabled` is true, IDs are nonempty, and the emitted attributes exactly match the committed values.

- [ ] **Step 5: Document operation**

In `README.md`, explain login/public visibility, article and guestbook mapping terms, and deletion/locking through Discussions. In `AGENTS.md`, classify `config/comments.json` as human-maintained source and preserve the fixed-script/no-secret constraints.

- [ ] **Step 6: Run complete verification**

Run:

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
python scripts/check.py
node --check js/comments.js
npx playwright test tests/e2e/comments.spec.js --config tests/playwright.config.js
npx playwright test --config tests/playwright.config.js
git diff --check
git status --short
```

Expected: all commands pass, no unexpected skip occurs, and only planned changes remain.

- [ ] **Step 7: Commit Task 4**

```powershell
git add config/comments.json README.md AGENTS.md tests/e2e/comments.spec.js
git commit -m "docs: enable and document community comments"
```

