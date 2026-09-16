import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('builds and deploys public through official Pages actions', async () => {
  const workflow = await readFile('.github/workflows/deploy-pages.yml', 'utf8');
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run check/);
  assert.match(workflow, /run: npm run test:e2e/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /path: public/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
