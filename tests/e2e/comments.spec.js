const { test, expect } = require('@playwright/test');

test.describe('guestbook', () => {
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
    const fallback = noScriptPage.locator('a[href="https://github.com/Jingtine/jingtine-agent-site/discussions"]');
    await expect(fallback).toHaveText('前往 GitHub Discussions 留言');
    await noScriptContext.close();
  });
});
