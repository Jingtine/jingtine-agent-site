const { test: base, expect, devices } = require('@playwright/test');

const root = '/jingtine-agent-site/';
const origin = 'http://127.0.0.1:8081';

async function observeLocalSite(context) {
  const failures = [];
  const external = new Set();
  const externalErrors = [];
  // Optional CDN fonts, analytics and enhancements must not make local tests flaky.
  // Do not replace them with fake implementations; assert local resources directly.
  await context.route('**/*', route => {
    const url = route.request().url();
    if (new URL(url).origin === origin) return route.continue();
    external.add(url);
    return route.abort('blockedbyclient');
  });
  context.on('page', page => {
    page.on('pageerror', error => {
      // Reimu eagerly imports its optional lightbox without a rejection handler.
      // Classify only this observed CDN failure; local fetch failures still fail.
      if (error.message === 'Failed to fetch' && error.stack?.includes('safeImport') && external.has('https://npm.webcache.cn/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.min.js')) {
        externalErrors.push(error.stack);
      } else failures.push(`Runtime: ${error.stack || error.message}`);
    });
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`);
    });
    page.on('requestfailed', request => {
      if (request.url().startsWith(origin) && request.failure()?.errorText !== 'net::ERR_ABORTED') failures.push(`${request.failure()?.errorText}: ${request.url()}`);
    });
    page.on('console', message => {
      if (message.type() === 'error' && message.location().url?.startsWith(origin)) failures.push(`Console: ${message.text()}`);
    });
  });
  return { failures, external, externalErrors };
}

const test = base.extend({
  context: async ({ context }, use, testInfo) => {
    const diagnostics = await observeLocalSite(context);
    await use(context);
    await testInfo.attach('network-diagnostics', {
      body: JSON.stringify({ localFailures: diagnostics.failures, blockedExternalUrls: [...diagnostics.external].sort(), expectedExternalErrors: diagnostics.externalErrors }, null, 2),
      contentType: 'application/json',
    });
    expect(diagnostics.failures, 'No local resource, base-path, console or runtime failures').toEqual([]);
  },
});

async function navigation(page, isMobile) {
  if (isMobile) {
    await page.locator('#main-nav-toggle').click();
    await expect(page.locator('body')).toHaveClass(/mobile-nav-on/);
    return page.locator('#mobile-nav');
  }
  return page.getByRole('navigation', { name: 'Primary navigation' });
}

test('Home shows its identity, author avatar, ten cards and retained links', async ({ page, request, isMobile }) => {
  await page.goto('./');
  await expect(page.locator('#loader .loading-word')).toHaveText('茶香氤氲时...');
  await expect(page.getByRole('heading', { name: '不驚茶坊', exact: true })).toBeVisible();
  await expect(page.locator('.post-wrapper')).toHaveCount(10);
  await expect(page.getByRole('heading', { name: 'Building My Digital Garden', exact: true })).toBeVisible();
  const nav = await navigation(page, isMobile);
  for (const [name, route] of [['归档', 'archives'], ['项目', 'projects'], ['关于', 'about'], ['友链', 'friend']]) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', `${root}${route}`);
    await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  }
  const sidebar = page.locator(isMobile ? '#mobile-nav' : '#sidebar');
  const author = sidebar.locator('.sidebar-author img');
  await expect(author).toHaveAttribute('alt', '不驚醴');
  await expect(author).toHaveAttribute('data-src', `${root}avatar/avatar.jpg`);
  expect((await request.get(`${root}avatar/avatar.jpg`)).status()).toBe(200);
  await expect(page.locator('#nav-rss-link')).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'Follow Me On GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/jingtine');
  await expect(sidebar.getByRole('link', { name: 'github', exact: true })).toHaveAttribute('href', 'https://github.com/jingtine');
  await expect(sidebar.getByRole('link', { name: 'email', exact: true })).toHaveAttribute('href', 'mailto:jingtineli@smail.nju.edu.cn');
  await expect(sidebar.getByRole('link', { name: 'rss', exact: true })).toHaveAttribute('href', `${root}atom.xml`);
});

test('sidebar renders left without taxonomy cards', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect(page.locator('#content')).toHaveClass(/sidebar-left/);
  const titles = await page.locator('#sidebar .sidebar-widget .widget-title').allTextContents();
  expect(titles.map(title => title.trim())).toEqual(['最新文章']);
  if (!isMobile) {
    const sidebarBox = await page.locator('#sidebar').boundingBox();
    const mainBox = await page.locator('#main').boundingBox();
    expect(sidebarBox.x).toBeLessThan(mainBox.x);
  }
  await page.goto('./about/');
  await expect(page.locator('#content')).toHaveClass(/sidebar-left/);
});

test('footer credits the 2026 site year to Jingtine', async ({ page }) => {
  await page.goto('./');
  const copyright = page.locator('#footer-info > div').first();
  await expect(copyright).toContainText('2026');
  await expect(copyright).not.toContainText('2020');
  await expect(copyright).toContainText('Jingtine');
  await expect(copyright).not.toContainText('不驚醴');
  await expect(copyright.locator('.footer-info-sep')).toHaveCount(1);
  await expect(page.locator('#sidebar .sidebar-author-name')).toHaveText('不驚醴');
});

test('home header shows the banner illustration', async ({ page, request }) => {
  await page.goto('./');
  const banner = page.locator('#header img').first();
  await expect(banner).toHaveAttribute('src', `${root}images/banner-illustration.webp`);
  expect((await request.get(`${root}images/banner-illustration.webp`)).status()).toBe(200);
});

test('friend page shows both link groups with safe external attributes', async ({ page }) => {
  await page.goto('./friend/');
  await expect(page.locator('h2', { hasText: '故友茶席' })).toBeVisible();
  await expect(page.locator('h2', { hasText: '常去之处' })).toBeVisible();
  await expect(page.locator('.friend-item-wrap')).toHaveCount(8);
  const card = page.locator('.friend-item-wrap').first();
  await expect(card.locator('.friend-name')).toHaveText('江畔絮语');
  await expect(card.locator('.friend-desc')).toContainText('一位文院学生思考的存档地');
  await expect(card.locator('img')).toHaveAttribute('data-src', 'https://water1i1y.org/img/dia.jpg');
  await expect(card.locator('a')).toHaveAttribute('href', 'https://water1i1y.org/');
  await expect(card.locator('a')).toHaveAttribute('target', '_blank');
  await expect(card.locator('a')).toHaveAttribute('rel', 'noopener nofollow noreferrer');
  const mellow = page.locator('.friend-item-wrap').filter({ hasText: 'MellowBlog' });
  await expect(mellow.locator('.friend-name')).toHaveText('MellowBlog');
  await expect(mellow.locator('.friend-desc')).toContainText('纪念的螺壳里，仍存在着那年夏天的海');
  await expect(mellow.locator('img')).toHaveAttribute('data-src', 'https://mellowwinds.com/icon/icon128.png');
  await expect(mellow.locator('a')).toHaveAttribute('href', 'https://mellowwinds.com/');
  await expect(mellow.locator('a')).toHaveAttribute('rel', 'noopener nofollow noreferrer');
  const luogu = page.locator('.friend-item-wrap').filter({ hasText: '洛谷' });
  await expect(luogu.locator('.friend-name')).toHaveText('洛谷');
  await expect(luogu.locator('.friend-desc')).toContainText('算法题的老地方，刷题与评测都在这儿。');
  await expect(luogu.locator('img')).toHaveAttribute('data-src', 'https://www.luogu.com.cn/favicon.ico');
  await expect(luogu.locator('a')).toHaveAttribute('href', 'https://www.luogu.com.cn/');
  await expect(luogu.locator('a')).toHaveAttribute('rel', 'noopener nofollow noreferrer');
  const placeholder = page.locator('.friend-item-wrap').filter({ hasText: '小百合图书馆' });
  await expect(placeholder.locator('img')).toHaveAttribute('data-src', /\/jingtine-agent-site\/images\/link-placeholder\.png$/);
  await expect(placeholder.locator('a')).toHaveAttribute('href', 'https://lilybre.lilystudio.space/');
});

test('serves the site favicon', async ({ page, request }) => {
  await page.goto('./');
  await expect(page.locator('link[rel="shortcut icon"]')).toHaveAttribute('href', `${root}images/site-favicon.ico`);
  expect((await request.get(`${root}images/site-favicon.ico`)).status()).toBe(200);
});

test('click firework respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('script[src*="mouse-firework"]')).toHaveCount(1);
  const reduced = await page.evaluate(() => {
    let called = false;
    window.firework = () => { called = true; };
    window.firework({});
    return called;
  });
  expect(reduced).toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  const normal = await page.evaluate(() => {
    let called = false;
    window.firework = () => { called = true; };
    window.firework({});
    return called;
  });
  expect(normal).toBe(true);
});

test('home subtitle types the tea poems and respects reduced motion', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('script[src*="typed.js"]')).toHaveCount(1);
  const strings = await page.evaluate(() => window.subtitleTypingConfig?.strings ?? []);
  expect(strings.length).toBe(7);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('#subtitle')).toContainText('山中何事？松花酿酒，春水煎茶。');
});

test('home sidebar hosts the playlist assets', async ({ page, request }) => {
  await page.goto('./');
  await expect(page.locator('#sidebar #aplayer')).toHaveCount(1);
  for (const slug of ['yi-jian-ru-gu', 'laoge', 'yumu', 'sudi', 'rumi', 'shanshui', 'qingming', 'qiandu', 'huanting', 'wenquan', 'mingzhi', 'ruyue']) {
    expect((await request.get(`${root}audio/${slug}.mp3`)).status(), `${slug}.mp3`).toBe(200);
    expect((await request.get(`${root}audio/${slug}.webp`)).status(), `${slug}.webp`).toBe(200);
  }
});

test('categories page shows the taxonomy and nested links resolve', async ({ page, isMobile }) => {
  await page.goto('./categories/');
  await expect(page.locator('.category-list')).toBeVisible();
  await expect(page.getByRole('link', { name: '工程', exact: true })).toBeVisible();
  const child = page.getByRole('link', { name: '站点建设', exact: true });
  await expect(child).toBeVisible();
  await child.click();
  await expect(page).toHaveURL(new RegExp(`${root}categories/`));
  await expect(page.getByRole('heading', { name: /4\s*0\s*4/ })).toHaveCount(0);
  await expect(page.locator('#main')).not.toBeEmpty();
  if (!isMobile) {
    await page.goto('./');
    await expect(page.locator('.post-categories-wrap')).toHaveCount(1);
    await expect(page.locator('.post-wrapper').first().locator('.post-sticky')).toHaveText('置顶');
  }
});

test('navigation excludes all retired experiences', async ({ page, isMobile }) => {
  await page.goto('./');
  const nav = await navigation(page, isMobile);
  await expect(nav.getByRole('link', { name: /论文|研究|Wiki|知识库|订阅阅读|问答助手|Status|留言/i })).toHaveCount(0);
});

test('post retains campus cover, reading controls and no comments', async ({ page, request, isMobile }) => {
  await page.goto('./');
  const card = page.locator('.post-wrap').filter({ has: page.getByRole('link', { name: 'GitHub Pages Development Notes', exact: true }) });
  const cover = card.getByRole('img', { name: 'GitHub Pages Development Notes', exact: true });
  await expect(cover).toHaveAttribute('data-src', `${root}images/default-campus-cover.webp`);
  await expect(cover).toHaveClass(/lazyload/);
  const coverResponse = await request.get(await cover.getAttribute('data-src'));
  expect(coverResponse.status()).toBe(200);
  expect(coverResponse.headers()['content-type']).toMatch(/^image\/webp/);
  await card.getByRole('link', { name: 'GitHub Pages Development Notes', exact: true }).click();
  await expect(page).toHaveURL(`${origin}${root}posts/github-pages-dev-notes/`);
  await expect(page.getByRole('heading', { name: 'GitHub Pages Development Notes', exact: true })).toBeVisible();
  await expect(page.locator('#header > img')).toHaveAttribute('src', `${root}images/default-campus-cover.webp`);
  await expect.poll(() => page.locator('#header > img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  if (!isMobile) {
    await expect(page.getByRole('complementary', { name: 'Sidebar' })).toBeVisible();
    await expect(page.locator('#sidebar .toc')).toBeVisible();
  } else {
    await expect(page.locator('#mobile-nav .toc')).toBeAttached();
  }
  await expect(page.locator('#article-nav').getByRole('link', { name: /^前一篇:/ })).toHaveAttribute('href', /^\/jingtine-agent-site\/posts\//);
  await expect(page.locator('#article-nav').getByRole('link', { name: /^后一篇:/ })).toHaveAttribute('href', /^\/jingtine-agent-site\/posts\//);
  await expect(page.locator('figure.highlight.html .code-copy')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  await expect(page.locator('.sidebar-top')).toHaveCSS('opacity', '1');
  await page.locator('.sidebar-top').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  const commentPattern = /giscus|waline|valine|twikoo|gitalk|disqus|utterances|beaudar/i;
  expect(await page.locator('script[src]').evaluateAll(scripts => scripts.map(script => script.src).join('\n'))).not.toMatch(commentPattern);
  await expect(page.locator('#comments, #comment, .comments, .comment-container, [data-repo-id], [id*="giscus"], [class*="giscus"], [id*="waline"], [id*="valine"], [id*="twikoo"], [id*="gitalk"], #disqus_thread, .utterances, .beaudar')).toHaveCount(0);
});

test('local search finds Agent posts beneath the project root', async ({ page }) => {
  await page.goto('./');
  await page.locator('#nav-search-btn').click();
  const input = page.locator('#search-text');
  await expect(input).toBeVisible();
  await input.fill('Agent');
  await input.press('Enter');
  const result = page.locator('#reimu-hits').getByRole('link', { name: 'Building My First AI Agent', exact: true });
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('href', /^\/jingtine-agent-site\/posts\//);
  await result.click();
  await expect(page.getByRole('heading', { name: 'Building My First AI Agent', exact: true })).toBeVisible();
});

test('theme control is keyboard reachable, cycles once per activation and persists on reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  const control = page.getByRole('button', { name: /^主题模式：/ });
  await expect(control).toBeVisible();
  await expect(control).toHaveAttribute('aria-pressed', 'false');
  await expect(control).toHaveAccessibleName(/跟随系统/);
  for (let step = 0; step < 30 && !await control.evaluate(element => element === document.activeElement); step++) {
    await page.keyboard.press('Tab');
  }
  await expect(control).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(control).toHaveAccessibleName(/浅色/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dark_mode'))).toBe('false');
  await expect(control).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(control).toHaveAccessibleName(/深色/);
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dark_mode'))).toBe('true');

  await page.reload();
  await expect(control).toHaveAccessibleName(/深色/);
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await control.click();
  await expect(control).toHaveAccessibleName(/跟随系统/);
  await expect(control).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dark_mode'))).toBe('auto');
});

test('light and dark contexts use different readable theme tokens', async ({ browser, isMobile }) => {
  const tokens = [];
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ ...devices[isMobile ? 'Pixel 7' : 'Desktop Chrome'], colorScheme });
    const diagnostics = await observeLocalSite(context);
    try {
      const page = await context.newPage();
      await page.goto(`${origin}${root}posts/github-pages-dev-notes/`);
      await expect(page.getByRole('heading', { name: 'GitHub Pages Development Notes', exact: true })).toBeVisible();
      // Reimu fades .article-inner for 0.3s after script.js applies the color scheme.
      // Wait for that transition to settle so the sampled colors are the final theme values.
      await page.waitForFunction(() => {
        const inner = document.querySelector('.article-inner');
        return inner && inner.getAnimations().every(animation => animation.playState !== 'running');
      });
      const style = await page.locator('.article-entry').evaluate(element => {
        const css = getComputedStyle(element);
        const rootStyle = getComputedStyle(document.documentElement);
        const luminance = color => {
          const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        const foreground = luminance(css.color);
        const background = luminance(getComputedStyle(element.closest('.article-inner')).backgroundColor);
        return { token: rootStyle.getPropertyValue('--red-1').trim(), contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05), fontSize: parseFloat(css.fontSize) };
      });
      expect(style.token).not.toBe('');
      expect(style.contrast, `${colorScheme} body-text contrast`).toBeGreaterThanOrEqual(4.5);
      expect(style.fontSize).toBeGreaterThanOrEqual(14);
      tokens.push(style.token);
      expect(diagnostics.failures).toEqual([]);
    } finally { await context.close(); }
  }
  expect(tokens[0]).not.toBe(tokens[1]);
});

test('retained page and taxonomy navigation resolves without 404s', async ({ page, isMobile }) => {
  for (const [name, route] of [['项目', 'projects'], ['关于', 'about'], ['友链', 'friend'], ['归档', 'archives'], ['分类', 'categories'], ['标签', 'tags']]) {
    await page.goto('./');
    const nav = await navigation(page, isMobile);
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${root}${route}/?$`));
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /4\s*0\s*4/ })).toHaveCount(0);
    await expect(page.locator('#main')).not.toBeEmpty();
  }
});

test('tags page renders a Butterfly-style multicolor cloud', async ({ page, isMobile }) => {
  const palette = ['#6d4fc4', '#3b6fc9', '#2f7d7a', '#b23a7a', '#b5542f', '#3f7f4f', '#5a5fc7', '#4a6b8a']
    .map(hex => {
      const value = parseInt(hex.slice(1), 16);
      return `rgb(${value >> 16 & 255}, ${value >> 8 & 255}, ${value & 255})`;
    });
  await page.goto('./tags/');
  const chips = page.locator('.tag-cloud-list a');
  await expect(chips).toHaveCount(18);
  await expect(chips.first()).toHaveAttribute('href', new RegExp(`^${root}tags/`));

  const styles = await chips.evaluateAll(elements => elements.map(element => {
    const css = getComputedStyle(element);
    const luminance = color => {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const foreground = luminance(css.color);
    const background = luminance(css.backgroundColor);
    return {
      radius: parseFloat(css.borderRadius),
      color: css.color,
      background: css.backgroundColor,
      fontSize: parseFloat(css.fontSize),
      contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
      after: getComputedStyle(element, '::after').content,
      shine: getComputedStyle(element, '::before').backgroundImage,
    };
  }));
  for (const style of styles) {
    expect(style.radius, `radius for ${style.background}`).toBe(7);
    expect(style.color, `text color for ${style.background}`).toBe('rgb(255, 255, 255)');
    expect(palette, `palette membership for ${style.background}`).toContain(style.background);
    expect(style.contrast, `contrast for ${style.background}`).toBeGreaterThanOrEqual(4.5);
    expect(style.after).toBe('none');
    expect(style.shine).toContain('gradient');
  }
  expect(new Set(styles.map(style => style.fontSize)).size).toBe(3);

  // The enabled sidebar widgets push the first chip to tab stop 44 on desktop.
  const tabBudget = 60;
  for (let step = 0; step < tabBudget && !await chips.first().evaluate(element => element === document.activeElement); step++) {
    await page.keyboard.press('Tab');
  }
  await expect(chips.first()).toBeFocused();
  // `transition: all` animates the focus ring, so wait for it to settle first.
  await expect.poll(() => chips.first().evaluate(element => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2);
  const outline = await chips.first().evaluate(element => ({
    style: getComputedStyle(element).outlineStyle,
    width: parseFloat(getComputedStyle(element).outlineWidth),
  }));
  expect(outline.style).toBe('solid');
  expect(outline.width).toBeGreaterThanOrEqual(2);

  if (isMobile) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const scaled = await chips.first().evaluate(element => ({
      zoom: getComputedStyle(document.querySelector('.tag-cloud-list')).zoom,
      shine: getComputedStyle(element, '::before').display,
    }));
    expect(scaled.zoom).toBe('0.85');
    expect(scaled.shine).toBe('none');
  } else {
    await chips.first().hover();
    await expect.poll(() => chips.first().evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none');
  }
});

test('Pixel viewport has no horizontal overflow and keyboard-reachable navigation', async ({ page }) => {
  await page.setViewportSize(devices['Pixel 7'].viewport);
  await page.goto('./');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  let focusedId;
  for (let step = 0; step < 16 && focusedId !== 'main-nav-toggle'; step++) {
    await page.keyboard.press('Tab');
    focusedId = await page.evaluate(() => document.activeElement.id);
  }
  expect(focusedId, 'Mobile menu toggle must be reachable with Tab').toBe('main-nav-toggle');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/mobile-nav-on/);
  const about = page.locator('#mobile-nav').getByRole('link', { name: '关于', exact: true });
  for (let step = 0; step < 30 && !await about.evaluate(link => link === document.activeElement); step++) await page.keyboard.press('Tab');
  await expect(about).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${root}about/?$`));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('reduced motion limits animated article elements to 0.01ms', async ({ page }) => {
  const durationsInMs = value => value.split(',').map(entry => parseFloat(entry) * (entry.trim().endsWith('ms') ? 1 : 1000));
  const article = page.locator('.article-inner[data-aos="fade-up"]');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('posts/github-pages-dev-notes/');
  await expect(article).toBeVisible();
  const normalTransitions = durationsInMs(await article.evaluate(element => getComputedStyle(element).transitionDuration));
  expect(normalTransitions.length).toBeGreaterThan(0);
  for (const duration of normalTransitions) expect(duration).toBeGreaterThan(0.01);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(article).toBeVisible();
  const reduced = await article.evaluate(element => ({
    animationDuration: getComputedStyle(element).animationDuration,
    transitionDuration: getComputedStyle(element).transitionDuration,
  }));
  const reducedAnimations = durationsInMs(reduced.animationDuration);
  expect(reducedAnimations.length).toBeGreaterThan(0);
  for (const duration of reducedAnimations) expect(duration).toBeLessThanOrEqual(0.01);
  const reducedTransitions = durationsInMs(reduced.transitionDuration);
  expect(reducedTransitions.length).toBeGreaterThan(0);
  for (const duration of reducedTransitions) expect(duration).toBeLessThanOrEqual(0.01);
});
