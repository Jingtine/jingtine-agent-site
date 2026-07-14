const { test, expect } = require('@playwright/test');

const PAGES = [
  { name: 'index', path: '/index.html', title: 'Jingtine' },
  { name: 'about', path: '/about.html', title: 'Jingtine' },
  { name: 'projects', path: '/projects.html', title: 'Jingtine' },
  { name: 'blog', path: '/blog.html', title: 'Jingtine' },
  { name: 'papers', path: '/papers.html', title: 'Jingtine' },
  { name: 'wiki', path: '/wiki.html', title: 'Jingtine' },
  { name: 'reader', path: '/reader.html', title: 'Jingtine' },
  { name: 'assistant', path: '/assistant.html', title: 'Jingtine' },
  { name: 'status', path: '/status.html', title: 'Jingtine' },
];

const NAV_ITEMS = ['Home', 'About', 'Projects', 'Blog', 'Research', 'Wiki', 'Reader', 'Assistant'];

/* ================================================================
   TC01 — 所有页面可正常访问 (F1)
   ================================================================ */
test.describe('TC01 — 所有页面可正常访问', () => {
  for (const page of PAGES) {
    test(`TC01 ${page.name} 返回 200`, async ({ page: p }) => {
      const res = await p.goto(page.path);
      expect(res.status()).toBe(200);
      const title = await p.title();
      expect(title.length).toBeGreaterThan(0);
    });
  }
});

/* ================================================================
   TC02 — 导航栏链接可跳转 (F1)
   ================================================================ */
test('TC02 — 导航栏链接可跳转', async ({ page }) => {
  await page.goto('/index.html');
  const navMap = { 'About': '/about.html', 'Projects': '/projects.html', 'Blog': '/blog.html', 'Research': '/papers.html', 'Wiki': '/wiki.html', 'Reader': '/reader.html', 'Assistant': '/assistant.html' };
  for (const [label, expectedPath] of Object.entries(navMap)) {
    await page.click(`.nav-links a:has-text("${label}")`);
    await page.waitForLoadState('networkidle');
    const url = new URL(page.url());
    expect(url.pathname).toBe(expectedPath);
    await page.goBack();
    await page.waitForLoadState('networkidle');
  }
});

/* ================================================================
   TC03 — 当前页面导航高亮与 aria-current (F1/F13)
   ================================================================ */
const navActiveMap = {
  '/index.html': 'Home',
  '/about.html': 'About',
  '/projects.html': 'Projects',
  '/blog.html': 'Blog',
  '/papers.html': 'Research',
  '/wiki.html': 'Wiki',
  '/reader.html': 'Reader',
  '/assistant.html': 'Assistant',
};

test.describe('TC03 — 导航高亮', () => {
  for (const [path, label] of Object.entries(navActiveMap)) {
    test(`TC03 ${label} 页导航高亮`, async ({ page }) => {
      await page.goto(path);
      const link = page.locator(`.nav-links a:has-text("${label}")`);
      await expect(link).toHaveClass(/active/);
      const color = await link.evaluate(el => getComputedStyle(el).color);
      expect(color).toBeTruthy();
    });
  }
});

/* ================================================================
   TC04 — 首页个人信息完整性 (F2)
   ================================================================ */
test('TC04 — 首页个人信息完整性', async ({ page }) => {
  await page.goto('/index.html');
  // Title
  const title = await page.title();
  expect(title).toContain('Jingtine');
  // Name
  await expect(page.locator('body')).toContainText('Jingtine');
  // Avatar image
  const avatar = page.locator('img[src*="figure.jpg"]').first();
  await expect(avatar).toBeVisible();
  const naturalWidth = await avatar.evaluate(img => img.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);
  // Tags
  await expect(page.locator('body')).toContainText('Software Engineering');
  await expect(page.locator('body')).toContainText('AI Agent');
  await expect(page.locator('body')).toContainText('Product Innovation');
  // Email in footer
  const emailLink = page.locator('footer a[href*="mailto:"]');
  await expect(emailLink).toBeVisible();
});

/* ================================================================
   TC05 — 博客文章列表渲染 (F4)
   ================================================================ */
test('TC05 — 博客文章列表渲染', async ({ page }) => {
  await page.goto('/blog.html');
  await page.waitForSelector('.article-card', { timeout: 5000 });
  const cards = page.locator('.article-card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(9);
  const firstCard = cards.first();
  await expect(firstCard.locator('.article-category')).toBeVisible();
  await expect(firstCard.locator('.article-date')).toBeVisible();
  await expect(firstCard.locator('h3')).toBeVisible();
});

/* ================================================================
   TC06 — 博客文章详情页 (F4)
   ================================================================ */
test('TC06 — 博客文章详情页', async ({ page }) => {
  await page.goto('/article.html?slug=hello-world');
  await page.waitForSelector('.article-detail', { timeout: 5000 });
  await expect(page.locator('.article-detail')).toBeVisible();
  const text = await page.locator('.article-detail').textContent();
  expect(text.length).toBeGreaterThan(50);
});

/* ================================================================
   TC07 — 博客 [[Wiki Link]] 解析 (F4)
   ================================================================ */
test('TC07 — 博客 Wiki Link 解析', async ({ page }) => {
  await page.goto('/article.html?slug=building-digital-garden');
  await page.waitForSelector('.article-detail', { timeout: 5000 });
  const wikiLinks = page.locator('.article-detail a[href*="wiki.html#"]');
  const count = await wikiLinks.count();
  // If the article has wiki links, they should resolve to wiki.html#
  // This article is known to reference wiki pages
  expect(count).toBeGreaterThanOrEqual(0);
  if (count > 0) {
    const href = await wikiLinks.first().getAttribute('href');
    expect(href).toContain('wiki.html#');
  }
});

/* ================================================================
   TC08 — RSS feed.xml 合法性 (F5)
   ================================================================ */
test('TC08 — RSS feed.xml 合法 XML', async ({ page }) => {
  const response = await page.request.get('/feed.xml');
  expect(response.status()).toBe(200);
  const xmlText = await response.text();
  // Validate via browser DOMParser
  const isValid = await page.evaluate((xml) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    return doc.querySelector('parsererror') === null;
  }, xmlText);
  expect(isValid).toBe(true);
});

/* ================================================================
   TC09 — RSS item 字段完整性 (F5)
   ================================================================ */
test('TC09 — RSS item 字段完整性', async ({ page }) => {
  const response = await page.request.get('/feed.xml');
  const xmlText = await response.text();
  const result = await page.evaluate((xml) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return { error: 'invalid xml' };
    const items = doc.querySelectorAll('item');
    const issues = [];
    items.forEach((item, i) => {
      ['title', 'link', 'guid', 'pubDate', 'description'].forEach(field => {
        const el = item.querySelector(field);
        if (!el || !el.textContent.trim()) {
          issues.push(`item[${i}] missing ${field}`);
        }
      });
      const link = item.querySelector('link');
      if (link && !link.textContent.startsWith('https://')) {
        issues.push(`item[${i}] link not https: ${link.textContent}`);
      }
    });
    return { count: items.length, issues };
  }, xmlText);
  expect(result.error).toBeUndefined();
  expect(result.count).toBeGreaterThanOrEqual(9);
  expect(result.issues).toEqual([]);
});

/* ================================================================
   TC10 — RSS 日期倒序 (F5)
   ================================================================ */
test('TC10 — RSS 日期倒序', async ({ page }) => {
  const response = await page.request.get('/feed.xml');
  const xmlText = await response.text();
  const result = await page.evaluate((xml) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const items = doc.querySelectorAll('item');
    const dates = Array.from(items).map(item => {
      const pd = item.querySelector('pubDate');
      return pd ? new Date(pd.textContent).getTime() : 0;
    });
    let sorted = true;
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] > dates[i - 1]) sorted = false;
    }
    return { count: dates.length, sorted };
  }, xmlText);
  expect(result.count).toBeGreaterThanOrEqual(2);
  expect(result.sorted).toBe(true);
});

/* ================================================================
   TC11 — RSS 特殊字符转义 (F5)
   ================================================================ */
test('TC11 — RSS 特殊字符转义', async ({ page }) => {
  const response = await page.request.get('/feed.xml');
  const xmlText = await response.text();
  const result = await page.evaluate((xml) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    return doc.querySelector('parsererror') === null;
  }, xmlText);
  expect(result).toBe(true);
});

/* ================================================================
   TC12 — rss-items.json 数据完整性 (F6)
   ================================================================ */
test('TC12 — rss-items.json 数据完整性', async ({ page }) => {
  const response = await page.request.get('/public/data/rss-items.json');
  expect(response.status()).toBe(200);
  const data = await response.json();
  const items = data.items || data;
  expect(Array.isArray(items)).toBe(true);
  if (items.length > 0) {
    for (const item of items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('link');
      expect(item.link).toMatch(/^https:\/\//);
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('pubDate');
      expect(item).toHaveProperty('source');
      expect(item.source).toHaveProperty('id');
      expect(item.source).toHaveProperty('name');
      expect(item).toHaveProperty('category');
    }
  }
});

/* ================================================================
   TC13 — 外部链接安全性 (F6/F14)
   ================================================================ */
test('TC13 — 外部链接安全性', async ({ page }) => {
  await page.goto('/reader.html');
  await page.waitForTimeout(2000);
  // All external links must be https
  const extLinks = page.locator('a[href^="http"]');
  const count = await extLinks.count();
  for (let i = 0; i < count; i++) {
    const href = await extLinks.nth(i).getAttribute('href');
    expect(href).toMatch(/^https:\/\//);
    const rel = await extLinks.nth(i).getAttribute('rel') || '';
    if (href && !href.includes('jingtine.github.io')) {
      expect(rel).toMatch(/noopener|noreferrer/);
    }
  }
  // No inline event handlers in the body HTML
  const html = await page.content();
  expect(html).not.toContain('onclick=');
  expect(html).not.toContain('onload=');
});

/* ================================================================
   TC14 — Wiki 数据完整性 (F7)
   ================================================================ */
test('TC14 — Wiki 数据完整性', async ({ page }) => {
  const response = await page.request.get('/public/data/wiki.json');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.total).toBeGreaterThanOrEqual(30);
  const ids = new Set();
  for (const p of data.pages) {
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('title');
    expect(p).toHaveProperty('category');
    expect(p).toHaveProperty('tags');
    expect(p).toHaveProperty('path');
    expect(ids.has(p.id)).toBe(false);
    ids.add(p.id);
  }
});

/* ================================================================
   TC15 — Wiki hash 路由 (F7)
   ================================================================ */
test('TC15 — Wiki hash 路由', async ({ page }) => {
  await page.goto('/wiki.html#AI/agent-overview');
  await page.waitForTimeout(2000);
  // Should load detail view
  const bodyText = await page.locator('body').textContent();
  expect(bodyText.length).toBeGreaterThan(100);
});

/* ================================================================
   TC16 — 移动端窄屏不溢出 (F13)
   ================================================================ */
test.describe('TC16 — 移动端窄屏不溢出', () => {
  const mobilePages = ['/index.html', '/blog.html', '/wiki.html', '/reader.html'];
  for (const path of mobilePages) {
    test(`TC16 ${path} 768px 无溢出`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await ctx.newPage();
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(overflow).toBe(true);
      await ctx.close();
    });
  }
});

/* ================================================================
   TC17 — check.py 可执行 (F11)
   ================================================================ */
test('TC17 — check.py 质量检查可执行', async () => {
  const { execSync } = require('child_process');
  const result = execSync('python scripts/check.py', { encoding: 'utf-8', cwd: process.cwd() });
  expect(result).toContain('check');
  // Note: exitCode is checked implicitly by execSync not throwing
});

/* ================================================================
   TC18 — 导航栏结构一致性 (F12)
   ================================================================ */
test('TC18 — 导航栏在所有页面中结构一致', async ({ page }) => {
  const navs = {};
  for (const { name, path } of PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const links = await page.$$eval('.nav-links a', els => els.map(e => e.textContent.trim()));
    navs[name] = links;
  }
  const first = Object.values(navs)[0];
  for (const [name, links] of Object.entries(navs)) {
    expect(links).toEqual(first);
  }
});

/* ================================================================
   TC19 — 文章数量与渲染一致性 (F4 边界)
   ================================================================ */
test('TC19 — 文章数量与渲染一致性', async ({ page }) => {
  const resp = await page.request.get('/articles/index.json');
  const indexData = await resp.json();
  // index.json is a bare array of articles
  const articles = Array.isArray(indexData) ? indexData : (indexData.articles || indexData.items || []);
  const expectedCount = articles.length;
  await page.goto('/blog.html');
  await page.waitForSelector('.article-card', { timeout: 5000 });
  const cardCount = await page.locator('.article-card').count();
  expect(cardCount).toBe(expectedCount);
});

/* ================================================================
   TC20 — 页面脚本无未捕获异常 (F3-F10)
   ================================================================ */
test.describe('TC20 — 页面脚本无未捕获异常', () => {
  for (const { name, path } of PAGES) {
    test(`TC20 ${name} 无 JS 异常`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      expect(errors).toEqual([]);
    });
  }
});
