# Banner Illustration Design

## Summary

Replace the neutral placeholder banner with the user-provided illustration (`盏茗.png`, 2048×1080) as the site-wide header banner. Scope is banner-only: article covers and social preview images stay unchanged.

## Change

- Convert the source PNG to `source/images/banner-illustration.webp` (WebP, quality 80, original 2048×1080); the distinct name avoids colliding with the theme's own `banner.webp` artwork.
- `_config.reimu.yml`: `banner: /images/banner-illustration.webp`.
- Delete `source/images/banner-placeholder.svg`; nothing references it after the switch.

## Non-goals

- Do not change the article default cover (`default-campus-cover.webp`) or the Open Graph image.
- Do not touch theme-shipped artwork or `node_modules/`.
- Do not add responsive variants for the banner in this change.

## Tests

- Unit (`tests/unit/assets.test.mjs`): the illustration exists, starts with the RIFF/WEBP magic bytes, and stays under a 600 KB budget; the placeholder file is gone.
- Unit (`tests/unit/generated-site.test.mjs`): home cards still do not use the banner as a lazy cover.
- E2E (`tests/e2e/site.spec.js`): the home header renders an `img` whose `src` is the illustration and which responds 200.

## Files

- `source/images/banner-illustration.webp` (new)
- `source/images/banner-placeholder.svg` (deleted)
- `_config.reimu.yml`
- `tests/unit/assets.test.mjs`
- `tests/unit/generated-site.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- The site banner shows the illustration on every page that uses the header.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass.
- Home screenshots in light and dark themes confirm the banner renders.
