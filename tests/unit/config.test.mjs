import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('pins the approved Hexo and Reimu toolchain', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.engines.node, '>=22');
  assert.equal(pkg.dependencies.hexo, '8.1.2');
  assert.equal(pkg.dependencies['hexo-theme-reimu'], '1.12.5');
  assert.equal(pkg.devDependencies['@playwright/test'], '1.63.0');
});

test('uses the GitHub Pages project root and clean post URLs', async () => {
  const config = await read('_config.yml');
  assert.match(config, /^author: 不驚醴$/m);
  assert.doesNotMatch(config, /Jingtine/);
  assert.match(config, /^url: https:\/\/jingtine\.github\.io\/jingtine-agent-site$/m);
  assert.match(config, /^root: \/jingtine-agent-site\/$/m);
  assert.match(config, /^permalink: posts\/:title\/$/m);
  assert.match(config, /^theme: reimu$/m);
});

test('disables comments and unwanted effects', async () => {
  const config = await read('_config.reimu.yml');
  for (const key of ['valine', 'waline', 'twikoo', 'gitalk', 'giscus', 'disqus', 'utterances', 'beaudar', 'live2d', 'live2d_widgets', 'reimu_cursor', 'material_theme']) {
    assert.match(config, new RegExp(`${key}:\\r?\\n\\s+enable: false`));
  }
});

test('uses the tea-house loading message', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /preloader:\r?\n\s+enable: true\r?\n\s+text:\r?\n\s+zh-CN: 茶香氤氲时\.\.\./);
  assert.doesNotMatch(config, /少女祈祷中/);
});

test('configures the sidebar contact links', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /social:\r?\n\s+github: https:\/\/github\.com\/jingtine\r?\n\s+email: mailto:jingtineli@smail\.nju\.edu\.cn\r?\n\s+rss: \/jingtine-agent-site\/atom\.xml/);
});

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

test('pins the footer copyright to the 2026 site year', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /^footer:\r?\n\s+since: 2026$/m);
});

test('shows the by-nc-sa article copyright declaration', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /article_copyright:\r?\n\s+enable: true\r?\n\s+content:\r?\n\s+author: true\r?\n\s+link: true\r?\n\s+license: true\r?\n\s+license_type: by-nc-sa/);
});

test('enables the green click firework', async () => {
  const config = await read('_config.reimu.yml');
  assert.match(config, /firework:\r?\n\s+enable: true/);
  assert.match(config, /colors: \["#86efac", "#4ade80", "#22c55e", "#16a34a"\]/);
  assert.match(config, /excludeElements: \["a", "button"\]/);
});

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
