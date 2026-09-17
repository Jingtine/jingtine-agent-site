# Category Taxonomy And Pages Design

## Summary

Restructure the site taxonomy into four top-level Chinese categories with two-level nesting, migrate the ten posts, rebuild the `/categories/` page as cards with child chips, and feature 工程/产品 on the home page with the provided default category cover.

## Change

- Top-level taxonomy: 工程 / 产品 / 随笔 / 笔记. Only 工程 and 产品 have posts today; 随笔 and 笔记 appear automatically once content exists.
- Post mapping (front matter `categories:` as a two-item array):
  - 工程 / 站点建设: `hello-world`, `building-digital-garden`, `rebuilding-the-tea-house`
  - 工程 / 工具与流程: `opencode-superpowers-workflow`, `github-pages-dev-notes`
  - 工程 / AI 与 Agent: `building-agent`
  - 工程 / 软件工程: `why-se-matters`
  - 产品 / 方法论: `product-thinking-101`
  - 产品 / 设计: `from-ui-to-product`
  - 产品 / 项目复盘: `notewhale-why-started`
- `source/categories/index.md` uses `{% list_categories show_count:true depth:2 %}`; `custom.css` styles the generated `.category-list` markup as top-level cards (name + count badge) with child chips below, using Reimu's purple/blue tokens in both themes.
- `_config.reimu.yml` enables `home_categories` with 工程 and 产品 entries, both using the new `source/images/category-bloom.webp` cover converted from the provided `Bloom.png` (2048×1080).
- `source/images/category-bloom.webp` is produced at 1600×844, WebP quality 82.

## Non-goals

- No custom Hexo tag plugin; the page keeps `list_categories` and gains CSS only.
- No changes to post tags (the tag cloud and its tests stay untouched).
- No migration of retired category URLs; the previous English category paths stop resolving (the site is new and unlinked).
- The sidebar category statistic now reports Hexo's category-document count (parents plus children), which is Hexo's native behavior for nested categories.

## Tests

- Unit (`tests/unit/content.test.mjs`): every post carries its exact two-level category array from the mapping.
- Unit (`tests/unit/generated-site.test.mjs`): the categories page renders the top-level cards (`工程`, `产品`), nested `category-list-child` chips (`站点建设` etc.), and counts; the home page renders two `post-categories-wrap` cards with the new cover.
- Unit (`tests/unit/assets.test.mjs`): `source/images/category-bloom.webp` exists as a WebP under 450 KB.
- E2E (`tests/e2e/site.spec.js`): the categories page shows the taxonomy, a child chip navigates without 404, and the home page shows the two featured category cards.

## Files

- `_config.reimu.yml`, `source/categories/index.md`, `source/css/custom.css`
- `source/images/category-bloom.webp` (new)
- `source/_posts/*.md` (10 category migrations)
- `tests/unit/content.test.mjs`, `tests/unit/generated-site.test.mjs`, `tests/unit/assets.test.mjs`, `tests/e2e/site.spec.js`

## Acceptance

- `/categories/` shows four-nature taxonomy cards with child chips; the home page shows the two featured category cards with the cover.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass; screenshots confirm both pages.
