# Category Taxonomy And Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four-nature category taxonomy with a card-style categories page and featured home cards using the provided cover.

**Architecture:** Post front matter carries two-level Chinese categories; Hexo's `list_categories depth:2` emits nested markup that `custom.css` styles into cards and chips; Reimu's `home_categories` renders the featured cover cards.

**Tech Stack:** Hexo 8, Reimu 1.12.5, Pillow (temporary) for the cover, Node test runner, Playwright.

## Global Constraints

- Do not edit `node_modules/` or theme sources; changes stay in content, config, `custom.css`, and tests.
- No npm dependencies; Pillow stays outside the repository.
- Keep the GitHub Pages project root `/jingtine-agent-site/` in every internal link.
- Unit tests read `public/`, so always run `npm run check` before `npm run test:unit`.
- Validation order: `npm run check` → `npm run test:unit` → `npm run test:e2e`; full gate is `npm test`.
- Commit messages use conventional prefixes (see `git log`).

---

### Task 1: Taxonomy, categories page, and home cards

**Files:**
- Create: `source/images/category-bloom.webp`
- Modify: `source/_posts/*.md` (10 files), `source/categories/index.md`, `source/css/custom.css`, `_config.reimu.yml`
- Modify: `tests/unit/content.test.mjs`, `tests/unit/generated-site.test.mjs`, `tests/unit/assets.test.mjs`, `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: Hexo's nested categories (`categories: [parent, child]`), `list_categories` with `depth:2`, and Reimu's `home_categories` (`categories` + `cover`).
- Produces: two-level category URLs (`/categories/工程/站点建设/`), card/chip categories page, and two featured home cards.

- [ ] **Step 1: Add the taxonomy unit test**

Append to `tests/unit/content.test.mjs`:

```js
const taxonomy = {
  'building-agent': ['工程', 'AI 与 Agent'],
  'building-digital-garden': ['工程', '站点建设'],
  'from-ui-to-product': ['产品', '设计'],
  'github-pages-dev-notes': ['工程', '工具与流程'],
  'hello-world': ['工程', '站点建设'],
  'notewhale-why-started': ['产品', '项目复盘'],
  'opencode-superpowers-workflow': ['工程', '工具与流程'],
  'product-thinking-101': ['产品', '方法论'],
  'rebuilding-the-tea-house': ['工程', '站点建设'],
  'why-se-matters': ['工程', '软件工程'],
};

test('assigns the two-level category taxonomy to every post', async () => {
  for (const [slug, expected] of Object.entries(taxonomy)) {
    const text = await readFile(`source/_posts/${slug}.md`, 'utf8');
    const block = /^categories:\r?\n((?:\s+- .*\r?\n?)+)/m.exec(text);
    assert.ok(block, `${slug}: categories block`);
    const names = block[1].split(/\r?\n/).map(line => line.trim().replace(/^- /, '')).filter(Boolean);
    assert.deepEqual(names, expected, slug);
  }
});
```

- [ ] **Step 2: Add the generated-site tests**

Append to `tests/unit/generated-site.test.mjs`:

```js
test('renders the two-level categories page', async () => {
  const page = await readFile('public/categories/index.html', 'utf8');
  assert.match(page, /<ul class="category-list">/);
  assert.match(page, /category-list-child/);
  for (const name of ['工程', '产品', '站点建设', '工具与流程', 'AI 与 Agent', '软件工程', '方法论', '设计', '项目复盘']) {
    assert.ok(page.includes(`>${name}</a>`), name);
  }
});

test('features the category cards on the home page', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.equal((home.match(/post-categories-wrap/g) || []).length, 2);
  assert.match(home, /category-bloom\.webp/);
  assert.match(home, />工程</);
  assert.match(home, />产品</);
});
```

- [ ] **Step 3: Extend the asset unit test**

In `tests/unit/assets.test.mjs`, inside `'ships local avatar, banner, and optimized WebP cover'`, after the banner assertions add:

```js
  const categoryCover = await readFile('source/images/category-bloom.webp');
  assert.equal(categoryCover.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(categoryCover.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(categoryCover.length < 450_000, `category cover is ${categoryCover.length} bytes`);
```

- [ ] **Step 4: Add the E2E test**

Append to `tests/e2e/site.spec.js`:

```js
test('categories page shows the taxonomy and nested links resolve', async ({ page, isMobile }) => {
  await page.goto('./categories/');
  await expect(page.locator('.category-list')).toBeVisible();
  await expect(page.getByRole('link', { name: '工程', exact: true })).toBeVisible();
  const child = page.getByRole('link', { name: '站点建设', exact: true });
  await expect(child).toBeVisible();
  await child.click();
  await expect(page).toHaveURL(new RegExp(`${root}categories/`));
  await expect(page.getByRole('heading', { name: /4\s*0\s*4/ })).toHaveCount(0);
  await expect(page.locator('#main')).not.toBeEmpty();
  if (!isMobile) {
    await page.goto('./');
    await expect(page.locator('.post-categories-wrap')).toHaveCount(2);
  }
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "categories page shows the taxonomy"
```

Expected: `check` passes; unit reports `fail 4`; the focused E2E reports `2 failed`.

- [ ] **Step 6: Convert the category cover**

```powershell
$env:PYTHONPATH = "C:\Users\LJT\AppData\Local\Temp\opencode\pylibs"
& "C:\Users\LJT\AppData\Local\Programs\Python\Python313\python.exe" -c "from PIL import Image; img = Image.open(r'C:\Users\LJT\Desktop\Bloom.png').convert('RGB'); img = img.resize((1600, round(img.height * 1600 / img.width)), Image.LANCZOS); img.save(r'D:\Projects\my-agent-site\source\images\category-bloom.webp', 'WEBP', quality=82, method=6); print('cover', img.size)"
```

Expected: `cover (1600, 844)` and a file well under 450 KB.

- [ ] **Step 7: Migrate the post categories**

For each pair, replace the `categories:` block in `source/_posts/<slug>.md`:

```yaml
categories:
  - 工程
  - 站点建设
```

using the mapping: `hello-world`, `building-digital-garden`, `rebuilding-the-tea-house` → 工程/站点建设; `opencode-superpowers-workflow`, `github-pages-dev-notes` → 工程/工具与流程; `building-agent` → 工程/AI 与 Agent; `why-se-matters` → 工程/软件工程; `product-thinking-101` → 产品/方法论; `from-ui-to-product` → 产品/设计; `notewhale-why-started` → 产品/项目复盘.

- [ ] **Step 8: Rebuild and inspect the nested markup**

Run `npm run check`, then inspect the category list markup:

```powershell
$html = Get-Content "public/categories/index.html" -Raw; $i = $html.IndexOf('category-list'); $html.Substring($i - 20, 700)
```

Confirm the structure is `.category-list > .category-list-item > .category-list-link + .category-list-count + .category-list-child > .category-list-item …` before writing CSS.

- [ ] **Step 9: Style the categories page and home cards**

In `source/categories/index.md`, change the tag to:

```markdown
{% list_categories show_count:true depth:2 %}
```

In `source/css/custom.css`, add before the `:focus-visible` rule:

```css
.article-entry .category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1.25rem 0 0.25rem;
  padding: 0;
  list-style: none;
}

.article-entry .category-list > .category-list-item {
  flex: 1 1 16rem;
  padding: 1.1rem 1.2rem;
  border: 1px solid color-mix(in srgb, var(--red-2) 28%, transparent);
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--red-5), var(--red-6));
  box-shadow: 0 1rem 2.5rem color-mix(in srgb, var(--red-1) 10%, transparent);
}

.article-entry .category-list > .category-list-item > .category-list-link {
  color: var(--red-0);
  font-size: 1.2rem;
  font-weight: 700;
  text-decoration: none;
}

.article-entry .category-list > .category-list-item > .category-list-count {
  margin-left: 0.5rem;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--red-2) 30%, transparent);
  color: var(--red-0);
  font-size: 0.78rem;
}

.article-entry .category-list-child {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0.7rem 0 0;
  padding: 0;
  list-style: none;
}

.article-entry .category-list-child .category-list-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.18rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--red-2) 35%, transparent);
  border-radius: 999px;
  background: #fff;
}

.article-entry .category-list-child .category-list-link {
  color: color-mix(in srgb, var(--red-0) 72%, #14141b);
  font-size: 0.85rem;
  text-decoration: none;
}

.article-entry .category-list-child .category-list-count {
  color: color-mix(in srgb, var(--red-0) 55%, #14141b);
  font-size: 0.75rem;
}
```

In `_config.reimu.yml`, add after the `subtitle` block:

```yaml
home_categories:
  enable: true
  content:
    - categories: 工程
      cover: /images/category-bloom.webp
    - categories: 产品
      cover: /images/category-bloom.webp
```

- [ ] **Step 10: Rebuild and verify all gates**

Run:

```powershell
npm run check
npm run test:unit
npx playwright test --config tests/playwright.config.js -g "categories page shows the taxonomy"
npm test
```

Expected: `check` prints `PASS: 8 routes, 10 posts, 10 Atom entries; ...`; unit reports `pass 51`, `fail 0`; the focused E2E reports `2 passed`; the full gate exits 0 with Playwright `38 passed`.

- [ ] **Step 11: Visual review**

Screenshot the home page (featured cards) and the categories page in light and dark themes; confirm the cards read well, chips are legible, and no layout overflow. Do not commit screenshots.

- [ ] **Step 12: Commit**

```powershell
git add _config.reimu.yml source/categories/index.md source/css/custom.css source/images/category-bloom.webp source/_posts tests/unit/content.test.mjs tests/unit/generated-site.test.mjs tests/unit/assets.test.mjs tests/e2e/site.spec.js
git commit -m "feat: restructure the taxonomy and categories pages"
```

---

## Self-Review

**Spec coverage**

- Two-level Chinese taxonomy and post migration → Step 7, locked by Step 1.
- Categories page cards/chips with counts → Steps 8-9, locked by Step 2.
- Home featured cards with the provided cover → Steps 6, 9, locked by Steps 3-4.
- Verification and visual review → Steps 5, 10, 11.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** the category names (`工程`, `产品`, 站点建设 …), the `depth:2` tag option, the `category-list*` selectors, and the `/images/category-bloom.webp` path are identical across spec, config, CSS, and tests.
