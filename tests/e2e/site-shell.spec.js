const { test, expect } = require('@playwright/test');

test('site shell presents the tea-house identity and English attribution', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.nav-brand-name')).toHaveText('不驚茶坊');
  await expect(page.locator('.nav-brand-signature')).toHaveText('不驚醴 · Jingtine');
  await expect(page.locator('.footer')).toContainText('Jingtine');
  await expect(page.locator('.footer')).not.toContainText('不驚醴');
});

const expectedNavigation = ['首页', '关于', '作品', '随笔', '研究', '知识库', '订阅阅读', '问答助手'];

test('Chinese navigation remains real HTML without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/index.html');
    await expect(page.locator('#nav-links a')).toHaveText(expectedNavigation);
    await expect(page.locator('.footer a[href="feed.xml"]')).toBeVisible();
  } finally {
    await context.close();
  }
});

test.describe('site theme', () => {
  test('applies repository-local background settings', async ({ page }) => {
    await page.route('**/config/site.json', route => route.fulfill({ json: {
      name: '不驚茶坊', author: '不驚醴', handle: 'Jingtine',
      background: { image: 'assets/images/backgrounds/example.jpg', blur: 14,
        saturation: 0.72, overlay: '#f4f0e8', overlayOpacity: 0.82, position: 'center' }
    }}));
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveClass(/site-background-ready/);
    expect(await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--site-bg-blur').trim())).toBe('14px');
  });

  test('unsafe background paths keep the dotted-paper fallback', async ({ page }) => {
    await page.route('**/config/site.json', route => route.fulfill({ json: {
      name: '不驚茶坊', author: '不驚醴', handle: 'Jingtine',
      background: { image: 'https://example.com/tracker.jpg', blur: 14 }
    }}));
    await page.goto('/index.html');
    await expect(page.locator('html')).not.toHaveClass(/site-background-ready/);
  });
});
