# Hexo Reimu Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current hand-written multi-application site with a reproducible Hexo 8 site using Reimu 1.12.5, retaining the approved personal content and removing the reader, papers, Wiki, assistant, status, comments, and guestbook.

**Architecture:** Hexo owns content generation from `source/`, while `hexo-theme-reimu` supplies all shared templates and interactions. Site-specific identity is expressed through `_config.yml`, `_config.reimu.yml`, Markdown pages, local assets, and one injected stylesheet; GitHub Actions builds and deploys the uncommitted `public/` artifact to the existing project Pages URL.

**Tech Stack:** Node.js 22, Hexo 8.1.2, hexo-theme-reimu 1.12.5, Hexo official generators/renderers, Node's built-in test runner, Playwright 1.63.0, GitHub Pages Actions

**Spec:** `docs/superpowers/specs/2026-09-16-hexo-reimu-migration-design.md`

## Global Constraints

- Production URL remains `https://jingtine.github.io/jingtine-agent-site/` with root `/jingtine-agent-site/`.
- Use the official npm theme package; do not vendor or edit `node_modules/hexo-theme-reimu`.
- Pin production and test dependencies exactly in `package.json` and commit `package-lock.json`.
- Preserve the nine existing public articles, site identity, avatar, project content, About content, and friend-link source data.
- Do not preserve old `article.html?slug=...` URLs.
- Do not add Giscus, Waline, a guestbook, a comment backend, or a database.
- Disable Live2D, custom cursors, mouse fireworks, Material You, and the music player.
- Keep music-player configuration disabled so it can be enabled later without template changes.
- Use the supplied campus photograph as the global article cover and a local blue-purple placeholder as the banner.
- Remove Wiki references and paragraphs/sections whose purpose depends on the removed Wiki.
- Keep the generated `public/` directory out of Git.
- Preserve unrelated user work if the worktree becomes dirty during execution.

---

## File Map

### New source and configuration

- `package.json` — pinned Hexo and Playwright commands/dependencies.
- `package-lock.json` — reproducible npm dependency graph.
- `_config.yml` — canonical Hexo site, URL, permalink, feed, and generator configuration.
- `_config.reimu.yml` — Reimu navigation, features, palette, media, and disabled integrations.
- `scaffolds/post.md` — future article template.
- `source/_posts/*.md` — nine migrated articles.
- `source/about/index.md` — About page.
- `source/projects/index.md` — retained project portfolio.
- `source/friend/index.md` and `source/friend/_data.yml` — Friends page and data.
- `source/categories/index.md` and `source/tags/index.md` — taxonomy overview pages backed by Hexo's built-in tag helpers.
- `source/_data/avatar/avatar.jpg` — retained avatar.
- `source/images/default-campus-cover.webp` — optimized user-supplied default cover.
- `source/images/banner-placeholder.svg` — replaceable blue-purple site banner.
- `source/css/custom.css` — project-page styling, focus treatment, and reduced-motion guardrails.
- `scripts/check-site.mjs` — generated-artifact and internal-link quality gate.
- `tests/unit/*.test.mjs` — configuration, source-content, asset, and removal contracts.
- `tests/e2e/site.spec.js` — generated-site browser behavior.
- `.github/workflows/deploy-pages.yml` — build, verify, and Pages deployment.

### Modified documentation/tooling

- `.gitignore` — track root lockfile and ignore Hexo output/cache.
- `README.md` — Hexo authoring, local preview, validation, and deployment.
- `AGENTS.md` — replace the former no-build rules with the approved Hexo architecture and retained safety rules.
- `tests/playwright.config.js` — test the generated project-root site through `hexo server`.

### Removed legacy surface

- All root hand-authored site HTML and `styles.css`.
- All files in `js/`.
- The old `articles/`, `config/`, `content/wiki/`, `content/templates/`, and `public/data/` trees after their retained content is migrated.
- Python collectors/generators/checkers used by the old architecture.
- Old generated `feed.xml`, `subscriptions.opml`, and root `.nojekyll`.
- The feed/paper/status nightly workflow.
- Old Python tests, old Playwright specs, visual-audit helpers, and obsolete test documentation.
- `.opencode/skills/research-paper-collector/` and `REDESIGN_REPORT.md`, which only document or support removed features.

---

### Task 1: Establish the pinned Hexo/Reimu foundation

**Files:**
- Create: `tests/unit/config.test.mjs`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `_config.yml`
- Create: `_config.reimu.yml`
- Create: `scaffolds/post.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm run clean`, `npm run build`, `npm run server`, `npm run test:unit`; Hexo root `/jingtine-agent-site/`; post route `/posts/:title/`.
- Consumes: no earlier implementation task.

- [ ] **Step 1: Write the failing configuration contract**

Create `tests/unit/config.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('pins the approved Hexo and Reimu toolchain', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.engines.node, '>=22');
  assert.equal(pkg.dependencies.hexo, '8.1.2');
  assert.equal(pkg.dependencies['hexo-theme-reimu'], '1.12.5');
  assert.equal(pkg.devDependencies['@playwright/test'], '1.63.0');
});

test('uses the GitHub Pages project root and clean post URLs', async () => {
  const config = await read('_config.yml');
  assert.match(config, /^url: https:\/\/jingtine\.github\.io\/jingtine-agent-site$/m);
  assert.match(config, /^root: \/jingtine-agent-site\/$/m);
  assert.match(config, /^permalink: posts\/:title\/$/m);
  assert.match(config, /^theme: reimu$/m);
});

test('disables comments and unwanted effects', async () => {
  const config = await read('_config.reimu.yml');
  for (const key of ['valine', 'waline', 'twikoo', 'gitalk', 'giscus', 'disqus', 'utterances', 'beaudar', 'live2d', 'live2d_widgets', 'reimu_cursor', 'firework', 'material_theme']) {
    assert.match(config, new RegExp(`${key}:\\r?\\n\\s+enable: false`));
  }
  assert.match(config, /aplayer:\r?\n\s+enable: false/);
  assert.match(config, /meting:\r?\n\s+enable: false/);
});
```

- [ ] **Step 2: Run the test and verify the pre-migration failure**

Run: `node --test tests/unit/config.test.mjs`

Expected: FAIL because the root `package.json`, `_config.yml`, and `_config.reimu.yml` do not exist.

- [ ] **Step 3: Create and pin the Hexo package manifest**

Create `package.json` with:

```json
{
  "name": "jingtine-agent-site",
  "version": "2.0.0",
  "private": true,
  "engines": { "node": ">=22" },
  "scripts": {
    "clean": "hexo clean",
    "build": "hexo generate",
    "server": "hexo server --port 8081",
    "test:unit": "node --test tests/unit/*.test.mjs",
    "test:e2e": "playwright test --config tests/playwright.config.js"
  },
  "dependencies": {
    "hexo": "8.1.2",
    "hexo-generator-archive": "2.0.0",
    "hexo-generator-category": "2.0.0",
    "hexo-generator-feed": "3.0.0",
    "hexo-generator-index": "4.0.0",
    "hexo-generator-tag": "2.0.0",
    "hexo-renderer-ejs": "2.0.0",
    "hexo-renderer-marked": "7.0.1",
    "hexo-renderer-stylus": "3.0.1",
    "hexo-server": "3.0.0",
    "hexo-theme-reimu": "1.12.5"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0"
  }
}
```

Remove the `package-lock.json` ignore rule from `.gitignore`, then run `npm install --ignore-scripts` once to create the lockfile. Run normal `npm ci` afterward to prove the lockfile is usable.

- [ ] **Step 4: Add the outer Hexo configuration**

Create `_config.yml` with the following effective values:

```yaml
title: 不驚茶坊
subtitle: 在学习与创造之间，记下一些想法，也留住日常的发现。
description: 不驚醴的个人茶坊：记录学习、写作、软件、产品与日常观察。
keywords: 软件工程, AI Agent, 产品思考, 个人博客
author: 不驚醴 / Jingtine
language: zh-CN
timezone: Asia/Shanghai

url: https://jingtine.github.io/jingtine-agent-site
root: /jingtine-agent-site/
permalink: posts/:title/
pretty_urls:
  trailing_index: false
  trailing_html: false

source_dir: source
public_dir: public
new_post_name: :title.md
default_layout: post
titlecase: false
external_link:
  enable: true
  field: site
  exclude: ''
filename_case: 0
render_drafts: false
post_asset_folder: false
relative_link: false
future: true
highlight:
  enable: true
  line_number: true
  auto_detect: false
  tab_replace: ''

index_generator:
  path: ''
  per_page: 10
  order_by: -date
archive_generator:
  per_page: 20
  yearly: true
  monthly: false
category_generator:
  per_page: 20
tag_generator:
  per_page: 20
feed:
  type: atom
  path: atom.xml
  limit: 0
  content: true
  order_by: -date

theme: reimu
```

- [ ] **Step 5: Add the Reimu override configuration**

Create `_config.reimu.yml` as a small override file, relying on Reimu defaults for unspecified settings:

```yaml
theme_version_check: true
theme_config_check: true

menu:
  - name: home
    url: /
    icon: false
  - name: archives
    url: /archives
    icon: false
  - name: categories
    url: /categories
    icon: false
  - name: tags
    url: /tags
    icon: false
  - name: 项目
    url: /projects
    icon: false
  - name: about
    url: /about
    icon: false
  - name: friend
    url: /friend
    icon: false

avatar: avatar.jpg
banner: /jingtine-agent-site/images/banner-placeholder.svg
cover: /jingtine-agent-site/images/default-campus-cover.webp
rss: atom.xml

sidebar:
  position: right
  menu: true
  article:
    show_common: true
widgets:
  - recent_posts
  - category
  - tag
toc: true
toc_options:
  list_number: true
  min_depth: 2
  max_depth: 4
generator_search:
  enable: true
  field: post
  content: true

dark_mode:
  button: true
  type: auto
animation:
  enable: true
pjax:
  enable: true
pace:
  enable: true
top:
  enable: true
  position: right
firework:
  enable: false
live2d:
  enable: false
live2d_widgets:
  enable: false
reimu_cursor:
  enable: false
material_theme:
  enable: false

player:
  position: before_sidebar
  disable_on_mobile: true
  aplayer:
    enable: false
    options:
      audio: []
  meting:
    enable: false

giscus:
  enable: false
waline:
  enable: false
valine:
  enable: false
twikoo:
  enable: false
gitalk:
  enable: false
disqus:
  enable: false
utterances:
  enable: false
beaudar:
  enable: false
```

- [ ] **Step 6: Add the future post scaffold**

Create `scaffolds/post.md`:

```markdown
---
title: {{ title }}
date: {{ date }}
updated: {{ date }}
description:
categories:
tags: []
comments: false
toc: true
---

```

- [ ] **Step 7: Verify configuration and a clean npm install**

Run:

```powershell
node --test tests/unit/config.test.mjs
npm ci
npx hexo config root
```

Expected: tests PASS; `npm ci` exits 0; Hexo prints `/jingtine-agent-site/`.

- [ ] **Step 8: Commit the foundation**

```powershell
git add .gitignore package.json package-lock.json _config.yml _config.reimu.yml scaffolds/post.md tests/unit/config.test.mjs
git commit -m "build: establish Hexo Reimu foundation"
```

---

### Task 2: Migrate articles and retained standalone content

**Files:**
- Create: `tests/unit/content.test.mjs`
- Create: `source/_posts/*.md` (nine files)
- Create: `source/about/index.md`
- Create: `source/projects/index.md`
- Create: `source/friend/index.md`
- Create: `source/friend/_data.yml`
- Create: `source/categories/index.md`
- Create: `source/tags/index.md`

**Interfaces:**
- Consumes: Hexo source conventions and permalink contract from Task 1.
- Produces: nine buildable posts and three retained standalone routes: `/about/`, `/projects/`, `/friend/`.

- [ ] **Step 1: Write the failing source-content contract**

Create `tests/unit/content.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const expectedSlugs = [
  'building-agent', 'building-digital-garden', 'from-ui-to-product',
  'github-pages-dev-notes', 'hello-world', 'notewhale-why-started',
  'opencode-superpowers-workflow', 'product-thinking-101', 'why-se-matters'
];

test('migrates exactly the nine public posts to YAML front matter', async () => {
  const files = (await readdir('source/_posts')).filter(name => name.endsWith('.md')).sort();
  assert.deepEqual(files, expectedSlugs.map(slug => `${slug}.md`).sort());
  for (const file of files) {
    const text = await readFile(`source/_posts/${file}`, 'utf8');
    assert.match(text, /^---\r?\n/);
    assert.match(text, /^slug: [a-z0-9-]+$/m);
    assert.match(text, /^comments: false$/m);
    assert.match(text, /^toc: true$/m);
    assert.doesNotMatch(text, /\[\[[^\]]+\]\]/);
    assert.doesNotMatch(text, /^## Related Wiki\s*$/m);
  }
});

test('creates retained standalone pages without comments', async () => {
  for (const path of ['source/about/index.md', 'source/projects/index.md', 'source/friend/index.md', 'source/categories/index.md', 'source/tags/index.md']) {
    const text = await readFile(path, 'utf8');
    assert.match(text, /^comments: false$/m);
  }
});
```

- [ ] **Step 2: Run the test and confirm the missing-source failure**

Run: `node --test tests/unit/content.test.mjs`

Expected: FAIL with `ENOENT` for `source/_posts`.

- [ ] **Step 3: Convert all nine post front matters**

For every post, keep the filename and add exact YAML keys in this order. Use the following metadata without inventing or translating values:

| slug | title | date | description | category | tags |
|---|---|---|---|---|---|
| `building-agent` | `Building My First AI Agent` | `2026-07-11 12:00:00` | `从零构建一个自主 Agent 的实践记录与思考。` | `ai-agent` | `AI Agent`, `实践` |
| `building-digital-garden` | `Building My Digital Garden` | `2026-07-13 12:00:00` | `为什么我选择构建数字花园而不是传统作品集。` | `software-engineering` | `数字花园`, `个人网站` |
| `from-ui-to-product` | `From UI to Product` | `2026-07-13 12:00:00` | `从 UI 打磨到产品思维，设计个人网站过程中的反思。` | `product-thinking` | `产品思维`, `设计` |
| `github-pages-dev-notes` | `GitHub Pages Development Notes` | `2026-07-12 12:00:00` | `在 GitHub Pages 上部署静态站点的技术笔记：缓存、资源路径与页面样式。` | `software-engineering` | `GitHub Pages`, `静态网站` |
| `hello-world` | `Hello World` | `2026-07-10 12:00:00` | `第一篇博客文章，关于这个网站的诞生与愿景。` | `ai-agent` | `个人网站`, `AI Agent` |
| `notewhale-why-started` | `Building NoteWhale: Why I Started` | `2026-07-13 12:00:00` | `从学生痛点出发，构建一个 AI 驱动的知识管理平台。` | `product-thinking` | `NoteWhale`, `知识管理` |
| `opencode-superpowers-workflow` | `My OpenCode + Superpowers Workflow` | `2026-07-12 12:00:00` | `使用 OpenCode 和 Superpowers 技能系统规划后再编码的工作流。` | `software-engineering` | `OpenCode`, `Superpowers`, `工作流` |
| `product-thinking-101` | `Product Thinking for Engineers` | `2026-07-12 12:00:00` | `工程师如何培养产品思维，从技术视角走向用户视角。` | `product-thinking` | `产品思维`, `工程师` |
| `why-se-matters` | `Why Software Engineering Matters for AI` | `2026-07-11 12:00:00` | `软件工程实践如何影响 AI 项目的质量与可维护性。` | `software-engineering` | `软件工程`, `AI` |

The YAML block for `building-agent.md`, showing the exact structure, is:

```yaml
---
title: "Building My First AI Agent"
date: 2026-07-11 12:00:00
slug: building-agent
description: "从零构建一个自主 Agent 的实践记录与思考。"
categories:
  - ai-agent
tags:
  - AI Agent
  - 实践
comments: false
toc: true
---
```

Remove the duplicate leading `# Title` from each body because Reimu renders the front-matter title as the article heading.

- [ ] **Step 4: Remove Wiki-dependent prose using the approved deletion matrix**

Apply these edits while leaving independent prose intact:

| Post | Delete |
|---|---|
| `building-agent.md` | Sentences or list items containing `[[agent-overview]]`, `[[llm-basics]]`, or `[[rag-pipeline]]`. |
| `building-digital-garden.md` | The `双向链接的实现` section and `Related Wiki` section; remove `[[...]]`-dependent sentences from other sections but retain the article as a historical design reflection. |
| `from-ui-to-product.md` | The `第三阶段：让它连接` section, Wiki-specific examples under `具体例子`, and `Related Wiki`. |
| `github-pages-dev-notes.md` | `坑一：Jekyll 处理 Markdown 文件`, `坑二：Hash 路由与可分享 URL`, and `Related Wiki`; update the summary paragraph so it only claims the retained cache/background lessons. |
| `notewhale-why-started.md` | Paragraphs whose reasoning explicitly depends on a `[[...]]` source and the entire `Related Wiki` section. |
| `opencode-superpowers-workflow.md` | Both `真实案例` sections that are specifically about the removed Wiki, plus `Related Wiki`; retain the general workflow and AGENTS discussion. |
| Other posts | No Wiki cleanup beyond the global assertion; retain content unchanged. |

Do not convert a Wiki token into plain text. Delete the dependent sentence/paragraph/section, then read adjacent paragraphs to remove broken transitions.

- [ ] **Step 5: Create the About page**

Create `source/about/index.md` with front matter:

```yaml
---
title: 关于
date: 2026-09-16 12:00:00
comments: false
sidebar: right
---
```

Retain the current introduction, 南京大学商学院软件工程（软工商业创新班） description, 软件工程/AI Agent/产品创新 capability sections, email link, and GitHub link. Use Markdown headings and lists; do not copy the old navigation/footer HTML.

- [ ] **Step 6: Create the Projects page and update the personal-site project**

Create `source/projects/index.md` with `title: 项目作品`, `comments: false`, and the four current project records. Preserve NoteWhale, 街像, and AI Agent Studio descriptions. Change “My Personal Website” to describe the new implementation:

```markdown
### 不驚茶坊

使用 Hexo 与 Reimu 构建的个人写作与作品站，保留文章、项目、关于与友链，部署于 GitHub Pages。

- **角色：** Designer & Developer
- **技术：** Hexo · Reimu · Node.js · GitHub Pages
- **特点：** 响应式文章布局、归档与分类、本地搜索、深色模式、RSS 和自动化发布
```

Use `.project-grid` and `.project-card` wrappers only where Markdown alone cannot preserve a readable four-card layout; these classes are styled in Task 3.

- [ ] **Step 7: Create the Friends page and empty data source**

Create `source/friend/index.md`:

```markdown
---
title: 茶友与去处
date: 2026-09-16 12:00:00
comments: false
---

一些常去的站点，也留一张继续认识彼此的地图。

{% friendsLink friend/_data.yml detailed %}
```

Convert `config/links.json` to Reimu YAML. Because the current source has no link entries, initialize `source/friend/_data.yml` as `[]`; do not invent friends.

- [ ] **Step 8: Create category and tag overview pages**

Create `source/categories/index.md`:

```markdown
---
title: 分类
date: 2026-09-16 12:00:00
comments: false
---

{% list_categories show_count:true %}
```

Create `source/tags/index.md`:

```markdown
---
title: 标签
date: 2026-09-16 12:00:00
comments: false
---

{% tagcloud %}
```

- [ ] **Step 9: Verify source content and render it**

Run:

```powershell
node --test tests/unit/content.test.mjs
npm run clean
npm run build
```

Expected: tests PASS; Hexo reports nine generated posts without front-matter or tag-plugin errors.

- [ ] **Step 10: Commit the content migration**

```powershell
git add source/_posts source/about source/projects source/friend source/categories source/tags tests/unit/content.test.mjs
git commit -m "feat: migrate retained content to Hexo"
```

---

### Task 3: Add personal assets and the blue-purple Reimu identity

**Files:**
- Create: `tests/unit/assets.test.mjs`
- Create: `source/_data/avatar/avatar.jpg`
- Create: `source/images/default-campus-cover.webp`
- Create: `source/images/banner-placeholder.svg`
- Create: `source/css/custom.css`
- Modify: `_config.reimu.yml`

**Interfaces:**
- Consumes: user-provided 2275×1279 campus JPEG and existing `assets/images/figure.jpg` avatar.
- Produces: local avatar, 1600×900 WebP default cover, local banner, palette tokens, and site-specific page styling.

- [ ] **Step 1: Write the failing asset and palette contract**

Create `tests/unit/assets.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('ships local avatar, banner, and optimized WebP cover', async () => {
  await stat('source/_data/avatar/avatar.jpg');
  await stat('source/images/banner-placeholder.svg');
  const cover = await readFile('source/images/default-campus-cover.webp');
  assert.equal(cover.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(cover.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(cover.length < 450_000, `cover is ${cover.length} bytes`);
});

test('defines a blue-purple Reimu palette and local stylesheet', async () => {
  const theme = await readFile('_config.reimu.yml', 'utf8');
  assert.match(theme, /internal_theme:/);
  assert.match(theme, /--red-1: "#6f7fe8"/);
  assert.match(theme, /--red-2: "#8795ee"/);
  assert.match(theme, /head_end: '<link rel="stylesheet" href="\/jingtine-agent-site\/css\/custom\.css">'/);
  const css = await readFile('source/css/custom.css', 'utf8');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.project-grid/);
});
```

- [ ] **Step 2: Run the test and verify missing assets fail**

Run: `node --test tests/unit/assets.test.mjs`

Expected: FAIL because the new source assets do not exist.

- [ ] **Step 3: Import the retained avatar**

Copy the bytes of `assets/images/figure.jpg` to `source/_data/avatar/avatar.jpg`. Do not resize or recolor the avatar.

- [ ] **Step 4: Produce the default article cover from the supplied attachment**

Use the task's attached campus JPEG as the editing source. Crop the one-pixel aspect mismatch to exact 16:9, preserve the building entrance in the central safe area, apply only a subtle cool blue-purple grade, and export exactly 1600×900 WebP to `source/images/default-campus-cover.webp`. Keep the output below 450 KB and inspect it visually before accepting it.

- [ ] **Step 5: Create the replaceable banner placeholder**

Create `source/images/banner-placeholder.svg` as a 1920×900 SVG containing only layered pale-blue/pale-purple gradients and soft translucent circles. It must contain no text, external references, scripts, raster embeds, or Touhou artwork.

- [ ] **Step 6: Configure the internal Reimu palette**

Append this palette to `_config.reimu.yml`:

```yaml
internal_theme:
  light:
    --red-0: "#5968d8"
    --red-1: "#6f7fe8"
    --red-2: "#8795ee"
    --red-3: "#aab4f5"
    --red-4: "#cbd2fa"
    --red-5: "#e7eafe"
    --red-5-5: "#f0f1ff"
    --red-6: "#f7f8ff"
    --color-red-6-shadow: "rgba(111, 127, 232, 0.45)"
    --color-red-3-shadow: "rgba(135, 149, 238, 0.28)"
  dark:
    --red-0: "#9aa8f3"
    --red-1: "#aab4f5"
    --red-2: "#bcc4f8"
    --red-3: "#cdd3fa"
    --red-4: "rgba(170, 180, 245, 0.55)"
    --red-5: "rgba(135, 149, 238, 0.18)"
    --red-5-5: "rgba(111, 127, 232, 0.10)"
    --red-6: "rgba(89, 104, 216, 0.22)"
```

Add the stylesheet injector:

```yaml
injector:
  head_end: '<link rel="stylesheet" href="/jingtine-agent-site/css/custom.css">'
  head_begin:
  body_begin:
  body_end:
  sidebar_begin:
  sidebar_end:
```

- [ ] **Step 7: Add focused custom styles**

Create `source/css/custom.css` with:

```css
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1.25rem;
}

.project-card {
  padding: 1.4rem;
  border: 1px solid color-mix(in srgb, var(--red-3) 36%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--red-6) 88%, transparent);
  box-shadow: 0 1rem 2.5rem color-mix(in srgb, var(--red-1) 10%, transparent);
}

.project-card h3 { margin-top: 0; }

:focus-visible {
  outline: 3px solid var(--red-1);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 8: Verify and visually inspect assets**

Run:

```powershell
node --test tests/unit/assets.test.mjs
npm run clean
npm run build
```

Then inspect `public/images/default-campus-cover.webp`, the homepage card crop, one article header, and the banner at desktop and mobile sizes. Expected: no stretched images, no default Reimu character artwork, and no red primary accents.

- [ ] **Step 9: Commit personal visual identity**

```powershell
git add _config.reimu.yml source/_data/avatar source/images source/css tests/unit/assets.test.mjs
git commit -m "feat: apply tea house visual identity"
```

---

### Task 4: Remove the legacy applications and rewrite project guidance

**Files:**
- Create: `tests/unit/legacy-removal.test.mjs`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Delete: legacy files enumerated below

**Interfaces:**
- Consumes: migrated source from Tasks 1–3.
- Produces: a Hexo-only repository with no runtime or automation paths to removed features.

- [ ] **Step 1: Write the failing legacy-removal contract**

Create `tests/unit/legacy-removal.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const removed = [
  'reader.html', 'papers.html', 'wiki.html', 'assistant.html', 'status.html',
  'guestbook.html', 'article.html', 'blog.html', 'knowledge.html', 'library.html',
  'contact.html', 'feed.xml', 'subscriptions.opml', 'styles.css', 'js', 'articles',
  'config', 'content/wiki', 'public/data', '.github/workflows/refresh-feeds.yml',
  '.opencode/skills/research-paper-collector', 'REDESIGN_REPORT.md'
];

test('removes every retired site surface', () => {
  for (const path of removed) assert.equal(existsSync(path), false, `${path} still exists`);
});

test('documents Hexo instead of the former direct-static architecture', async () => {
  const [readme, agents] = await Promise.all([readFile('README.md', 'utf8'), readFile('AGENTS.md', 'utf8')]);
  assert.match(readme, /npm ci/);
  assert.match(readme, /npm run build/);
  assert.match(agents, /Hexo 8/);
  assert.doesNotMatch(agents, /无需运行 npm/);
});
```

- [ ] **Step 2: Run the test and confirm legacy paths fail**

Run: `node --test tests/unit/legacy-removal.test.mjs`

Expected: FAIL and list the still-present reader/papers/Wiki/etc. paths.

- [ ] **Step 3: Delete retired production files**

Delete with explicit paths, preserving the newly created `source/`, Node tests, `scripts/check-site.mjs` when it is added, and historical `docs/superpowers/` records:

```text
about.html article.html assistant.html blog.html contact.html guestbook.html
index.html knowledge.html library.html links.html papers.html projects.html
reader.html status.html wiki.html styles.css feed.xml subscriptions.opml .nojekyll
js/**
articles/**
config/**
content/templates/**
content/wiki/**
public/data/**
scripts/*.py
.github/workflows/refresh-feeds.yml
.opencode/skills/research-paper-collector/**
REDESIGN_REPORT.md
```

After the avatar has been copied, delete the old `assets/images/` tree as well. Do not delete `docs/superpowers/`.

- [ ] **Step 4: Remove obsolete tests and helpers**

Delete:

```text
tests/e2e/comments.spec.js
tests/e2e/impl.spec.js
tests/e2e/links.spec.js
tests/e2e/redesign.spec.js
tests/e2e/requirements.spec.js
tests/e2e/site-shell.spec.js
tests/e2e/writing.spec.js
tests/test_build_articles.py
tests/test_check_articles.py
tests/test_check_comments.py
tests/test_check_links.py
tests/test_collect_github_stats.py
tests/capture.cjs
tests/visual-audit.cjs
tests/redesign.config.js
tests/docs/**
tests/package.json
tests/package-lock.json
```

Keep `tests/unit/`, `tests/e2e/`, and `tests/playwright.config.js`.

- [ ] **Step 5: Rewrite README for the new workflow**

The new `README.md` must contain these sections with concrete commands:

1. Project description and live URL.
2. Retained routes: Home, Archives, Categories/Tags, Projects, About, Friends, Feed.
3. Requirements: Node.js 22+.
4. Setup: `npm ci`.
5. Local authoring: `npx hexo new post "title"`, edit `source/_posts/`, `npm run server`.
6. Validation: `npm run test:unit`, `npm run build`, `npm run check`, `npm run test:e2e`.
7. Deployment: pushes to `main` deploy through GitHub Pages Actions.
8. Media replacement: default cover and banner exact paths; music remains disabled in `_config.reimu.yml`.

- [ ] **Step 6: Rewrite AGENTS.md around the approved Hexo boundary**

Retain the existing safety, accessibility, external-link, secret, focused-change, and verification principles, but replace the obsolete architecture with these rules:

- Production is generated by Hexo 8 and Reimu; do not add another frontend framework or server runtime.
- Node.js 22+ and `npm ci` are the production build toolchain.
- Content lives in `source/`; `public/` is generated and never edited or committed.
- Theme customization belongs in `_config.reimu.yml`, `source/css/custom.css`, and local assets; never edit `node_modules`.
- Dependencies must be exact and the lockfile must be committed.
- Comments, guestbook, reader, papers, Wiki, assistant, and status are deliberately out of scope.
- Every change runs unit checks and a clean Hexo build; behavior/layout changes also run Playwright.
- GitHub Pages root remains `/jingtine-agent-site/`.

- [ ] **Step 7: Update ignores and verify deletion**

Ensure `.gitignore` includes:

```gitignore
node_modules/
public/
.deploy_git/
db.json
.cache/
test-results/
playwright-report/
```

Ensure it does not ignore `package-lock.json`. Run:

```powershell
node --test tests/unit/legacy-removal.test.mjs
npm run clean
npm run build
git status --short
```

Expected: tests and build PASS; generated `public/` does not appear in status.

- [ ] **Step 8: Commit the architecture cleanup**

```powershell
git add -A
git commit -m "refactor: remove retired site applications"
```

---

### Task 5: Add generated-site quality checks and browser coverage

**Files:**
- Create: `scripts/check-site.mjs`
- Create: `tests/unit/generated-site.test.mjs`
- Create: `tests/e2e/site.spec.js`
- Modify: `tests/playwright.config.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: generated `public/` tree from `npm run build`.
- Produces: `npm run check` for deterministic artifact validation and `npm run test:e2e` for desktop/mobile behavior.

- [ ] **Step 1: Write the failing generated-output test**

Create `tests/unit/generated-site.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';

test('generates retained routes, nine posts, and an Atom feed', async () => {
  for (const route of ['index.html', 'archives/index.html', 'about/index.html', 'projects/index.html', 'friend/index.html', 'atom.xml']) {
    assert.equal(existsSync(`public/${route}`), true, route);
  }
  const posts = (await readdir('public/posts', { withFileTypes: true })).filter(item => item.isDirectory());
  assert.equal(posts.length, 9);
  const feed = await readFile('public/atom.xml', 'utf8');
  assert.equal((feed.match(/<entry>/g) || []).length, 9);
  assert.match(feed, /https:\/\/jingtine\.github\.io\/jingtine-agent-site\/posts\//);
});

test('does not generate retired routes or comment clients', async () => {
  for (const route of ['reader', 'papers', 'wiki', 'assistant', 'status', 'guestbook']) {
    assert.equal(existsSync(`public/${route}`), false, route);
  }
  const home = await readFile('public/index.html', 'utf8');
  assert.doesNotMatch(home, /giscus\.app|@waline|valine|twikoo|gitalk|disqus|utterances|beaudar|guestbook|reader\.html|papers\.html|wiki\.html/i);
});
```

- [ ] **Step 2: Prove the test catches a stale or missing build**

Run `npm run clean`, then `node --test tests/unit/generated-site.test.mjs`.

Expected: FAIL because `public/` has been removed.

- [ ] **Step 3: Implement the generated artifact checker**

Create `scripts/check-site.mjs` with these exact checks and exit behavior:

- Verify expected routes: `/`, `/archives/`, `/categories/`, `/tags/`, `/about/`, `/projects/`, `/friend/`, `/atom.xml`.
- Verify exactly nine `public/posts/*/index.html` files with the approved slug directory names.
- Parse Atom as text and require exactly nine `<entry>` elements and project-root canonical URLs.
- Recursively scan generated HTML for `article.html?slug=`, `reader.html`, `papers.html`, `wiki.html`, `assistant.html`, `status.html`, `guestbook.html`, `giscus.app`, `@waline`, Valine, Twikoo, Gitalk, Disqus, Utterances, Beaudar, and `data-repo-id`; fail if found.
- Extract local `href` and `src` attributes, strip query/fragment, map `/jingtine-agent-site/...` to `public/...`, and require the referenced file or directory index to exist.
- Ignore `mailto:`, `tel:`, `data:`, fragment-only URLs, and HTTPS URLs.
- Print one concise PASS summary to stdout and actionable failures to stderr; set `process.exitCode = 1` on any failure.

Export pure helpers `walkFiles(root)`, `resolveLocalTarget(url)`, and `collectLocalReferences(html)` so the checker can be unit-tested without starting a server. The CLI path calls `main()` only when `import.meta.url === pathToFileURL(process.argv[1]).href`.

- [ ] **Step 4: Wire the check into package scripts and pass it**

Add to `package.json`:

```json
"check": "npm run clean && npm run build && node scripts/check-site.mjs",
"test": "npm run test:unit && npm run check && npm run test:e2e"
```

Run:

```powershell
npm run build
node --test tests/unit/generated-site.test.mjs
npm run check
```

Expected: all PASS.

- [ ] **Step 5: Replace the Playwright configuration**

Update `tests/playwright.config.js` so it:

- uses `testDir: './e2e'`;
- tests desktop Chrome and a mobile Pixel profile;
- sets `baseURL` to `http://127.0.0.1:8081/jingtine-agent-site/`;
- starts `npm run server` from the repository root;
- records traces only on first retry;
- uses one worker locally to avoid sharing the Hexo server state.

- [ ] **Step 6: Write browser tests for the retained experience**

Create `tests/e2e/site.spec.js` with separate tests that:

1. Load Home, assert `不驚茶坊`, the author avatar, article cards, and links to Archives, Projects, About, and Friends.
2. Assert no visible navigation item matches `论文|研究|Wiki|知识库|订阅阅读|问答助手|Status|留言`.
3. Open one post, assert its heading, lazy-loaded default campus cover, desktop sidebar, table of contents, previous/next navigation, code-copy control when a code block is present, working back-to-top control after scrolling, and absence of all comment-provider scripts or comment containers.
4. Exercise local search with `Agent` and require a result linking beneath `/jingtine-agent-site/posts/`.
5. Use light and dark color-scheme contexts and assert the computed `--red-1` token differs while each page remains readable.
6. Navigate Projects, About, Friends, Archives, Categories, and Tags without a 404.
7. At the Pixel viewport, assert `document.documentElement.scrollWidth <= window.innerWidth` and keyboard-reachable navigation.
8. With reduced motion enabled, assert the computed animation duration on an animated article element is at most `0.01ms`.

Prefer accessible roles and link names. For theme controls without an accessible name, inspect the generated Reimu markup once and use its stable ID/class; do not use positional selectors such as `nth-child`.

- [ ] **Step 7: Run browser verification**

Run:

```powershell
npx playwright install chromium
npm run test:e2e
```

Expected: all desktop and mobile projects PASS with no console errors caused by local assets or wrong base paths.

- [ ] **Step 8: Commit quality gates**

```powershell
git add package.json scripts/check-site.mjs tests/unit/generated-site.test.mjs tests/e2e/site.spec.js tests/playwright.config.js
git commit -m "test: verify generated Reimu site"
```

---

### Task 6: Add GitHub Pages deployment and final verification

**Files:**
- Create: `tests/unit/workflow.test.mjs`
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `README.md` only if the final command names differ from Task 4 documentation

**Interfaces:**
- Consumes: `npm ci`, `npm run check`, `npm run test:e2e`, and the generated `public/` artifact.
- Produces: official GitHub Pages deployment from `main`.

- [ ] **Step 1: Write the failing workflow contract**

Create `tests/unit/workflow.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('builds and deploys public through official Pages actions', async () => {
  const workflow = await readFile('.github/workflows/deploy-pages.yml', 'utf8');
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run check/);
  assert.match(workflow, /run: npm run test:e2e/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /path: public/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
```

- [ ] **Step 2: Run the test and confirm the workflow is missing**

Run: `node --test tests/unit/workflow.test.mjs`

Expected: FAIL with `ENOENT` for `.github/workflows/deploy-pages.yml`.

- [ ] **Step 3: Add the Pages workflow**

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy Hexo site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Install dependencies
        run: npm ci
      - name: Install Chromium
        run: npx playwright install --with-deps chromium
      - name: Verify generated site
        run: npm run check
      - name: Run browser tests
        run: npm run test:e2e
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Run the complete local verification suite**

Run from a clean generated state:

```powershell
npm ci
npm run test:unit
npm run check
npm run test:e2e
git diff --check
git status --short
```

Expected: every command exits 0; status contains only the workflow/test files intended for this task; `public/`, `db.json`, test results, and browser reports remain ignored.

- [ ] **Step 5: Inspect the final generated site**

Open and inspect Home, one article, Projects, About, and Friends at both desktop and mobile widths. Confirm:

- the Nanjing University cover is correctly cropped;
- the banner is the blue-purple placeholder, not Reimu artwork;
- navigation and assets use `/jingtine-agent-site/`;
- dark mode, local search, sidebar, TOC, and back-to-top work;
- no custom cursor, fireworks, Live2D, music player, comment UI, or retired feature links appear.

- [ ] **Step 6: Commit deployment**

```powershell
git add .github/workflows/deploy-pages.yml tests/unit/workflow.test.mjs README.md
git commit -m "ci: deploy Hexo site to GitHub Pages"
```

- [ ] **Step 7: Review the branch before integration**

Run `git log --oneline --decorate -7` and `git diff HEAD~6 --stat`. Verify the branch contains the design commit plus the six focused implementation commits, and that no user credential, temporary attachment path, generated `public/`, or unrelated artifact was committed.
