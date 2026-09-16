# Footer Credit Update Design

## Summary

Change the footer copyright line from `© 2020-2026 [taichi icon] 不驚醴` to `© 2026 [taichi icon] Jingtine`, keeping the existing copyright icon and the rotating taichi separator.

## Change

- `_config.reimu.yml` gains `footer.since: 2026`. Reimu renders a single year when `since` equals the current year, so the footer shows `2026` now; the theme's native range behaviour returns automatically in later years.
- `scripts/tags.js` extends the existing `after_render:html` filter to rewrite only the footer copyright credit. The regular expression is anchored on the `footer-info-sep` separator icon and replaces the author text that follows it with `Jingtine`. `config.author` stays `不驚醴`, so the sidebar author block, avatar `alt` text, and metadata are unchanged.

The separator element itself (`.footer-info-sep` with the taichi mask image) is preserved, as is the `icon-copyright` glyph.

## Non-goals

- No theme or `node_modules/` edits.
- No change to the sidebar identity, avatar, page metadata, or top navigation.
- No change to other footer lines (powered-by, word count, busuanzi).

## Tests

- Unit (`tests/unit/config.test.mjs`): `_config.reimu.yml` contains `footer.since: 2026`.
- Unit (`tests/unit/generated-site.test.mjs`): the HTML filter rewrites the footer credit to `Jingtine`, keeps the separator, and leaves `alt="不驚醴"` elsewhere untouched.
- E2E (`tests/e2e/site.spec.js`): the first footer line contains `2026` and `Jingtine`, does not contain `2020` or `不驚醴`, and still has exactly one `.footer-info-sep`; the sidebar author name remains `不驚醴`.

## Files

- `_config.reimu.yml`
- `scripts/tags.js`
- `tests/unit/config.test.mjs`
- `tests/unit/generated-site.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- The footer reads `© 2026 [taichi icon] Jingtine`; the sidebar still shows `不驚醴`.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass.
- Footer screenshots in light and dark themes confirm the render.
