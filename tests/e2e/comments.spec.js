const { test, expect } = require('@playwright/test');
const productionConfig = require('../../config/comments.json');

const discussionsUrl = 'https://github.com/Jingtine/jingtine-agent-site/discussions';
const validConfig = {
  enabled: true,
  repo: 'Jingtine/jingtine-agent-site',
  repoId: 'R_kgDOExample',
  category: 'General',
  categoryId: 'DIC_kwDOExample',
  theme: 'dark',
  lang: 'en',
};

async function disableAutomaticLoading(page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true });
  });
}

async function routeConfig(page, value = validConfig) {
  await page.route('**/config/comments.json', route => route.fulfill({ json: value }));
}

async function routeGiscus(page, handler) {
  await page.route('https://giscus.app/client.js', handler || (route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.__giscusFixtureLoaded = true;',
  })));
}

async function expectDiscussionsFallback(page, mountSelector) {
  const link = page.locator(`${mountSelector} a[href="${discussionsUrl}"]`);
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
}

test.describe('guestbook', () => {
  test('guestbook passes the committed production configuration to Giscus', async ({ page }) => {
    await disableAutomaticLoading(page);
    await routeGiscus(page);
    await page.goto('/guestbook.html');

    expect(productionConfig.enabled).toBe(true);
    expect(productionConfig.repoId).not.toBe('');
    expect(productionConfig.categoryId).not.toBe('');
    await page.getByRole('button', { name: '加载留言' }).focus();

    const script = page.locator('#guestbook-comments script');
    await expect(script).toHaveAttribute('data-repo', productionConfig.repo);
    await expect(script).toHaveAttribute('data-repo-id', productionConfig.repoId);
    await expect(script).toHaveAttribute('data-category', productionConfig.category);
    await expect(script).toHaveAttribute('data-category-id', productionConfig.categoryId);
    await expect(script).toHaveAttribute('data-theme', productionConfig.theme);
    await expect(script).toHaveAttribute('data-lang', productionConfig.lang);
  });

  test('guestbook route provides an accessible public discussion fallback', async ({ page, browser }) => {
    const response = await page.goto('/guestbook.html');

    expect(response.status()).toBe(200);
    await expect(page.locator('.skip-link[href="#main-content"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="主导航"]')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('#guestbook-comments')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('main')).toContainText('这里的留言公开可见');
    await expect(page.locator('.nav-links a[href="guestbook.html"]')).toHaveAttribute('aria-current', 'page');

    const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
    const noScriptPage = await noScriptContext.newPage();
    await noScriptPage.goto('/guestbook.html');
    const fallback = noScriptPage.locator(`a[href="${discussionsUrl}"]`);
    await expect(fallback).toHaveText('前往 GitHub Discussions 留言');
    await noScriptContext.close();
  });

  test('guestbook mounts one fixed-origin Giscus script with validated attributes', async ({ page }) => {
    await disableAutomaticLoading(page);
    await routeConfig(page);
    await routeGiscus(page);
    await page.goto('/guestbook.html');

    await page.getByRole('button', { name: '加载留言' }).focus();
    const script = page.locator('#guestbook-comments script');
    await expect(script).toHaveAttribute('src', 'https://giscus.app/client.js');
    await expect(script).toHaveAttribute('data-repo', 'Jingtine/jingtine-agent-site');
    await expect(script).toHaveAttribute('data-repo-id', 'R_kgDOExample');
    await expect(script).toHaveAttribute('data-category', 'General');
    await expect(script).toHaveAttribute('data-category-id', 'DIC_kwDOExample');
    await expect(script).toHaveAttribute('data-mapping', 'specific');
    await expect(script).toHaveAttribute('data-term', 'guestbook');
    await expect(script).toHaveAttribute('data-strict', '1');
    await expect(script).toHaveAttribute('data-reactions-enabled', '1');
    await expect(script).toHaveAttribute('data-emit-metadata', '0');
    await expect(script).toHaveAttribute('data-input-position', 'top');
    await expect(script).toHaveAttribute('data-theme', 'dark');
    await expect(script).toHaveAttribute('data-lang', 'en');
    expect(await script.evaluate(element => ({ async: element.async, crossOrigin: element.crossOrigin })))
      .toEqual({ async: true, crossOrigin: 'anonymous' });
  });

  test('guestbook keeps its load button when IntersectionObserver is unavailable and loads by keyboard focus', async ({ page }) => {
    await disableAutomaticLoading(page);
    await routeConfig(page);
    await routeGiscus(page);
    await page.goto('/guestbook.html');

    const button = page.getByRole('button', { name: '加载留言' });
    await expect(button).toBeVisible();
    await expect(page.locator('#guestbook-comments script')).toHaveCount(0);
    for (let presses = 0; presses < 20 && await page.locator('#guestbook-comments script').count() === 0; presses++) {
      await page.keyboard.press('Tab');
    }
    await expect(page.locator('#guestbook-comments script')).toHaveAttribute('data-term', 'guestbook');
  });

  test('guestbook loads when it nears the viewport using the configured observer margin', async ({ page }) => {
    await page.addInitScript(() => {
      window.IntersectionObserver = class {
        constructor(callback, options) {
          this.callback = callback;
          window.__commentsRootMargin = options.rootMargin;
        }
        observe(element) { this.callback([{ isIntersecting: true, target: element }]); }
        disconnect() {}
      };
    });
    await routeConfig(page);
    await routeGiscus(page);
    await page.goto('/guestbook.html');

    await expect(page.locator('#guestbook-comments script')).toHaveAttribute('data-term', 'guestbook');
    expect(await page.evaluate(() => window.__commentsRootMargin)).toBe('400px 0px');
  });

  test('guestbook announces loading status before the Giscus client resolves', async ({ page }) => {
    await disableAutomaticLoading(page);
    await routeConfig(page);
    await routeGiscus(page, async route => {
      await new Promise(resolve => setTimeout(resolve, 400));
      await route.fulfill({ contentType: 'application/javascript', body: '' });
    });
    await page.goto('/guestbook.html');

    await page.getByRole('button', { name: '加载留言' }).focus();
    await expect(page.getByRole('status')).toContainText('正在加载留言');
    await expect(page.locator('#guestbook-comments')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#guestbook-comments script')).toHaveCount(1);
  });

  for (const scenario of [
    { name: 'disabled comments', value: { ...validConfig, enabled: false, repoId: '', categoryId: '' } },
    { name: 'malformed config', value: { ...validConfig, theme: 'system' } },
  ]) {
    test(`guestbook exposes the fixed Discussions link for ${scenario.name} with JavaScript enabled`, async ({ page }) => {
      await disableAutomaticLoading(page);
      await routeConfig(page, scenario.value);
      await page.goto('/guestbook.html');
      await page.getByRole('button', { name: '加载留言' }).focus();
      await expectDiscussionsFallback(page, '#guestbook-comments');
      await expect(page.locator('#guestbook-comments script')).toHaveCount(0);
    });
  }

  test('guestbook rejects a configurable Giscus client origin and uses the fixed Discussions fallback', async ({ page }) => {
    await disableAutomaticLoading(page);
    const attemptedUrls = [];
    page.on('request', request => {
      if (request.url().includes('evil.example')) attemptedUrls.push(request.url());
    });
    await routeConfig(page, { ...validConfig, clientUrl: 'https://evil.example/client.js' });
    await page.goto('/guestbook.html');
    await page.getByRole('button', { name: '加载留言' }).focus();

    await expectDiscussionsFallback(page, '#guestbook-comments');
    expect(attemptedUrls).toEqual([]);
  });

  test('guestbook exposes the fixed Discussions link after config fetch failure and retries it', async ({ page }) => {
    await disableAutomaticLoading(page);
    let attempts = 0;
    await page.route('**/config/comments.json', route => ++attempts === 1
      ? route.fulfill({ status: 503, body: '' })
      : route.fulfill({ json: validConfig }));
    await routeGiscus(page);
    await page.goto('/guestbook.html');
    await page.getByRole('button', { name: '加载留言' }).focus();

    await expectDiscussionsFallback(page, '#guestbook-comments');
    await page.getByRole('button', { name: '重试加载留言' }).click();
    await expect(page.locator('#guestbook-comments script')).toHaveAttribute('data-term', 'guestbook');
    expect(attempts).toBe(2);
  });

  test('guestbook replaces a failed Giscus script with the fixed fallback and retries once', async ({ page }) => {
    await disableAutomaticLoading(page);
    await routeConfig(page);
    let attempts = 0;
    await routeGiscus(page, route => ++attempts === 1
      ? route.abort('failed')
      : route.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.goto('/guestbook.html');
    await page.getByRole('button', { name: '加载留言' }).focus();

    await expectDiscussionsFallback(page, '#guestbook-comments');
    await page.getByRole('button', { name: '重试加载留言' }).click();
    await expect(page.locator('#guestbook-comments script')).toHaveAttribute('data-term', 'guestbook');
    expect(attempts).toBe(2);
  });

  test('guestbook repeated mount calls remain idempotent', async ({ page }) => {
    await disableAutomaticLoading(page);
    await routeConfig(page);
    await routeGiscus(page);
    await page.goto('/guestbook.html');

    const statuses = await page.evaluate(() => Promise.all([
      window.SiteComments.mount(document.getElementById('guestbook-comments'), 'guestbook'),
      window.SiteComments.mount(document.getElementById('guestbook-comments'), 'guestbook'),
    ]));
    expect(statuses).toEqual([{ status: 'ready' }, { status: 'ready' }]);
    await page.getByRole('button', { name: '加载留言' }).focus();
    await page.evaluate(() => window.SiteComments.mount(document.getElementById('guestbook-comments'), 'guestbook'));
    await expect(page.locator('#guestbook-comments script')).toHaveCount(1);
  });
});
