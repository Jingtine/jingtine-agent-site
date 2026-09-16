const { test, expect } = require('@playwright/test');

const fixture = {
  groups: [
    {
      id: 'friends', name: '茶友', links: [
        { name: 'Alice', url: 'https://alice.example/', description: '一起写字的朋友。', tags: ['写作'], avatar: 'assets/images/figure.jpg' },
        { name: 'Bamboo', url: 'https://bamboo.example/', description: '安静的花园。', tags: ['笔记'] }
      ]
    },
    {
      id: 'places', name: '去处', links: [
        { name: 'Cedar', url: 'https://cedar.example/', description: '值得常去的站点。', tags: ['阅读'] }
      ]
    }
  ]
};

test('renders safe grouped links as text', async ({ page }) => {
  await page.route('**/config/links.json', route => route.fulfill({ json: fixture }));
  await page.goto('/links.html');
  await expect(page.locator('.links-group')).toHaveCount(2);
  await expect(page.locator('.link-entry a').first()).toHaveAttribute('target', '_blank');
  await expect(page.locator('.link-entry a').first()).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('#links-status')).toHaveText('共收录 3 个链接。');
});

test('shows the intentional empty state when no groups have links', async ({ page }) => {
  await page.route('**/config/links.json', route => route.fulfill({ json: { groups: [{ id: 'empty', name: '空组', links: [] }] } }));
  await page.goto('/links.html');
  await expect(page.locator('.links-group')).toHaveCount(0);
  await expect(page.locator('#links-groups')).toHaveText('暂时还没有收录链接。');
  await expect(page.locator('#links-status')).toHaveText('暂时没有链接。');
});

test('recovers from a failed fetch with the keyboard retry button', async ({ page }) => {
  let fail = true;
  await page.route('**/config/links.json', route => fail ? route.fulfill({ status: 503 }) : route.fulfill({ json: fixture }));
  await page.goto('/links.html');
  await expect(page.locator('#links-groups')).toContainText('链接目录暂时无法读取。');
  const retry = page.getByRole('button', { name: '重试' });
  await retry.focus();
  fail = false;
  await page.keyboard.press('Enter');
  await expect(page.locator('.links-group')).toHaveCount(2);
});

test('treats untrusted strings as text and rejects unsafe URLs and avatars', async ({ page }) => {
  const unsafe = '<img src=x onerror=alert(1)>';
  await page.route('**/config/links.json', route => route.fulfill({ json: { groups: [{
    id: 'safety', name: unsafe, links: [
      { name: unsafe, url: 'javascript:alert(1)', description: unsafe, avatar: '../escape.png' },
      { name: 'HTTP', url: 'http://example.com', description: 'not accepted' },
      { name: 'Safe', url: 'https://safe.example/', description: 'kept', avatar: '../escape.png' }
    ]
  }] } }));
  await page.goto('/links.html');
  await expect(page.locator('.links-group')).toHaveCount(1);
  await expect(page.locator('.link-entry')).toHaveCount(1);
  await expect(page.locator('.link-entry')).toContainText('Safe');
  await expect(page.locator('.links-directory img, .links-directory script')).toHaveCount(0);
  await expect(page.locator('.link-avatar')).toHaveText('S');
});

test('rejects percent-encoded traversal in local avatar paths', async ({ page }) => {
  await page.route('**/config/links.json', route => route.fulfill({ json: { groups: [{
    id: 'safety', name: '安全', links: [
      { name: 'Encoded', url: 'https://safe.example/', description: 'must use an initial', avatar: 'assets/images/%2e%2e/figure.jpg' }
    ]
  }] } }));
  await page.goto('/links.html');
  await expect(page.locator('.link-entry')).toHaveCount(1);
  expect(await page.evaluate(() => window.LinksPage.normalizeAvatarPath('assets/images/%2e%2e/figure.jpg'))).toBeNull();
  await expect(page.locator('.link-avatar img')).toHaveCount(0);
  await expect(page.locator('.link-avatar')).toHaveText('E');
});

test('rejects percent-encoded separators in local avatar paths', async ({ page }) => {
  const encodedPaths = [
    'assets/images/x%2f..%2f..%2fconfig/links.json',
    'assets/images/x%5c..%5c..%5cconfig/links.json'
  ];
  await page.route('**/config/links.json', route => route.fulfill({ json: { groups: [{
    id: 'safety', name: '安全', links: encodedPaths.map((avatar, index) => ({
      name: 'Encoded ' + index, url: 'https://safe.example/', description: 'must use an initial', avatar
    }))
  }] } }));
  await page.goto('/links.html');
  for (const avatar of encodedPaths) {
    expect(await page.evaluate(value => window.LinksPage.normalizeAvatarPath(value), avatar)).toBeNull();
  }
  await expect(page.locator('.link-avatar img')).toHaveCount(0);
  await expect(page.locator('.link-avatar')).toHaveText(['E', 'E']);
});

test('replaces a failed local avatar with its text initial without changing focus', async ({ page }) => {
  await page.route('**/config/links.json', route => route.fulfill({ json: fixture }));
  await page.goto('/links.html');
  const link = page.locator('.link-entry a').first();
  await link.focus();
  await page.locator('.link-avatar img').dispatchEvent('error');
  await expect(page.locator('.link-entry').first().locator('.link-avatar')).toHaveText('A');
  await expect(link).toBeFocused();
});

test('keeps link entries keyboard accessible', async ({ page }) => {
  await page.route('**/config/links.json', route => route.fulfill({ json: fixture }));
  await page.goto('/links.html');
  await page.locator('.link-entry a').first().focus();
  await expect(page.locator('.link-entry a').first()).toBeFocused();
});

test('keeps navigation and the no-JavaScript notice available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/links.html');
    const directoryLink = page.locator('#nav-links a[href="links.html"]');
    await expect(page.locator('#nav-links a')).toHaveCount(10);
    await expect(directoryLink).toHaveText('友链');
    await expect(directoryLink).toBeVisible();
    await expect(directoryLink).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('noscript .empty-state')).toContainText('链接目录需要 JavaScript 读取');
  } finally {
    await context.close();
  }
});

test('does not overflow at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/config/links.json', route => route.fulfill({ json: fixture }));
  await page.goto('/links.html');
  await expect(page.locator('.link-entry')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
