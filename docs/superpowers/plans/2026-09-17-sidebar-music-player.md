# Sidebar Music Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play the self-hosted 许嵩《一见如故》 from a sidebar APlayer with a local WebP cover.

**Architecture:** A temporary ffmpeg (from imageio-ffmpeg) transcode produces `source/audio/yi-jian-ru-gu.mp3`; Pillow produces the 640×640 WebP cover. Reimu's APlayer renders the entry from `_config.reimu.yml` at the top of the desktop sidebar; Meting stays disabled.

**Tech Stack:** Hexo 8, Reimu 1.12.5, APlayer 1.10.1 (theme CDN vendor), ffmpeg 7.1 + Pillow (temporary build-time tools), Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; the change is config, two local assets, and tests.
- No npm dependencies; ffmpeg/Pillow stay in a temporary directory outside the repository.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Self-hosted sidebar player

**Files:**
- Modify: `_config.reimu.yml`
- Create: `source/audio/yi-jian-ru-gu.mp3` (transcoded)
- Create: `source/audio/yi-jian-ru-gu.webp` (converted cover)
- Modify: `tests/unit/config.test.mjs`
- Modify: `tests/unit/assets.test.mjs`
- Modify: `tests/unit/generated-site.test.mjs`
- Modify: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Reimu's `player.aplayer.options.audio` schema (`name`, `artist`, `url`, `cover`).
- Produces: a sidebar `#aplayer` element streaming `/jingtine-agent-site/audio/yi-jian-ru-gu.mp3` with the local cover.

- [ ] **Step 1: Update the disabled-features test and add the player test**

In `tests/unit/config.test.mjs`, remove the two assertions for `aplayer` and `meting` from `'disables comments and unwanted effects'`, then append:

```js
test('plays the self-hosted song in the sidebar player', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /aplayer:\r?\n\s+enable: true/);
  assert.match(config, /meting:\r?\n\s+enable: false/);
  assert.match(config, /name: 一见如故/);
  assert.match(config, /artist: 许嵩/);
  assert.match(config, /url: \/jingtine-agent-site\/audio\/yi-jian-ru-gu\.mp3/);
  assert.match(config, /cover: \/jingtine-agent-site\/audio\/yi-jian-ru-gu\.webp/);
  assert.match(config, /preload: none/);
});
```

- [ ] **Step 2: Add the asset unit test**

Append to `tests/unit/assets.test.mjs`:

```js
test('ships the self-hosted song and its cover', async () => {
  const mp3 = await readFile('source/audio/yi-jian-ru-gu.mp3');
  assert.equal(mp3[0], 0xFF, 'mp3 frame sync');
  assert.equal(mp3[1] & 0xE0, 0xE0, 'mp3 frame sync');
  assert.ok(mp3.length < 4_000_000, `mp3 is ${mp3.length} bytes`);
  const cover = await readFile('source/audio/yi-jian-ru-gu.webp');
  assert.equal(cover.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(cover.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(cover.length < 150_000, `cover is ${cover.length} bytes`);
});
```

- [ ] **Step 3: Add the generated-site test**

Append to `tests/unit/generated-site.test.mjs`:

```js
test('mounts the sidebar audio player with the song', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.match(home, /<div id="aplayer"/);
  assert.match(home, /"name":"一见如故","artist":"许嵩"/);
  assert.match(home, /"url":"\/jingtine-agent-site\/audio\/yi-jian-ru-gu\.mp3"/);
  assert.match(home, /"cover":"\/jingtine-agent-site\/audio\/yi-jian-ru-gu\.webp"/);
  assert.match(home, /aplayer@1\.10\.1\/dist\/APlayer\.min\.js/);
  assert.doesNotMatch(home, /meting@2\.0\.1/);
});
```

- [ ] **Step 4: Add the E2E test**

Insert after the `'home subtitle types the tea poems and respects reduced motion'` test in `tests/e2e/site.spec.js`:

```js
test('home sidebar hosts the audio player and song', async ({ page, request }) => {
  await page.goto('./');
  await expect(page.locator('#sidebar #aplayer')).toHaveCount(1);
  expect((await request.get(`${root}audio/yi-jian-ru-gu.mp3`)).status()).toBe(200);
  expect((await request.get(`${root}audio/yi-jian-ru-gu.webp`)).status()).toBe(200);
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "home sidebar hosts the audio player"
```

Expected: `check` passes; unit reports `fail 3` (the config, asset, and generated-site tests); the focused E2E reports `2 failed` (no player element).

- [ ] **Step 6: Transcode the audio and convert the cover**

```powershell
$ffmpeg = "C:\Users\LJT\AppData\Local\Temp\opencode\pylibs\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
Move-Item "D:\Projects\my-agent-site\source\audio\yi-jian-ru-gu.mp3" "C:\Users\LJT\AppData\Local\Temp\opencode\yi-jian-ru-gu-source.mp4" -Force
& $ffmpeg -y -hide_banner -loglevel error -i "C:\Users\LJT\AppData\Local\Temp\opencode\yi-jian-ru-gu-source.mp4" -vn -map_metadata -1 -c:a libmp3lame -b:a 96k -ar 44100 -ac 2 "D:\Projects\my-agent-site\source\audio\yi-jian-ru-gu.mp3"
$env:PYTHONPATH = "C:\Users\LJT\AppData\Local\Temp\opencode\pylibs"
& "C:\Users\LJT\AppData\Local\Programs\Python\Python313\python.exe" -c "from PIL import Image; img = Image.open(r'C:\Users\LJT\Desktop\yijianrugu.jpg').convert('RGB').resize((640, 640), Image.LANCZOS); img.save(r'D:\Projects\my-agent-site\source\audio\yi-jian-ru-gu.webp', 'WEBP', quality=82, method=6); print('cover written', img.size)"
```

Expected: the MP3 is roughly 3 MB with an `FF FB`/`FF F3` frame sync; the WebP is a few tens of KB.

- [ ] **Step 7: Configure the player**

In `_config.reimu.yml`, replace the `player` block with:

```yaml
player:
  position: before_sidebar
  disable_on_mobile: true
  aplayer:
    enable: true
    options:
      audio:
        - name: 一见如故
          artist: 许嵩
          url: /jingtine-agent-site/audio/yi-jian-ru-gu.mp3
          cover: /jingtine-agent-site/audio/yi-jian-ru-gu.webp
      preload: none
  meting:
    enable: false
```

- [ ] **Step 8: Rebuild and verify all gates**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "home sidebar hosts the audio player"
npm test
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 48`, `fail 0`; the focused E2E reports `2 passed`; the full gate exits 0 with Playwright `36 passed`.

- [ ] **Step 9: Visual review**

With a temporary Playwright script against the local server (network enabled), screenshot the sidebar player and click play to confirm the MP3 streams (`audio.currentTime > 0`). Do not commit screenshots.

- [ ] **Step 10: Commit**

```powershell
git add _config.reimu.yml source/audio/yi-jian-ru-gu.mp3 source/audio/yi-jian-ru-gu.webp tests/unit/config.test.mjs tests/unit/assets.test.mjs tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: host the tea-house song in the sidebar player"
```

---

## Self-Review

**Spec coverage**

- Transcode + cover conversion → Step 6, locked by Step 2.
- Sidebar APlayer with the song entry and `preload: none` → Step 7, locked by Steps 1 and 3.
- Reachability and play verification → Steps 4, 8, 9.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** the paths `/audio/yi-jian-ru-gu.mp3|webp`, the APlayer option keys `name`/`artist`/`url`/`cover`, and the selector `#sidebar #aplayer` are used identically across spec, config, and tests.
