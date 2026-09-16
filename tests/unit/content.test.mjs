import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const expectedSlugs = [
  'building-agent', 'building-digital-garden', 'from-ui-to-product',
  'github-pages-dev-notes', 'hello-world', 'notewhale-why-started',
  'opencode-superpowers-workflow', 'product-thinking-101', 'why-se-matters'
];

test('migrates exactly the nine public posts to YAML front matter', async () => {
  const files = (await readdir('source/_posts')).filter(name => name.endsWith('.md')).sort();
  assert.deepEqual(files, expectedSlugs.map(slug => `${slug}.md`).sort());
  for (const file of files) {
    const text = await readFile(`source/_posts/${file}`, 'utf8');
    assert.match(text, /^---\r?\n/);
    assert.match(text, /^slug: [a-z0-9-]+$/m);
    assert.match(text, /^comments: false$/m);
    assert.match(text, /^toc: true$/m);
    assert.doesNotMatch(text, /\[\[[^\]]+\]\]/);
    assert.doesNotMatch(text, /^## Related Wiki\s*$/m);
  }
});

test('creates retained standalone pages without comments', async () => {
  for (const path of ['source/about/index.md', 'source/projects/index.md', 'source/friend/index.md', 'source/categories/index.md', 'source/tags/index.md']) {
    const text = await readFile(path, 'utf8');
    assert.match(text, /^comments: false$/m);
  }
});
