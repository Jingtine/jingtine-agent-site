# Tags Page Chips Design

## Summary

Replace the plain `/tags/` index output with a centered chip cloud. The page currently renders Hexo's built-in `tagcloud` helper output: bare links with tiny inline font sizes and no visual treatment. The new design keeps the existing `tagcloud` helper, wraps it in a site-owned container, and styles it through `source/css/custom.css` using Reimu's purple/blue tokens.

Visual reference: `https://water1i1y.org/tags/` (Butterfly theme chip cloud). Only the layout idea is borrowed — centered chips, rounded corners, size by post count, hover emphasis. The palette stays with the site's own light purple, light blue, and white design language.

## Goals

- Make `/tags/` feel intentional and consistent with the rest of the site.
- Keep the size-by-frequency heat scale (13 single-post tags vs. 3 two-post tags).
- Reuse the existing `tagcloud` helper options instead of adding new JavaScript.
- Support light and dark themes with accessible text contrast.
- Keep keyboard focus, reduced motion, and mobile layout correct.

## Non-goals

- Do not change the sidebar tag widget, tag detail pages (`/tags/<tag>/`), or archives.
- Do not show per-tag post counts on the chips.
- Do not add per-tag random colors; the palette is the site's purple/blue scale.
- Do not edit `node_modules/` theme sources or add a new front-end framework.
- Do not change tag names, slugs, or generated tag routes.

## Markup

`source/tags/index.md` drops the intro sentence and wraps the helper:

```html
<div class="tag-cloud-list">
{% tagcloud min_font:1 max_font:1.6 unit:em orderby:length order:-1 class:tag-chip %}
</div>
```

- `class:tag-chip` makes the helper emit `tag-chip-0` through `tag-chip-10`, computed from each tag's post count ratio. The current site has two tiers: `tag-chip-0` (13 tags) and `tag-chip-10` (AI Agent, 产品思维, 个人网站).
- `min_font:1 max_font:1.6 unit:em` keeps the inline `font-size` in `em` so chip text scales with the container, which gives responsive sizing without `!important` overrides.
- `orderby:length order:-1` puts the most-used tags first.
- The helper still emits inline `style="font-size: ..."`; this is the size scale and is intentionally kept.

## Visual Design

### Container

- `display: flex`, `flex-wrap: wrap`, `justify-content: center`, `align-items: center`.
- `gap: 0.5rem 0.65rem`, padding around the cloud, `font-size: 15px` on desktop.
- Mobile (`@media (max-width: 767px)`, matching the theme's normal breakpoint): `font-size: 13.5px`, slightly tighter gap.

### Chips

- `display: inline-flex`, `align-items: center`, `padding: 0.35em 0.95em`.
- `border-radius: 999px`, `font-weight: 600`, `line-height: 1.7`, `text-decoration: none`.
- `transition: transform 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease`.
- No `overflow: hidden`, so the global `:focus-visible` outline is not clipped.

### Heat tiers (light theme)

| Tier | Classes | Background | Text |
| --- | --- | --- | --- |
| Cool | `tag-chip-0` … `tag-chip-4` | `var(--red-5)` with `color-mix` border | `var(--red-0)` |
| Medium | `tag-chip-5` … `tag-chip-7` | `var(--red-4)` | `var(--red-0)` |
| Hot | `tag-chip-8` … `tag-chip-10` | `linear-gradient(135deg, var(--red-0), var(--red-1))` | `#fff` |

Hot chips render at `1.6em` (large text), so the white-on-purple gradient clears the 3:1 large-text contrast threshold; the deep end (`--red-0`) is about 4.7:1 against white.

### Dark theme

A `[data-theme='dark']` override block adjusts the chips:

- Cool/medium: translucent purple background (`color-mix` from `--red-5`/`--red-4`) with `var(--red-1)` or `var(--red-2)` text.
- Hot: translucent light-purple background with `#fff` text and a brighter border.

### Interaction

- Hover: `translateY(-2px)` plus a soft shadow, and `.tag-cloud-list:hover a:not(:hover) { opacity: 0.72 }` to emphasize the hovered chip.
- No shine sweep or looping animation; the existing global `prefers-reduced-motion` rule already neutralizes transitions.

## Accessibility

- Chips remain plain links with the tag name as the accessible name.
- Keyboard focus uses the existing global `:focus-visible` outline with `outline-offset: 3px`.
- Color is never the only signal: font size also encodes heat, and chip text contrast meets WCAG AA (or AA-large for the hot tier).
- Semantic markup stays a flat list of links; no ARIA is required.
- Mobile layout must not introduce horizontal overflow.

## Validation

Implementation is complete only when all of the following pass:

1. `npm run check` — clean build plus generated-site check.
2. `npm run test:unit` — updated assertions on `public/tags/index.html`.
3. `npm run test:e2e` — new focused `/tags/` test on desktop and Pixel.
4. Manual screenshot review of the tags page in light and dark themes at desktop and mobile widths.

### Unit coverage

Extend `tests/unit/generated-site.test.mjs` to assert the generated `/tags/index.html`:

- contains `class="tag-cloud-list"`;
- contains at least one `tag-chip-0` and one `tag-chip-10` anchor;
- chip `href` values point under `/jingtine-agent-site/tags/`;
- no chip carries an inline `background-color`.

### E2E coverage

Add a focused test to `tests/e2e/site.spec.js` for both projects:

- `/tags/` chips are visible and their hrefs use the project-root prefix;
- a chip is reachable by keyboard and shows a visible focus indicator;
- the Pixel viewport has no horizontal overflow on `/tags/`.

## Files

- `source/tags/index.md` — wrapper container and helper arguments.
- `source/css/custom.css` — chip cloud styles and dark theme overrides.
- `tests/unit/generated-site.test.mjs` — generated markup assertions.
- `tests/e2e/site.spec.js` — tags page behavior coverage.

## Acceptance Criteria

- `/tags/` shows centered purple/blue chips with larger chips for more-used tags.
- Light and dark themes both render readable chips; hot chips are clearly distinguished.
- Hover and keyboard focus states are visible; reduced-motion users see no motion.
- No counts, no per-tag random colors, no theme source edits, no new runtime dependencies.
- All validation commands pass and the deployed project-root URLs remain correct.
