# Friend Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 江畔絮语 friend card to the Reimu friend page via the local friend data file.

**Architecture:** `source/friend/_data.yml` feeds Reimu's `{% friendsLink %}` tag, which renders the card. Unit tests lock the data shape and the generated markup; an E2E test locks the visible card on the friend page.

**Tech Stack:** Hexo 8, Reimu 1.12.5 (pinned), Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; the change is content plus tests.
- Do not add dependencies.
- External links must use `https://`; Reimu's card template supplies `rel="noopener nofollow noreferrer"` and `target="_blank"`.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Friend card for 江畔絮语

**Files:**
- Modify: `source/friend/_data.yml`
- Modify: `tests/unit/content.test.mjs`
- Modify: `tests/unit/generated-site.test.mjs`
- Modify: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Reimu's `friendsLink` tag data schema `{ name, url, desc, image }`.
- Produces: one rendered card in `public/friend/index.html` with link `https://water1i1y.org/` and avatar `https://water1i1y.org/img/dia.jpg`.

- [ ] **Step 1: Write the failing content unit test**

Append to `tests/unit/content.test.mjs`:

```js
test('lists the classmate blog as a friend link', async () => {
  const data = await readFile('source/friend/_data.yml', 'utf8');
  assert.match(data, /- name: 江畔絮语\r?\n\s+url: https:\/\/water1i1y\.org\/\r?\n\s+desc: 一位文院学生思考的存档地\r?\n\s+image: https:\/\/water1i1y\.org\/img\/dia\.jpg/);
});
```

Check the file's existing imports first; it already imports `readFile` from `node:fs/promises` (`assert` from `node:assert/strict`). If the helper name differs, use the same helper the other tests in the file use.

- [ ] **Step 2: Write the failing generated-site unit test**

Append to `tests/unit/generated-site.test.mjs`:

```js
test('renders the friend card with safe external attributes', async () => {
  const friend = await readFile('public/friend/index.html', 'utf8');
  assert.match(friend, /<a href="https:\/\/water1i1y\.org\/" rel="noopener nofollow noreferrer" target="_blank"><\/a>/);
  assert.match(friend, /<img class="no-lightbox" src="https:\/\/water1i1y\.org\/img\/dia\.jpg" alt="江畔絮语">/);
  assert.match(friend, /<div class="friend-name">\s*江畔絮语\s*<\/div>/);
  assert.match(friend, /一位文院学生思考的存档地/);
});
```

- [ ] **Step 3: Write the failing E2E test**

Insert after the `'home header shows the banner illustration'` test in `tests/e2e/site.spec.js`:

```js
test('friend page shows the classmate card', async ({ page }) => {
  await page.goto('./friend/');
  const card = page.locator('.friend-item-wrap').first();
  await expect(card.locator('.friend-name')).toHaveText('江畔絮语');
  await expect(card.locator('.friend-desc')).toContainText('一位文院学生思考的存档地');
  await expect(card.locator('img')).toHaveAttribute('src', 'https://water1i1y.org/img/dia.jpg');
  await expect(card.locator('a')).toHaveAttribute('href', 'https://water1i1y.org/');
  await expect(card.locator('a')).toHaveAttribute('target', '_blank');
  await expect(card.locator('a')).toHaveAttribute('rel', 'noopener nofollow noreferrer');
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "friend page shows the classmate card"
```

Expected: `npm run check` passes (the empty data file builds fine); unit reports `fail 2` (the data file is `[]` and the friend page has no card); the focused E2E reports `2 failed` (no card renders).

- [ ] **Step 5: Add the friend entry**

Replace the contents of `source/friend/_data.yml` with:

```yaml
- name: 江畔絮语
  url: https://water1i1y.org/
  desc: 一位文院学生思考的存档地
  image: https://water1i1y.org/img/dia.jpg
```

- [ ] **Step 6: Rebuild and verify all gates**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "friend page shows the classmate card"
npm test
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 35`, `fail 0`; the focused E2E reports `2 passed`; the full gate exits 0 with unit `pass 35` and Playwright `28 passed`.

- [ ] **Step 7: Visual review**

Capture the friend page in light and dark themes with a temporary Playwright script and confirm the card renders with the avatar, name, and description. The avatar is external, so a normal networked browser shows it; the local E2E fixture blocks external requests by design. Do not commit screenshots.

- [ ] **Step 8: Commit**

```powershell
git add source/friend/_data.yml tests/unit/content.test.mjs tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: add the classmate blog to the friend page"
```

---

## Self-Review

**Spec coverage**

- One friend card with the agreed name, URL, description, and avatar → Steps 5, locked by Steps 1-3.
- External link safety (`https`, `rel`, `target`) → Step 2 assertions on the rendered markup.
- Verification and visual review → Steps 4, 6, 7.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** `.friend-item-wrap`, `.friend-name`, `.friend-desc`, and the YAML keys `name`/`url`/`desc`/`image` match Reimu's `friendLink.js` template exactly.
