# Sidebar Left And Widget Trim Design

## Summary

Move the Reimu sidebar to the left and remove the category and tag cards from the sidebar widget list, keeping only the recent-posts card. The request is a configuration-only change; no theme code is touched.

## Change

In `_config.reimu.yml`:

- `sidebar.position: right` → `left`.
- `widgets` becomes exactly `[recent_posts]` (the `category` and `tag` entries are removed).

## Effects

- Desktop: author block, site stats, social links, the Follow button, the sidebar menu, and the recent-posts card render on the left; the article table-of-contents sidebar follows the same side via the theme's `sidebar-left` layout class (`#content`).
- The category and tag cards disappear from the desktop sidebar. Widgets only render on non-post pages, and the mobile drawer never included the widget list, so mobile behavior is unchanged apart from the shared layout class.
- Top navigation 分类 and 标签 links and the `/categories/`, `/tags/` pages stay exactly as they are.

## Non-goals

- No new widgets and no reordering beyond removing the two cards.
- No edits to `node_modules/` or theme sources.
- No changes to the mobile drawer contents or to taxonomy pages.

## Tests

- Unit (`tests/unit/config.test.mjs`): `sidebar.position` is `left`, and the widgets list contains exactly `recent_posts`.
- E2E (`tests/e2e/site.spec.js`): `#content` carries `sidebar-left`; the sidebar's only widget title is 最新文章; on desktop the sidebar box sits left of the main column.

## Files

- `_config.reimu.yml`
- `tests/unit/config.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- The sidebar renders on the left and only the recent-posts card remains.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass.
- Desktop and mobile screenshots in light and dark themes confirm the layout.
