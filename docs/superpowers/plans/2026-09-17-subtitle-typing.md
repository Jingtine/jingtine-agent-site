# Home Subtitle Typing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rotate seven tea poems as the home subtitle via Reimu's typed.js integration, with a reduced-motion still state.

**Architecture:** `subtitle.typing` config drives the theme's typed.js setup; a small head-injected guard fills the first poem and neutralizes `window.Typed` when `prefers-reduced-motion: reduce` matches.

**Tech Stack:** Hexo 8, Reimu 1.12.5, typed.js 2.1.0 (theme CDN vendor), vanilla JavaScript, Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; the change is config, one local script, and tests.
- Do not add dependencies; typed.js stays on the theme's CDN list.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Tea-poem subtitle typing

**Files:**
- Modify: `_config.reimu.yml`
- Create: `source/js/typing-guard.js`
- Modify: `tests/unit/config.test.mjs`
- Modify: `tests/unit/assets.test.mjs`
- Modify: `tests/unit/generated-site.test.mjs`
- Modify: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Reimu's `subtitle.typing` options and its `window.subtitleTypingConfig` / `window.__typedInstance` contract; `injector.head_end`.
- Produces: a rotating home subtitle in the given order and a static first poem under reduced motion.

- [ ] **Step 1: Add the config unit test**

Append to `tests/unit/config.test.mjs`:

```js
test('rotates the tea-poem subtitle on the home page', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /subtitle:\r?\n\s+typing:\r?\n\s+enable: true/);
  assert.match(config, /shuffle: false/);
  const strings = /strings:\r?\n((?:\s+- .*\r?\n?)+)/.exec(config);
  assert.ok(strings, 'the subtitle strings exist');
  assert.deepEqual(
    strings[1].split(/\r?\n/).map(line => line.trim().replace(/^- /, '')).filter(Boolean),
    [
      '山中何事？松花酿酒，春水煎茶。',
      '今日鬓丝禅榻畔，茶烟轻飏落花风。',
      '井放辘轳闲浸酒，笼开鹦鹉报煎茶。',
      '被酒莫惊春睡重，赌书消得泼茶香。',
      '雪沫乳花浮午盏，蓼茸蒿笋试春盘。',
      '竹下忘言对紫茶，全胜羽客醉流霞。',
      '野泉烟火白云间，坐饮香茶爱此山。',
    ],
  );
});
```

- [ ] **Step 2: Update the injection assertion**

In `tests/unit/assets.test.mjs`, replace the `head_end` assertion with:

```js
  assert.match(theme, /head_end: '<link rel="stylesheet" href="\/jingtine-agent-site\/css\/custom\.css"><script src="\/jingtine-agent-site\/js\/firework-guard\.js"><\/script><script src="\/jingtine-agent-site\/js\/typing-guard\.js"><\/script>'/);
```

- [ ] **Step 3: Add the generated-site tests**

Append to `tests/unit/generated-site.test.mjs`:

```js
test('wires the home subtitle typing to the tea poems', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.match(home, /<span id="subtitle"><span><\/span><\/span>/);
  assert.match(home, /typed\.js@2\.1\.0\/dist\/typed\.umd\.js/);
  assert.match(home, /window\.subtitleTypingConfig/);
  assert.match(home, /山中何事？松花酿酒，春水煎茶。/);
  assert.match(home, /<script src="\/jingtine-agent-site\/js\/typing-guard\.js"><\/script>/);
  assert.ok(home.indexOf('typing-guard.js') < home.indexOf('typed.js@2.1.0'), 'guard loads first');
});

test('typing guard stills the subtitle under reduced motion', async () => {
  const code = await readFile('source/js/typing-guard.js', 'utf8');
  const loadGuard = matches => {
    const target = { textContent: '' };
    const document = { readyState: 'complete', querySelector: () => target, addEventListener() {} };
    const window = { matchMedia: () => ({ matches }), subtitleTypingConfig: { strings: ['第一句', '第二句'] } };
    vm.runInNewContext(code, { window, document });
    return { window, target };
  };
  const reduced = loadGuard(true);
  const instance = new reduced.window.Typed('#subtitle span', { strings: ['第一句', '第二句'] });
  assert.equal(reduced.target.textContent, '第一句');
  assert.equal(typeof instance.destroy, 'function');
  const normal = loadGuard(false);
  class RealTyped { constructor() { this.animated = true; } }
  normal.window.Typed = RealTyped;
  assert.equal(new normal.window.Typed() instanceof RealTyped, true, 'the vendor class passes through');
});
```

- [ ] **Step 4: Add the E2E test**

Insert after the `'click firework respects reduced motion'` test in `tests/e2e/site.spec.js`:

```js
test('home subtitle types the tea poems and respects reduced motion', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('script[src*="typed.js"]')).toHaveCount(1);
  const strings = await page.evaluate(() => window.subtitleTypingConfig?.strings ?? []);
  expect(strings.length).toBe(7);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('#subtitle')).toContainText('山中何事？松花酿酒，春水煎茶。');
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "home subtitle types the tea poems"
```

Expected: `check` passes (typing still disabled builds fine); unit reports `fail 4` (the new config test, the assets injection assertion, and both generated-site tests); the focused E2E reports `2 failed` (no typed.js script and no config).

- [ ] **Step 6: Enable the typing subtitle**

In `_config.reimu.yml`, after the `rss` line, add:

```yaml
subtitle:
  typing:
    enable: true
    strings:
      - 山中何事？松花酿酒，春水煎茶。
      - 今日鬓丝禅榻畔，茶烟轻飏落花风。
      - 井放辘轳闲浸酒，笼开鹦鹉报煎茶。
      - 被酒莫惊春睡重，赌书消得泼茶香。
      - 雪沫乳花浮午盏，蓼茸蒿笋试春盘。
      - 竹下忘言对紫茶，全胜羽客醉流霞。
      - 野泉烟火白云间，坐饮香茶爱此山。
    typeSpeed: 100
    backSpeed: 50
    backDelay: 2600
    startDelay: 300
    loop: true
    shuffle: false
    showCursor: true
    cursorChar: "|"
    smartBackspace: false
```

- [ ] **Step 7: Create the reduced-motion guard**

Create `source/js/typing-guard.js`:

```js
// Keep the typing subtitle still for users who request reduced motion.
(() => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!media.matches) return;
  const showStaticLine = () => {
    const line = (window.subtitleTypingConfig?.strings ?? [])[0] || '';
    const target = document.querySelector('#subtitle span');
    if (target && line) target.textContent = line;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showStaticLine);
  } else {
    showStaticLine();
  }
  Object.defineProperty(window, 'Typed', {
    configurable: true,
    get: () => function Typed() {
      showStaticLine();
      return { destroy() {}, stop() {} };
    },
    set: () => {},
  });
})();
```

- [ ] **Step 8: Inject the guard and rebuild**

In `_config.reimu.yml`, change `injector.head_end` to:

```yaml
injector:
  head_end: '<link rel="stylesheet" href="/jingtine-agent-site/css/custom.css"><script src="/jingtine-agent-site/js/firework-guard.js"></script><script src="/jingtine-agent-site/js/typing-guard.js"></script>'
```

Then run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "home subtitle types the tea poems"
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 45`, `fail 0`; the focused E2E reports `2 passed`.

- [ ] **Step 9: Run the full gate**

Run: `npm test`
Expected: exit code 0; unit `pass 45`; Playwright `34 passed`.

- [ ] **Step 10: Visual review**

With a temporary Playwright script against the local server (network enabled so typed.js loads), screenshot the home header after a few seconds to catch the typing, then reload with reduced motion and screenshot the static first poem. Do not commit screenshots.

- [ ] **Step 11: Commit**

```powershell
git add _config.reimu.yml source/js/typing-guard.js tests/unit/config.test.mjs tests/unit/assets.test.mjs tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: rotate tea-poem subtitles on the home banner"
```

---

## Self-Review

**Spec coverage**

- Seven poems in order, theme-default typing → Step 6, locked by Step 1.
- Reduced-motion still state → Steps 7-8, locked by Steps 2-4.
- Verification and visual review → Steps 5, 8, 9, 10.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** `subtitle.typing`, `window.subtitleTypingConfig`, `window.Typed`, `#subtitle span`, and `typing-guard.js` are used identically across config, guard, unit tests, and E2E tests.
