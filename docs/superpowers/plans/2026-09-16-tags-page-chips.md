# Tags Page Chip Cloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render `/tags/` as a centered, accessible purple/blue chip cloud with a size-by-frequency heat scale.

**Architecture:** Keep Hexo's built-in `tagcloud` helper and pass options from `source/tags/index.md` (`class:tag-chip`, `unit:em`, `orderby:length order:-1`). The helper emits `tag-chip-0`…`tag-chip-10` classes plus an inline `font-size` in `em`. A site-owned wrapper `<div class="tag-cloud-list">` plus rules in `source/css/custom.css` provide the chip visuals, dark theme overrides, and responsive scaling. No JavaScript is added.

**Tech Stack:** Hexo 8, Reimu 1.12.5 (pinned), plain CSS in `source/css/custom.css`, Node test runner for unit tests, Playwright for E2E.

## Global Constraints

- Do not edit `node_modules/` or theme sources; customization stays in `source/` and site config.
- Do not add dependencies or a front-end framework.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Reuse Reimu tokens (`--red-0` … `--red-6`); no new palette variables.
- Do not commit `public/`, screenshots, or generated artifacts.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Respect `prefers-reduced-motion` (existing global rule handles transitions).
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Chip cloud markup, styles, and coverage

**Files:**
- Modify: `source/tags/index.md`
- Modify: `source/css/custom.css` (insert before the `:focus-visible` rule)
- Modify: `tests/unit/generated-site.test.mjs` (insert after the "generates retained routes" test, line 43)
- Modify: `tests/e2e/site.spec.js` (insert after the "retained page and taxonomy navigation" test, line 218)
- Test: `tests/unit/generated-site.test.mjs`, `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Hexo `tagcloud` helper options `min_font`, `max_font`, `unit`, `orderby`, `order`, `class` (documented in `node_modules/hexo/dist/plugins/helper/tagcloud.js`).
- Produces: container class `tag-cloud-list`, chip classes `tag-chip-0` … `tag-chip-10` in generated HTML, styled by `source/css/custom.css`.

- [ ] **Step 1: Write the failing unit test**

Insert this test into `tests/unit/generated-site.test.mjs` immediately after the `'generates retained routes, nine posts, and an Atom feed'` test (after line 43, before the `'uses the default campus cover for lazy-loaded home cards'` test):

```js
test('renders the tags page as a chip cloud', async () => {
  const tags = await readFile('public/tags/index.html', 'utf8');
  const cloud = /<div class="tag-cloud-list">([\s\S]*?)<\/div>/.exec(tags);
  assert.ok(cloud, 'tag cloud container exists');
  const chips = [...cloud[1].matchAll(/<a href="([^"]+)" style="font-size: [^"]*" class="tag-chip-(\d+)">/g)];
  assert.equal(chips.length, 16);
  assert.equal(chips[0][2], '10', 'the most-used tag renders first with the hottest class');
  for (const [, href] of chips) assert.ok(href.startsWith('/jingtine-agent-site/tags/'), href);
  assert.match(cloud[1], /class="tag-chip-10"/);
  assert.match(cloud[1], /class="tag-chip-0"/);
  assert.doesNotMatch(cloud[1], /background-color/);
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run:

```powershell
npm run check
npm run test:unit
```

Expected: `npm run check` prints `PASS: 8 routes, 9 posts, ...`; `npm run test:unit` reports `fail 1` for `renders the tags page as a chip cloud` with `AssertionError [ERR_ASSERTION]: tag cloud container exists` (the current page has no wrapper), while the other 29 tests pass.

- [ ] **Step 3: Update the tags page source**

Replace the body of `source/tags/index.md` so the file becomes exactly:

```markdown
---
title: 标签
date: 2026-09-16 12:00:00
comments: false
---

<div class="tag-cloud-list">
{% tagcloud min_font:1 max_font:1.6 unit:em orderby:length order:-1 class:tag-chip %}
</div>
```

Notes: no blank lines between the wrapper, the tag, and `</div>` keeps the whole block a single raw-HTML block for the Markdown renderer. The intro sentence is removed on purpose.

- [ ] **Step 4: Rebuild and run the unit test to verify it passes**

Run:

```powershell
npm run check
npm run test:unit
```

Expected: `npm run check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; `npm run test:unit` reports `pass 30`, `fail 0`.

- [ ] **Step 5: Write the failing E2E test**

Insert this test into `tests/e2e/site.spec.js` immediately after the `'retained page and taxonomy navigation resolves without 404s'` test (after line 218, before the `'Pixel viewport has no horizontal overflow...'` test):

```js
test('tags page renders a centered chip cloud with accessible focus states', async ({ page, isMobile }) => {
  await page.goto('./tags/');
  const chips = page.locator('.tag-cloud-list a');
  const cool = page.locator('.tag-cloud-list a.tag-chip-0').first();
  const hot = page.locator('.tag-cloud-list a.tag-chip-10').first();
  await expect(chips).toHaveCount(16);
  await expect(page.locator('.tag-cloud-list a.tag-chip-10')).toHaveCount(3);
  await expect(chips.first()).toHaveAttribute('href', new RegExp(`^${root}tags/`));

  const coolStyle = await cool.evaluate(element => {
    const css = getComputedStyle(element);
    const luminance = color => {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const foreground = luminance(css.color);
    const background = luminance(css.backgroundColor);
    return {
      radius: parseFloat(css.borderRadius),
      background: css.backgroundColor,
      fontSize: parseFloat(css.fontSize),
      after: getComputedStyle(element, '::after').content,
      contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
    };
  });
  expect(coolStyle.radius).toBeGreaterThanOrEqual(20);
  expect(coolStyle.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(coolStyle.after).toBe('none');
  expect(coolStyle.contrast, 'cool chip contrast').toBeGreaterThanOrEqual(4.5);

  const hotStyle = await hot.evaluate(element => {
    const css = getComputedStyle(element);
    return { backgroundImage: css.backgroundImage, fontSize: parseFloat(css.fontSize), color: css.color };
  });
  expect(hotStyle.backgroundImage).not.toBe('none');
  expect(hotStyle.fontSize).toBeGreaterThan(coolStyle.fontSize);
  expect(hotStyle.color).toBe('rgb(255, 255, 255)');

  for (let step = 0; step < 40 && !await chips.first().evaluate(element => element === document.activeElement); step++) {
    await page.keyboard.press('Tab');
  }
  await expect(chips.first()).toBeFocused();
  const outline = await chips.first().evaluate(element => ({
    style: getComputedStyle(element).outlineStyle,
    width: parseFloat(getComputedStyle(element).outlineWidth),
  }));
  expect(outline.style).toBe('solid');
  expect(outline.width).toBeGreaterThanOrEqual(2);

  if (isMobile) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
```

- [ ] **Step 6: Run the E2E test to verify it fails**

Run:

```powershell
npm run test:e2e
```

Expected: `2 failed` (the new test on `desktop-chrome` and `pixel-mobile`), `18 passed`. The first failure is `expect(received).toBeGreaterThanOrEqual(expected)` for `coolStyle.radius` with `Expected: >= 20, Received: 0` — the chips are still unstyled.

- [ ] **Step 7: Add the chip styles**

In `source/css/custom.css`, insert this block immediately before the existing `:focus-visible` rule:

```css
.tag-cloud-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem 0.65rem;
  margin: 1.25rem 0 0.25rem;
  font-size: 15px;
}

.tag-cloud-list a {
  display: inline-flex;
  align-items: center;
  padding: 0.35em 0.95em;
  border: 1px solid color-mix(in srgb, var(--red-2) 35%, transparent);
  border-radius: 999px;
  background: var(--red-5);
  color: color-mix(in srgb, var(--red-0) 72%, #14141b);
  font-weight: 600;
  line-height: 1.7;
  text-decoration: none;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease, color 0.25s ease;
}

.tag-cloud-list a::after {
  content: none !important;
}

.tag-cloud-list a:hover {
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 0.5rem 1.2rem color-mix(in srgb, var(--red-1) 26%, transparent);
}

.tag-cloud-list:hover a:not(:hover) {
  opacity: 0.72;
}

.tag-cloud-list a.tag-chip-5,
.tag-cloud-list a.tag-chip-6,
.tag-cloud-list a.tag-chip-7 {
  background: var(--red-4);
}

.tag-cloud-list a.tag-chip-8,
.tag-cloud-list a.tag-chip-9,
.tag-cloud-list a.tag-chip-10 {
  border-color: transparent;
  background: linear-gradient(135deg, var(--red-0), var(--red-1));
  color: #fff;
  box-shadow: 0 0.5rem 1.2rem color-mix(in srgb, var(--red-1) 24%, transparent);
}

[data-theme='dark'] .tag-cloud-list a {
  border-color: color-mix(in srgb, var(--red-1) 32%, transparent);
  background: color-mix(in srgb, var(--red-1) 16%, transparent);
  color: var(--red-2);
}

[data-theme='dark'] .tag-cloud-list a.tag-chip-5,
[data-theme='dark'] .tag-cloud-list a.tag-chip-6,
[data-theme='dark'] .tag-cloud-list a.tag-chip-7 {
  background: color-mix(in srgb, var(--red-1) 26%, transparent);
}

[data-theme='dark'] .tag-cloud-list a.tag-chip-8,
[data-theme='dark'] .tag-cloud-list a.tag-chip-9,
[data-theme='dark'] .tag-cloud-list a.tag-chip-10 {
  border-color: color-mix(in srgb, var(--red-1) 55%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--red-1) 40%, transparent), color-mix(in srgb, var(--red-1) 22%, transparent));
  color: #fff;
}

@media (max-width: 767px) {
  .tag-cloud-list {
    gap: 0.4rem 0.5rem;
    font-size: 13.5px;
  }
}
```

Why each non-obvious rule exists:

- `::after { content: none !important; }` — the theme's `.article-entry a:not(...)::after` rule has higher specificity and would otherwise draw an iconfont arrow after every chip.
- `color: color-mix(in srgb, var(--red-0) 72%, #14141b)` — plain `--red-0` on `--red-5` is only ~4.0:1; the darkened mix reaches ~5.9:1 and keeps the purple tone.
- Hot chips are `1.6em` (24px bold = WCAG large text), so white on the purple gradient clears the 3:1 large-text threshold.

- [ ] **Step 8: Run the E2E test to verify it passes**

Run:

```powershell
npm run test:e2e
```

Expected: `20 passed`.

- [ ] **Step 9: Run the full gate**

Run:

```powershell
npm test
```

Expected: exit code 0; `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 30`, `fail 0`; Playwright reports `20 passed`.

- [ ] **Step 10: Visual review**

Write this temporary script to `C:\Users\LJT\AppData\Local\Temp\opencode\tags-shots.cjs`:

```js
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium, devices } = require(path.join(process.cwd(), 'node_modules', '@playwright/test'));

const base = 'http://127.0.0.1:8081/jingtine-agent-site/tags/';
const outDir = path.join(os.tmpdir(), 'tags-shots');
fs.mkdirSync(outDir, { recursive: true });

async function waitForServer(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(base);
      if (res.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('server did not start');
}

(async () => {
  const server = spawn(process.execPath, ['hexo-runner.cjs', 'server', '--port', '8081'], { cwd: process.cwd(), stdio: 'ignore' });
  try {
    await waitForServer(60000);
    const browser = await chromium.launch();
    for (const [name, colorScheme, options] of [
      ['desktop-light', 'light', { viewport: { width: 1280, height: 900 } }],
      ['desktop-dark', 'dark', { viewport: { width: 1280, height: 900 } }],
      ['mobile-light', 'light', { ...devices['Pixel 7'] }],
      ['mobile-dark', 'dark', { ...devices['Pixel 7'] }],
    ]) {
      const context = await browser.newContext({ ...options, colorScheme });
      const page = await context.newPage();
      await page.goto(base, { waitUntil: 'load' });
      await page.waitForTimeout(2500);
      await page.locator('#main').screenshot({ path: path.join(outDir, `${name}.png`) });
      await context.close();
    }
    await browser.close();
    console.log('shots written to ' + outDir);
  } finally {
    server.kill();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
```

Run from the repository root:

```powershell
node "C:\Users\LJT\AppData\Local\Temp\opencode\tags-shots.cjs"
```

Then inspect the four PNG files in `%TEMP%\tags-shots` and confirm:

- chips are centered with even spacing and rounded pill shapes;
- cool chips are pale purple with deep purple text; the three hot chips use the purple gradient with white text and are visibly larger;
- no arrow glyph follows any chip label;
- dark theme chips are readable and match the dark surface;
- mobile chips wrap without horizontal overflow.

Do not commit these screenshots.

- [ ] **Step 11: Commit**

Run:

```powershell
git status --porcelain=v1
git add source/tags/index.md source/css/custom.css tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: style the tags page as a chip cloud"
```

Expected: `git status` lists only the four modified files before staging; the commit succeeds with `4 files changed`.

Deployment to GitHub Pages happens only when `main` is pushed; do not push without an explicit request.

---

## Self-Review

**Spec coverage**

- Centered chip cloud, rounded chips, size by frequency → Steps 3 and 7.
- Helper reuse with `class`/`unit`/`orderby` → Step 3.
- Purple/blue heat tiers and dark overrides → Step 7.
- Hover lift, sibling dim, no shine animation → Step 7 (transitions only; global reduced-motion rule).
- No counts, no random colors, no theme edits → Global Constraints and Step 3/7.
- Focus visibility without clipping → Step 7 (`border-radius`, no `overflow: hidden`) and Step 5 focus assertion.
- Responsive sizing and no mobile overflow → Step 7 media query and Step 5 mobile assertion.
- Unit and E2E coverage as specified → Steps 1 and 5.
- Validation commands and manual screenshot review → Steps 2, 4, 6, 8, 9, 10.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** container class `tag-cloud-list` and chip classes `tag-chip-0`…`tag-chip-10` are used identically in the source, CSS, unit test, and E2E test. The E2E `luminance` helper matches the existing test at `tests/e2e/site.spec.js:187`.
