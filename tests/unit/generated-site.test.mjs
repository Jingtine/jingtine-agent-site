import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const slugs = ['building-agent', 'building-digital-garden', 'from-ui-to-product', 'github-pages-dev-notes', 'hello-world', 'notewhale-why-started', 'opencode-superpowers-workflow', 'product-thinking-101', 'why-se-matters'];

async function checker() {
  assert.equal(existsSync('scripts/check-site.mjs'), true, 'generated artifact checker exists');
  return import('../../scripts/check-site.mjs');
}

test('site filters fix only exact theme 404 and iconfont URLs', async () => {
  const filters = new Map();
  vm.runInNewContext(await readFile('scripts/tags.js', 'utf8'), {
    require,
    hexo: {
      base_dir: process.cwd(),
      config: { root: '/jingtine-agent-site/' },
      theme: { config: { icon_font: '4552607_ex15nbittbh' } },
      extend: { tag: { register() {} }, filter: { register(name, handler) { filters.set(name, handler); } } }
    }
  });
  assert.equal(typeof filters.get('after_render:html'), 'function');
  assert.equal(typeof filters.get('after_render:css'), 'function');
  const html = '<a href="/" id="logo">404</a><a href="/" id="subtitle">back</a><a href="/">body</a><a id="nav-rss-link" class="nav-icon" href="/jingtine-agent-site/atom.xml" title="RSS 订阅" aria-label="RSS 订阅" target="_blank"></a><link rel="stylesheet" href="/jingtine-agent-site/css/custom.css"><script src="/jingtine-agent-site/js/accessibility.js" defer></script><link rel="preload" href="//at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2" as="font"><p>//at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2</p>';
  const output = filters.get('after_render:html')(html);
  assert.match(output, /<a href="\/jingtine-agent-site\/" id="logo">404<\/a>/);
  assert.match(output, /<a href="\/jingtine-agent-site\/" id="subtitle">back<\/a>/);
  assert.doesNotMatch(output, /nav-rss-link/);
  assert.match(output, /<link rel="stylesheet" href="\/jingtine-agent-site\/css\/custom\.css\?v=[0-9a-f]{10}">/);
  assert.match(output, /<script src="\/jingtine-agent-site\/js\/accessibility\.js\?v=[0-9a-f]{10}" defer><\/script>/);
  assert.match(output, /<link rel="preload" href="https:\/\/at\.alicdn\.com\/t\/c\/font_4552607_ex15nbittbh\.woff2" as="font">/);
  assert.match(output, /<p>\/\/at\.alicdn\.com\/t\/c\/font_4552607_ex15nbittbh\.woff2<\/p>/);
  const versions = [...output.matchAll(/\?v=([0-9a-f]{10})"/g)].map(match => match[1]);
  assert.equal(versions.length, 2, 'both injected assets are versioned');
  assert.equal(versions[0], versions[1], 'assets share one build version');
  const footer = '<div><span class="icon-copyright"></span>\n      2026\n      <span class="footer-info-sep rotate"></span>\n      不驚醴\n    </div>';
  const footerOutput = filters.get('after_render:html')(footer);
  assert.match(footerOutput, /Jingtine/);
  assert.doesNotMatch(footerOutput, /不驚醴/);
  assert.match(footerOutput, /<span class="footer-info-sep rotate"><\/span>/);
  assert.match(filters.get('after_render:html')('<img alt="不驚醴" class="lazyload">'), /alt="不驚醴"/);
  assert.equal(filters.get('after_render:css')('@font-face{src:url("//at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2")}'), '@font-face{src:url("https://at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2")}');
});

test('cloud_tags emits palette chips with stable colors and escaped names', async () => {
  const registered = new Map();
  const helpers = new Map();
  const collection = [
    { name: 'AI Agent', path: 'tags/AI-Agent/', length: 2 },
    { name: 'AI', path: 'tags/AI/', length: 1 },
    { name: '设计', path: 'tags/%E8%AE%BE%E8%AE%A1/', length: 1 },
    { name: '<script>', path: 'tags/script/', length: 1 },
  ];
  collection.random = function () {
    const items = [...this];
    return this.shuffled ? items.reverse() : items;
  };
  vm.runInNewContext(await readFile('scripts/tags.js', 'utf8'), {
    require,
    hexo: {
      base_dir: process.cwd(),
      config: { root: '/jingtine-agent-site/' },
      theme: { config: { icon_font: '4552607_ex15nbittbh' } },
      locals: { get: () => collection },
      extend: {
        tag: { register(name, handler) { registered.set(name, handler); } },
        helper: {
          register(name, handler) { helpers.set(name, handler); },
          get(name) { return helpers.get(name); },
        },
        filter: { register() {} },
      },
    },
  });
  helpers.set('url_for', path => `/jingtine-agent-site/${path}`);
  const render = registered.get('cloud_tags');
  assert.equal(typeof render, 'function');

  const parse = html => [...html.matchAll(/<a href="([^"]+)" class="tag-cloud-item" style="font-size: ([^;]+); background-color: (#[0-9a-f]{6});">([^<]*)<\/a>/g)]
    .map(match => ({ href: match[1], fontSize: match[2], color: match[3], name: match[4] }));
  const palette = ['#6d4fc4', '#3b6fc9', '#2f7d7a', '#b23a7a', '#b5542f', '#3f7f4f', '#5a5fc7', '#4a6b8a'];

  const first = parse(render.call({}));
  assert.equal(first.length, 4);
  for (const chip of first) {
    assert.ok(chip.href.startsWith('/jingtine-agent-site/tags/'), chip.href);
    assert.ok(palette.includes(chip.color), chip.color);
    assert.ok(['1.2em', '1.5em'].includes(chip.fontSize), chip.fontSize);
  }
  assert.equal(first.find(chip => chip.name === 'AI Agent').fontSize, '1.5em');
  assert.equal(first.find(chip => chip.name === 'AI').fontSize, '1.2em');
  assert.ok(first.some(chip => chip.name === '&lt;script&gt;'), 'tag names are escaped');

  collection.shuffled = true;
  const second = parse(render.call({}));
  assert.notDeepEqual(first.map(chip => chip.name), second.map(chip => chip.name));
  assert.deepEqual(
    Object.fromEntries(first.map(chip => [chip.name, chip.color])),
    Object.fromEntries(second.map(chip => [chip.name, chip.color])),
  );

  collection.shuffled = false;
  collection.length = 0;
  collection.push(
    { name: 'one', path: 'tags/one/', length: 1 },
    { name: 'two', path: 'tags/two/', length: 2 },
    { name: 'three', path: 'tags/three/', length: 3 },
  );
  assert.deepEqual(parse(render.call({})).map(chip => chip.fontSize), ['1.2em', '1.35em', '1.5em']);

  collection.length = 0;
  assert.equal(render.call({}), '');
});

test('generates retained routes, nine posts, and an Atom feed', async () => {
  for (const route of ['index.html', 'archives/index.html', 'categories/index.html', 'tags/index.html', 'about/index.html', 'projects/index.html', 'friend/index.html', 'atom.xml']) {
    assert.equal(existsSync(`public/${route}`), true, route);
  }
  const posts = (await readdir('public/posts', { withFileTypes: true })).filter(item => item.isDirectory());
  assert.equal(posts.length, 9);
  assert.deepEqual(posts.map(item => item.name).sort(), slugs);
  const feed = await readFile('public/atom.xml', 'utf8');
  assert.equal((feed.match(/<entry>/g) || []).length, 9);
  assert.match(feed, /https:\/\/jingtine\.github\.io\/jingtine-agent-site\/posts\//);
});

test('renders the tags page as a Butterfly-style cloud', async () => {
  const palette = ['#6d4fc4', '#3b6fc9', '#2f7d7a', '#b23a7a', '#b5542f', '#3f7f4f', '#5a5fc7', '#4a6b8a'];
  const tags = await readFile('public/tags/index.html', 'utf8');
  const cloud = /<div class="tag-cloud-list">([\s\S]*?)<\/div>/.exec(tags);
  assert.ok(cloud, 'tag cloud container exists');
  assert.doesNotMatch(cloud[1], /tag-chip-/);
  const chips = [...cloud[1].matchAll(/<a href="([^"]+)" class="tag-cloud-item" style="font-size: ([^;]+); background-color: (#[0-9a-f]{6});">([^<]*)<\/a>/g)];
  assert.equal(chips.length, 16);
  assert.equal(new Set(chips.map(chip => chip[4])).size, 16);
  for (const [, href, fontSize, color] of chips) {
    assert.ok(href.startsWith('/jingtine-agent-site/tags/'), href);
    assert.ok(['1.2em', '1.5em'].includes(fontSize), fontSize);
    assert.ok(palette.includes(color), color);
  }
  assert.ok(chips.some(chip => chip[2] === '1.5em'), 'the most-used tags render larger');
});

test('uses the default campus cover for lazy-loaded home cards', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.match(home, /data-src="\/jingtine-agent-site\/images\/default-campus-cover.webp"/);
  assert.doesNotMatch(home, /data-src="\/jingtine-agent-site\/images\/banner-illustration\.webp"/);
});

test('keeps social preview images on the deployed project root without theme artwork', async () => {
  const pages = (await readdir('public', { recursive: true })).filter(file => file.endsWith('.html'));
  assert.ok(pages.length > 0, 'generated HTML exists');
  let seen = 0;
  for (const page of pages) {
    const html = await readFile(path.join('public', page), 'utf8');
    for (const meta of html.matchAll(/<meta[^>]+>/g)) {
      if (!/property="og:image"|name="twitter:image"/.test(meta[0])) continue;
      const content = /content="([^"]*)"/.exec(meta[0]);
      assert.ok(content, `${page}: social image meta has content`);
      assert.ok(content[1].startsWith('https://jingtine.github.io/jingtine-agent-site/'), `${page}: ${content[1]}`);
      assert.doesNotMatch(content[1], /banner\.webp/, `${page}: ${content[1]}`);
      seen += 1;
    }
  }
  assert.ok(seen > 0, 'social preview images are emitted');
});

test('maps project-root and encoded local references without escaping public', async () => {
  const { resolveLocalTarget } = await checker();
  for (const [url, expected] of [
    ['/jingtine-agent-site/', 'public/index.html'],
    ['/jingtine-agent-site/posts/hello-world/?view=full#intro', 'public/posts/hello-world/index.html'],
    ['images/campus%20cover.webp?size=2', 'public/images/campus cover.webp'],
    ['atom.xml', 'public/atom.xml'],
    ['https://example.com/a', null], ['mailto:hello@example.com', null],
    ['tel:123', null], ['data:image/png;base64,AA', null], ['#intro', null], ['', null],
  ]) assert.equal(resolveLocalTarget(url), expected, url);
  for (const url of ['/images/cover.webp', '../outside', '/jingtine-agent-site/%2e%2e/secret', '//example.com/file', 'http://example.com', 'javascript:alert(1)', 'bad%ZZ']) {
    assert.throws(() => resolveLocalTarget(url), undefined, url);
  }
});

test('extracts actual href/src attributes, decodes entities, and ignores script/comment text', async () => {
  const { collectLocalReferences } = await checker();
  assert.deepEqual(collectLocalReferences(`<!-- <a href="missing"> -->
    <script>const fake = '<a href="missing">';</script>
    <style>.x::before { content: '<a href="missing">'; }</style>
    <a data-href="fake" HREF='/jingtine-agent-site/posts/hello-world/?a=1&amp;b=2#toc'>Post</a>
    <img src=/jingtine-agent-site/images/cover.webp>
    <a href="&#x2f;jingtine-agent-site/atom.xml">Feed</a>
    <a href="https://example.com">External</a><a href="#toc">TOC</a>`), [
    '/jingtine-agent-site/posts/hello-world/?a=1&b=2#toc',
    '/jingtine-agent-site/images/cover.webp', '/jingtine-agent-site/atom.xml'
  ]);
});

test('walks files recursively in a stable order without executing the CLI on import', async () => {
  const { walkFiles } = await checker();
  const fixture = await mkdtemp(path.join(tmpdir(), 'reimu-walk-'));
  try {
    await mkdir(path.join(fixture, 'nested'));
    await writeFile(path.join(fixture, 'z.html'), '');
    await writeFile(path.join(fixture, 'nested', 'a.html'), '');
    assert.deepEqual((await walkFiles(fixture)).map(file => path.relative(fixture, file).replaceAll('\\', '/')), ['nested/a.html', 'z.html']);
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', 'await import("./scripts/check-site.mjs")'], { encoding: 'utf8' });
    assert.equal(output, '');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('CLI rejects missing routes, wrong slugs/feed, nested forbidden clients and broken local links', async () => {
  await checker();
  const fixture = await mkdtemp(path.join(tmpdir(), 'reimu-check-'));
  const script = path.resolve('scripts/check-site.mjs');
  const put = async (name, content = '<a href="/jingtine-agent-site/">Home</a>') => {
    await mkdir(path.dirname(path.join(fixture, 'public', name)), { recursive: true });
    await writeFile(path.join(fixture, 'public', name), content);
  };
  const run = () => spawnSync(process.execPath, [script], { cwd: fixture, encoding: 'utf8' });
  try {
    for (const route of ['index.html', 'archives/index.html', 'categories/index.html', 'tags/index.html', 'about/index.html', 'projects/index.html', 'friend/index.html', ...slugs.map(slug => `posts/${slug}/index.html`)]) await put(route);
    const feed = `<feed><id>https://jingtine.github.io/jingtine-agent-site/</id>${slugs.map(slug => `<entry><id>https://jingtine.github.io/jingtine-agent-site/posts/${slug}/</id><link href="https://jingtine.github.io/jingtine-agent-site/posts/${slug}/"/></entry>`).join('')}</feed>`;
    await put('atom.xml', feed);
    const good = run();
    assert.equal(good.status, 0, good.stderr);
    assert.match(good.stdout, /PASS/);
    assert.equal(good.stderr, '');
    for (const [name, broken, diagnostic] of [
      ['about/index.html', '<script src="https://giscus.app/client.js"></script>', /about\/index.html.*giscus/i],
      ['about/index.html', '<a href="../missing/">Missing</a>', /about\/index.html.*missing/],
      ['about/index.html', '<img src="/images/bad.webp">', /project root|base path/i],
      ['atom.xml', '<feed></feed>', /nine|9.*entr/i],
      ['atom.xml', feed.replace('https://jingtine.github.io/jingtine-agent-site/posts/', 'https://jingtine.github.io/posts/'), /canonical|project.root/i],
    ]) {
      const original = await readFile(path.join(fixture, 'public', name), 'utf8');
      await put(name, broken);
      const result = run();
      assert.equal(result.status, 1, name);
      assert.match(result.stderr, diagnostic);
      assert.doesNotMatch(result.stdout, /PASS/);
      await put(name, original);
    }
    await rm(path.join(fixture, 'public', 'tags', 'index.html'));
    assert.match(run().stderr, /tags/);
    await put('posts/unapproved/index.html');
    assert.match(run().stderr, /unapproved/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('does not generate retired routes or comment clients', async () => {
  for (const route of ['reader', 'papers', 'wiki', 'assistant', 'status', 'guestbook']) {
    assert.equal(existsSync(`public/${route}`), false, route);
  }
  const home = await readFile('public/index.html', 'utf8');
  assert.doesNotMatch(home, /giscus\.app|@waline|valine|twikoo|gitalk|disqus|utterances|beaudar|guestbook|reader\.html|papers\.html|wiki\.html/i);
});

test('renders the friend card with safe external attributes', async () => {
  const friend = await readFile('public/friend/index.html', 'utf8');
  assert.match(friend, /<a href="https:\/\/water1i1y\.org\/" rel="noopener nofollow noreferrer" target="_blank"><\/a>/);
  assert.match(friend, /<img class="no-lightbox" src="https:\/\/water1i1y\.org\/img\/dia\.jpg" alt="江畔絮语">/);
  assert.match(friend, /<div class="friend-name">\s*江畔絮语\s*<\/div>/);
  assert.match(friend, /一位文院学生思考的存档地/);
  assert.match(friend, /<a href="https:\/\/mellowwinds\.com\/" rel="noopener nofollow noreferrer" target="_blank"><\/a>/);
  assert.match(friend, /<img class="no-lightbox" src="https:\/\/mellowwinds\.com\/icon\/icon128\.png" alt="MellowBlog">/);
  assert.match(friend, /<div class="friend-name">\s*MellowBlog\s*<\/div>/);
  assert.match(friend, /纪念的螺壳里，仍存在着那年夏天的海/);
  assert.equal((friend.match(/friend-item-wrap/g) || []).length, 2);
});

test('serves the site favicon from the project root', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.match(home, /<link rel="shortcut icon" href="\/jingtine-agent-site\/images\/site-favicon\.ico">/);
  const source = await readFile('source/images/site-favicon.ico');
  const published = await readFile('public/images/site-favicon.ico');
  assert.deepEqual(published, source, 'the site favicon is published unchanged');
});

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
