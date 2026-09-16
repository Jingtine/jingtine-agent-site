# Banner Illustration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the provided 2048×1080 illustration as the site banner via an optimized WebP file, replacing the placeholder SVG.

**Architecture:** The illustration is converted once with Pillow (installed into a temporary directory) and committed as `source/images/banner-illustration.webp`. `_config.reimu.yml` points the Reimu banner at it; the placeholder file is deleted. Unit and E2E tests lock the asset and its render.

**Tech Stack:** Hexo 8, Reimu 1.12.5 (pinned), Python 3.13 + Pillow (temporary, build-time only), Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; changes stay in site assets, config, and tests.
- The repository must not gain a Python runtime dependency; Pillow is installed into a temporary directory outside the repo and is not committed.
- Do not add npm dependencies.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Banner illustration

**Files:**
- Create: `source/images/banner-illustration.webp`
- Delete: `source/images/banner-placeholder.svg`
- Modify: `_config.reimu.yml`
- Modify: `tests/unit/assets.test.mjs`
- Modify: `tests/unit/generated-site.test.mjs`
- Modify: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: the user-provided PNG at `C:\Users\LJT\Desktop\PICTURES\盏茗.png` (2048×1080, ~2.7 MB).
- Produces: `source/images/banner-illustration.webp` referenced by `_config.reimu.yml` as `/images/banner-illustration.webp` and rendered as the `#header img` on every page.

- [ ] **Step 1: Write the failing asset unit test**

In `tests/unit/assets.test.mjs`, change the first test to:

```js
test('ships local avatar, banner, and optimized WebP cover', async () => {
  await stat('source/_data/avatar/avatar.jpg');
  const banner = await readFile('source/images/banner-illustration.webp');
  assert.equal(banner.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(banner.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(banner.length < 600_000, `banner is ${banner.length} bytes`);
  await assert.rejects(stat('source/images/banner-placeholder.svg'));
  const cover = await readFile('source/images/default-campus-cover.webp');
  assert.equal(cover.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(cover.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(cover.length < 450_000, `cover is ${cover.length} bytes`);
});
```

- [ ] **Step 2: Write the failing E2E test**

Insert after the `'footer credits the 2026 site year to Jingtine'` test in `tests/e2e/site.spec.js`:

```js
test('home header shows the banner illustration', async ({ page, request }) => {
  await page.goto('./');
  const banner = page.locator('#header img').first();
  await expect(banner).toHaveAttribute('src', `${root}images/banner-illustration.webp`);
  expect((await request.get(`${root}images/banner-illustration.webp`)).status()).toBe(200);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```powershell
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "home header shows the banner illustration"
```

Expected: unit reports `fail 1` (the banner file does not exist yet); the focused E2E reports `2 failed` (the header still renders the placeholder SVG).

- [ ] **Step 4: Convert the illustration to WebP**

Run (Pillow lands in a temporary directory; nothing is added to the repository):

```powershell
$python = "C:\Users\LJT\AppData\Local\Programs\Python\Python313\python.exe"
$libs = "C:\Users\LJT\AppData\Local\Temp\opencode\pylibs"
& $python -m pip install --target $libs pillow --quiet
Get-ChildItem "C:\Users\LJT\Desktop\PICTURES" -File | Where-Object { $_.Length -eq 2735512 } | Copy-Item -Destination "C:\Users\LJT\AppData\Local\Temp\opencode\banner-source.png"
$env:PYTHONPATH = $libs
& $python -c "from PIL import Image; img = Image.open(r'C:\Users\LJT\AppData\Local\Temp\opencode\banner-source.png').convert('RGB'); img.save(r'D:\Projects\my-agent-site\source\images\banner-illustration.webp', 'WEBP', quality=80, method=6); print('saved', img.size)"
```

Expected: `saved (2048, 1080)`; the produced file is well under 600 KB. If the PNG copy matches no file (size changed), list `C:\Users\LJT\Desktop\PICTURES` and pick the single PNG there.

- [ ] **Step 5: Update the configuration and remove the placeholder**

In `_config.reimu.yml`, change:

```yaml
banner: /images/banner-illustration.webp
```

Then delete the placeholder:

```powershell
git rm source/images/banner-placeholder.svg
```

- [ ] **Step 6: Update the generated-site unit test**

In `tests/unit/generated-site.test.mjs`, the assertion that home cards never use the banner as a lazy cover currently reads:

```js
  assert.doesNotMatch(home, /data-src="\/jingtine-agent-site\/images\/banner-placeholder.svg"/);
```

Change the path to the new banner:

```js
  assert.doesNotMatch(home, /data-src="\/jingtine-agent-site\/images\/banner-illustration.webp"/);
```

- [ ] **Step 7: Rebuild and verify all gates**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "home header shows the banner illustration"
npm test
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 33`, `fail 0`; the focused E2E reports `2 passed`; the full gate exits 0 with unit `pass 33` and Playwright `26 passed`.

- [ ] **Step 8: Visual review**

Capture the home page in light and dark themes with a temporary Playwright script and confirm the illustration renders as the header banner, is not stretched oddly, and the title/subtitle stay readable over it. Do not commit screenshots.

- [ ] **Step 9: Commit**

```powershell
git add _config.reimu.yml source/images/banner-illustration.webp tests/unit/assets.test.mjs tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: use the tea-house illustration as the site banner"
```

---

## Self-Review

**Spec coverage**

- Convert and place the WebP banner → Steps 4, 5, locked by Step 1.
- Banner-only scope (covers and OG untouched) → no other asset or config changes; Step 6 keeps the cover guard.
- Header render and reachability → Step 2, verified in Step 7; visual check in Step 8.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** the path `/images/banner-illustration.webp`, the `banner:` config key, and the `#header img` selector are used consistently across spec, unit tests, config, and E2E tests.
