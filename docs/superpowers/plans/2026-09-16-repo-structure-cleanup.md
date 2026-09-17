# Repository Structure Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the one tracked redundancy, consolidate the build shim under `scripts/`, and clear local-only scratch so the working tree matches the repository layout.

**Architecture:** The audit found no committed build output or junk; the only structural fixes are deleting `tests/e2e/.gitkeep`, relocating `hexo-runner.cjs` into `scripts/` with an explicit repository root, and deleting git-ignored scratch files locally.

**Tech Stack:** Hexo 8, Reimu 1.12.5, npm scripts, Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources.
- Do not delete `docs/superpowers/` history or `source/_data/covers.yml`.
- Deleted local scratch is git-ignored and must not be reintroduced.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Structure cleanup

**Files:**
- Create: `tests/unit/structure.test.mjs`
- Delete: `tests/e2e/.gitkeep`
- Move: `hexo-runner.cjs` → `scripts/hexo-runner.cjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: the shim's `new Hexo(root)` contract (the site root must remain the repository root after the move) and the npm scripts consumed by the Pages workflow.
- Produces: a root with only configuration, documentation, and package files; `npm run clean|build|server` running `node scripts/hexo-runner.cjs …`.

- [ ] **Step 1: Write the failing structure test**

Create `tests/unit/structure.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: `fail 1` for `keeps the root to config and docs with build scripts under scripts/` (the shim is still at the root).

- [ ] **Step 3: Move the shim and fix its root resolution**

Run: `git mv hexo-runner.cjs scripts/hexo-runner.cjs`

In `scripts/hexo-runner.cjs`, replace the site-root usage:

```js
const siteRoot = path.join(__dirname, '..');
const hexo = new Hexo(siteRoot, {});
```

and, inside `main()`:

```js
  await hexo.loadPlugin(path.join(siteRoot, 'scripts', 'tags.js'));
```

Also update the usage message to `Usage: node scripts/hexo-runner.cjs clean|generate|server [--port PORT] [--ip IP] [--static]`.

- [ ] **Step 4: Update the npm scripts**

In `package.json`, change the three lines:

```json
    "clean": "node scripts/hexo-runner.cjs clean",
    "build": "node scripts/hexo-runner.cjs generate",
    "server": "node scripts/hexo-runner.cjs server --port 8081",
```

- [ ] **Step 5: Remove the redundant placeholder**

Run: `git rm tests/e2e/.gitkeep`

- [ ] **Step 6: Delete the local scratch files**

These paths are git-ignored and not part of the repository:

```powershell
Remove-Item -Force artifacts-*.log, debug.log
Remove-Item -Recurse -Force artifacts, assets, test-results
Remove-Item -Force db.json
Remove-Item -Recurse -Force content
```

- [ ] **Step 7: Rebuild and verify all gates**

Run:

```powershell
npm run check
npm run test:unit
npm test
```

Expected: `check` prints `PASS: 8 routes, 9 posts, 9 Atom entries; ...`; unit reports `pass 41`, `fail 0`; the full gate exits 0 with Playwright `32 passed`.

- [ ] **Step 8: Commit**

```powershell
git add package.json scripts/hexo-runner.cjs tests/unit/structure.test.mjs
git commit -m "chore: consolidate build scripts and drop redundant placeholders"
```

- [ ] **Step 9: Push**

```powershell
git push origin main
```

---

## Self-Review

**Spec coverage**

- `.gitkeep` removal → Step 5, locked by Step 1.
- Shim relocation with explicit root → Steps 3-4, proven by Step 7 (`npm run check`, `npm run server` via E2E, and the workflow's npm-script usage).
- Local scratch deletion → Step 6 (git-ignored paths only).
- Push after cleanup → Step 9.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** `scripts/hexo-runner.cjs`, the `siteRoot` constant, and the three npm script names are used consistently across the spec, test, and steps.
