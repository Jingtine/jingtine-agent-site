# Home Subtitle Typing Design

## Summary

Replace the static home subtitle below 不驚茶坊 with a rotating typewriter of seven tea poems, using Reimu's built-in `subtitle.typing` feature (typed.js 2.1.0), and keep it still for users who request reduced motion.

## Change

- `_config.reimu.yml` enables `subtitle.typing` with the seven poems in the given order (`shuffle: false`), theme-default speeds, `backDelay: 2600`, `loop: true`, visible `|` cursor, `smartBackspace: false`.
- New `source/js/typing-guard.js` is injected in `injector.head_end` after the firework guard. Under `prefers-reduced-motion: reduce` it renders the first poem statically on `DOMContentLoaded` and replaces `window.Typed` with a no-op constructor so the vendor library never animates (the returned instance still exposes `destroy`, which Reimu calls on PJAX).
- `injector.head_end` becomes the stylesheet link plus both guard scripts.

## Non-goals

- No changes to other pages' header subtitles (archives, categories, tags, and posts keep their static values).
- The site-wide `subtitle` in `_config.yml` stays for metadata.
- No theme or `node_modules/` edits; no new dependencies (typed.js remains a theme CDN vendor script).

## Tests

- Unit (`tests/unit/config.test.mjs`): typing enabled, `shuffle: false`, and the seven poem strings exactly.
- Unit (`tests/unit/assets.test.mjs`): `head_end` injects both guards.
- Unit (`tests/unit/generated-site.test.mjs`): the home page renders the empty typing span, loads the typed.js vendor after the guard, embeds the strings, and the guard suppresses animation under reduced motion (vm harness for both media states).
- E2E (`tests/e2e/site.spec.js`): the vendor script exists once, the embedded config holds seven strings, and under reduced motion the first poem renders statically.

## Files

- `_config.reimu.yml`
- `source/js/typing-guard.js`
- `tests/unit/config.test.mjs`
- `tests/unit/assets.test.mjs`
- `tests/unit/generated-site.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- The home header cycles the seven poems in order; other pages are unchanged.
- Reduced-motion users see the first poem without animation.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass; screenshots capture the typing and the still state.
