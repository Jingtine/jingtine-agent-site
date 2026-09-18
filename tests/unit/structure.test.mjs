import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

test('keeps the root to config and docs with build scripts under scripts/', async () => {
  assert.equal(existsSync('hexo-runner.cjs'), false, 'no build shim in the root');
  assert.equal(existsSync('scripts/hexo-runner.cjs'), true, 'build shim lives in scripts/');
  assert.equal(existsSync('tests/e2e/.gitkeep'), false, 'no placeholder beside real specs');
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  for (const name of ['clean', 'build', 'server']) {
    assert.match(pkg.scripts[name], /^node scripts\/hexo-runner\.cjs /, name);
  }
});

test('documents the authoring workflows and ships the post scaffold', async () => {
  const readme = await readFile('README.md', 'utf8');
  assert.match(readme, /npm run new -- /);
  assert.match(readme, /source\/friend\/_data\.yml/);
  assert.match(readme, /source\/friend\/_sites\.yml/);
  assert.match(readme, /link-placeholder\.png/);
  assert.match(readme, /banner-illustration\.webp/);
  assert.doesNotMatch(readme, /banner-placeholder/);
  const scaffold = await readFile('scaffolds/post.md', 'utf8');
  for (const field of ['title: {{ title }}', 'slug: {{ slug }}', 'comments: false', 'toc: true']) {
    assert.ok(scaffold.includes(field), field);
  }
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(pkg.scripts.new, 'node scripts/hexo-runner.cjs new');
});
