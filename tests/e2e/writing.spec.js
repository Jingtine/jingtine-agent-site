const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const commentsConfig = {
  enabled: true,
  repo: 'Jingtine/jingtine-agent-site',
  repoId: 'R_kgDOExample',
  category: 'General',
  categoryId: 'DIC_kwDOExample',
  theme: 'light',
  lang: 'zh-CN',
};

async function useManualComments(page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true });
  });
  await page.route('**/config/comments.json', route => route.fulfill({ json: commentsConfig }));
  await page.route('https://giscus.app/client.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      (() => {
        const frame = document.createElement('iframe');
        frame.className = 'giscus-frame';
        document.currentScript.parentNode.appendChild(frame);
        window.setTimeout(() => frame.dispatchEvent(new Event('load')), 0);
      })();
    `,
  }));
}

test('article and Writing cards load an existing local cover containing spaces and Unicode', async ({ page }) => {
  const relativePath = 'assets/images/covers/article e2e 封面.svg';
  const coverPath = path.resolve(__dirname, '../..', relativePath);
  fs.mkdirSync(path.dirname(coverPath), { recursive: true });
  fs.writeFileSync(coverPath, '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="lavender"/></svg>', { flag: 'wx' });
  try {
    await articleFixture(page, [{ ...fixture[0], cover: relativePath, coverAlt: '带空格的本地封面' }]);
    await page.goto('/article.html?slug=new-note');
    const cover = page.locator('#article-cover img');
    await expect(cover).toBeVisible();
    await expect(cover).toHaveAttribute('src', 'assets/images/covers/article%20e2e%20%E5%B0%81%E9%9D%A2.svg');
    await expect(cover).toHaveAttribute('alt', '带空格的本地封面');
    expect(await cover.evaluate(image => image.naturalWidth)).toBe(200);
    await page.goto('/blog.html');
    const cardCover = page.locator('#writing-results img');
    await expect(cardCover).toBeVisible();
    await expect(cardCover).toHaveAttribute('src', 'assets/images/covers/article%20e2e%20%E5%B0%81%E9%9D%A2.svg');
    expect(await cardCover.evaluate(image => image.naturalWidth)).toBe(200);
  } finally {
    fs.unlinkSync(coverPath);
  }
});

test('Wiki related article categories use Writing config labels and fall back when config fails', async ({ page }) => {
  await page.goto('/wiki.html#Software/clean-architecture');
  const categories = page.locator('#wiki-related-articles .article-category');
  await expect(categories.first()).toHaveText('软件工程');
  await page.route('**/config/writing.json', route => route.fulfill({ status: 503, body: '' }));
  await page.reload();
  await expect(categories.first()).toHaveText('software-engineering');
  await expect(page.locator('#wiki-detail-body h2').first()).toBeVisible();
  await page.route('**/config/writing.json', route => route.fulfill({ json: { categories: { 'software-engineering': '<b>工程笔记</b>' } } }));
  await page.reload();
  await expect(categories.first()).toHaveText('<b>工程笔记</b>');
  await expect(page.locator('#wiki-related-articles b')).toHaveCount(0);
});

test('article and Writing reject noncanonical cover segments and URL injection without fetching them', async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (request.url().includes('/assets/images/')) requests.push(request.url()); });
  for (const cover of ['assets/images/covers/../x.svg', 'assets/images/covers/./x.svg',
    'assets/images/covers//x.svg', 'assets/images/covers/x.svg?query=1',
    'assets/images/covers/x.svg#fragment', 'assets/images/covers/x\n.svg',
    'assets/images/covers/x\\y.svg', 'assets/images/other/x.svg']) {
    await articleFixture(page, [{ ...fixture[0], cover, coverAlt: 'Invalid cover' }]);
    await page.goto('/article.html?slug=new-note');
    await expect(page.locator('#article-body')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#article-cover')).toBeHidden();
    await expect(page.locator('#article-cover img')).toHaveCount(0);
    await page.goto('/blog.html');
    await expect(page.locator('#writing-results .writing-card')).toHaveCount(1);
    await expect(page.locator('#writing-results img')).toHaveCount(0);
  }
  expect(requests).toEqual([]);
});

async function articleFixture(page, records, markdown = '+++\ndraft = false\n+++\n## A heading\n\nArticle body.') {
  await useArticles(page, records);
  await page.route('**/articles/*.md', route => route.fulfill({ body: markdown }));
}

test('article loads an indexed Unicode filename through an encoded local Markdown path', async ({ page }) => {
  await articleFixture(page, [{ ...fixture[0], slug: '读书_笔记 01' }]);
  const requests = [];
  page.on('request', request => { if (request.url().endsWith('.md')) requests.push(new URL(request.url()).pathname); });
  await page.goto('/article.html?slug=' + encodeURIComponent('读书_笔记 01'));
  await expect(page.locator('#article-body h2')).toHaveText('A heading');
  expect(requests).toEqual(['/articles/%E8%AF%BB%E4%B9%A6_%E7%AC%94%E8%AE%B0%2001.md']);
});

test('article renders metadata without exposing front matter and emits ready after reading enhancements', async ({ page }) => {
  await page.addInitScript(() => document.addEventListener('article:ready', event => {
    window.readyArticle = { ...event.detail, hasContents: !!document.querySelector('.reading-toc') };
  }));
  await page.goto('/article.html?slug=hello-world');
  await expect(page.locator('#article-title')).toHaveText('Hello World');
  await expect(page.locator('#article-meta')).toContainText('1 分钟');
  await expect(page.locator('#article-meta')).toContainText('168 字');
  await expect(page.locator('#article-meta time')).toHaveAttribute('datetime', '2026-07-10');
  await expect(page.locator('#article-meta')).toContainText('技术');
  await expect(page.locator('#article-summary')).toContainText('第一篇');
  await expect(page.locator('#article-tags')).toContainText('个人网站');
  await expect(page.locator('#article-body')).not.toContainText('draft = false');
  await expect(page.locator('#related-articles a')).not.toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.readyArticle)).toEqual({ slug: 'hello-world', title: 'Hello World', hasContents: true });
  await expect(page.locator('#article-comments')).toHaveCount(1);
});

test('article comments mount after article ready with a stable slug term', async ({ page }) => {
  await useManualComments(page);
  await page.goto('/article.html?slug=hello-world');
  await expect(page.locator('#article-title')).toHaveText('Hello World');
  await page.getByRole('button', { name: '加载留言' }).focus();
  await expect.poll(async () => page.locator('#article-comments script').getAttribute('data-term'))
    .toBe('article:hello-world');
});

test('article comments never mount for an invalid article', async ({ page }) => {
  await useManualComments(page);
  const giscusRequests = [];
  page.on('request', request => {
    if (request.url() === 'https://giscus.app/client.js') giscusRequests.push(request.url());
  });
  await page.goto('/article.html?slug=unknown');
  await expect(page.getByRole('alert')).toContainText('文章不存在');
  await expect(page.locator('#article-comments script')).toHaveCount(0);
  await expect(page.locator('#article-comments .comments-load')).toHaveCount(0);
  expect(giscusRequests).toEqual([]);
});

for (const query of ['', '?slug=unknown', '?slug=..%2Fconfig%2Fwriting']) {
  test(`article rejects missing or nonpublic slug ${JSON.stringify(query)} without fetching Markdown`, async ({ page }) => {
    const requests = [];
    page.on('request', request => { if (request.url().includes('.md')) requests.push(request.url()); });
    await page.goto('/article.html' + query);
    await expect(page.getByRole('alert')).toContainText('文章不存在');
    await expect(page.locator('#article-body')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.article-back a')).toBeVisible();
    expect(requests).toEqual([]);
  });
}

for (const resource of ['public/data/articles.json', 'articles/hello-world.md']) {
  test(`article reports accessible load failure for ${resource}`, async ({ page }) => {
    await page.route('**/' + resource, route => route.fulfill({ status: 503, body: '' }));
    await page.addInitScript(() => document.addEventListener('article:ready', () => { window.readyArticle = true; }));
    await page.goto('/article.html?slug=hello-world');
    await expect(page.getByRole('alert')).toContainText('加载失败');
    await expect(page.locator('#article-body')).toHaveAttribute('aria-busy', 'false');
    expect(await page.evaluate(() => window.readyArticle)).toBeUndefined();
  });
}

for (const newline of ['\n', '\r\n']) {
  test(`article strips strict TOML delimiters with ${JSON.stringify(newline)} line endings`, async ({ page }) => {
    await articleFixture(page, [fixture[0]], ['+++', 'draft = false', '+++', '## Visible body'].join(newline));
    await page.goto('/article.html?slug=new-note');
    await expect(page.locator('#article-body h2')).toHaveText('Visible body');
    await expect(page.locator('#article-body')).not.toContainText('draft');
  });
}

for (const markdown of ['## Missing front matter', '+++\ndraft = false\n## Unclosed', ' +++\ndraft = false\n+++\nBad', '+++\ndraft = false\n+++extra\nBad']) {
  test(`article rejects malformed front matter ${JSON.stringify(markdown)}`, async ({ page }) => {
    await articleFixture(page, [fixture[0]], markdown);
    await page.goto('/article.html?slug=new-note');
    await expect(page.getByRole('alert')).toContainText('加载失败');
    await expect(page.locator('#article-body')).not.toContainText('draft');
  });
}

test('article ranks related by shared tags then category, date and slug with a three item limit', async ({ page }) => {
  const current = { ...fixture[0], tags: ['one', 'two'] };
  await articleFixture(page, [current,
    { ...fixture[1], slug: 'only-category', category: 'life', date: '2026-10-01' },
    { ...fixture[1], slug: 'z-tag', tags: ['one'], date: '2026-08-02' },
    { ...fixture[1], slug: 'a-tag', tags: ['one'], date: '2026-08-02' },
    { ...fixture[1], slug: 'old-tag', tags: ['two'], date: '2026-08-01' },
    { ...fixture[1], slug: 'best', tags: ['one', 'two'], date: '2020-01-01' },
    fixture[2],
  ]);
  await page.goto('/article.html?slug=new-note');
  await expect(page.locator('#related-articles a')).toHaveCount(3);
  expect(await page.locator('#related-articles a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual([
    'article.html?slug=best', 'article.html?slug=a-tag', 'article.html?slug=z-tag',
  ]);
});

test('article hides optional cover and related section when no matches exist, with config failure fallback', async ({ page }) => {
  await articleFixture(page, fixture);
  await page.route('**/config/writing.json', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/article.html?slug=new-note');
  await expect(page.locator('#article-body h2')).toBeVisible();
  await expect(page.locator('#article-cover')).toBeHidden();
  await expect(page.locator('#related-section')).toBeHidden();
  await expect(page.locator('#article-meta')).toContainText('note');
});

test('article renders optional safe cover and removes failed cover without disrupting the body', async ({ page }) => {
  await articleFixture(page, [{ ...fixture[0], cover: 'assets/images/covers/present.svg', coverAlt: 'Quiet landscape' }]);
  await page.route('**/assets/images/covers/present.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"/>' }));
  await page.goto('/article.html?slug=new-note');
  await expect(page.locator('#article-cover img')).toBeVisible();
  await expect(page.locator('#article-cover img')).toHaveAttribute('alt', 'Quiet landscape');
  await page.route('**/assets/images/covers/present.svg', route => route.fulfill({ status: 404, body: '' }));
  await page.reload();
  await expect(page.locator('#article-cover')).toBeHidden();
  await expect(page.locator('#article-body h2')).toBeVisible();
});

test('article uses text for metadata and related cards and rejects unsafe covers', async ({ page }) => {
  const payload = '<img src=x onerror=alert(1)>';
  for (const cover of ['https://example.com/a.jpg', 'assets/images/covers/../x.png', 'assets/images/covers/%2e%2e/x.png', 'assets/images/covers/..\\x.png', '//example.com/x', 'javascript:alert(1)']) {
    await articleFixture(page, [
      { ...fixture[0], title: payload, summary: payload, tags: [payload], category: payload, cover },
      { ...fixture[1], title: payload, summary: payload, tags: [payload], category: payload, cover },
    ]);
    await page.goto('/article.html?slug=new-note');
    await expect(page.locator('#article-title')).toHaveText(payload);
    await expect(page.locator('#article-summary')).toHaveText(payload);
    await expect(page.locator('#article-tags')).toHaveText(payload);
    await expect(page.locator('#related-articles h3')).toHaveText(payload);
    await expect(page.locator('#related-articles p')).toHaveText(payload);
    await expect(page.locator('#article-cover')).toBeHidden();
    await expect(page.locator('main img')).toHaveCount(0);
  }
});

test('article preserves Wiki Link resolution and reading accessibility, including Wiki failure', async ({ page }) => {
  await articleFixture(page, [fixture[0]], '+++\ndraft = false\n+++\n# Heading\n\n[[topic]] [[Missing]] `[[topic]]`\n\n```js\nconst value = 1;\n```');
  await page.route('**/public/data/wiki.json', route => route.fulfill({ json: { pages: [{ id: 'notes/topic', title: 'Topic' }] } }));
  await page.goto('/article.html?slug=new-note');
  await expect(page.locator('#article-body a.wiki-link')).toHaveAttribute('href', 'wiki.html#notes%2Ftopic');
  await expect(page.locator('#article-body code').first()).toHaveText('[[topic]]');
  await expect(page.locator('#article-body')).toContainText('[[Missing]]');
  await expect(page.locator('#article-body pre')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.reading-toc')).toBeVisible();
  await page.route('**/public/data/wiki.json', route => route.fulfill({ status: 503, body: '' }));
  await page.reload();
  await expect(page.locator('#article-body')).toContainText('[[topic]]');
  await expect(page.locator('#article-body')).toHaveAttribute('aria-busy', 'false');
});

test('article is unframed and responsive with keyboard reachable back navigation', async ({ page }) => {
  await page.goto('/article.html?slug=building-digital-garden');
  await expect(page.locator('#article-body h2').first()).toBeVisible();
  const style = await page.locator('#article-body').evaluate(el => ({ maxWidth: getComputedStyle(el).maxWidth, border: getComputedStyle(el).borderWidth }));
  expect(style).toEqual({ maxWidth: '920px', border: '0px' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.article-back a').focus();
  await expect(page.locator('.article-back a')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/blog\.html$/);
});

const fixture = [
  { slug: 'new-note', title: 'Newest note', date: '2026-09-02', kind: 'note', category: 'life', tags: ['quiet'], summary: 'A morning observation', cover: '', coverAlt: '', wordCount: 40, readingMinutes: 1 },
  { slug: 'older-essay', title: 'Older essay', date: '2026-08-01', kind: 'essay', category: 'reading', tags: ['books'], summary: 'Reading a library', cover: '', coverAlt: '', wordCount: 200, readingMinutes: 1 },
  { slug: 'archive-entry', title: 'Archive entry', date: '2025-12-31', kind: 'technical', category: 'unlisted', tags: ['history'], summary: 'An earlier year', cover: '', coverAlt: '', wordCount: 600, readingMinutes: 2 },
];

async function useArticles(page, items = fixture) {
  await page.route('**/public/data/articles.json', route => route.fulfill({ json: items }));
}

test('Writing searches title, summary, and tags with trimmed case-insensitive queries', async ({ page }) => {
  await page.goto('/blog.html');
  for (const query of ['  DIGITAL GARDEN  ', '为什么我选择', '数字花园']) {
    await page.getByLabel('搜索随笔').fill(query);
    await expect(page.locator('#writing-results .writing-card')).toHaveCount(1);
    await expect(page.locator('#writing-results')).toContainText('Building My Digital Garden');
    await expect(page.locator('#writing-count')).toContainText('1');
    await expect(page.locator('#writing-archive a')).toHaveCount(1);
  }
});

test('Writing combines kind and category filters and keeps archive in sync', async ({ page }) => {
  await page.goto('/blog.html');
  await expect(page.locator('.writing-feature')).toBeVisible();
  await page.getByLabel('文章类型').selectOption('technical');
  await page.getByLabel('文章分类').selectOption('ai-agent');
  await expect(page.locator('#writing-results .writing-card')).toHaveCount(2);
  await expect(page.locator('#writing-archive a')).toHaveCount(2);
  await expect(page.locator('#writing-archive')).toContainText('2026');
  await expect(page.locator('#writing-results')).not.toContainText('Digital Garden');
  await page.getByLabel('搜索随笔').fill('not found anywhere');
  await expect(page.locator('#writing-results .writing-card')).toHaveCount(0);
  await expect(page.locator('#writing-results')).toContainText('没有找到');
  await expect(page.locator('#writing-count')).toHaveText('0 篇文章');
  await expect(page.locator('#writing-archive a')).toHaveCount(0);
  await expect(page.locator('.writing-feature')).toHaveCount(0);
});

test('Writing groups archive by year/month with real dated article links', async ({ page }) => {
  await useArticles(page);
  let requests = 0;
  page.on('request', request => { if (request.url().endsWith('/public/data/articles.json')) requests++; });
  await page.goto('/blog.html');
  await expect(page.locator('#writing-archive h3')).toHaveText(['2026', '2025']);
  await expect(page.locator('#writing-archive h4')).toHaveText(['09 月', '08 月', '12 月']);
  await expect(page.locator('#writing-archive a').first()).toHaveAttribute('href', 'article.html?slug=new-note');
  await expect(page.locator('#writing-archive time').first()).toHaveAttribute('datetime', '2026-09-02');
  await page.getByLabel('文章分类').selectOption('unlisted');
  await expect(page.locator('#writing-results')).toContainText('unlisted');
  await expect(page.locator('#writing-archive h3')).toHaveText(['2025']);
  expect(requests).toBe(1);
});

test('Writing selects configured featured article and falls back to newest matching article', async ({ page }) => {
  await useArticles(page, [fixture[2], fixture[0], fixture[1]]);
  await page.route('**/config/writing.json', route => route.fulfill({ json: { featuredSlug: 'older-essay', kinds: { note: '短札' }, categories: { life: '日常' } } }));
  await page.goto('/blog.html');
  await expect(page.locator('.writing-feature')).toContainText('Older essay');
  await page.getByLabel('文章类型').selectOption('note');
  await expect(page.locator('.writing-feature')).toContainText('Newest note');
  await expect(page.locator('#writing-kind option:checked')).toHaveText('短札');
  await page.getByLabel('文章分类').selectOption('life');
  await expect(page.locator('#writing-category option:checked')).toHaveText('日常');
  await page.getByLabel('文章类型').selectOption('');
  await page.getByLabel('文章分类').selectOption('unlisted');
  await expect(page.locator('#writing-category option:checked')).toHaveText('unlisted');
});

for (const featuredSlug of ['', 'missing']) {
  test(`Writing falls back to newest article for featured slug ${JSON.stringify(featuredSlug)}`, async ({ page }) => {
    await useArticles(page, [fixture[2], fixture[0], fixture[1]]);
    await page.route('**/config/writing.json', route => route.fulfill({ json: { featuredSlug } }));
    await page.goto('/blog.html');
    await expect(page.locator('.writing-feature')).toContainText('Newest note');
  });
}

test('Writing renders text safely and rejects invalid or escaping cover paths', async ({ page }) => {
  const payload = '<img src=x onerror=alert(1)>';
  const covers = ['', 'https://example.com/cover.jpg', 'assets/images/covers/../secret.jpg', 'assets/images/covers/%2e%2e/secret.jpg', 'assets/images/covers/..\\secret.jpg', '//example.com/cover.jpg', 'javascript:alert(1)'];
  await useArticles(page, covers.map((cover, index) => ({ ...fixture[0], slug: `unsafe-${index}&x=1`, title: payload, summary: payload, tags: [payload], category: payload, cover })));
  await page.goto('/blog.html');
  await expect(page.locator('#writing-results .writing-card')).toHaveCount(7);
  await expect(page.locator('#writing-results img')).toHaveCount(0);
  await expect(page.locator('#writing-results .writing-cover')).toHaveCount(7);
  await expect(page.locator('#writing-results h3').first()).toHaveText(payload);
  await expect(page.locator('#writing-results a').first()).toHaveAttribute('href', 'article.html?slug=unsafe-0%26x%3D1');
  await expect(page.locator('#writing-results p').first()).toHaveText(payload);
  await expect(page.locator('#writing-results .blog-tag').first()).toHaveText(payload);
  await expect(page.locator('#writing-archive img')).toHaveCount(0);
  await expect(page.locator('#writing-archive a').first()).toHaveText(payload);
});

test('Writing loads local covers with alt text and falls back for missing images', async ({ page }) => {
  await useArticles(page, [
    { ...fixture[0], cover: 'assets/images/covers/present.svg', coverAlt: 'A calm garden' },
    { ...fixture[1], cover: 'assets/images/covers/missing.png', coverAlt: 'Missing artwork' },
  ]);
  await page.route('**/assets/images/covers/present.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="lavender"/></svg>' }));
  await page.route('**/assets/images/covers/missing.png', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/blog.html');
  await expect(page.locator('#writing-results img')).toHaveCount(1);
  await expect(page.locator('#writing-results img')).toHaveAttribute('alt', 'A calm garden');
  await expect(page.locator('#writing-results .writing-cover').nth(1)).toContainText('阅读');
});

test('Writing handles an empty index and configuration failure', async ({ page }) => {
  await useArticles(page, []);
  await page.route('**/config/writing.json', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/blog.html');
  await expect(page.locator('#writing-count')).toHaveText('0 篇文章');
  await expect(page.locator('#writing-results')).toContainText('没有找到');
  await expect(page.locator('.writing-feature')).toHaveCount(0);
});

test('Writing remains usable when configuration fails and retries article failures', async ({ page }) => {
  await page.route('**/config/writing.json', route => route.fulfill({ status: 503, body: '' }));
  let attempts = 0;
  await page.route('**/public/data/articles.json', route => ++attempts === 1
    ? route.fulfill({ status: 503, body: '' }) : route.fulfill({ json: fixture }));
  await page.goto('/blog.html');
  await expect(page.locator('#writing-results')).toContainText('加载失败');
  await page.getByRole('button', { name: '重试' }).click();
  await expect(page.locator('#writing-results .writing-card')).toHaveCount(3);
  await page.getByLabel('文章类型').selectOption('technical');
  await expect(page.locator('#writing-results .writing-card')).toHaveCount(1);
});

test('Writing supports keyboard filters and card navigation on mobile without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blog.html');
  await expect(page.getByLabel('搜索随笔')).toBeEnabled();
  await page.getByLabel('搜索随笔').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('文章类型')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('文章分类')).toBeFocused();
  await page.getByLabel('搜索随笔').fill('digital garden');
  const link = page.locator('#writing-results a').first();
  await link.focus();
  await expect(link).toBeFocused();
  expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/article\.html\?slug=building-digital-garden$/);
});

test('Writing announces result changes without moving focus and safely labels unknown kinds', async ({ page }) => {
  await useArticles(page, [{ ...fixture[0], kind: 'unlisted-kind' }]);
  await page.route('**/config/writing.json', route => route.fulfill({ json: { kinds: { 'unlisted-kind': '<b>Custom kind</b>' } } }));
  await page.goto('/blog.html');
  await page.getByLabel('搜索随笔').fill('morning');
  await expect(page.getByLabel('搜索随笔')).toBeFocused();
  await expect(page.locator('#writing-count')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#writing-count')).toHaveText('1 篇文章');
  await page.getByLabel('文章类型').selectOption('unlisted-kind');
  await expect(page.locator('#writing-kind option:checked')).toHaveText('<b>Custom kind</b>');
  await expect(page.locator('#writing-results .writing-meta')).toContainText('<b>Custom kind</b>');
  await expect(page.locator('#writing-results b')).toHaveCount(0);
});

test('Writing offers RSS and navigation with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/blog.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('随笔 / Writing');
  await expect(page.locator('noscript a')).toHaveAttribute('href', 'feed.xml');
  await expect(page.locator('nav a[href="index.html"]').first()).toBeVisible();
  await context.close();
});
