import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import vm from 'node:vm';

const slugs = ['building-agent', 'building-digital-garden', 'from-ui-to-product', 'github-pages-dev-notes', 'hello-world', 'notewhale-why-started', 'opencode-superpowers-workflow', 'product-thinking-101', 'why-se-matters'];

async function checker() {
  assert.equal(existsSync('scripts/check-site.mjs'), true, 'generated artifact checker exists');
  return import('../../scripts/check-site.mjs');
}

test('site filters fix only exact theme 404 and iconfont URLs', async () => {
  const filters = new Map();
  vm.runInNewContext(await readFile('scripts/tags.js', 'utf8'), {
    hexo: {
      config: { root: '/jingtine-agent-site/' },
      theme: { config: { icon_font: '4552607_ex15nbittbh' } },
      extend: { tag: { register() {} }, filter: { register(name, handler) { filters.set(name, handler); } } }
    }
  });
  assert.equal(typeof filters.get('after_render:html'), 'function');
  assert.equal(typeof filters.get('after_render:css'), 'function');
  const html = '<a href="/" id="logo">404</a><a href="/" id="subtitle">back</a><a href="/">body</a><link rel="preload" href="//at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2" as="font"><p>//at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2</p>';
  assert.equal(filters.get('after_render:html')(html), '<a href="/jingtine-agent-site/" id="logo">404</a><a href="/jingtine-agent-site/" id="subtitle">back</a><a href="/">body</a><link rel="preload" href="https://at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2" as="font"><p>//at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2</p>');
  assert.equal(filters.get('after_render:css')('@font-face{src:url("//at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2")}'), '@font-face{src:url("https://at.alicdn.com/t/c/font_4552607_ex15nbittbh.woff2")}');
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

test('uses the default campus cover for lazy-loaded home cards', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.match(home, /data-src="\/jingtine-agent-site\/images\/default-campus-cover.webp"/);
  assert.doesNotMatch(home, /data-src="\/jingtine-agent-site\/images\/banner-placeholder.svg"/);
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
