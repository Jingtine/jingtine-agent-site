# Site Favicon Design

## Summary

Use the provided tea-cup illustration (`site-pic.png`, 1254×1254, transparent) as the browser-tab icon. The file is converted to a local multi-size ICO that overrides Reimu's default favicon.

## Change

- Convert the source PNG with Pillow (temporary install, not committed) to `source/images/site-favicon.ico` containing 16, 32, and 48 px frames.
- `_config.reimu.yml` sets `favicon: /images/site-favicon.ico`.
- The distinct name is required: at identical output paths, Reimu's theme source wins over the site source (verified during implementation: `public/images/favicon.ico` stayed byte-identical to the theme asset), so the site favicon uses its own path instead of overriding `favicon.ico`.
- Reimu's head emits `<link rel="shortcut icon" href="/jingtine-agent-site/images/site-favicon.ico">` through Hexo's `favicon_tag` helper, so no template work is needed.

## Non-goals

- No apple-touch-icon, mask-icon, or PWA manifest changes.
- No changes to the banner, avatar, or cover artwork.
- The repository gains no Python runtime dependency; Pillow stays in a temporary directory.

## Tests

- Unit (`tests/unit/assets.test.mjs`): `source/images/site-favicon.ico` exists, carries a valid ICO header (reserved 0, type 1, three embedded sizes), and stays under 100 KB.
- Unit (`tests/unit/generated-site.test.mjs`): the home page links `rel="shortcut icon"` to `/jingtine-agent-site/images/site-favicon.ico`, and the published `public/images/site-favicon.ico` is byte-identical to the site source.
- E2E (`tests/e2e/site.spec.js`): the icon link points at the project-root favicon and the asset responds 200.

## Files

- `source/images/site-favicon.ico`
- `_config.reimu.yml`
- `tests/unit/assets.test.mjs`
- `tests/unit/generated-site.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- Browser tabs show the tea-cup illustration.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass.
- A rendered preview of the 16/32/48 px frames is legible at the larger sizes.
