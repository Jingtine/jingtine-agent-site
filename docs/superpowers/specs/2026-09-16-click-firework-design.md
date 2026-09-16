# Click Firework Design

## Summary

Enable Reimu's click firework (`mouse-firework`) with a green palette, and keep it off for users who request reduced motion.

## Change

- `_config.reimu.yml` enables `firework` with the theme's default particle structure (emit circles plus one diffuse ring), `excludeElements: ["a", "button"]`, and a four-step green palette: `#86efac`, `#4ade80`, `#22c55e`, `#16a34a`.
- New `source/js/firework-guard.js` is injected in `injector.head_end` before the theme's deferred vendor script. It wraps `window.firework` with a property whose getter returns a no-op while `prefers-reduced-motion: reduce` matches, so the effect never initializes for those users.
- `injector.head_end` becomes the custom stylesheet link followed by the guard script tag.

## Non-goals

- No changes to the vendor CDN source or the theme templates.
- No new npm dependencies; the guard is local vanilla JavaScript.
- No color theming tied to `internal_theme` tokens (canvas needs concrete colors).

## Tests

- Unit (`tests/unit/config.test.mjs`): `firework.enable` is true, the green palette is present, `a`/`button` stay excluded; the disabled-feature list no longer contains `firework`.
- Unit (`tests/unit/assets.test.mjs`): `head_end` injects the stylesheet and the guard script.
- Unit (`tests/unit/generated-site.test.mjs`): the generated page loads the guard before the `mouse-firework` vendor script, and the guard suppresses the effect under reduced motion (vm harness with both `matchMedia` outcomes).
- E2E (`tests/e2e/site.spec.js`): the vendor script tag exists once; a stubbed `window.firework` is suppressed under reduced motion and callable otherwise.

## Files

- `_config.reimu.yml`
- `source/js/firework-guard.js`
- `tests/unit/config.test.mjs`
- `tests/unit/assets.test.mjs`
- `tests/unit/generated-site.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- Clicking empty page areas bursts green particles; links and buttons stay excluded.
- Reduced-motion users get no particles.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass.
- A local screenshot captures the green burst.
