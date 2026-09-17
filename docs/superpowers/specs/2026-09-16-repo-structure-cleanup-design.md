# Repository Structure Cleanup Design

## Summary

Audit of the tracked repository found no redundant uploads: all 72 tracked files are purposeful, no build output, logs, screenshots, or dependencies are committed, and the folder layout (content / build extensions / tests / history / CI) is sound. The cleanup therefore removes the one tracked redundancy, consolidates the build shim under `scripts/`, and clears local-only scratch files that are not part of the repository.

## Change

- `tests/e2e/.gitkeep` is removed; the directory already contains `site.spec.js`.
- `hexo-runner.cjs` moves to `scripts/hexo-runner.cjs`. Because the shim uses `__dirname` as the Hexo site root, it is updated to resolve the repository root as `path.join(__dirname, '..')` for both the `Hexo` instance and the `scripts/tags.js` plugin load. `package.json` scripts `clean`, `build`, and `server` point at the new path.
- Local scratch files that are ignored by git and absent from the repository are deleted: `artifacts-*.log` (10 files), `debug.log`, `artifacts/`, `assets/`, `test-results/`, `db.json`, and the empty `content/` directory.

## Non-goals

- Do not delete `docs/superpowers/` history (AGENTS.md requires keeping it).
- Do not delete `source/_data/covers.yml`; Reimu's random-cover helper reads it.
- Do not touch `.agents/`, `.opencode/`, `.superpowers/`, `.worktrees/`, `public/`, or `node_modules/`.
- No content, theme, or behavior changes.

## Tests

- New unit test (`tests/unit/structure.test.mjs`): the root has no `hexo-runner.cjs`; the shim exists under `scripts/`; `tests/e2e/.gitkeep` is gone; and the `clean`, `build`, and `server` npm scripts all invoke `node scripts/hexo-runner.cjs`.
- Full gate (`npm test`) proves the moved shim still builds, serves, and passes browser tests.

## Files

- `.gitignore` (unchanged; `*.log`, `artifacts/`, `test-results/`, `db.json` already cover the deleted scratch)
- `tests/e2e/.gitkeep` (deleted)
- `hexo-runner.cjs` → `scripts/hexo-runner.cjs`
- `package.json`
- `tests/unit/structure.test.mjs` (new)

## Acceptance

- The repository root contains only configuration, documentation, and package files.
- `npm test` passes; the GitHub Pages workflow (which uses npm scripts) is unaffected.
- The cleaned tree is pushed to `main`.
