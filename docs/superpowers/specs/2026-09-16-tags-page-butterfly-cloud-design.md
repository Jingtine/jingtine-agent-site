# Tags Page Butterfly Cloud Design

## Summary

Rework the `/tags/` index page to follow hexo-theme-butterfly's tag display for both construction and visual design, with a fixed multicolor palette and random ordering. This supersedes the chip-cloud design in `docs/superpowers/specs/2026-09-16-tags-page-chips-design.md` (historical).

Reference implementation studied from `jerryc127/hexo-theme-butterfly` (v5.7.0):
- `scripts/helpers/page.js` → `cloudTags` helper: size buckets from `tag.length`, inline `font-size`, inline `background-color`, `custom_colors` support, random order by default.
- `source/css/_page/tags.styl` → `.tag-cloud-list` styles: 7px radius, white text, entry fade, hover shine, sibling fade, active press, mobile zoom.

## Goals

- Reproduce Butterfly's tag-cloud construction on our Hexo/Reimu site.
- Reproduce Butterfly's visual design: entry fade, hover shine + lift, sibling fade, active press, mobile scaling.
- Keep a fixed multicolor palette (deterministic colors) while ordering tags randomly per build.
- Keep white chip text at WCAG AA contrast on every palette color.
- Keep the change scoped to `/tags/`; no theme edits, no new dependencies, no new runtime JavaScript.

## Non-goals

- Do not change the sidebar tag widget, tag detail pages, or archives.
- Do not copy Butterfly code verbatim; the local implementation is deterministic, reviewable, and adapted to Reimu tokens and rules.
- Do not add per-build random colors (Butterfly's default random RGB) — colors come from a fixed palette.
- Do not remove the theme's arrow suppression or the existing keyboard-focus treatment.

## Construction

`scripts/tags.js` gains a local `cloud_tags` tag plugin that mirrors Butterfly's `cloudTags` logic:

- Distinct post-count sizes are collected ascending; each tag's ratio is `index / (count - 1)`, or `0` when there is a single size.
- Font size is `1.2em + 0.3em × ratio` (current content: `1.2em` for single-post tags, `1.5em` for two-post tags).
- Each tag is assigned a palette color by a deterministic hash of its name, so a tag keeps its color across builds even though order is random.
- Tags are emitted in random order using Hexo's `tags.random()` (Butterfly's default `orderby: random`).
- Output is `<a href="…" class="tag-cloud-item" style="font-size: 1.2em; background-color: #6d4fc4;">name</a>` joined with no separators.
- Tag names are HTML-escaped; hrefs go through Hexo's `url_for` so they keep the `/jingtine-agent-site/` root.
- An empty tag collection returns an empty string.

`source/tags/index.md` becomes:

```markdown
---
title: 标签
date: 2026-09-16 12:00:00
comments: false
---

<div class="tag-cloud-list">
{% cloud_tags %}
</div>
```

## Palette

Fixed eight-color palette, all verified ≥ 4.82:1 against white text:

| Hex | Contrast vs white |
| --- | --- |
| `#6d4fc4` | 5.89 |
| `#3b6fc9` | 4.88 |
| `#2f7d7a` | 4.84 |
| `#b23a7a` | 5.56 |
| `#b5542f` | 4.91 |
| `#3f7f4f` | 4.82 |
| `#5a5fc7` | 5.39 |
| `#4a6b8a` | 5.58 |

## Visual Design

`source/css/custom.css` replaces the previous `.tag-cloud-list` / `.tag-chip-*` block with Butterfly-style rules:

- Container: centered text, `animation: tags-fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)`, small top margin for breathing room under the theme's divider.
- Chip: `inline-block`, `margin: 5px`, `padding: 3px 12px`, `line-height: 1.7`, `border-radius: 7px`, `overflow: hidden`, white text, `transform: translateY(0) scale(1)`, `will-change: transform, background-color, box-shadow`, `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`.
- Shine: `::before` gradient `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)` positioned at `left: -100%`, `z-index: -1`, `transition: left 0.6s`; on hover it sweeps to `left: 100%`.
- Sibling fade: `.tag-cloud-list:hover a:not(:hover) { opacity: 0.7; transform: scale(0.98); }`.
- Hover: lift to `translateY(-2px) scale(1.02)` with Butterfly's three-layer shadow.
- Active: `translateY(-1px) scale(0.98)`, smaller shadow, faster transition.
- Entry: `@keyframes tags-fade-in` from `opacity: 0; translateY(20px)` to `opacity: 1; translateY(0)`.
- Mobile (`max-width: 767px`): container `zoom: 0.85`; hover/active deltas reduced; shine disabled with `display: none`.

### Deliberate adaptations

1. Hover keeps each chip's own color and adds `filter: brightness(1.08)` instead of Butterfly's `background: var(--btn-hover-color)`. Reimu's dark-theme accent tokens are light purples, and switching to them would drop white-text contrast.
2. `::after { content: none !important; }` stays, because Reimu draws an iconfont arrow after every `.article-entry` link.
3. Colors are hash-stable per tag name rather than cycled by index; random ordering would otherwise reshuffle colors on every build.
4. No dark-theme overrides: the palette is fixed and already AA against white in both themes.

## Accessibility

- White text on all eight palette colors is ≥ 4.82:1 (WCAG AA normal text).
- Chips remain links with the tag name as the accessible name; no ARIA required.
- Keyboard focus keeps the global `:focus-visible` outline (3px solid `--red-1`, offset 3px).
- `prefers-reduced-motion` is honored by the existing global rule, which reduces the entry animation, shine, and hover transitions to 0.01ms.
- Mobile chips must not introduce horizontal overflow.

## Validation

Implementation is complete only when:

1. `npm run check` passes (clean build plus generated-site check).
2. `npm run test:unit` passes with the new and updated assertions.
3. `npm run test:e2e` passes on desktop and Pixel.
4. Screenshots of `/tags/` in light and dark themes at desktop and mobile widths confirm the visual design.

### Unit coverage

- New `scripts/tags.js` test (vm harness): `cloud_tags` emits one anchor per tag with `class="tag-cloud-item"`, font sizes limited to the two buckets, every inline background color from the palette, the same tag name always receives the same color, HTML-special characters in tag names are escaped, and an empty collection returns an empty string.
- Updated generated-site test: `/tags/index.html` contains the `.tag-cloud-list` wrapper, sixteen `tag-cloud-item` anchors, no leftover `tag-chip-` classes, all hrefs under `/jingtine-agent-site/tags/`, and all inline background colors from the palette.

### E2E coverage

Updated `/tags/` test for both projects:

- sixteen chips visible with rooted hrefs;
- computed `border-radius` of 7px and white text;
- every chip's white-text contrast against its own background ≥ 4.5;
- every chip background is one of the eight palette colors;
- the arrow pseudo-element is suppressed and the shine pseudo-element exists with a gradient background;
- keyboard focus reaches the first chip with a visible outline;
- desktop hover applies the brightness filter;
- Pixel: computed `zoom` is 0.85, shine is `display: none`, and there is no horizontal overflow.

## Files

- `scripts/tags.js` — `cloud_tags` tag, palette, hash, escaping, rendering logic.
- `source/tags/index.md` — wrapper plus `{% cloud_tags %}`.
- `source/css/custom.css` — Butterfly-style tag cloud block replacing the chip rules.
- `tests/unit/generated-site.test.mjs` — plugin and generated-markup assertions.
- `tests/e2e/site.spec.js` — updated tags page test.

## Acceptance Criteria

- `/tags/` shows centered multicolor chips with 7px radius, white text, two size buckets, and a random order that changes per build.
- Each tag keeps a stable color across builds; the palette is fixed and deterministic.
- Entry fade, hover shine/lift/sibling fade, active press, and mobile scaling behave like Butterfly's, and are neutralized under `prefers-reduced-motion`.
- All chip text meets WCAG AA contrast; keyboard focus remains visible; no mobile overflow.
- No changes outside the tags page; no new dependencies; no theme or `node_modules/` edits.
