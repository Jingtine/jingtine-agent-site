# 不驚茶坊 Identity and Visual Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the existing portfolio shell as “不驚茶坊”, add an owner-configurable frosted background, and make the home and About pages read like a personal publication.

**Architecture:** Keep the static HTML structure and progressive enhancement. A small `site-theme.js` module reads validated public settings from `config/site.json` and exposes them through CSS variables; each HTML page retains real navigation and footer markup when JavaScript is disabled.

**Tech Stack:** Static HTML, CSS custom properties, vanilla JavaScript, Python 3.11 standard library checks, Playwright tests.

**Spec:** `docs/superpowers/specs/2026-09-11-long-term-personal-site-design.md`

## Global Constraints

- Production remains directly deployable to GitHub Pages without npm, bundling, transpilation, a server, or a database.
- Site brand is `不驚茶坊`; Chinese signature is `不驚醴`; English handle and footer attribution are `Jingtine`.
- The sidebar brand contains exactly two visible lines: `不驚茶坊` and `不驚醴 · Jingtine`.
- Existing paper texture, pale purple/blue palette, serif headings, sidebar, and wide reading surface remain the visual foundation.
- Large outlined cards, continuous section numbering, and repeated decorative tape are reduced; mobile content comes before decoration.
- Background images must be repository-local under `assets/images/backgrounds/`; invalid configuration falls back to the current dotted paper.
- All existing links and the GitHub Pages base `/jingtine-agent-site/` remain valid.

---

## File Map

- Create `config/site.json`: public brand and background settings.
- Create `js/site-theme.js`: validate settings and set safe CSS variables.
- Create `tests/e2e/site-shell.spec.js`: brand, fallback, no-JS, and responsive behavior.
- Modify `styles.css`: global tokens, background layers, sidebar title, lighter editorial layout, home/About/Status styling.
- Modify every root `*.html`: two-line brand, Chinese navigation labels, theme script, English footer attribution.
- Modify `index.html`: publication-oriented home content and reduced section count.
- Modify `about.html`: `不驚醴 / Jingtine` identity and less résumé-like hierarchy.
- Modify `status.html`: Chinese page framing while preserving the GitHub visualization.
- Modify `js/nav.js`: preserve icon relocation and accessible mobile behavior with the new two-line logo.
- Modify `tests/e2e/redesign.spec.js`, `tests/e2e/requirements.spec.js`, `tests/e2e/impl.spec.js`: replace old English-label and panel-count assertions.

### Task 1: Lock the global brand contract with failing tests

**Files:**
- Create: `tests/e2e/site-shell.spec.js`
- Modify: `tests/e2e/redesign.spec.js`
- Modify: `tests/e2e/requirements.spec.js`
- Modify: `tests/e2e/impl.spec.js`

**Interfaces:**
- Consumes: existing `.nav`, `.nav-inner`, `#nav-links`, `.footer`, and `.nav-social-links` markup.
- Produces: stable `.nav-brand-name`, `.nav-brand-signature`, and `data-site-theme` selectors used by later tasks.

- [ ] **Step 1: Add brand and footer assertions**

```js
test('site shell presents the tea-house identity and English attribution', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.nav-brand-name')).toHaveText('不驚茶坊');
  await expect(page.locator('.nav-brand-signature')).toHaveText('不驚醴 · Jingtine');
  await expect(page.locator('.footer')).toContainText('Jingtine');
  await expect(page.locator('.footer')).not.toContainText('不驚醴');
});
```

- [ ] **Step 2: Add navigation and no-JavaScript assertions**

```js
const expectedNavigation = ['首页', '关于', '作品', '随笔', '研究', '知识库', '订阅阅读', '问答助手'];
test('Chinese navigation remains real HTML without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/index.html');
  await expect(page.locator('#nav-links a')).toHaveText(expectedNavigation);
  await expect(page.locator('.footer a[href="feed.xml"]')).toBeVisible();
  await context.close();
});
```

- [ ] **Step 3: Remove assertions that require nine numbered home panels or English navigation**

Update the existing navigation maps to:

```js
const navMap = {
  '关于': '/about.html',
  '作品': '/projects.html',
  '随笔': '/blog.html',
  '研究': '/papers.html',
  '知识库': '/wiki.html',
  '订阅阅读': '/reader.html',
  '问答助手': '/assistant.html'
};
```

- [ ] **Step 4: Run the focused tests and verify failure**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/site-shell.spec.js`

Expected: FAIL because `.nav-brand-name` and `.nav-brand-signature` do not exist and labels are still English.

- [ ] **Step 5: Commit the failing contract**

```powershell
git add tests/e2e/site-shell.spec.js tests/e2e/redesign.spec.js tests/e2e/requirements.spec.js tests/e2e/impl.spec.js
git commit -m "test: define tea-house site shell"
```

### Task 2: Add validated site settings and background fallback

**Files:**
- Create: `config/site.json`
- Create: `js/site-theme.js`
- Modify: `styles.css`
- Test: `tests/e2e/site-shell.spec.js`

**Interfaces:**
- Consumes: `config/site.json` with `name`, `author`, `handle`, and `background`.
- Produces: `window.SiteTheme.load(): Promise<object>`, root class `.site-background-ready`, and CSS variables `--site-bg-image`, `--site-bg-blur`, `--site-bg-saturation`, `--site-bg-overlay`, `--site-bg-overlay-opacity`, `--site-bg-position`.

- [ ] **Step 1: Add tests for valid settings and rejected paths**

```js
test('site theme applies repository-local background settings', async ({ page }) => {
  await page.route('**/config/site.json', route => route.fulfill({ json: {
    name: '不驚茶坊', author: '不驚醴', handle: 'Jingtine',
    background: { image: 'assets/images/backgrounds/example.jpg', blur: 14,
      saturation: 0.72, overlay: '#f4f0e8', overlayOpacity: 0.82, position: 'center' }
  }}));
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveClass(/site-background-ready/);
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--site-bg-blur').trim())).toBe('14px');
});

test('unsafe background paths keep the dotted-paper fallback', async ({ page }) => {
  await page.route('**/config/site.json', route => route.fulfill({ json: {
    name: '不驚茶坊', author: '不驚醴', handle: 'Jingtine',
    background: { image: 'https://example.com/tracker.jpg', blur: 14 }
  }}));
  await page.goto('/index.html');
  await expect(page.locator('html')).not.toHaveClass(/site-background-ready/);
});
```

- [ ] **Step 2: Create the owner-editable settings file**

```json
{
  "name": "不驚茶坊",
  "author": "不驚醴",
  "handle": "Jingtine",
  "background": {
    "image": "",
    "blur": 14,
    "saturation": 0.72,
    "overlay": "#f4f0e8",
    "overlayOpacity": 0.82,
    "position": "center"
  }
}
```

- [ ] **Step 3: Implement strict validation**

```js
(function () {
  'use strict';
  function finite(value, min, max, fallback) {
    var number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
  }
  function localBackground(value) {
    return typeof value === 'string' &&
      /^assets\/images\/backgrounds\/[a-zA-Z0-9._/-]+$/.test(value) &&
      value.indexOf('..') === -1 && value.indexOf('//') === -1 ? value : '';
  }
  function load() {
    return fetch('config/site.json').then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (site) {
      var image = localBackground(site.background && site.background.image);
      if (!image) return site;
      var root = document.documentElement;
      root.style.setProperty('--site-bg-image', 'url("' + image + '")');
      root.style.setProperty('--site-bg-blur', finite(site.background.blur, 0, 40, 14) + 'px');
      root.style.setProperty('--site-bg-saturation', String(finite(site.background.saturation, 0, 2, 0.72)));
      root.style.setProperty('--site-bg-overlay', /^#[0-9a-fA-F]{6}$/.test(site.background.overlay || '') ? site.background.overlay : '#f4f0e8');
      root.style.setProperty('--site-bg-overlay-opacity', String(finite(site.background.overlayOpacity, 0, 1, 0.82)));
      root.style.setProperty('--site-bg-position', /^(center|top|bottom|left|right)( (center|top|bottom|left|right))?$/.test(site.background.position || '') ? site.background.position : 'center');
      root.classList.add('site-background-ready');
      return site;
    }).catch(function () { return null; });
  }
  window.SiteTheme = { load: load };
  load();
})();
```

- [ ] **Step 4: Add a fixed, non-interactive background layer in CSS**

```css
body::before { content:""; position:fixed; inset:-40px; z-index:-2; background:var(--site-bg-image) var(--site-bg-position)/cover no-repeat; filter:blur(var(--site-bg-blur)) saturate(var(--site-bg-saturation)); opacity:0; }
.site-background-ready body::before { opacity:1; }
body::after { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; background:var(--site-bg-overlay); opacity:var(--site-bg-overlay-opacity); }
```

Use the existing dotted background on `body` so it remains visible when `image` is empty or loading fails.

- [ ] **Step 5: Run the focused tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/site-shell.spec.js -g "site theme"`

Expected: PASS for the routed local image and for the unsafe-path fallback. The test asserts applied variables and does not depend on downloading the referenced image.

- [ ] **Step 6: Commit the settings layer**

```powershell
git add config/site.json js/site-theme.js styles.css tests/e2e/site-shell.spec.js
git commit -m "feat: add configurable paper background"
```

### Task 3: Convert the shared shell to the two-line Chinese identity

**Files:**
- Modify: every root `*.html`
- Modify: `js/nav.js`
- Modify: `styles.css`
- Test: `tests/e2e/site-shell.spec.js`

**Interfaces:**
- Consumes: the selectors established in Task 1 and `js/site-theme.js` from Task 2.
- Produces: identical static navigation order across all pages and an enhanced icon row moved into the sidebar by `js/nav.js`.

- [ ] **Step 1: Replace each logo anchor with semantic two-line markup**

```html
<a href="index.html" class="nav-logo" aria-label="不驚茶坊首页">
  <span class="nav-brand-name">不驚茶坊</span>
  <span class="nav-brand-signature">不驚醴 · Jingtine</span>
</a>
```

- [ ] **Step 2: Replace the eight existing navigation labels consistently**

```html
<a href="index.html">首页</a>
<a href="about.html">关于</a>
<a href="projects.html">作品</a>
<a href="blog.html">随笔</a>
<a href="papers.html">研究</a>
<a href="wiki.html">知识库</a>
<a href="reader.html">订阅阅读</a>
<a href="assistant.html">问答助手</a>
```

Retain the correct `class="active" aria-current="page"` on each route. Keep footer link text as the no-JavaScript fallback and keep `&copy; 2026 Jingtine` unchanged.

- [ ] **Step 3: Load the theme script before page-specific scripts**

```html
<script src="js/site-theme.js?v=20260911"></script>
```

- [ ] **Step 4: Style the sidebar title as a publication masthead**

```css
.nav-logo { display:grid; gap:4px; text-decoration:none; }
.nav-brand-name { font-family:var(--font-serif); font-size:clamp(28px,2.4vw,42px); line-height:1; color:var(--ink); }
.nav-brand-signature { font-family:var(--font-mono); font-size:11px; letter-spacing:.08em; color:var(--muted); }
.nav-logo::after { content:none; }
```

- [ ] **Step 5: Keep `nav.js` focused on behavior**

Retain `setOpen(open, restore)`, Escape focus restoration, breakpoint reset, safe SVG construction, and relocation of `.footer-links`. Update only selectors or labels required by the new markup; do not fetch site configuration from `nav.js`.

- [ ] **Step 6: Run shell and navigation tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/site-shell.spec.js tests/e2e/impl.spec.js -g "shell|导航|汉堡"`

Expected: PASS with eight Chinese links, four sidebar icons under JavaScript, and visible footer links without JavaScript.

- [ ] **Step 7: Commit the shared shell**

```powershell
git add *.html js/nav.js styles.css tests/e2e
git commit -m "feat: adopt 不驚茶坊 site identity"
```

### Task 4: Reshape the home page around current life and writing

**Files:**
- Modify: `index.html`
- Modify: `js/home.js`
- Modify: `styles.css`
- Test: `tests/e2e/site-shell.spec.js`

**Interfaces:**
- Consumes: `loadArticleIndex()` and `renderArticleList()` until the Writing plan replaces those functions.
- Produces: `#latest-posts`, `.home-now`, `.home-writing`, `.home-making`, and `.home-found` regions.

- [ ] **Step 1: Add a failing content-order test**

```js
test('home reads as a personal publication', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('h1')).toContainText('你好，我是不驚醴。');
  await expect(page.locator('main > section')).toHaveCount(4);
  await expect(page.locator('.home-now')).toBeVisible();
  await expect(page.locator('.home-writing')).toBeVisible();
  await expect(page.locator('.home-making')).toBeVisible();
  await expect(page.locator('.home-found')).toBeVisible();
  await expect(page.locator('.panel-number')).toHaveCount(2);
});
```

- [ ] **Step 2: Replace the nine-panel grid with four editorial sections**

Use this document order:

```html
<section class="home-now" aria-labelledby="home-title">…</section>
<section class="home-writing" aria-labelledby="writing-title"><div id="latest-posts" aria-live="polite">正在加载随笔…</div></section>
<section class="home-making" aria-labelledby="making-title">…</section>
<section class="home-found" aria-labelledby="found-title">…</section>
```

The first section introduces `不驚醴`, identifies the Nanjing University program accurately, and links to About. “正在做的事” links to selected projects. “随手收藏” links to Research, Wiki, and Reader in a compact text list.

- [ ] **Step 3: Remove the home Skills disclosure and software-only tag row**

Delete `.home-skills-note`, `Software Engineering / AI Agent / Product Innovation` hero tags, and sequential `01` through `09` labels. Retain a maximum of two small issue-style labels on the hero and Writing heading.

- [ ] **Step 4: Implement a looser two-column desktop rhythm and single-column mobile rhythm**

```css
.home-publication { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(250px,.65fr); gap:clamp(32px,5vw,72px); }
.home-writing { border-top:1px solid var(--line); padding-top:clamp(28px,4vw,48px); }
.home-found { align-self:start; background:color-mix(in srgb,var(--blue-paper) 72%,transparent); transform:rotate(.25deg); }
@media (max-width:767px) { .home-publication { grid-template-columns:1fr; } .home-found { transform:none; } }
```

- [ ] **Step 5: Keep loading and retry behavior in `home.js`**

Change the visible strings to `正在加载随笔…`, `随笔加载失败。`, and `重试`; retain DOM-based button creation and the existing `load()` retry.

- [ ] **Step 6: Run home and responsive tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/site-shell.spec.js -g "home|responsive"`

Expected: PASS at 360, 390, 768, 1024, and 1440 pixels without horizontal overflow.

- [ ] **Step 7: Commit the home transformation**

```powershell
git add index.html js/home.js styles.css tests/e2e/site-shell.spec.js
git commit -m "feat: reshape home as a personal publication"
```

### Task 5: Humanize About and align Status with the publication shell

**Files:**
- Modify: `about.html`
- Modify: `status.html`
- Modify: `js/status.js`
- Modify: `styles.css`
- Test: `tests/e2e/site-shell.spec.js`
- Test: `tests/e2e/redesign.spec.js`

**Interfaces:**
- Consumes: current GitHub JSON schema and `renderGitHub(container, data, siteData)`.
- Produces: stable About education copy and Chinese Status headings without changing data collection.

- [ ] **Step 1: Add identity and education assertions**

```js
test('About keeps the precise program wording', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.locator('h1')).toContainText('不驚醴');
  await expect(page.locator('h1')).toContainText('Jingtine');
  await expect(page.locator('.about-lead')).toHaveText('南京大学商学院软件工程（软工商业创新班）在读。');
  await expect(page.locator('.about-study')).toContainText('软件工程与工商管理双学位班');
});
```

- [ ] **Step 2: Reduce About decoration and résumé density**

Keep the portrait, short introduction, precise education section, three capability groups, and contact links. Remove the `STUDENT / MAKER` stamp, repeated panel numbering, and any claim that software engineering and business administration are two unrelated study programs.

- [ ] **Step 3: Update About titles and introductory copy**

Use `不驚醴 / Jingtine` as the `h1`. Keep the lead sentence exact. Follow it with one paragraph that can encompass writing, learning, software, products, and daily observations.

- [ ] **Step 4: Translate the Status frame while preserving data labels where clarity benefits**

Change the page heading to `近况 / Status` and the introduction to `公开的 GitHub 活动，以及这座档案馆最近是否运转正常。`. In `status.js`, use `月度活动`, `每日活动`, `最近维护的仓库`, `贡献`, `公开仓库`, `获得的星标`, and `活跃天数`.

- [ ] **Step 5: Run About and Status tests**

Run: `npx playwright test --config tests/playwright.config.js tests/e2e/site-shell.spec.js tests/e2e/redesign.spec.js -g "About|Status|program"`

Expected: PASS with the GitHub chart, calendar, safe repository links, and site-health fallback unchanged.

- [ ] **Step 6: Commit page alignment**

```powershell
git add about.html status.html js/status.js styles.css tests/e2e
git commit -m "feat: align About and Status with publication theme"
```

### Task 6: Verify the visual foundation as a complete increment

**Files:**
- Modify: `scripts/check.py` only if the new local config requires a structural check.
- Modify: `tests/e2e/site-shell.spec.js` only for uncovered acceptance behavior.

**Interfaces:**
- Consumes: all output from Tasks 1–5.
- Produces: a green baseline for the Writing plan.

- [ ] **Step 1: Add a `check_site_config()` quality check**

Validate exact keys, identity values, numeric ranges, and local background prefix. Append it to `main()` and print one concise `Site config` line.

- [ ] **Step 2: Run the Python quality gate**

Run: `python scripts/check.py`

Expected: exit code 0 and all checks pass, including `Site config`.

- [ ] **Step 3: Run the complete Playwright suite**

Run: `npx playwright test --config tests/playwright.config.js`

Expected: all tests pass; every route retains navigation, main, and footer landmarks at 360, 390, 768, 1024, and 1440 pixels.

- [ ] **Step 4: Inspect desktop and mobile pages**

Open `index.html`, `about.html`, and `status.html` at 1440×900 and 390×844. Confirm that there are no continuous tall stacks of outlined cards, the sidebar brand stays two lines, and the background never reduces text contrast.

- [ ] **Step 5: Commit the verified baseline**

```powershell
git add scripts/check.py tests/e2e/site-shell.spec.js
git commit -m "test: verify visual foundation"
```
