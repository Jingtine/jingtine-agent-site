# Apple Glass Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Jingtine Agent Site 改造成以自定义温室插画为朦胧背景、以中文为主并采用 Apple 式玻璃材质的个人网站，同时保持所有现有内容和静态数据功能可用。

**Architecture:** 继续使用现有静态 HTML、共享 `styles.css` 和原生 JavaScript。全站通过一套新的背景、玻璃、排版和响应式设计令牌统一；首页新增左侧个人介绍与右侧状态卡，内页只调整语义化结构和共享类，不改变数据生成或远程数据渲染边界。

**Tech Stack:** HTML5、CSS 自定义属性与 `backdrop-filter`、原生 JavaScript、Python 3 标准库质量检查、Playwright（仅本地 E2E 测试）。

**Spec:** `docs/superpowers/specs/2026-08-26-apple-glass-personalization-design.md`

## Global Constraints

- 生产站点只使用 HTML、CSS 和原生 JavaScript，不增加框架、打包器、服务端代码或生产运行时依赖。
- `scripts/` 中的 Python 脚本只能使用标准库；本计划不新增数据生成脚本。
- 背景源图为 `C:\Users\LJT\Desktop\PICTURES\OplusInfoCollection_260408162811357.png`；只在仓库内生成优化副本，不修改源文件。
- 导航、栏目、按钮、状态与错误信息以中文为主；`Jingtine`、GitHub、Email、RSS、Wiki 与必要技术名词可保留英文。
- 远程数据继续视为不可信数据，只能通过 `textContent`、DOM 节点和显式属性赋值渲染。
- 外部链接必须使用 HTTPS，并包含 `rel="noopener noreferrer"`。
- 所有站内路径必须兼容 GitHub Pages 的 `/jingtine-agent-site/` 基础路径；本地可用时优先相对链接。
- 所有动效尊重 `prefers-reduced-motion: reduce`；没有 JavaScript、背景图或 `backdrop-filter` 时核心内容仍然可用。
- 不重新抓取远程数据，不手工修改 `public/data/`、`feed.xml` 或 `subscriptions.opml`。

## File Map

- `assets/images/garden-background.jpg`：从用户源图生成的 2560px 宽网页背景副本，JPEG 品质 84。
- `styles.css`：全站视觉令牌、背景和雾化层、玻璃组件、导航、首页、内页、响应式与减少动画规则。
- `index.html`：中文导航、首页左右分栏和三张状态卡。
- `about.html`, `projects.html`, `contact.html`：个人档案、项目橱窗和联系页玻璃结构。
- `blog.html`, `article.html`, `wiki.html`, `knowledge.html`, `library.html`：中文内容索引与阅读界面。
- `papers.html`, `reader.html`, `assistant.html`, `status.html`：高信息密度数据页的玻璃容器和中文静态状态文案。
- `js/site-motion.js`：删除全局流星/随机粒子，添加确定性的背景景深和玻璃高光渐进增强。
- `js/nav.js`：保留现有键盘、焦点和移动菜单行为；仅在需要时适配新的导航容器类。
- `tests/e2e/personalization.spec.js`：新版视觉结构、中文界面、响应式、回退与减少动画测试。
- `tests/e2e/impl.spec.js`, `tests/e2e/requirements.spec.js`：把依赖英文导航文本的旧断言更新为中文。

---

### Task 1: Freeze the background asset and global visual contract

**Files:**
- Create: `assets/images/garden-background.jpg`
- Create: `tests/e2e/personalization.spec.js`
- Modify: `styles.css:1-160`
- Modify: `index.html`
- Modify: `about.html`
- Modify: `projects.html`
- Modify: `blog.html`
- Modify: `papers.html`
- Modify: `wiki.html`
- Modify: `reader.html`
- Modify: `assistant.html`
- Modify: `status.html`
- Modify: `article.html`
- Modify: `knowledge.html`
- Modify: `library.html`
- Modify: `contact.html`
- Modify: `tests/e2e/impl.spec.js:18-70,330-430`
- Modify: `tests/e2e/requirements.spec.js:20-42`

**Interfaces:**
- Consumes: the user-provided PNG at the exact source path in Global Constraints.
- Produces: CSS tokens `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-shadow`, `--garden-green`, `--garden-blue`, `--garden-cream`, `--garden-accent`; shared classes `.glass-panel`, `.glass-nav`; Chinese navigation labels used by every later task.

- [ ] **Step 1: Add failing global visual and Chinese navigation tests**

Create `tests/e2e/personalization.spec.js` with:

```js
const { test, expect } = require('@playwright/test');

const pages = [
  '/index.html', '/about.html', '/projects.html', '/blog.html',
  '/papers.html', '/wiki.html', '/reader.html', '/assistant.html',
  '/status.html', '/article.html?slug=hello-world', '/knowledge.html',
  '/library.html', '/contact.html',
];

test('全站使用优化背景和共享玻璃导航', async ({ page }) => {
  const backgroundResponse = await page.request.get('/assets/images/garden-background.jpg');
  expect(backgroundResponse.status()).toBe(200);
  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator('body')).toHaveClass(/garden-site/);
    await expect(page.locator('.nav')).toHaveClass(/glass-nav/);
    const backgroundImage = await page.locator('body').evaluate(
      el => getComputedStyle(el, '::before').backgroundImage
    );
    expect(backgroundImage).toContain('garden-background.jpg');
  }
});

test('主导航以中文为主且结构一致', async ({ page }) => {
  const expected = ['首页', '关于', '项目', '博客', '论文', 'Wiki', '阅读', '助手'];
  for (const path of pages.slice(0, 9)) {
    await page.goto(path);
    const labels = await page.locator('.nav-links a').allTextContents();
    expect(labels.map(label => label.trim())).toEqual(expected);
  }
});

test('玻璃材质具有无 backdrop-filter 回退色', async ({ page }) => {
  await page.goto('/index.html');
  const fallback = await page.locator('.nav').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(fallback).not.toBe('rgba(0, 0, 0, 0)');
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js
```

Expected: failures because `garden-background.jpg`, `.garden-site`, `.glass-nav` and Chinese navigation labels do not exist.

- [ ] **Step 3: Generate the repository background asset without changing the source PNG**

Use Windows `System.Drawing` as a one-time asset operation; do not add this as a production build step:

```powershell
Add-Type -AssemblyName System.Drawing
$sourceImage = [System.Drawing.Image]::FromFile('C:\Users\LJT\Desktop\PICTURES\OplusInfoCollection_260408162811357.png')
$targetWidth = 2560
$targetHeight = [int]($sourceImage.Height * $targetWidth / $sourceImage.Width)
$bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($sourceImage, 0, 0, $targetWidth, $targetHeight)
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$encoder = [System.Drawing.Imaging.Encoder]::Quality
$parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, 84L)
$bitmap.Save('D:\Projects\my-agent-site\assets\images\garden-background.jpg', $jpegCodec, $parameters)
$graphics.Dispose()
$bitmap.Dispose()
$sourceImage.Dispose()
```

Verify:

```powershell
Get-Item assets/images/garden-background.jpg | Select-Object Length
```

Expected: file exists and is smaller than the 3,484,634-byte source PNG.

- [ ] **Step 4: Define the global background and glass tokens**

At the top of `styles.css`, retain existing tokens that are still referenced and add the exact shared contract:

```css
:root {
  --garden-cream: #f7f7f2;
  --garden-green: #82957e;
  --garden-blue: #a8cfe0;
  --garden-accent: #7567e8;
  --glass-bg: rgba(255, 255, 255, 0.58);
  --glass-bg-strong: rgba(255, 255, 255, 0.78);
  --glass-border: rgba(255, 255, 255, 0.72);
  --glass-shadow: 0 24px 70px rgba(40, 52, 44, 0.14);
  --glass-blur: 24px;
}

body.garden-site::before {
  content: "";
  position: fixed;
  inset: -32px;
  z-index: -2;
  background: #dce9e2 url("assets/images/garden-background.jpg") center / cover no-repeat;
  filter: blur(14px) saturate(0.84) brightness(1.06);
  transform: scale(1.035);
}

body.garden-site::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 10%, rgba(255,255,255,.72), transparent 46%),
    linear-gradient(180deg, rgba(250,252,249,.18), rgba(236,242,238,.48));
}

.glass-panel {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

@supports (backdrop-filter: blur(1px)) {
  .glass-panel,
  .glass-nav {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.2);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.2);
  }
}
```

- [ ] **Step 5: Apply the global body/nav contract and translate navigation**

For every HTML page in the file list:

1. Set `<body class="garden-site">`, merging with any existing body class.
2. Set `<nav class="nav glass-nav">`.
3. Use the exact labels `首页`, `关于`, `项目`, `博客`, `论文`, `Wiki`, `阅读`, `助手` while preserving existing `href`, `active`, `aria-*`, toggle button structure and script includes.
4. Change the mobile toggle `aria-label` to `打开导航菜单`.
5. Update footer labels that have clear Chinese equivalents, but keep `Jingtine`, GitHub, Email and RSS unchanged.

Update `NAV_ITEMS`, `navMap`, `navActiveMap` and all `:has-text(...)` selectors in both legacy E2E files to the same Chinese labels. Do not loosen the assertions.

- [ ] **Step 6: Run the global tests and legacy navigation tests**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js tests/e2e/impl.spec.js --grep "全站使用|主导航|玻璃材质|TC02|TC03|TC18|TC21"
```

Expected: all selected tests pass.

- [ ] **Step 7: Commit the global contract**

```powershell
git add assets/images/garden-background.jpg styles.css *.html tests/e2e/personalization.spec.js tests/e2e/impl.spec.js tests/e2e/requirements.spec.js
git commit -m "feat: establish Apple glass site theme"
```

---

### Task 2: Build the personalized home hero and live status cards

**Files:**
- Modify: `index.html:34-145`
- Modify: `styles.css:161-606,1238-1350`
- Modify: `tests/e2e/personalization.spec.js`

**Interfaces:**
- Consumes: `.glass-panel`, garden tokens and Chinese navigation from Task 1.
- Produces: `.home-hero-grid`, `.home-profile-panel`, `.home-status-stack`, `.now-card`; stable status labels used by later visual regression and accessibility checks.

- [ ] **Step 1: Add failing homepage structure tests**

Append:

```js
test('首页首屏左侧展示个人信息，右侧展示三类状态', async ({ page }) => {
  await page.goto('/index.html');
  const hero = page.locator('.home-hero-grid');
  await expect(hero).toBeVisible();
  await expect(hero.locator('.home-profile-panel')).toContainText('Jingtine');
  await expect(hero.locator('.home-profile-panel img[src*="figure.jpg"]')).toBeVisible();
  const cards = hero.locator('.now-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('正在构建');
  await expect(cards.nth(1)).toContainText('正在思考');
  await expect(cards.nth(2)).toContainText('最近阅读');
});

test('首页在 375px 下按个人信息、状态卡顺序单栏排列', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('/index.html');
  const profile = await page.locator('.home-profile-panel').boundingBox();
  const statuses = await page.locator('.home-status-stack').boundingBox();
  expect(profile.y).toBeLessThan(statuses.y);
  expect(profile.width).toBeLessThanOrEqual(375);
  expect(statuses.width).toBeLessThanOrEqual(375);
  await context.close();
});
```

- [ ] **Step 2: Run and verify the homepage tests fail**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js --grep "首页"
```

Expected: fail because the new layout classes and status cards do not exist.

- [ ] **Step 3: Replace only the homepage hero markup**

In `index.html`, keep the existing avatar, name, identity, tags and description content, but place them inside:

```html
<header class="hero hero-intro-section">
  <div class="hero-intro-stage" id="hero-intro-stage">
    <div class="home-hero-grid" id="hero-intro-content">
      <section class="home-profile-panel glass-panel" aria-labelledby="home-title">
        <!-- existing avatar decoration and avatar -->
        <p class="hero-greeting">你好，我是</p>
        <h1 class="hero-name" id="home-title">Jingtine</h1>
        <!-- existing identity, tags and description; translate descriptive prose to Chinese -->
      </section>
      <aside class="home-status-stack" aria-label="我的最近动态">
        <article class="now-card glass-panel" data-tilt="1">
          <span class="now-card-index">01</span>
          <h2>正在构建</h2>
          <p>持续完善个人知识助手与 Agent 实验。</p>
        </article>
        <article class="now-card glass-panel" data-tilt="2">
          <span class="now-card-index">02</span>
          <h2>正在思考</h2>
          <p>AI Agent 如何形成更可靠的产品判断。</p>
        </article>
        <article class="now-card glass-panel" data-tilt="3">
          <span class="now-card-index">03</span>
          <h2>最近阅读</h2>
          <p>LLM 系统、Agent Memory 与人机交互。</p>
        </article>
      </aside>
    </div>
  </div>
</header>
```

Retain IDs queried by `js/site-motion.js`. Do not add inline event handlers or inline style attributes.

- [ ] **Step 4: Implement the desktop and mobile hero layout**

Add CSS that uses a two-column grid above 900px and one column below it:

```css
.home-hero-grid {
  width: min(1180px, calc(100% - 48px));
  min-height: calc(100vh - var(--nav-height) - 48px);
  margin: 24px auto;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr);
  align-items: center;
  gap: clamp(24px, 5vw, 72px);
}

.home-profile-panel {
  padding: clamp(28px, 5vw, 64px);
  border-radius: 36px;
  text-align: left;
}

.home-profile-panel .hero-tags { justify-content: flex-start; }

.home-status-stack { display: grid; gap: 16px; }

.now-card {
  padding: 22px 24px;
  border-radius: 26px;
  transition: transform .35s ease, box-shadow .35s ease;
}

@media (max-width: 900px) {
  .home-hero-grid {
    width: min(100% - 28px, 680px);
    grid-template-columns: 1fr;
    margin-top: 14px;
  }
  .home-profile-panel { padding: 28px 22px; border-radius: 28px; }
}
```

Remove obsolete CSS that assumes the complete hero is centered; keep the avatar decoration styles only if they still render inside the panel without overflow.

- [ ] **Step 5: Run homepage and existing personal-information tests**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js tests/e2e/impl.spec.js --grep "首页|TC04|TC16|TC22"
```

Expected: all selected tests pass at desktop, 768px and 375px.

- [ ] **Step 6: Commit the homepage**

```powershell
git add index.html styles.css tests/e2e/personalization.spec.js
git commit -m "feat: personalize home hero and current status"
```

---

### Task 3: Replace decorative particle motion with Apple-style depth

**Files:**
- Modify: `js/site-motion.js`
- Modify: `styles.css:307-606,931-997,1864-2035`
- Modify: `tests/e2e/personalization.spec.js`

**Interfaces:**
- Consumes: `.home-hero-grid`, `.glass-panel`, `.now-card` from Tasks 1-2.
- Produces: root CSS variables `--pointer-x`, `--pointer-y`; no random decorative DOM layers; reduced-motion static state.

- [ ] **Step 1: Add failing motion and reduced-motion tests**

Append:

```js
test('新版动效不创建流星或随机粒子层', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.meteor-layer')).toHaveCount(0);
  await expect(page.locator('.silver-particle-layer')).toHaveCount(0);
});

test('指针移动只更新根节点景深变量', async ({ page }) => {
  await page.goto('/index.html');
  await page.mouse.move(900, 300);
  await page.waitForTimeout(50);
  const values = await page.locator('html').evaluate(el => ({
    x: el.style.getPropertyValue('--pointer-x'),
    y: el.style.getPropertyValue('--pointer-y'),
  }));
  expect(values.x).not.toBe('');
  expect(values.y).not.toBe('');
});

test('减少动画模式不启用景深变量和装饰动画', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  await page.mouse.move(900, 300);
  const values = await page.locator('html').evaluate(el => ({
    x: el.style.getPropertyValue('--pointer-x'),
    y: el.style.getPropertyValue('--pointer-y'),
  }));
  expect(values).toEqual({ x: '', y: '' });
  const duration = await page.locator('.now-card').first().evaluate(el => getComputedStyle(el).transitionDuration);
  expect(duration === '0s' || duration.split(',').every(value => value.trim() === '0s')).toBe(true);
});
```

- [ ] **Step 2: Run and verify the motion tests fail**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js --grep "动效|指针|减少动画"
```

Expected: old meteor/particle layers exist and the pointer variables are absent.

- [ ] **Step 3: Remove the obsolete global decoration generators**

Delete the `meteor-layer` and `silver-particle-layer` creation blocks from `js/site-motion.js`. Remove their CSS selectors and keyframes from `styles.css`. Retain the IntersectionObserver reveal API used by dynamically rendered lists.

- [ ] **Step 4: Add deterministic depth variables**

Inside the existing IIFE, after computing `reduced`, add:

```js
function setupGardenDepth() {
  if (reduced) return;
  var root = document.documentElement;
  var scheduled = false;
  var nextX = 0;
  var nextY = 0;

  function paint() {
    root.style.setProperty('--pointer-x', nextX.toFixed(3));
    root.style.setProperty('--pointer-y', nextY.toFixed(3));
    scheduled = false;
  }

  window.addEventListener('pointermove', function (event) {
    nextX = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
    nextY = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(paint);
    }
  }, { passive: true });
}
```

Call `setupGardenDepth()` during initialization. Use the variables only for small transforms and highlight positions; never translate content more than 8px.

- [ ] **Step 5: Add the CSS depth effect and complete reduced-motion reset**

Use `--pointer-x` and `--pointer-y` in the background pseudo-element and status cards. In the existing reduced-motion block, set all glass/reveal transitions and animations to `none`, remove transforms, and leave all content visible.

- [ ] **Step 6: Run motion, navigation and JS-error tests**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js tests/e2e/impl.spec.js --grep "动效|指针|减少动画|TC20|TC21"
```

Expected: no generated particle layers, pointer variables update only in normal motion mode, and no page errors occur.

- [ ] **Step 7: Commit the motion update**

```powershell
git add js/site-motion.js styles.css tests/e2e/personalization.spec.js
git commit -m "feat: add subtle garden depth motion"
```

---

### Task 4: Migrate profile, project and editorial content pages

**Files:**
- Modify: `about.html`
- Modify: `projects.html`
- Modify: `contact.html`
- Modify: `blog.html`
- Modify: `article.html`
- Modify: `wiki.html`
- Modify: `knowledge.html`
- Modify: `library.html`
- Modify: `styles.css:607-1797`
- Modify: `tests/e2e/personalization.spec.js`

**Interfaces:**
- Consumes: shared garden and glass tokens from Task 1.
- Produces: `.page-shell`, `.glass-page-header`, `.project-showcase`, `.editorial-index`; retains all DOM IDs consumed by `js/blog.js` and `js/wiki.js`.

- [ ] **Step 1: Add failing inner-page structure tests**

Append:

```js
test('档案、项目和内容页使用对应的共享布局', async ({ page }) => {
  const cases = [
    ['/about.html', '.profile-dossier'],
    ['/projects.html', '.project-showcase'],
    ['/blog.html', '.editorial-index'],
    ['/wiki.html', '.editorial-index'],
    ['/article.html?slug=hello-world', '.reading-surface'],
  ];
  for (const [path, selector] of cases) {
    await page.goto(path);
    await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator('.glass-page-header')).toBeVisible();
  }
});

test('动态内容容器 ID 在视觉迁移后保持存在', async ({ page }) => {
  await page.goto('/blog.html');
  await expect(page.locator('#article-list')).toBeAttached();
  await page.goto('/wiki.html');
  await expect(page.locator('#wiki-content')).toBeAttached();
});
```

- [ ] **Step 2: Run and verify the inner-page tests fail**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js --grep "档案|动态内容容器"
```

Expected: the new shared layout classes do not exist.

- [ ] **Step 3: Add semantic wrapper classes without changing data hooks**

For the listed pages:

- add `.glass-page-header` to the existing `.page-header`;
- wrap the primary content in `.page-shell` only where no equivalent container exists;
- use `.profile-dossier` on About/Contact, `.project-showcase` on Projects, `.editorial-index` on Blog/Wiki/Knowledge/Library, and `.reading-surface` on Article;
- add `.glass-panel` to appropriate static cards and parent containers rather than every nested element;
- translate static headings, filter labels and buttons to Chinese;
- preserve all element IDs, query parameters, hash routes and `data-*` attributes used by JavaScript.

- [ ] **Step 4: Implement editorial and project visual hierarchy**

Add shared CSS:

```css
.page-shell {
  width: min(var(--max-width), calc(100% - 48px));
  margin: 0 auto 72px;
}

.glass-page-header {
  width: min(var(--max-width), calc(100% - 48px));
  margin: 32px auto 28px;
  padding: clamp(28px, 5vw, 56px);
  border-radius: 34px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.project-showcase .project-detail-card:first-child {
  grid-column: 1 / -1;
  min-height: 320px;
}

.reading-surface,
.editorial-index {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: 30px;
  box-shadow: var(--glass-shadow);
}
```

Refine existing selectors rather than duplicating complete card systems. Ensure article body contrast remains higher than decorative cards.

- [ ] **Step 5: Run content behavior and responsive tests**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js tests/e2e/impl.spec.js --grep "档案|动态内容容器|TC05|TC06|TC07|TC14|TC15|TC16|TC19|TC22"
```

Expected: visual wrappers exist and all blog/Wiki data behavior remains unchanged.

- [ ] **Step 6: Commit the editorial-page migration**

```powershell
git add about.html projects.html contact.html blog.html article.html wiki.html knowledge.html library.html styles.css tests/e2e/personalization.spec.js
git commit -m "feat: style profile projects and editorial pages"
```

---

### Task 5: Migrate dense data pages and preserve safe states

**Files:**
- Modify: `papers.html`
- Modify: `reader.html`
- Modify: `assistant.html`
- Modify: `status.html`
- Modify: `styles.css`
- Modify: `js/papers.js`
- Modify: `js/reader.js`
- Modify: `js/assistant.js`
- Modify: `js/status.js`
- Modify: `tests/e2e/personalization.spec.js`

**Interfaces:**
- Consumes: `.glass-page-header`, `.glass-panel`, `.page-shell` from Tasks 1 and 4.
- Produces: `.dense-glass-list`, `.assistant-surface`, `.status-surface`; exact Chinese state messages `正在加载…`, `暂时没有内容`, `加载失败，请稍后重试。` rendered through `textContent`.

- [ ] **Step 1: Add failing data-surface and safe-state tests**

Append:

```js
test('论文、阅读器、助手和状态页使用高可读玻璃容器', async ({ page }) => {
  const cases = [
    ['/papers.html', '.dense-glass-list'],
    ['/reader.html', '.dense-glass-list'],
    ['/assistant.html', '.assistant-surface'],
    ['/status.html', '.status-surface'],
  ];
  for (const [path, selector] of cases) {
    await page.goto(path);
    await expect(page.locator(selector)).toBeVisible();
    const background = await page.locator(selector).evaluate(el => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
  }
});

test('阅读器数据失败时显示中文安全错误状态', async ({ page }) => {
  await page.route('**/public/data/rss-items.json', route => route.abort());
  await page.goto('/reader.html');
  await expect(page.locator('body')).toContainText('加载失败，请稍后重试。');
  const html = await page.locator('body').innerHTML();
  expect(html).not.toContain('onclick=');
});
```

- [ ] **Step 2: Run and verify the data-surface tests fail**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js --grep "论文|阅读器数据失败"
```

Expected: new surface classes are absent and the old error copy differs.

- [ ] **Step 3: Apply high-opacity glass containers**

Add `.dense-glass-list`, `.assistant-surface` and `.status-surface` to the existing page-level containers without renaming IDs used by the JavaScript files. Use `--glass-bg-strong` and smaller blur than the home hero; information contrast takes priority over showing the background.

- [ ] **Step 4: Normalize user-facing state copy without changing render safety**

In each listed JavaScript file, locate existing loading, empty and catch branches. Set state messages through the existing `textContent` or DOM-node path to these exact strings:

```js
loadingElement.textContent = '正在加载…';
emptyElement.textContent = '暂时没有内容';
errorElement.textContent = '加载失败，请稍后重试。';
```

Use the actual existing local variable names in each file; do not introduce `innerHTML` or `insertAdjacentHTML` for remote data.

- [ ] **Step 5: Run data, safety and JS-error tests**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js tests/e2e/impl.spec.js --grep "论文|阅读器数据失败|TC12|TC13|TC20|TC22"
```

Expected: glass surfaces are visible, the forced reader failure shows the exact Chinese message, and no safety or page-error test regresses.

- [ ] **Step 6: Commit the dense-page migration**

```powershell
git add papers.html reader.html assistant.html status.html styles.css js/papers.js js/reader.js js/assistant.js js/status.js tests/e2e/personalization.spec.js
git commit -m "feat: style data pages and localize states"
```

---

### Task 6: Final accessibility, responsive and repository verification

**Files:**
- Modify: `styles.css`
- Modify: `tests/e2e/personalization.spec.js`
- Modify only if a failure proves necessary: any HTML or JavaScript file already listed in Tasks 1-5.

**Interfaces:**
- Consumes: the completed visual system and all stable selectors from Tasks 1-5.
- Produces: verified desktop/tablet/mobile layout, keyboard access, reduced-motion behavior and repository quality gate.

- [ ] **Step 1: Add final focus, image-fallback and overflow tests**

Append:

```js
test('键盘焦点在玻璃导航上清晰可见', async ({ page }) => {
  await page.goto('/index.html');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate(el => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('背景图片失败时仍有非透明渐变背景', async ({ page }) => {
  await page.route('**/assets/images/garden-background.jpg', route => route.abort());
  await page.goto('/index.html');
  const background = await page.locator('body').evaluate(el => getComputedStyle(el, '::before').backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('.home-profile-panel')).toBeVisible();
});

for (const width of [375, 768, 1280]) {
  test(`${width}px 全站关键页面无横向溢出`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const path of ['/index.html', '/projects.html', '/blog.html', '/reader.html', '/assistant.html']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await context.close();
  });
}
```

- [ ] **Step 2: Run the final new tests and fix only observed failures**

Run:

```powershell
npx playwright test --config tests/playwright.config.js tests/e2e/personalization.spec.js
```

Expected: all personalization tests pass. If a test fails, make the smallest CSS/markup correction that satisfies the documented design; do not add unrelated features.

- [ ] **Step 3: Run the Python quality gate**

Run:

```powershell
python scripts/check.py
```

If `python` is unavailable, run:

```powershell
py -3 scripts/check.py
```

Expected: exit code 0 and the repository check summary reports success.

- [ ] **Step 4: Run the complete Playwright suite**

Run:

```powershell
npx playwright test --config tests/playwright.config.js
```

Expected: every existing and new E2E test passes with no retries.

- [ ] **Step 5: Inspect the final diff and generated-file boundary**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: only the source asset, HTML, CSS, browser JavaScript and E2E tests named in this plan are changed; no `public/data/`, `feed.xml` or `subscriptions.opml` changes appear.

- [ ] **Step 6: Commit final verification fixes**

```powershell
git add styles.css tests/e2e/personalization.spec.js
git add *.html js/*.js
git commit -m "test: verify responsive glass personalization"
```

If Step 2 required no fixes after Task 5, skip this empty commit.
