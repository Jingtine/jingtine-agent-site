import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const removed = [
  'reader.html', 'papers.html', 'wiki.html', 'assistant.html', 'status.html',
  'guestbook.html', 'article.html', 'blog.html', 'knowledge.html', 'library.html',
  'contact.html', 'feed.xml', 'subscriptions.opml', 'styles.css', 'js', 'articles',
  'config', 'content/wiki', 'public/data', '.github/workflows/refresh-feeds.yml',
  '.opencode/skills/research-paper-collector', 'REDESIGN_REPORT.md'
];

test('removes every retired site surface', () => {
  for (const path of removed) assert.equal(existsSync(path), false, `${path} still exists`);
});

test('documents Hexo instead of the former direct-static architecture', async () => {
  const [readme, agents] = await Promise.all([readFile('README.md', 'utf8'), readFile('AGENTS.md', 'utf8')]);
  assert.match(readme, /npm ci/);
  assert.match(readme, /npm run build/);
  assert.match(agents, /Hexo 8/);
  assert.doesNotMatch(agents, /无需运行 npm/);
});
