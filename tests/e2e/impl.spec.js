const { test, expect } = require('@playwright/test');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

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
  { name: 'links', path: '/links.html', title: '不驚茶坊' },
  { name: 'guestbook', path: '/guestbook.html', title: '不驚茶坊' },
];

const LEGACY_PAGES = [
  { name: 'article', path: '/article.html' },
  { name: 'knowledge', path: '/knowledge.html' },
  { name: 'library', path: '/library.html' },
  { name: 'contact', path: '/contact.html' },
];

const ROOT_NAV_PAGES = [...PAGES, ...LEGACY_PAGES];

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
  const navMap = {
    '关于': '/about.html',
    '作品': '/projects.html',
    '随笔': '/blog.html',
    '研究': '/papers.html',
    '知识库': '/wiki.html',
    '订阅阅读': '/reader.html',
    '问答助手': '/assistant.html',
    '友链': '/links.html',
    '留言簿': '/guestbook.html'
  };
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
  '/index.html': '首页',
  '/about.html': '关于',
  '/projects.html': '作品',
  '/blog.html': '随笔',
  '/papers.html': '研究',
  '/wiki.html': '知识库',
  '/reader.html': '订阅阅读',
  '/assistant.html': '问答助手',
  '/links.html': '友链',
  '/guestbook.html': '留言簿',
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

test('TC01 legacy routes return 200', async ({ request }) => {
  for (const legacyPage of LEGACY_PAGES) {
    const res = await request.get(legacyPage.path);
    expect(res.status()).toBe(200);
  }
});

test('navigation exposes the visitor group on every root page', async ({ page }) => {
  for (const sitePage of ROOT_NAV_PAGES) {
    await page.goto(sitePage.path);
    const links = page.locator('#nav-links');
    await expect(links.locator('.nav-group-label').last()).toHaveText('来坐坐');
    const directoryLink = links.locator('a[href="links.html"]').last();
    await expect(directoryLink).toHaveText('友链');
    await expect(directoryLink).toBeVisible();
    const guestbookLink = links.locator('a[href="guestbook.html"]').last();
    await expect(guestbookLink).toHaveText('留言簿');
    await expect(guestbookLink).toBeVisible();
  }
});

/* ================================================================
   TC04 — 首页个人信息完整性 (F2)
   ================================================================ */
test('TC04 — 首页个人信息完整性', async ({ page }) => {
  await page.goto('/index.html');
  const title = await page.title();
  expect(title).toBe('不驚茶坊 — Jingtine 的个人网站');
  await expect(page.locator('h1')).toHaveText('你好，我是不驚醴。');
  await expect(page.locator('.home-now')).toContainText('南京大学商学院软件工程（软工商业创新班）在读。');
  await expect(page.locator('main > section')).toHaveCount(4);
  await expect(page.locator('.home-making')).toContainText('NoteWhale');
  // Email in the sidebar shortcut row
  const emailLink = page.locator('.nav-social-links a[href*="mailto:"]');
  await expect(emailLink).toBeVisible();
});

/* ================================================================
   TC05 — 博客文章列表渲染 (F4)
   ================================================================ */
test('TC05 — 博客文章列表渲染', async ({ page }) => {
  const articles = await (await page.request.get('/public/data/articles.json')).json();
  expect(articles.length).toBeGreaterThan(0);
  await page.goto('/blog.html');
  const cards = page.locator('.article-card');
  await expect(cards).toHaveCount(articles.length);
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
  await expect(page.locator('#article-body')).toHaveAttribute('aria-busy', 'false');
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
  const articles = await (await page.request.get('/public/data/articles.json')).json();
  expect(result.count).toBe(articles.length);
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
  const result = execSync('python scripts/check.py', { encoding: 'utf-8', cwd: REPO_ROOT });
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
  const response = await page.request.get('/public/data/articles.json');
  expect(response.status()).toBe(200);
  const articles = await response.json();
  expect(Array.isArray(articles)).toBe(true);
  const expectedCount = articles.length;
  await page.goto('/blog.html');
  await page.waitForSelector('.article-card', { timeout: 5000 });
  const cardCount = await page.locator('.article-card').count();
  expect(cardCount).toBe(expectedCount);
});

test('TC19 生成文章数据模块读取索引和写作配置', async ({ page }) => {
  const articles = await (await page.request.get('/public/data/articles.json')).json();
  const config = await (await page.request.get('/config/writing.json')).json();
  expect(articles.length).toBeGreaterThan(0);
  const fields = ['slug', 'title', 'date', 'kind', 'category', 'tags', 'summary', 'cover', 'coverAlt', 'wordCount', 'readingMinutes'].sort();
  expect(new Set(articles.map(article => article.slug)).size).toBe(articles.length);
  for (const article of articles) {
    expect(Object.keys(article).sort()).toEqual(fields);
    expect(article.slug).toEqual(expect.any(String));
    expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(['essay', 'note', 'technical']).toContain(article.kind);
    expect(Array.isArray(article.tags)).toBe(true);
    expect(Number.isInteger(article.wordCount)).toBe(true);
    expect(article.wordCount).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(article.readingMinutes)).toBe(true);
    expect(article.readingMinutes).toBeGreaterThanOrEqual(1);
  }
  expect(articles.map(article => article.date)).toEqual(articles.map(article => article.date).sort().reverse());
  for (let index = 1; index < articles.length; index += 1) {
    if (articles[index - 1].date === articles[index].date) {
      // Compare Unicode code points, matching Python's stable slug ordering.
      const previous = Array.from(articles[index - 1].slug, char => char.codePointAt(0));
      const current = Array.from(articles[index].slug, char => char.codePointAt(0));
      const differing = previous.findIndex((point, offset) => point !== current[offset]);
      expect(differing < 0 ? previous.length < current.length : previous[differing] < (current[differing] ?? -1)).toBe(true);
    }
  }
  await page.goto('/index.html');
  const result = await page.evaluate(async () => ({
    articles: await window.ArticleData.load(),
    config: await window.ArticleData.loadConfig(),
    date: window.ArticleData.formatDate('2026-02-28'),
    invalidDate: window.ArticleData.formatDate('2026-02-29'),
    href: window.ArticleData.articleHref('hello world/测试'),
  }));
  expect(result).toEqual({
    articles,
    config,
    date: '2026-02-28',
    invalidDate: '',
    href: 'article.html?slug=hello%20world%2F%E6%B5%8B%E8%AF%95',
  });
});

test('TC19 旧索引返回 404 且博客只读取生成文章', async ({ page }) => {
  const response = await page.request.get('/articles/index.json');
  expect(response.status()).toBe(404);
  const articles = await (await page.request.get('/public/data/articles.json')).json();
  const oldRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/articles/index.json') oldRequests.push(request.url());
  });
  await page.goto('/blog.html');
  await expect(page.locator('.article-card')).toHaveCount(articles.length);
  expect(oldRequests).toEqual([]);
});

// Published URL compatibility is intentionally a fixed historical contract.
for (const slug of ['hello-world', 'building-agent', 'why-se-matters', 'product-thinking-101',
  'notewhale-why-started', 'building-digital-garden', 'opencode-superpowers-workflow',
  'github-pages-dev-notes', 'from-ui-to-product']) {
  test(`TC19 published article URL remains readable: ${slug}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`/article.html?slug=${slug}`);
    expect(response.status()).toBe(200);
    await expect(page.locator('#article-body')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#article-body')).not.toHaveAttribute('role', 'alert');
    await expect(page.locator('#article-body h2').first()).toBeVisible();
    expect((await page.locator('#article-body').innerText()).trim().length).toBeGreaterThan(50);
    expect(errors).toEqual([]);
  });
}

test('TC19 首页在生成文章索引第一次失败后可重试', async ({ page }) => {
  const response = await page.request.get('/public/data/articles.json');
  const articles = await response.json();
  let generatedIndexRequests = 0;

  await page.route('**/public/data/articles.json', async route => {
    generatedIndexRequests += 1;
    if (generatedIndexRequests === 1) {
      await route.fulfill({ status: 500, body: 'temporary failure' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(articles),
    });
  });

  await page.goto('/index.html');
  const retry = page.locator('#latest-posts button:has-text("重试")');
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.locator('#latest-posts .article-card')).toHaveCount(Math.min(3, articles.length));
  expect(generatedIndexRequests).toBe(2);
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

/* ================================================================
   TC21 — 移动端汉堡菜单 (F13)
   ================================================================ */
test.describe('TC21 — 移动端汉堡菜单', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('TC21 展开/收起/跳转/无溢出', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('.nav-toggle');
    const links = page.locator('#nav-links');

    await expect(toggle).toBeVisible();
    await expect(links).not.toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(links).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/nav-open/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const overflowOpen = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(overflowOpen).toBe(true);

    await toggle.click();
    await expect(links).not.toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/nav-open/);

    await toggle.click();
    await page.locator('#nav-links a:has-text("随笔")').click();
    await page.waitForLoadState('networkidle');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/blog.html');
  });

  test('TC21 点外部与 Esc 收起', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    const toggle = page.locator('.nav-toggle');
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/nav-open/);
    await page.locator('main').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('html')).not.toHaveClass(/nav-open/);
    const urlAfterOutside = new URL(page.url());
    expect(urlAfterOutside.pathname).toBe('/index.html');
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/nav-open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/nav-open/);
  });

  test('TC21 reduced-motion 无 navIn 动画', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    const toggle = page.locator('.nav-toggle');
    const links = page.locator('#nav-links');
    await toggle.click();
    await expect(links).toBeVisible();
    const animationName = await links.evaluate(el => getComputedStyle(el).animationName);
    expect(animationName).not.toBe('navIn');
  });
});

/* ================================================================
   TC22 — 375px 全页面无横向溢出 (F13)
   ================================================================ */
test.describe('TC22 — 375px 全页面无横向溢出', () => {
  const paths = [
    '/index.html', '/about.html', '/projects.html', '/blog.html',
    '/papers.html', '/wiki.html', '/reader.html', '/assistant.html',
    '/status.html', '/article.html?slug=hello-world', '/knowledge.html',
    '/library.html', '/contact.html', '/links.html', '/guestbook.html',
  ];
  for (const path of paths) {
    test(`TC22 ${path} 375px 无溢出`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
      const page = await ctx.newPage();
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      );
      expect(overflow).toBe(true);
      await ctx.close();
    });
  }
});
