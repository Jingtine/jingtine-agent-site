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
  const page = await context.newPage();
  await page.goto('/index.html');
  await expect(page.locator('#nav-links a')).toHaveText(expectedNavigation);
  await expect(page.locator('.footer a[href="feed.xml"]')).toBeVisible();
  await context.close();
});
