# Sidebar Playlist Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the sidebar player into a twelve-song 许嵩 playlist (一见如故 + the eleven provided songs) with local MP3s and WebP covers.

**Architecture:** A one-off build script (Node drives Python, which calls ffmpeg and Pillow; all temporary) produces `source/audio/<slug>.mp3|webp`. `_config.reimu.yml` lists the entries; Reimu's APlayer renders the playlist with a folded list.

**Tech Stack:** Hexo 8, Reimu 1.12.5, APlayer 1.10.1, ffmpeg 7.1 + Pillow (temporary), Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; the change is config, local assets, and tests.
- No npm dependencies; ffmpeg/Pillow stay outside the repository.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Twelve-song sidebar playlist

**Files:**
- Modify: `_config.reimu.yml`
- Create: `source/audio/<slug>.mp3` and `source/audio/<slug>.webp` for the eleven new slugs
- Modify: `tests/unit/config.test.mjs`
- Modify: `tests/unit/assets.test.mjs`
- Modify: `tests/unit/generated-site.test.mjs`
- Modify: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: `C:\Users\LJT\Desktop\new-songs-list\<N>-<title>\` (AAC/fMP4 audio + cover image per folder, ordered 1→11).
- Produces: a twelve-entry `player.aplayer.options.audio` list rendered by APlayer.

- [ ] **Step 1: Update the config unit test**

Replace the body of `'plays the self-hosted song in the sidebar player'` in `tests/unit/config.test.mjs` with:

```js
test('plays the self-hosted playlist in the sidebar player', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /aplayer:\r?\n\s+enable: true/);
  assert.match(config, /meting:\r?\n\s+enable: false/);
  assert.match(config, /preload: none/);
  assert.match(config, /listFolded: true/);
  assert.match(config, /loop: all/);
  const audioBlock = /audio:\r?\n([\s\S]*?)\r?\n\s+preload: none/.exec(config);
  assert.ok(audioBlock, 'the audio block exists');
  const names = [...audioBlock[1].matchAll(/- name: (.+)/g)].map(match => match[1].trim());
  assert.deepEqual(names, [
    '一见如故', '老歌', '雨幕', '天龙八部之宿敌', '如谜', '山水之间',
    '清明雨上', '千百度', '幻听', '温泉', '明智之举', '如约而至',
  ]);
  for (const slug of ['laoge', 'yumu', 'sudi', 'rumi', 'shanshui', 'qingming', 'qiandu', 'huanting', 'wenquan', 'mingzhi', 'ruyue']) {
    assert.match(config, new RegExp(`url: /jingtine-agent-site/audio/${slug}\\.mp3`));
    assert.match(config, new RegExp(`cover: /jingtine-agent-site/audio/${slug}\\.webp`));
  }
  assert.match(config, /artist: 许嵩/);
});
```

- [ ] **Step 2: Update the asset unit test**

Replace `'ships the self-hosted song and its cover'` in `tests/unit/assets.test.mjs` with:

```js
test('ships the self-hosted playlist and covers', async () => {
  const slugs = ['yi-jian-ru-gu', 'laoge', 'yumu', 'sudi', 'rumi', 'shanshui', 'qingming', 'qiandu', 'huanting', 'wenquan', 'mingzhi', 'ruyue'];
  for (const slug of slugs) {
    const mp3 = await readFile(`source/audio/${slug}.mp3`);
    const hasId3 = mp3.subarray(0, 3).toString('ascii') === 'ID3';
    const hasFrameSync = mp3[0] === 0xFF && (mp3[1] & 0xE0) === 0xE0;
    assert.ok(hasId3 || hasFrameSync, `${slug}: valid mp3 header`);
    assert.ok(mp3.length < 4_000_000, `${slug}: mp3 is ${mp3.length} bytes`);
    const cover = await readFile(`source/audio/${slug}.webp`);
    assert.equal(cover.subarray(0, 4).toString('ascii'), 'RIFF', slug);
    assert.equal(cover.subarray(8, 12).toString('ascii'), 'WEBP', slug);
    assert.ok(cover.length < 150_000, `${slug}: cover is ${cover.length} bytes`);
  }
});
```

- [ ] **Step 3: Update the generated-site test**

Replace `'mounts the sidebar audio player with the song'` in `tests/unit/generated-site.test.mjs` with:

```js
test('mounts the sidebar audio player with the playlist', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.match(home, /<div id="aplayer"/);
  assert.match(home, /aplayer@1\.10\.1\/dist\/APlayer\.min\.js/);
  assert.doesNotMatch(home, /meting@2\.0\.1/);
  const embedded = /audio: (\[[\s\S]*?\]),/.exec(home);
  assert.ok(embedded, 'the audio list is embedded');
  const entries = JSON.parse(embedded[1]);
  assert.deepEqual(entries.map(entry => entry.name), [
    '一见如故', '老歌', '雨幕', '天龙八部之宿敌', '如谜', '山水之间',
    '清明雨上', '千百度', '幻听', '温泉', '明智之举', '如约而至',
  ]);
  for (const entry of entries) {
    assert.equal(entry.artist, '许嵩');
    assert.match(entry.url, /^\/jingtine-agent-site\/audio\/[a-z-]+\.mp3$/);
    assert.match(entry.cover, /^\/jingtine-agent-site\/audio\/[a-z-]+\.webp$/);
  }
});
```

- [ ] **Step 4: Update the E2E test**

Replace the body of `'home sidebar hosts the audio player and song'` in `tests/e2e/site.spec.js` with:

```js
test('home sidebar hosts the playlist assets', async ({ page, request }) => {
  await page.goto('./');
  await expect(page.locator('#sidebar #aplayer')).toHaveCount(1);
  for (const slug of ['yi-jian-ru-gu', 'laoge', 'yumu', 'sudi', 'rumi', 'shanshui', 'qingming', 'qiandu', 'huanting', 'wenquan', 'mingzhi', 'ruyue']) {
    expect((await request.get(`${root}audio/${slug}.mp3`)).status(), `${slug}.mp3`).toBe(200);
    expect((await request.get(`${root}audio/${slug}.webp`)).status(), `${slug}.webp`).toBe(200);
  }
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "home sidebar hosts the playlist assets"
```

Expected: `check` passes; unit reports `fail 3`; the focused E2E reports `2 failed`.

- [ ] **Step 6: Produce the audio and covers**

Write the temporary script `C:\Users\LJT\AppData\Local\Temp\opencode\build-playlist.py`:

```python
import os, subprocess
from PIL import Image

root = r"C:\Users\LJT\Desktop\new-songs-list"
out = r"D:\Projects\my-agent-site\source\audio"
ffmpeg = r"C:\Users\LJT\AppData\Local\Temp\opencode\pylibs\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
songs = [("1-老歌", "laoge"), ("2-雨幕", "yumu"), ("3-天龙八部之宿敌", "sudi"), ("4-如秘", "rumi"),
         ("5-山水之间", "shanshui"), ("6-清明雨上", "qingming"), ("7-千百度", "qiandu"),
         ("8-幻听", "huanting"), ("9-温泉", "wenquan"), ("10-明智之举", "mingzhi"), ("11-如约而至", "ruyue")]

for folder, slug in songs:
    d = os.path.join(root, folder)
    audio = next(f for f in sorted(os.listdir(d)) if f.lower().endswith((".mp3", ".m4a")))
    subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", os.path.join(d, audio),
                    "-vn", "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "96k", "-ar", "44100", "-ac", "2",
                    os.path.join(out, f"{slug}.mp3")], check=True)
    image = next(f for f in sorted(os.listdir(d)) if f.lower().endswith((".jpg", ".jpeg", ".png")))
    img = Image.open(os.path.join(d, image)).convert("RGB")
    w, h = img.size
    side = min(w, h)
    img = img.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2)).resize((640, 640), Image.LANCZOS)
    img.save(os.path.join(out, f"{slug}.webp"), "WEBP", quality=82, method=6)
    print(slug, os.path.getsize(os.path.join(out, f"{slug}.mp3")), os.path.getsize(os.path.join(out, f"{slug}.webp")))
```

Run it and confirm twelve `slug <mp3 bytes> <webp bytes>` lines with MP3s under 4 MB.

- [ ] **Step 7: Extend the playlist configuration**

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
        - name: 老歌
          artist: 许嵩
          url: /jingtine-agent-site/audio/laoge.mp3
          cover: /jingtine-agent-site/audio/laoge.webp
        - name: 雨幕
          artist: 许嵩
          url: /jingtine-agent-site/audio/yumu.mp3
          cover: /jingtine-agent-site/audio/yumu.webp
        - name: 天龙八部之宿敌
          artist: 许嵩
          url: /jingtine-agent-site/audio/sudi.mp3
          cover: /jingtine-agent-site/audio/sudi.webp
        - name: 如谜
          artist: 许嵩
          url: /jingtine-agent-site/audio/rumi.mp3
          cover: /jingtine-agent-site/audio/rumi.webp
        - name: 山水之间
          artist: 许嵩
          url: /jingtine-agent-site/audio/shanshui.mp3
          cover: /jingtine-agent-site/audio/shanshui.webp
        - name: 清明雨上
          artist: 许嵩
          url: /jingtine-agent-site/audio/qingming.mp3
          cover: /jingtine-agent-site/audio/qingming.webp
        - name: 千百度
          artist: 许嵩
          url: /jingtine-agent-site/audio/qiandu.mp3
          cover: /jingtine-agent-site/audio/qiandu.webp
        - name: 幻听
          artist: 许嵩
          url: /jingtine-agent-site/audio/huanting.mp3
          cover: /jingtine-agent-site/audio/huanting.webp
        - name: 温泉
          artist: 许嵩
          url: /jingtine-agent-site/audio/wenquan.mp3
          cover: /jingtine-agent-site/audio/wenquan.webp
        - name: 明智之举
          artist: 许嵩
          url: /jingtine-agent-site/audio/mingzhi.mp3
          cover: /jingtine-agent-site/audio/mingzhi.webp
        - name: 如约而至
          artist: 许嵩
          url: /jingtine-agent-site/audio/ruyue.mp3
          cover: /jingtine-agent-site/audio/ruyue.webp
      preload: none
      listFolded: true
      loop: all
  meting:
    enable: false
```

- [ ] **Step 8: Rebuild and verify all gates**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "home sidebar hosts the playlist assets"
npm test
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 48`, `fail 0`; the focused E2E reports `2 passed`; the full gate exits 0 with Playwright `36 passed`.

- [ ] **Step 9: Visual review**

With a temporary Playwright script against the local server, confirm the player shows the folded playlist, expands to twelve rows with covers, and plays a new track (`00:0x / duration` advances). Do not commit screenshots.

- [ ] **Step 10: Commit**

```powershell
git add _config.reimu.yml source/audio tests/unit/config.test.mjs tests/unit/assets.test.mjs tests/unit/generated-site.test.mjs tests/e2e/site.spec.js
git commit -m "feat: expand the sidebar player into a 许嵩 playlist"
```

---

## Self-Review

**Spec coverage**

- Eleven transcodes + covers in folder order → Step 6, locked by Step 2.
- Twelve-entry playlist with folded list and loop-all → Step 7, locked by Steps 1 and 3.
- Asset reachability → Step 4; verification → Steps 5, 8, 9.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** the twelve slugs, the `一见如故 + 1→11` name order, and the `audio/<slug>.mp3|webp` paths are identical across the script, config, and tests.
