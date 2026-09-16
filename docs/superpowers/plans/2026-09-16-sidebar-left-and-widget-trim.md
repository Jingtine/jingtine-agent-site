# Sidebar Left And Widget Trim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Reimu sidebar to the left and reduce the sidebar widgets to the recent-posts card only.

**Architecture:** Two configuration values in `_config.reimu.yml` (`sidebar.position`, `widgets`) drive the theme's existing `sidebar-left` layout class and widget loop. Unit and E2E assertions lock the configuration and the rendered result.

**Tech Stack:** Hexo 8, Reimu 1.12.5 (pinned), Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; changes stay in site configuration and tests.
- Do not add dependencies.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Sidebar position and widget trim

**Files:**
- Modify: `_config.reimu.yml`
- Modify: `tests/unit/config.test.mjs`
- Modify: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Reimu's `sidebar.position` (`left`/`right`) and `widgets` (array of widget names) configuration.
- Produces: `#content.sidebar-left` on every page; a sidebar widget list rendering only the `最新文章` card.

- [ ] **Step 1: Write the failing unit test**

Append to `tests/unit/config.test.mjs`:

```js
test('moves the sidebar left and drops the taxonomy cards', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /^sidebar:\r?\n\s+position: left$/m);
  const widgets = /^widgets:\r?\n((?:\s+- .*\r?\n?)+)/m.exec(config);
  assert.ok(widgets, 'the widgets list exists');
  assert.deepEqual(
    widgets[1].split(/\r?\n/).map(line => line.trim()).filter(Boolean),
    ['- recent_posts'],
  );
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `npm run test:unit`
Expected: `fail 1` for `moves the sidebar left and drops the taxonomy cards` (`sidebar.position` is still `right`); the other 31 tests pass.

- [ ] **Step 3: Write the failing E2E test**

Insert after the `'Home shows its identity, author avatar, nine cards and retained links'` test in `tests/e2e/site.spec.js`:

```js
test('sidebar renders left without taxonomy cards', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect(page.locator('#content')).toHaveClass(/sidebar-left/);
  const titles = await page.locator('#sidebar .sidebar-widget .widget-title').allTextContents();
  expect(titles.map(title => title.trim())).toEqual(['最新文章']);
  if (!isMobile) {
    const sidebarBox = await page.locator('#sidebar').boundingBox();
    const mainBox = await page.locator('#main').boundingBox();
    expect(sidebarBox.x).toBeLessThan(mainBox.x);
  }
});
```

- [ ] **Step 4: Run the E2E test to verify it fails**

Run: `npx playwright test --config tests/playwright.config.js -g "sidebar renders left without taxonomy cards"`
Expected: `2 failed` (desktop and mobile): `#content` still has `sidebar-right`, and the sidebar still lists 分类 and 标签.

- [ ] **Step 5: Update the configuration**

In `_config.reimu.yml`, change:

```yaml
sidebar:
  position: left
  menu: true
  article:
    show_common: true
widgets:
  - recent_posts
```

- [ ] **Step 6: Rebuild and verify unit, E2E, and the focused gates**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "sidebar renders left without taxonomy cards"
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 32`, `fail 0`; Playwright reports `2 passed`.

- [ ] **Step 7: Run the full gate**

Run: `npm test`
Expected: exit code 0; check PASS; unit `pass 32`; Playwright `22 passed`.

- [ ] **Step 8: Visual review**

Capture desktop and mobile screenshots in light and dark themes with a temporary Playwright script (same pattern as prior tasks), then confirm:

- the sidebar column is on the left of the main content on desktop;
- only the 最新文章 card remains (no 分类 or 标签 cards);
- the mobile drawer still shows author, social links, and the menu;
- no horizontal overflow on mobile.

Do not commit the screenshots.

- [ ] **Step 9: Commit**

```powershell
git add _config.reimu.yml tests/unit/config.test.mjs tests/e2e/site.spec.js
git commit -m "feat: move the sidebar left and trim dashboard cards"
```

Expected: three files staged; commit succeeds.

---

## Self-Review

**Spec coverage**

- `sidebar.position: right` → `left` → Step 5, locked by Step 1.
- Remove category and tag widgets, keep recent posts → Step 5, locked by Steps 1 and 3.
- Mobile drawer unchanged → Step 8 checklist (widgets never render there).
- Verification commands and screenshots → Steps 2, 4, 6, 7, 8.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** the selector `#content.sidebar-left`, the widget container `.sidebar-widget .widget-title`, and the widget name `recent_posts` are used consistently across the spec, unit test, and E2E test.
