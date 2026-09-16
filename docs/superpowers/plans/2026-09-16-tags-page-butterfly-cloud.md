# Butterfly-Style Tags Cloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/tags/` page as a Butterfly-style multicolor tag cloud: local `cloud_tags` plugin, fixed palette with stable per-tag colors, random order, and Butterfly's entry/hover/active/mobile visuals.

**Architecture:** `scripts/tags.js` gains a `cloud_tags` tag plugin that mirrors hexo-theme-butterfly's `cloudTags` helper (size buckets from post counts, inline `font-size` and `background-color`, random order, palette colors by name hash). `source/tags/index.md` uses `{% cloud_tags %}` inside a `.tag-cloud-list` wrapper. `source/css/custom.css` replaces the previous chip rules with Butterfly-style rules (7px radius, white text, entry fade, hover shine/lift, sibling fade, active press, mobile zoom). No runtime JavaScript and no new dependencies.

**Tech Stack:** Hexo 8, Reimu 1.12.5 (pinned), plain CSS in `source/css/custom.css`, Node test runner, Playwright.

**Supersedes:** the chip-cloud implementation from commits `a03ca2a` / `4677832` and the design in `docs/superpowers/specs/2026-09-16-tags-page-chips-design.md`.

## Global Constraints

- Do not edit `node_modules/` or theme sources; customization stays in `source/` and site config.
- Do not add dependencies or a front-end framework; no new runtime JavaScript.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Palette is fixed at exactly: `#6d4fc4`, `#3b6fc9`, `#2f7d7a`, `#b23a7a`, `#b5542f`, `#3f7f4f`, `#5a5fc7`, `#4a6b8a` (all ≥ 4.82:1 against white).
- Tag order is random per build; colors are stable per tag name. Tests must never assert order.
- Do not commit `public/`, screenshots, or generated artifacts.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Respect `prefers-reduced-motion` (existing global rule handles animations/transitions).
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: `cloud_tags` construction and Butterfly visuals

**Files:**
- Modify: `scripts/tags.js` (insert after the `tagcloud` tag registration, before the `// Reimu 1.12.5 hardcodes...` comment)
- Modify: `source/tags/index.md`
- Modify: `source/css/custom.css` (replace lines 66–144)
- Modify: `tests/unit/generated-site.test.mjs` (insert a plugin test after the `site filters...` test; replace the `renders the tags page as a chip cloud` test)
- Modify: `tests/e2e/site.spec.js` (replace the tags test at lines 220–278)
- Test: `tests/unit/generated-site.test.mjs`, `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Hexo tag registration (`hexo.extend.tag.register`), helper registry (`hexo.extend.helper.get("url_for")`), site tags collection (`hexo.locals.get("tags")`, a Warehouse Query with `.length`, `.map`, `.random`).
- Produces: `{% cloud_tags %}` emitting `<a href="…" class="tag-cloud-item" style="font-size: {1.2|1.5}em; background-color: {palette};">name</a>` per tag, joined without separators; styled by the `.tag-cloud-list` rules in `source/css/custom.css`.

- [ ] **Step 1: Write the failing plugin unit test**

Insert this test into `tests/unit/generated-site.test.mjs` immediately after the `'site filters fix only exact theme 404 and iconfont URLs'` test (after line 31, before the `'generates retained routes, nine posts, and an Atom feed'` test):

```js
test('cloud_tags emits palette chips with stable colors and escaped names', async () => {
  const registered = new Map();
  const helpers = new Map();
  const collection = [
    { name: 'AI Agent', path: 'tags/AI-Agent/', length: 2 },
    { name: 'AI', path: 'tags/AI/', length: 1 },
    { name: '设计', path: 'tags/%E8%AE%BE%E8%AE%A1/', length: 1 },
    { name: '<script>', path: 'tags/script/', length: 1 },
  ];
  collection.random = function () {
    const items = [...this];
    return this.shuffled ? items.reverse() : items;
  };
  vm.runInNewContext(await readFile('scripts/tags.js', 'utf8'), {
    hexo: {
      config: { root: '/jingtine-agent-site/' },
      theme: { config: { icon_font: '4552607_ex15nbittbh' } },
      locals: { get: () => collection },
      extend: {
        tag: { register(name, handler) { registered.set(name, handler); } },
        helper: {
          register(name, handler) { helpers.set(name, handler); },
          get(name) { return helpers.get(name); },
        },
        filter: { register() {} },
      },
    },
  });
  helpers.set('url_for', path => `/jingtine-agent-site/${path}`);
  const render = registered.get('cloud_tags');
  assert.equal(typeof render, 'function');

  const parse = html => [...html.matchAll(/<a href="([^"]+)" class="tag-cloud-item" style="font-size: ([^;]+); background-color: (#[0-9a-f]{6});">([^<]*)<\/a>/g)]
    .map(match => ({ href: match[1], fontSize: match[2], color: match[3], name: match[4] }));
  const palette = ['#6d4fc4', '#3b6fc9', '#2f7d7a', '#b23a7a', '#b5542f', '#3f7f4f', '#5a5fc7', '#4a6b8a'];

  const first = parse(render.call({}));
  assert.equal(first.length, 4);
  for (const chip of first) {
    assert.ok(chip.href.startsWith('/jingtine-agent-site/tags/'), chip.href);
    assert.ok(palette.includes(chip.color), chip.color);
    assert.ok(['1.2em', '1.5em'].includes(chip.fontSize), chip.fontSize);
  }
  assert.equal(first.find(chip => chip.name === 'AI Agent').fontSize, '1.5em');
  assert.equal(first.find(chip => chip.name === 'AI').fontSize, '1.2em');
  assert.ok(first.some(chip => chip.name === '&lt;script&gt;'), 'tag names are escaped');

  collection.shuffled = true;
  const second = parse(render.call({}));
  assert.notDeepEqual(first.map(chip => chip.name), second.map(chip => chip.name));
  assert.deepEqual(
    Object.fromEntries(first.map(chip => [chip.name, chip.color])),
    Object.fromEntries(second.map(chip => [chip.name, chip.color])),
  );

  collection.length = 0;
  assert.equal(render.call({}), '');
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run:

```powershell
npm run test:unit
```

Expected: `fail 1` for `cloud_tags emits palette chips with stable colors and escaped names` with `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal` at `assert.equal(typeof render, 'function')`; the other 30 tests pass. (`cloud_tags` is not registered yet, so `render` is `undefined`.)

- [ ] **Step 3: Implement the `cloud_tags` tag**

In `scripts/tags.js`, insert this block immediately after the `tagcloud` tag registration (after the closing `});` of `hexo.extend.tag.register("tagcloud", ...)`) and before the `// Reimu 1.12.5 hardcodes...` comment:

```js
/**
 * Butterfly-style tag cloud for the tags index page.
 *
 * Mirrors hexo-theme-butterfly's `cloudTags` helper: font sizes bucket by
 * post count, a fixed multicolor palette, and inline font-size and
 * background-color. Order is random per build; colors stay stable per name.
 */
const TAG_PALETTE = ['#6d4fc4', '#3b6fc9', '#2f7d7a', '#b23a7a', '#b5542f', '#3f7f4f', '#5a5fc7', '#4a6b8a'];

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const paletteColor = name => {
  let hash = 0;
  for (const char of String(name)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
};

const renderCloudTags = (tags, urlFor) => {
  if (!tags || !tags.length) return '';
  const sizes = [...new Set(tags.map(tag => tag.length).sort((a, b) => a - b))];
  const span = sizes.length - 1;
  return tags.random().map(tag => {
    const ratio = span ? sizes.indexOf(tag.length) / span : 0;
    const fontSize = parseFloat((1.2 + 0.3 * ratio).toFixed(2));
    return `<a href="${urlFor(tag.path)}" class="tag-cloud-item" style="font-size: ${fontSize}em; background-color: ${paletteColor(tag.name)};">${escapeHtml(tag.name)}</a>`;
  }).join('');
};

hexo.extend.tag.register("cloud_tags", function () {
  const urlFor = hexo.extend.helper.get("url_for");
  return renderCloudTags(hexo.locals.get("tags"), path => urlFor.call(hexo, path));
});
```

Notes: `tags.random()` comes from Warehouse (`Query.prototype.random`); `url_for` keeps the project-root prefix; `escapeHtml` protects tag names; hash-based colors keep each tag's color stable across the random order.

- [ ] **Step 4: Run the unit test to verify it passes**

Run:

```powershell
npm run test:unit
```

Expected: `pass 31`, `fail 0`.

- [ ] **Step 5: Replace the generated-markup unit test**

Replace the existing test `renders the tags page as a chip cloud` (currently lines 45–56 of `tests/unit/generated-site.test.mjs`) with:

```js
test('renders the tags page as a Butterfly-style cloud', async () => {
  const palette = ['#6d4fc4', '#3b6fc9', '#2f7d7a', '#b23a7a', '#b5542f', '#3f7f4f', '#5a5fc7', '#4a6b8a'];
  const tags = await readFile('public/tags/index.html', 'utf8');
  const cloud = /<div class="tag-cloud-list">([\s\S]*?)<\/div>/.exec(tags);
  assert.ok(cloud, 'tag cloud container exists');
  assert.doesNotMatch(cloud[1], /tag-chip-/);
  const chips = [...cloud[1].matchAll(/<a href="([^"]+)" class="tag-cloud-item" style="font-size: ([^;]+); background-color: (#[0-9a-f]{6});">([^<]*)<\/a>/g)];
  assert.equal(chips.length, 16);
  assert.equal(new Set(chips.map(chip => chip[4])).size, 16);
  for (const [, href, fontSize, color] of chips) {
    assert.ok(href.startsWith('/jingtine-agent-site/tags/'), href);
    assert.ok(['1.2em', '1.5em'].includes(fontSize), fontSize);
    assert.ok(palette.includes(color), color);
  }
  assert.ok(chips.some(chip => chip[2] === '1.5em'), 'the most-used tags render larger');
});
```

- [ ] **Step 6: Rebuild and verify the markup test fails**

Run:

```powershell
npm run check
npm run test:unit
```

Expected: `npm run check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; `npm run test:unit` reports `fail 1` with `AssertionError [ERR_ASSERTION]: The input was expected to not match the regular expression` (the generated page still contains `tag-chip-` markup because the page source has not changed yet), while the other 30 tests pass.

- [ ] **Step 7: Switch the tags page to `cloud_tags`**

Replace the body of `source/tags/index.md` so the file becomes exactly:

```markdown
---
title: 标签
date: 2026-09-16 12:00:00
comments: false
---

<div class="tag-cloud-list">
{% cloud_tags %}
</div>
```

- [ ] **Step 8: Rebuild and verify all unit tests pass**

Run:

```powershell
npm run check
npm run test:unit
```

Expected: `npm run check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; 37 HTML files and ...`; `npm run test:unit` reports `pass 31`, `fail 0`.

- [ ] **Step 9: Replace the E2E tags test**

Replace the existing test `tags page renders a centered chip cloud with accessible focus states` (currently lines 220–278 of `tests/e2e/site.spec.js`) with:

```js
test('tags page renders a Butterfly-style multicolor cloud', async ({ page, isMobile }) => {
  const palette = ['#6d4fc4', '#3b6fc9', '#2f7d7a', '#b23a7a', '#b5542f', '#3f7f4f', '#5a5fc7', '#4a6b8a']
    .map(hex => {
      const value = parseInt(hex.slice(1), 16);
      return `rgb(${value >> 16 & 255}, ${value >> 8 & 255}, ${value & 255})`;
    });
  await page.goto('./tags/');
  const chips = page.locator('.tag-cloud-list a');
  await expect(chips).toHaveCount(16);
  await expect(chips.first()).toHaveAttribute('href', new RegExp(`^${root}tags/`));

  const styles = await chips.evaluateAll(elements => elements.map(element => {
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
      color: css.color,
      background: css.backgroundColor,
      fontSize: parseFloat(css.fontSize),
      contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
      after: getComputedStyle(element, '::after').content,
      shine: getComputedStyle(element, '::before').backgroundImage,
    };
  }));
  for (const style of styles) {
    expect(style.radius, `radius for ${style.background}`).toBe(7);
    expect(style.color, `text color for ${style.background}`).toBe('rgb(255, 255, 255)');
    expect(palette, `palette membership for ${style.background}`).toContain(style.background);
    expect(style.contrast, `contrast for ${style.background}`).toBeGreaterThanOrEqual(4.5);
    expect(style.after).toBe('none');
    expect(style.shine).toContain('gradient');
  }
  expect(new Set(styles.map(style => style.fontSize)).size).toBe(2);

  // The enabled sidebar widgets push the first chip to tab stop 44 on desktop.
  const tabBudget = 60;
  for (let step = 0; step < tabBudget && !await chips.first().evaluate(element => element === document.activeElement); step++) {
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
    const scaled = await chips.first().evaluate(element => ({
      zoom: getComputedStyle(document.querySelector('.tag-cloud-list')).zoom,
      shine: getComputedStyle(element, '::before').display,
    }));
    expect(scaled.zoom).toBe('0.85');
    expect(scaled.shine).toBe('none');
  } else {
    await chips.first().hover();
    await expect.poll(() => chips.first().evaluate(element => getComputedStyle(element).filter)).toContain('brightness');
  }
});
```

- [ ] **Step 10: Run the E2E test to verify it fails**

Run:

```powershell
npm run test:e2e
```

Expected: `2 failed` (the new test on `desktop-chrome` and `pixel-mobile`), `18 passed`. The first failure is `expect(style.radius).toBe(7)` with `Expected: 7, Received: 999` (the old chip CSS still applies a 999px pill radius).

- [ ] **Step 11: Replace the tag cloud CSS**

In `source/css/custom.css`, replace the block from `.tag-cloud-list {` (line 66) through the closing `}` of the `@media (max-width: 767px)` rule (line 144) — the entire previous tag-cloud/chip section — with:

```css
.tag-cloud-list {
  margin: 1rem 0 0.25rem;
  text-align: center;
  animation: tags-fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-cloud-list:hover a:not(:hover) {
  opacity: 0.7;
  transform: scale(0.98);
}

.tag-cloud-list a {
  position: relative;
  display: inline-block;
  margin: 5px;
  padding: 3px 12px;
  border-radius: 7px;
  overflow: hidden;
  color: #fff;
  line-height: 1.7;
  text-decoration: none;
  transform: translateY(0) scale(1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, background-color, box-shadow;
}

.tag-cloud-list a::before {
  position: absolute;
  top: 0;
  left: -100%;
  z-index: -1;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  content: '';
  transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-cloud-list a::after {
  content: none !important;
}

.tag-cloud-list a:hover {
  text-decoration: none;
  filter: brightness(1.08);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.tag-cloud-list a:hover::before {
  left: 100%;
}

.tag-cloud-list a:active {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes tags-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 767px) {
  .tag-cloud-list {
    zoom: 0.85;
  }

  .tag-cloud-list a:hover {
    transform: translateY(-1px) scale(1.01);
  }

  .tag-cloud-list a:active {
    transform: translateY(0) scale(0.99);
  }

  .tag-cloud-list a::before {
    display: none;
  }
}
```

Why these rules exist:

- `::after { content: none !important; }` — Reimu's `.article-entry a:not(...)::after` rule has higher specificity and would draw an iconfont arrow after every chip.
- `::before` with `z-index: -1` — `will-change: transform` makes the chip a stacking context, so the shine paints above the chip's own background but below its text.
- `filter: brightness(1.08)` on hover — keeps each chip's fixed palette color instead of switching to Reimu's light accent tokens (which would break white-text contrast in dark mode).
- No dark-theme overrides — the fixed palette is AA against white in both themes.

- [ ] **Step 12: Run the E2E test to verify it passes**

Run:

```powershell
npm run test:e2e
```

Expected: `20 passed`.

- [ ] **Step 13: Run the full gate**

Run:

```powershell
npm test
```

Expected: exit code 0; `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 31`, `fail 0`; Playwright reports `20 passed`.

- [ ] **Step 14: Visual review**

Write this temporary script to `C:\Users\LJT\AppData\Local\Temp\opencode\tags-cloud-shots.cjs`:

```js
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium, devices } = require(path.join(process.cwd(), 'node_modules', '@playwright/test'));

const base = 'http://127.0.0.1:8081/jingtine-agent-site/tags/';
const outDir = path.join(os.tmpdir(), 'tags-cloud-shots');
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
node "C:\Users\LJT\AppData\Local\Temp\opencode\tags-cloud-shots.cjs"
```

Inspect the four PNGs in `%TEMP%\tags-cloud-shots` and confirm:

- chips are centered, multicolored, rounded at 7px, with white text;
- the three two-post tags (AI Agent, 产品思维, 个人网站) render visibly larger than single-post tags;
- no arrow glyph follows any chip label;
- light and dark themes both read cleanly (chips are identical across themes);
- mobile chips are scaled down and wrap without horizontal overflow;
- chip order differs from any previous screenshot (random per build).

Do not commit these screenshots.

- [ ] **Step 15: Commit**

Run:

```powershell
git status --porcelain=v1
git add scripts/tags.js source/tags/index.md source/css/custom.css tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: rebuild the tags page as a Butterfly-style cloud"
```

Expected: `git status` lists exactly the five modified files before staging; the commit succeeds with `5 files changed`.

Deployment happens only when `main` is pushed; do not push without an explicit request.

---

## Self-Review

**Spec coverage**

- Butterfly construction (size buckets, inline font-size/background-color, random order) → Steps 3, 7.
- Fixed palette with stable per-tag colors → Step 3 (hash-based `paletteColor`).
- Butterfly visuals (7px radius, white text, entry fade, shine, sibling fade, hover lift, active press, mobile zoom/shine off) → Step 11.
- Deliberate adaptations (brightness hover, arrow suppression, hash-stable colors, no dark overrides) → Step 11 notes and Step 3.
- Accessibility (palette ≥4.82:1, focus, reduced motion, no overflow) → Step 9 assertions and Step 11 (global reduced-motion rule already present).
- Unit coverage (plugin behavior, generated markup) → Steps 1, 5.
- E2E coverage (count, hrefs, radius, white text, palette membership, per-chip contrast, shine, arrow suppression, focus, hover, mobile zoom/overflow) → Step 9.
- Validation commands and screenshots → Steps 2, 4, 6, 8, 10, 12, 13, 14.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** the palette array, class `tag-cloud-item`, wrapper class `tag-cloud-list`, font-size strings `1.2em`/`1.5em`, and the `cloud_tags` tag name are identical across `scripts/tags.js`, `source/tags/index.md`, CSS, unit tests, and E2E tests. The E2E `luminance` helper matches the existing one at `tests/e2e/site.spec.js:232`.
