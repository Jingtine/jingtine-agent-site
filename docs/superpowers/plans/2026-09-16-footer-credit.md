# Footer Credit Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the footer credit as `© 2026 [taichi icon] Jingtine` while the sidebar identity stays `不驚醴`.

**Architecture:** `footer.since: 2026` in `_config.reimu.yml` produces the single-year copyright through Reimu's own template. The site-local `after_render:html` filter in `scripts/tags.js` rewrites only the footer credit text so `config.author` can stay `不驚醴` everywhere else.

**Tech Stack:** Hexo 8, Reimu 1.12.5 (pinned), Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; changes stay in site config, the local filter, and tests.
- Do not add dependencies.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Footer year and credit

**Files:**
- Modify: `_config.reimu.yml`
- Modify: `scripts/tags.js`
- Modify: `tests/unit/config.test.mjs`
- Modify: `tests/unit/generated-site.test.mjs`
- Modify: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Reimu's `footer.since` config; the generated footer markup (`<span class="icon-copyright">`, `#footer-info`, `<span class="footer-info-sep">`).
- Produces: a footer credit line rendered as `2026` plus `Jingtine` with the separator preserved.

- [ ] **Step 1: Write the failing config unit test**

Append to `tests/unit/config.test.mjs`:

```js
test('pins the footer copyright to the 2026 site year', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /^footer:\r?\n\s+since: 2026$/m);
});
```

- [ ] **Step 2: Write the failing filter unit test**

In `tests/unit/generated-site.test.mjs`, inside the `'site filters fix only exact theme 404 and iconfont URLs'` test, after the existing `output` assertions, add:

```js
  const footer = '<div><span class="icon-copyright"></span>\n      2026\n      <span class="footer-info-sep rotate"></span>\n      不驚醴\n    </div>';
  const footerOutput = filters.get('after_render:html')(footer);
  assert.match(footerOutput, /Jingtine/);
  assert.doesNotMatch(footerOutput, /不驚醴/);
  assert.match(footerOutput, /<span class="footer-info-sep rotate"><\/span>/);
  assert.match(filters.get('after_render:html')('<img alt="不驚醴" class="lazyload">'), /alt="不驚醴"/);
```

- [ ] **Step 3: Write the failing E2E test**

Insert after the `'sidebar renders left without taxonomy cards'` test in `tests/e2e/site.spec.js`:

```js
test('footer credits the 2026 site year to Jingtine', async ({ page }) => {
  await page.goto('./');
  const copyright = page.locator('#footer-info > div').first();
  await expect(copyright).toContainText('2026');
  await expect(copyright).not.toContainText('2020');
  await expect(copyright).toContainText('Jingtine');
  await expect(copyright).not.toContainText('不驚醴');
  await expect(copyright.locator('.footer-info-sep')).toHaveCount(1);
  await expect(page.locator('#sidebar .sidebar-author-name')).toHaveText('不驚醴');
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run:

```powershell
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "footer credits the 2026 site year to Jingtine"
```

Expected: unit reports `fail 2` (the config test sees no `footer.since`, the filter test sees `不驚醴` in the footer output); the focused E2E reports `2 failed` (the footer still shows `2020-2026` and `不驚醴`).

- [ ] **Step 5: Add the footer year configuration**

In `_config.reimu.yml`, add after the `open_graph` block (before `internal_theme`):

```yaml
footer:
  since: 2026
```

- [ ] **Step 6: Extend the HTML filter**

In `scripts/tags.js`, add this replacement to the `after_render:html` filter chain (after the `nav-rss-link` removal and before the iconfont replacement):

```js
    .replace(/(<span class="footer-info-sep[^>]*><\/span>\s*)[^<]+?(\s*<\/div>)/g, "$1Jingtine$2")
```

- [ ] **Step 7: Rebuild and verify all gates**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "footer credits the 2026 site year to Jingtine"
npm test
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 33`, `fail 0`; the focused E2E reports `2 passed`; the full gate exits 0 with unit `pass 33` and Playwright `24 passed`.

- [ ] **Step 8: Visual review**

Capture a footer screenshot on the home page in light and dark themes with a temporary Playwright script and confirm: `© 2026 [taichi icon] Jingtine`, separator rotating icon present, no `不驚醴` in the footer. Do not commit screenshots.

- [ ] **Step 9: Commit**

```powershell
git add _config.reimu.yml scripts/tags.js tests/unit/config.test.mjs tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: credit the footer to Jingtine with the 2026 site year"
```

---

## Self-Review

**Spec coverage**

- Single-year copyright → Step 5, locked by Step 1.
- Footer credit `Jingtine`, separator and icon preserved, author untouched elsewhere → Step 6, locked by Steps 2 and 3.
- Verification and visual review → Steps 4, 7, 8.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** `footer.since`, `.footer-info-sep`, `.sidebar-author-name`, and `#footer-info > div` selectors are used consistently across spec, unit tests, and E2E tests.
