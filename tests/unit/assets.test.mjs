import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

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
  const categoryCover = await readFile('source/images/category-bloom.webp');
  assert.equal(categoryCover.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(categoryCover.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(categoryCover.length < 450_000, `category cover is ${categoryCover.length} bytes`);
});

test('defines a blue-purple Reimu palette and local stylesheet', async () => {
  const theme = await readFile('_config.reimu.yml', 'utf8');
  assert.match(theme, /internal_theme:/);
  assert.match(theme, /--red-1: "#6f7fe8"/);
  assert.match(theme, /--red-2: "#8795ee"/);
  assert.match(theme, /head_end: '<link rel="stylesheet" href="\/jingtine-agent-site\/css\/custom\.css"><script src="\/jingtine-agent-site\/js\/firework-guard\.js"><\/script><script src="\/jingtine-agent-site\/js\/typing-guard\.js"><\/script>'/);
  const css = await readFile('source/css/custom.css', 'utf8');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.project-grid/);
  assert.match(css, /\.reimu-bg\s*\{[^}]*display:\s*none\s*!important;/s);
  assert.match(css, /\.sidebar-wrapper-container > #aplayer\s*\{[^}]*flex-shrink:\s*0;/s);
});

test('ships a local multi-size favicon', async () => {
  const favicon = await readFile('source/images/site-favicon.ico');
  assert.equal(favicon.readUInt16LE(0), 0, 'reserved field');
  assert.equal(favicon.readUInt16LE(2), 1, 'icon type');
  assert.ok(favicon.readUInt16LE(4) >= 3, 'multiple sizes embedded');
  assert.ok(favicon.length < 100_000, `favicon is ${favicon.length} bytes`);
});

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
