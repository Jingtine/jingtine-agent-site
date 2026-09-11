# Links, Comments, and Guestbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe friends page, GitHub-authenticated article comments, and a public guestbook that the site owner moderates through GitHub Discussions.

**Architecture:** Friend data is a checked-in JSON source rendered with DOM APIs. A shared comments module validates public Giscus configuration and injects the fixed official client only when configuration is complete; otherwise it presents a useful Discussions link without affecting page content.

**Tech Stack:** Static HTML, JSON, vanilla JavaScript DOM APIs, Giscus/GitHub Discussions, Python 3.11 checks, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-11-long-term-personal-site-design.md`

## Global Constraints

- Visitors must sign in through GitHub before posting; the static site stores no token, account, visitor profile, or comment database.
- Article terms are stable `article:<slug>` values; the guestbook term is exactly `guestbook`.
- All external URLs must use HTTPS and rendered external links must include `rel="noopener noreferrer"`.
- Remote/config strings render through `textContent` and explicit attribute assignment.
- Friend avatars are repository-local under `assets/images/links/`; absent avatars use a text fallback.
- Friends and RSS subscriptions remain separate; a friend feed is only a visible link until explicitly added to `config/feeds.json` and `config/allowlist.json`.
- Comments failure never blocks article text, navigation, or guestbook explanation.

---

## File Map

- Create `config/links.json`: owner-maintained friend records.
- Create `config/comments.json`: public Giscus identifiers and fallback Discussion URL.
- Create `links.html`, `js/links.js`: friends page and safe renderer.
- Create `guestbook.html`: public guestbook introduction and comment mount.
- Create `js/comments.js`: validated Giscus loader and fallback state.
- Create `tests/e2e/community.spec.js`: config, security, keyboard, mapping, and failure behavior.
- Create `docs/giscus-setup.md`: exact one-time GitHub setup and moderation instructions.
- Modify every root `*.html`: append `友邻` and `来客簿` to static navigation.
- Modify `article.html`, `js/article-page.js`: load comments after `article:ready`.
- Modify `styles.css`: postcard-like friends, guestbook introduction, and comment spacing.
- Modify `scripts/check.py`: require pages and validate both configuration files.
- Modify existing E2E route lists and navigation counts from eight to ten.

### Task 1: Define and validate the friends data contract

**Files:**
- Create: `config/links.json`
- Modify: `scripts/check.py`
- Create: `tests/e2e/community.spec.js`

**Interfaces:**
- Consumes: records with `name`, `url`, `owner`, `description`, optional `avatar`, optional `tags`, and optional `feed`.
- Produces: `check_links_config() -> bool` in `scripts/check.py`.

- [ ] **Step 1: Add an empty but valid initial source**

```json
[]
```

The first release may ship without invented friends. Real entries are added only from information the owner supplies.

- [ ] **Step 2: Add Python validation**

For every record, require non-empty string fields `name`, `url`, `owner`, and `description`; accept only `https://` for `url` and `feed`; require `avatar` to match `assets/images/links/<filename>` and exist; require `tags` to be an array of non-empty strings; reject duplicate normalized URLs.

- [ ] **Step 3: Add a browser fixture test for safe data**

```js
test('friends render safe HTTPS links and local avatar paths', async ({ page }) => {
  await page.route('**/config/links.json', route => route.fulfill({ json: [{
    name: '示例站点', url: 'https://example.com/', owner: '朋友',
    description: '一封来自远方的信。', avatar: '', tags: ['个人博客'],
    feed: 'https://example.com/feed.xml'
  }]}));
  await page.goto('/links.html');
  const link = page.locator('.friend-card a[href="https://example.com/"]');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});
```

- [ ] **Step 4: Run the Python gate and verify the page test fails**

Run: `python scripts/check.py`

Expected: PASS for the empty array after `check_links_config()` is wired.

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/community.spec.js`

Expected: FAIL because `links.html` does not exist.

- [ ] **Step 5: Commit the data contract**

```powershell
git add config/links.json scripts/check.py tests/e2e/community.spec.js
git commit -m "test: define friends data contract"
```

### Task 2: Build the friends page with safe DOM rendering

**Files:**
- Create: `links.html`
- Create: `js/links.js`
- Modify: `styles.css`
- Test: `tests/e2e/community.spec.js`

**Interfaces:**
- Consumes: `config/links.json` from Task 1.
- Produces: `loadFriends() -> Promise<Array>`, `renderFriends(items) -> void`, and `safeHttps(value) -> string`.

- [ ] **Step 1: Add empty, failure, and unsafe-link tests**

Route the JSON request to `[]`, abort it, and supply an `http://` URL. Assert respectively `还没有公开的友邻`, a `重试` button, and no rendered clickable unsafe URL.

- [ ] **Step 2: Create semantic page markup**

Use `h1` text `友邻`, a short explanation, `#friends-list` with `aria-live="polite"`, and a `本站信息` section listing site name `不驚茶坊`, owner `不驚醴`, English handle `Jingtine`, production URL, and a local avatar URL only when a dedicated site avatar exists.

- [ ] **Step 3: Implement URL and asset validation in the browser**

```js
function safeHttps(value) {
  try { var url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
  catch (_) { return ''; }
}
function safeAvatar(value) {
  return typeof value === 'string' &&
    /^assets\/images\/links\/[a-zA-Z0-9._/-]+$/.test(value) &&
    value.indexOf('..') === -1 && value.indexOf('//') === -1 ? value : '';
}
```

- [ ] **Step 4: Render postcard-like cards without HTML strings**

Create each element with `document.createElement`. Use the site or owner initial when no avatar exists. Build tags as `<span>` text nodes. Open site/feed links in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

- [ ] **Step 5: Add restrained postcard styling**

Use alternating pale paper colors, one thin rule, a small rotated stamp motif, and no heavy enclosing border around the entire page. Disable transforms in the mobile breakpoint and under `prefers-reduced-motion`.

- [ ] **Step 6: Run community tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/community.spec.js -g "friends"`

Expected: PASS for populated, empty, failed, unsafe, keyboard, and 360px layouts.

- [ ] **Step 7: Commit the friends page**

```powershell
git add links.html js/links.js styles.css tests/e2e/community.spec.js
git commit -m "feat: add friends page"
```

### Task 3: Implement a disabled-by-default Giscus configuration and fallback

**Files:**
- Create: `config/comments.json`
- Create: `js/comments.js`
- Create: `docs/giscus-setup.md`
- Modify: `scripts/check.py`
- Test: `tests/e2e/community.spec.js`

**Interfaces:**
- Produces: `window.SiteComments.mount(target, term): Promise<void>`.
- Accepts: `term` matching `^(guestbook|article:[a-z0-9-]+)$`.
- Configuration keys: `enabled`, `repo`, `repoId`, `category`, `categoryId`, `discussionUrl`, `theme`, `lang`.

- [ ] **Step 1: Create safe initial configuration**

```json
{
  "enabled": false,
  "repo": "jingtine/jingtine-agent-site",
  "repoId": "",
  "category": "",
  "categoryId": "",
  "discussionUrl": "https://github.com/jingtine/jingtine-agent-site/discussions",
  "theme": "light",
  "lang": "zh-CN"
}
```

- [ ] **Step 2: Add configuration checks**

Validate key types, exact repo format, HTTPS Discussions URL under `github.com`, accepted `theme`, accepted language `zh-CN`, and require non-empty IDs/category only when `enabled` is true. Public IDs are configuration, not secrets.

- [ ] **Step 3: Add fallback tests**

```js
test('disabled comments show a useful Discussions link', async ({ page }) => {
  await page.goto('/guestbook.html');
  await expect(page.locator('.comments-unavailable')).toContainText('留言暂未开放');
  await expect(page.locator('.comments-unavailable a')).toHaveAttribute('href', /^https:\/\/github\.com\//);
});
```

Add malformed-config, fetch-failure, and script-load-failure tests; each must leave the article body or guestbook introduction visible.

- [ ] **Step 4: Implement fixed official-script injection**

```js
function createGiscusScript(config, term) {
  var script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-repo', config.repo);
  script.setAttribute('data-repo-id', config.repoId);
  script.setAttribute('data-category', config.category);
  script.setAttribute('data-category-id', config.categoryId);
  script.setAttribute('data-mapping', 'specific');
  script.setAttribute('data-term', term);
  script.setAttribute('data-strict', '1');
  script.setAttribute('data-reactions-enabled', '1');
  script.setAttribute('data-emit-metadata', '0');
  script.setAttribute('data-input-position', 'top');
  script.setAttribute('data-theme', config.theme);
  script.setAttribute('data-lang', config.lang);
  return script;
}
```

Use DOM nodes for fallback copy and the Discussions link. Never accept a script URL from JSON.

- [ ] **Step 5: Write the one-time setup guide**

Document enabling Discussions, installing the Giscus App for this repository, creating/selecting a category, obtaining `repoId` and `categoryId` from the official Giscus setup page, filling the four public values, setting `enabled` to true, testing GitHub login, and deleting/locking a test Discussion as owner.

- [ ] **Step 6: Run focused tests and quality checks**

Run: `python scripts/check.py`

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/community.spec.js -g "comments|Giscus|Discussions"`

Expected: PASS with the disabled fallback and no network dependency.

- [ ] **Step 7: Commit the integration layer**

```powershell
git add config/comments.json js/comments.js docs/giscus-setup.md scripts/check.py tests/e2e/community.spec.js
git commit -m "feat: add safe Giscus integration"
```

### Task 4: Add the guestbook and article comments

**Files:**
- Create: `guestbook.html`
- Modify: `article.html`
- Modify: `js/article-page.js`
- Modify: `styles.css`
- Test: `tests/e2e/community.spec.js`

**Interfaces:**
- Consumes: `SiteComments.mount(target, term)` and the `article:ready` event.
- Produces: `#guestbook-comments` mapped to `guestbook` and `#article-comments` mapped to `article:<slug>`.

- [ ] **Step 1: Add mapping tests without loading the third-party script**

Route `config/comments.json` with complete fake public IDs and intercept `https://giscus.app/client.js`. Inspect the inserted script element and assert exact `data-mapping="specific"`, `data-term="guestbook"`, and `data-term="article:hello-world"` values.

- [ ] **Step 2: Create the guestbook page**

Explain that messages are public, posting requires GitHub login, and the owner may remove abusive or private content. Add a visible HTTPS Discussions fallback link and a `#guestbook-comments` mount below the introduction.

- [ ] **Step 3: Mount article comments only after metadata resolves**

```js
document.addEventListener('article:ready', function (event) {
  SiteComments.mount(document.getElementById('article-comments'), 'article:' + event.detail.slug);
});
```

Load `js/comments.js` before `js/article-page.js` so the listener is registered before `article:ready` fires.

- [ ] **Step 4: Style comment regions as part of the reading flow**

Use a thin top rule, generous top margin, and a small section label. Do not put the Giscus iframe inside a heavy card. Keep a minimum 44px focus target for fallback links.

- [ ] **Step 5: Run mapping and failure tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/community.spec.js -g "guestbook|article comments|mapping"`

Expected: PASS with exact stable terms and visible content when Giscus fails.

- [ ] **Step 6: Commit comments and guestbook**

```powershell
git add guestbook.html article.html js/article-page.js styles.css tests/e2e/community.spec.js
git commit -m "feat: add article comments and guestbook"
```

### Task 5: Add community pages to every static navigation shell

**Files:**
- Modify: every root `*.html`
- Modify: `tests/e2e/site-shell.spec.js`
- Modify: `tests/e2e/redesign.spec.js`
- Modify: `tests/e2e/impl.spec.js`
- Modify: `scripts/check.py`

**Interfaces:**
- Consumes: `links.html` and `guestbook.html`.
- Produces: identical ten-link navigation on all required pages.

- [ ] **Step 1: Append the two links in the same order everywhere**

```html
<a href="links.html">友邻</a>
<a href="guestbook.html">来客簿</a>
```

Set the matching active link and `aria-current="page"` on the two new pages.

- [ ] **Step 2: Update route arrays, counts, and active-label maps**

Add `links` and `guestbook` to every all-route test. Expect ten navigation links with JavaScript and without JavaScript.

- [ ] **Step 3: Require new pages and configurations in `check.py`**

Add `links.html` and `guestbook.html` to `REQUIRED_HTML`. Append `check_links_config()` and `check_comments_config()` to `main()`.

- [ ] **Step 4: Run navigation and all-route tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/site-shell.spec.js tests/e2e/redesign.spec.js tests/e2e/impl.spec.js -g "navigation|导航|all routes|所有页面"`

Expected: PASS at 360, 390, 768, 1024, and 1440 pixels without overflow.

- [ ] **Step 5: Commit navigation integration**

```powershell
git add *.html tests/e2e scripts/check.py
git commit -m "feat: add friends and guestbook navigation"
```

### Task 6: Verify owner moderation readiness

**Files:**
- Modify: `docs/giscus-setup.md` only if the real setup reveals a missing instruction.
- Modify: `config/comments.json` with real public identifiers after the owner completes GitHub setup.

**Interfaces:**
- Consumes: a public repository with Discussions and the Giscus App installed.
- Produces: working GitHub-authenticated comments and documented deletion/locking workflow.

Changing repository settings and installing the Giscus GitHub App are external account permission changes. If the implementing agent controls the GitHub UI, it must request action-time confirmation immediately before those changes; otherwise the owner performs the documented steps directly.

- [ ] **Step 1: Complete the GitHub-side setup from the guide**

The owner enables Discussions, installs Giscus, creates the selected category, and supplies the public IDs. No token is copied into the repository.

- [ ] **Step 2: Enable the checked-in configuration**

Set `enabled` to true and fill `repoId`, `category`, and `categoryId` exactly as Giscus reports.

- [ ] **Step 3: Verify a test article comment and guestbook message**

Open `article.html?slug=hello-world` and `guestbook.html`, sign in through GitHub, create one clearly marked test message on each, and confirm they appear in separate Discussions with terms `article:hello-world` and `guestbook`.

- [ ] **Step 4: Verify owner control in GitHub Discussions**

Delete one test message and lock/unlock the test Discussion. Confirm the embedded view reflects the moderation result after refresh.

- [ ] **Step 5: Remove remaining test content and run regression**

Run: `python scripts/check.py`

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/community.spec.js`

Expected: both pass; automated tests still intercept Giscus and do not create live comments.

- [ ] **Step 6: Commit the public identifiers**

```powershell
git add config/comments.json docs/giscus-setup.md
git commit -m "chore: enable site discussions"
```
