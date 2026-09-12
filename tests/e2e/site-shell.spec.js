const { test, expect } = require('@playwright/test');
const backgroundImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLqLwAAAABJRU5ErkJggg==', 'base64');

test('About keeps the precise program wording', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.locator('h1')).toHaveText('不驚醴 / Jingtine');
  await expect(page.locator('.about-lead')).toHaveText('南京大学商学院软件工程（软工商业创新班）在读。');
  await expect(page.locator('.about-study')).toContainText('软件工程与工商管理双学位班');
});

test('home reads as a personal publication', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('h1')).toContainText('你好，我是不驚醴。');
  await expect(page.locator('main > section')).toHaveCount(4);
  await expect(page.locator('.home-now')).toBeVisible();
  await expect(page.locator('.home-writing')).toBeVisible();
  await expect(page.locator('.home-making')).toBeVisible();
  await expect(page.locator('.home-found')).toBeVisible();
  await expect(page.locator('.panel-number')).toHaveCount(2);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`home responsive reading order at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/index.html');
    await expect(page.locator('#latest-posts .article-card')).toHaveCount(3);
    expect(await page.locator('main > section').evaluateAll(sections => sections.map(section => section.className)))
      .toEqual(['home-now', 'home-writing', 'home-making', 'home-found']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 768) {
      const sections = await page.locator('main > section').evaluateAll(items => items.map(item => {
        const rect = item.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }));
      sections.slice(1).forEach((section, index) => expect(section.top).toBeGreaterThanOrEqual(sections[index].bottom));
    }
  });
}

test('home writing recovers from a failed load with keyboard retry', async ({ page }) => {
  await page.route('**/articles/index.json', route => route.fulfill({ status: 503 }));
  await page.goto('/index.html');
  await expect(page.locator('#latest-posts')).toContainText('随笔加载失败。');
  await expect(page.locator('.home-now a[href="about.html"]')).toBeVisible();
  await page.unroute('**/articles/index.json');
  await page.getByRole('button', { name: '重试' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#latest-posts .article-card')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '重试' })).toHaveCount(0);
});

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
  for (const route of ['index.html', 'about.html']) {
    for (const width of [390, 1440]) {
      test(`${route} keeps reading contrast over a dark custom background at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.route('**/assets/images/backgrounds/dark.svg', route => route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><path fill="#000000" d="M0 0h8v8H0z"/></svg>'
        }));
        await page.route('**/config/site.json', route => route.fulfill({ json: {
          name: '不驚茶坊', author: '不驚醴', handle: 'Jingtine',
          background: { image: 'assets/images/backgrounds/dark.svg', blur: 0,
            saturation: 0, overlay: '#000000', overlayOpacity: 1, position: 'center' }
        }}));
        await page.goto(`/${route}`);
        await page.evaluate(() => window.SiteTheme.load());
        await expect(page.locator('html')).toHaveClass(/site-background-ready/);

        const reading = await page.locator('main').evaluate(main => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d');
          const rgba = color => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return Array.from(context.getImageData(0, 0, 1, 1).data);
          };
          const luminance = rgb => rgb.slice(0, 3).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
          const style = getComputedStyle(main);
          const surface = rgba(style.backgroundColor);
          // Composite the reading paper over the fixture's solid black backdrop.
          const paper = luminance(surface.slice(0, 3).map(value => value * surface[3] / 255));
          return {
            opacity: surface[3] / 255,
            borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
            contrast: Array.from(main.querySelectorAll('h1, h2, h3, p, a:not(.btn-primary), li span')).map(element => {
              const ink = luminance(rgba(getComputedStyle(element).color));
              return (Math.max(paper, ink) + 0.05) / (Math.min(paper, ink) + 0.05);
            })
          };
        });
        expect(reading.opacity).toBeGreaterThanOrEqual(0.9);
        expect(reading.borders).toEqual(['0px', '0px', '0px', '0px']);
        expect(reading.contrast.length).toBeGreaterThan(10);
        for (const contrast of reading.contrast) expect(contrast).toBeGreaterThanOrEqual(4.5);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

        await page.route('**/config/site.json', route => route.fulfill({ json: { background: { image: '' } } }));
        await page.evaluate(() => window.SiteTheme.load());
        await expect(page.locator('html')).not.toHaveClass(/site-background-ready/);
        await expect(page.locator('main')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      });
    }
  }

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
    await page.evaluate(() => window.SiteTheme.load());
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
    await page.evaluate(() => window.SiteTheme.load());
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
