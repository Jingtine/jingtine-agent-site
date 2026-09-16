# Click Firework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Reimu's click firework with a green palette and a reduced-motion guard.

**Architecture:** Reimu already ships the `mouse-firework` vendor script behind `theme.firework.enable`; the site supplies a green palette in `_config.reimu.yml` and a small local guard injected in `head_end` that makes `window.firework` a no-op under `prefers-reduced-motion: reduce`.

**Tech Stack:** Hexo 8, Reimu 1.12.5, vanilla JavaScript, Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; the change is config, one local script, and tests.
- Do not add dependencies.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Green click firework with a motion guard

**Files:**
- Modify: `_config.reimu.yml`
- Create: `source/js/firework-guard.js`
- Modify: `tests/unit/config.test.mjs`
- Modify: `tests/unit/assets.test.mjs`
- Modify: `tests/unit/generated-site.test.mjs`
- Modify: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Reimu's `firework` config block and the `mouse-firework` vendor script; `injector.head_end`.
- Produces: green particle bursts on clicks outside links/buttons; `window.firework` no-ops under reduced motion.

- [ ] **Step 1: Update the config unit test and add the firework test**

In `tests/unit/config.test.mjs`, remove `'firework'` from the disabled list in `'disables comments and unwanted effects'`:

```js
  for (const key of ['valine', 'waline', 'twikoo', 'gitalk', 'giscus', 'disqus', 'utterances', 'beaudar', 'live2d', 'live2d_widgets', 'reimu_cursor', 'material_theme']) {
```

Then append:

```js
test('enables the green click firework', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /firework:\r?\n\s+enable: true/);
  assert.match(config, /colors: \["#86efac", "#4ade80", "#22c55e", "#16a34a"\]/);
  assert.match(config, /excludeElements: \["a", "button"\]/);
});
```

- [ ] **Step 2: Update the injection assertion**

In `tests/unit/assets.test.mjs`, replace the `head_end` assertion with:

```js
  assert.match(theme, /head_end: '<link rel="stylesheet" href="\/jingtine-agent-site\/css\/custom\.css"><script src="\/jingtine-agent-site\/js\/firework-guard\.js"><\/script>'/);
```

- [ ] **Step 3: Add the generated-site tests**

Append to `tests/unit/generated-site.test.mjs`:

```js
test('injects the firework guard before the vendor script', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.match(home, /<script src="\/jingtine-agent-site\/js\/firework-guard\.js"><\/script>/);
  assert.match(home, /mouse-firework@0\.2\.0\/dist\/index\.umd\.js/);
  assert.ok(home.indexOf('firework-guard.js') < home.indexOf('mouse-firework@0.2.0'), 'guard loads first');
});

test('firework guard honors reduced motion', async () => {
  const code = await readFile('source/js/firework-guard.js', 'utf8');
  const loadGuard = matches => {
    const window = { matchMedia: () => ({ matches }) };
    vm.runInNewContext(code, { window });
    return window;
  };
  const reduced = loadGuard(true);
  let reducedCalled = false;
  reduced.firework = () => { reducedCalled = true; };
  reduced.firework({});
  assert.equal(reducedCalled, false, 'reduced motion suppresses the effect');
  const normal = loadGuard(false);
  let normalCalled = false;
  normal.firework = () => { normalCalled = true; };
  normal.firework({});
  assert.equal(normalCalled, true, 'the effect stays enabled without the preference');
});
```

- [ ] **Step 4: Add the E2E test**

Insert after the `'serves the site favicon'` test in `tests/e2e/site.spec.js`:

```js
test('click firework respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('script[src*="mouse-firework"]')).toHaveCount(1);
  const reduced = await page.evaluate(() => {
    let called = false;
    window.firework = () => { called = true; };
    window.firework({});
    return called;
  });
  expect(reduced).toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  const normal = await page.evaluate(() => {
    let called = false;
    window.firework = () => { called = true; };
    window.firework({});
    return called;
  });
  expect(normal).toBe(true);
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "click firework respects reduced motion"
```

Expected: `check` passes (firework still disabled builds fine); unit reports `fail 3` (the config test sees `enable: false`, the assets test sees the old `head_end`, and the guard file does not exist); the focused E2E reports `2 failed` (no `mouse-firework` script tag is rendered).

- [ ] **Step 6: Enable the firework with the green palette**

In `_config.reimu.yml`, replace:

```yaml
firework:
  enable: false
```

with:

```yaml
firework:
  enable: true
  disable_on_mobile: false
  options:
    excludeElements: ["a", "button"]
    particles:
      - shape: circle
        move: ["emit"]
        easing: easeOutExpo
        colors: ["#86efac", "#4ade80", "#22c55e", "#16a34a"]
        number: 20
        duration: [1200, 1800]
        shapeOptions:
          radius: [16, 32]
          alpha: [0.3, 0.5]
      - shape: circle
        move: ["diffuse"]
        easing: easeOutExpo
        colors: ["#22c55e"]
        number: 1
        duration: [1200, 1800]
        shapeOptions:
          radius: 20
          alpha: [0.2, 0.5]
          lineWidth: 6
```

- [ ] **Step 7: Create the reduced-motion guard**

Create `source/js/firework-guard.js`:

```js
// Keep the click firework off for users who request reduced motion.
(() => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let implementation;
  Object.defineProperty(window, 'firework', {
    configurable: true,
    get: () => (media.matches ? () => {} : implementation),
    set: value => { implementation = value; },
  });
})();
```

- [ ] **Step 8: Inject the guard in the head**

In `_config.reimu.yml`, change `injector.head_end` to:

```yaml
injector:
  head_end: '<link rel="stylesheet" href="/jingtine-agent-site/css/custom.css"><script src="/jingtine-agent-site/js/firework-guard.js"></script>'
```

- [ ] **Step 9: Rebuild and verify all gates**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "click firework respects reduced motion"
npm test
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 40`, `fail 0`; the focused E2E reports `2 passed`; the full gate exits 0 with unit `pass 40` and Playwright `32 passed`.

- [ ] **Step 10: Visual review**

With a temporary Playwright script against the local server, load the home page, wait for the vendor script, click an empty area, and screenshot immediately; confirm green particles appear. Do not commit screenshots.

- [ ] **Step 11: Commit**

```powershell
git add _config.reimu.yml source/js/firework-guard.js tests/unit/config.test.mjs tests/unit/assets.test.mjs tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: enable the green click firework with a motion guard"
```

---

## Self-Review

**Spec coverage**

- Green palette and theme-default particle structure → Step 6, locked by Step 1.
- Reduced-motion guard injected before the vendor script → Steps 7-8, locked by Steps 2-4.
- Verification and visual review → Steps 5, 9, 10.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** `window.firework`, `firework-guard.js`, `mouse-firework@0.2.0`, and the four green hex values are used identically across config, guard, unit tests, and E2E tests.
