const { test, expect } = require('@playwright/test');
const backgroundImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLqLwAAAABJRU5ErkJggg==', 'base64');

test('site shell presents the tea-house identity and English attribution', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.nav-brand-name')).toHaveText('不驚茶坊');
  await expect(page.locator('.nav-brand-signature')).toHaveText('不驚醴 · Jingtine');
  await expect(page.locator('.footer')).toContainText('Jingtine');
  await expect(page.locator('.footer')).not.toContainText('不驚醴');
});

test('wide desktop masthead keeps each brand line inside the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/index.html');

  const layout = await page.locator('.nav-logo').evaluate(logo => {
    const sidebar = logo.closest('.nav').getBoundingClientRect();
    return Array.from(logo.children).map(span => {
      const range = document.createRange();
      range.selectNodeContents(span);
      const lineRects = Array.from(range.getClientRects()).filter(rect => rect.width && rect.height);
      return {
        lines: lineRects.length,
        left: Math.min(...lineRects.map(rect => rect.left)),
        right: Math.max(...lineRects.map(rect => rect.right)),
        top: Math.min(...lineRects.map(rect => rect.top)),
        bottom: Math.max(...lineRects.map(rect => rect.bottom)),
        sidebarLeft: sidebar.left,
        sidebarRight: sidebar.right,
      };
    });
  });

  expect(layout).toHaveLength(2);
  for (const line of layout) {
    expect(line.lines).toBe(1);
    expect(line.left).toBeGreaterThanOrEqual(line.sidebarLeft);
    expect(line.right).toBeLessThanOrEqual(line.sidebarRight);
  }
  expect(layout[1].top).toBeGreaterThanOrEqual(layout[0].bottom);
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
    await page.route('**/assets/images/backgrounds/example.jpg', route => route.fulfill({
      contentType: 'image/png', body: backgroundImage
    }));
    await page.route('**/config/site.json', route => route.fulfill({ json: {
      name: '不驚茶坊', author: '不驚醴', handle: 'Jingtine',
      background: { image: 'assets/images/backgrounds/example.jpg', blur: 14,
        saturation: 0.72, overlay: '#f4f0e8', overlayOpacity: 0.82, position: 'center' }
    }}));
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveClass(/site-background-ready/);
    expect(await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--site-bg-blur').trim())).toBe('14px');
    expect(await page.locator('body').evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('0.82');
    await page.locator('html').evaluate(el => el.classList.remove('site-background-ready'));
    expect(await page.locator('body').evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('0');
  });

  test('unsafe background paths keep the dotted-paper fallback', async ({ page }) => {
    await page.route('**/config/site.json', route => route.fulfill({ json: {
      name: '不驚茶坊', author: '不驚醴', handle: 'Jingtine',
      background: { image: 'https://example.com/tracker.jpg', blur: 14 }
    }}));
    await page.goto('/index.html');
    await expect(page.locator('html')).not.toHaveClass(/site-background-ready/);
  });

  test('failed repository-local backgrounds keep the dotted-paper fallback', async ({ page }) => {
    await page.route('**/assets/images/backgrounds/missing.jpg', route => route.fulfill({ status: 404 }));
    await page.route('**/config/site.json', route => route.fulfill({ json: {
      name: '不驚茶坊', author: '不驚醴', handle: 'Jingtine',
      background: { image: 'assets/images/backgrounds/missing.jpg', blur: 24,
        saturation: 1.4, overlay: '#123456', overlayOpacity: 0.5, position: 'top left' }
    }}));
    await page.goto('/index.html');
    await expect(page.locator('html')).not.toHaveClass(/site-background-ready/);
    expect(await page.locator('html').evaluate(el => ({
      inline: el.style.getPropertyValue('--site-bg-image'),
      defaults: [
        '--site-bg-image', '--site-bg-blur', '--site-bg-saturation',
        '--site-bg-overlay', '--site-bg-overlay-opacity', '--site-bg-position'
      ].map(name => getComputedStyle(el).getPropertyValue(name).trim())
    }))).toEqual({
      inline: '', defaults: ['none', '14px', '0.72', '#f4f0e8', '0', 'center']
    });
  });
});
