const { test, expect } = require('@playwright/test');

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
