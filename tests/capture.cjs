const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const phase = process.argv[2] || 'after';
  const out = path.resolve('artifacts/redesign', phase);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    const articles = JSON.parse(fs.readFileSync('articles/index.json', 'utf8'));
    for (const [name, route] of Object.entries({home:'index.html', projects:'projects.html', article:'article.html?slug='+articles[0].slug, assistant:'assistant.html'})) {
      await page.goto('http://127.0.0.1:8082/'+route);
      await page.waitForTimeout(600);
      if (name === 'assistant') { await page.locator('#assistant-input').fill('Agent'); await page.locator('#assistant-ask').click(); await page.waitForTimeout(1000); }
      await page.screenshot({path:path.join(out, `${name}-${width}.png`),fullPage:true});
    }
    await page.close();
  }
  fs.writeFileSync(path.join(out,'errors.json'),JSON.stringify(errors,null,2));
  await browser.close();
})();
