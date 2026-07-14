const { test, expect } = require('@playwright/test');

/* ================================================================
   BC01 — 首页完整信息展示 (Req1)
   ================================================================ */
test('BC01 — 首页完整信息展示', async ({ page }) => {
  await page.goto('/index.html');
  const title = await page.title();
  expect(title).toContain('Jingtine');
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toContain('Jingtine');
  expect(bodyText).toContain('Software Engineering');
  expect(bodyText).toContain('AI Agent');
  expect(bodyText).toContain('Product Innovation');
  const emailLink = page.locator('footer a[href*="mailto:"]');
  await expect(emailLink).toBeVisible();
});

/* ================================================================
   BC02 — 五个导航入口可跳转 (Req2)
   ================================================================ */
test('BC02 — 五个导航入口可跳转', async ({ page }) => {
  await page.goto('/index.html');
  const navMap = { 'About': '/about.html', 'Blog': '/blog.html', 'Research': '/papers.html', 'Wiki': '/wiki.html' };
  for (const [label, expectedPath] of Object.entries(navMap)) {
    await page.click(`.nav-links a:has-text("${label}")`);
    await page.waitForLoadState('networkidle');
    const url = new URL(page.url());
    expect(url.pathname).toBe(expectedPath);
    const activeLink = page.locator('.nav-links a.active');
    await expect(activeLink).toBeVisible();
    await page.goBack();
    await page.waitForLoadState('networkidle');
  }
  // also check back to Home
  await page.goto('/about.html');
  await page.click('.nav-links a:has-text("Home")');
  await page.waitForLoadState('networkidle');
  expect(new URL(page.url()).pathname).toBe('/index.html');
});

/* ================================================================
   BC03 — 博客文章列表展示 (Req3)
   ================================================================ */
test('BC03 — 博客文章列表展示', async ({ page }) => {
  await page.goto('/blog.html');
  await page.waitForSelector('.article-card', { timeout: 5000 });
  const cards = page.locator('.article-card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(5);
  const firstCard = cards.first();
  await expect(firstCard.locator('h3')).toBeVisible();
  await expect(firstCard.locator('.article-date')).toBeVisible();
});

/* ================================================================
   BC04 — 点击文章进入详情 (Req3)
   ================================================================ */
test('BC04 — 点击文章进入详情', async ({ page }) => {
  await page.goto('/blog.html');
  await page.waitForSelector('.article-card', { timeout: 5000 });
  const firstCard = page.locator('.article-card').first();
  await firstCard.click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.article-detail')).toBeVisible({ timeout: 5000 });
  const text = await page.locator('.article-detail').textContent();
  expect(text.length).toBeGreaterThan(50);
});

/* ================================================================
   BC05 — RSS Feed 可解析 (Req4)
   ================================================================ */
test('BC05 — RSS Feed 可解析', async ({ page }) => {
  const response = await page.request.get('/feed.xml');
  expect(response.status()).toBe(200);
  const xmlText = await response.text();
  const isValid = await page.evaluate((xml) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    return doc.querySelector('parsererror') === null;
  }, xmlText);
  expect(isValid).toBe(true);
  const count = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return doc.querySelectorAll('item').length;
  }, xmlText);
  expect(count).toBeGreaterThanOrEqual(5);
});

/* ================================================================
   BC06 — RSS 文章按日期倒序 (Req4)
   ================================================================ */
test('BC06 — RSS 文章按日期倒序', async ({ page }) => {
  const response = await page.request.get('/feed.xml');
  const xmlText = await response.text();
  const sorted = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const items = doc.querySelectorAll('item');
    const dates = Array.from(items).map(item => {
      const pd = item.querySelector('pubDate');
      return pd ? new Date(pd.textContent).getTime() : 0;
    });
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] > dates[i - 1]) return false;
    }
    return true;
  }, xmlText);
  expect(sorted).toBe(true);
});

/* ================================================================
   BC07 — RSS 阅读器展示多个来源 (Req5)
   ================================================================ */
test('BC07 — RSS 阅读器展示多个来源', async ({ page }) => {
  await page.goto('/reader.html');
  await page.waitForTimeout(3000);
  const bodyText = await page.locator('body').textContent();
  expect(bodyText.length).toBeGreaterThan(50);
});

/* ================================================================
   BC08 — 外部链接安全性 (Req5)
   ================================================================ */
test('BC08 — 外部链接安全性', async ({ page }) => {
  await page.goto('/reader.html');
  await page.waitForTimeout(2000);
  const extLinks = page.locator('a[href^="http"]');
  const count = await extLinks.count();
  for (let i = 0; i < count; i++) {
    const href = await extLinks.nth(i).getAttribute('href');
    expect(href).toMatch(/^https:\/\//);
    if (href && !href.includes('jingtine.github.io')) {
      const rel = await extLinks.nth(i).getAttribute('rel') || '';
      expect(rel).toMatch(/noopener|noreferrer/);
    }
  }
  const html = await page.content();
  expect(html).not.toContain('onclick=');
  expect(html).not.toContain('onload=');
});

/* ================================================================
   BC09 — Wiki 页面可浏览 (Req6)
   ================================================================ */
test('BC09 — Wiki 页面可浏览', async ({ page }) => {
  await page.goto('/wiki.html');
  await page.waitForTimeout(2000);
  const bodyText = await page.locator('body').textContent();
  // Should have content loaded (categories + page list)
  expect(bodyText).toContain('AI');
  // Click a category if filter buttons exist
  const filterBtn = page.locator('.wiki-filter-btn, button').first();
  if (await filterBtn.isVisible()) {
    await filterBtn.click();
    await page.waitForTimeout(500);
  }
});

/* ================================================================
   BC10 — 移动端窄屏不崩溃 (Req1/Req2/Req8)
   ================================================================ */
test('BC10 — 移动端窄屏不崩溃', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  const hasContent = await page.locator('body').textContent();
  expect(hasContent.length).toBeGreaterThan(100);
  // Nav should still be present
  const navLinks = page.locator('.nav-links a');
  const navCount = await navLinks.count();
  expect(navCount).toBeGreaterThanOrEqual(4);
  await ctx.close();
});

/* ================================================================
   BC11 — 768px 无横向溢出 (Req8)
   ================================================================ */
test('BC11 — 768px 无横向溢出', async ({ browser }) => {
  for (const path of ['/index.html', '/blog.html', '/wiki.html', '/reader.html']) {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(overflow).toBe(true);
    await ctx.close();
  }
});

/* ================================================================
   BC12 — 博客页加载不报 JS 异常 (Req3 稳健性)
   ================================================================ */
test('BC12 — 博客页加载不报 JS 异常', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/blog.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});
