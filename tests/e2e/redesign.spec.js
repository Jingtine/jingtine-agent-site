const {test, expect} = require('@playwright/test');
const routes=['index','about','projects','blog','papers','wiki','reader','assistant','status','contact','knowledge','library','article'];
test('homepage uses varied paper accents and hand-drawn editorial details',async({page})=>{
  await page.goto('/index.html');
  const backgrounds=await page.locator('.panel-profile,.panel-projects,.panel-posts,.panel-research,.panel-wiki,.panel-reader,.panel-tools').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));
  expect(new Set(backgrounds).size).toBeGreaterThanOrEqual(5);
  const details=await page.locator('.panel-posts,.panel-wiki,.panel-reader').evaluateAll(els=>els.map(el=>getComputedStyle(el,'::before').content));
  expect(details.every(content=>content && content!=='none')).toBe(true);
  const topOffsets=await page.locator('.panel-projects,.panel-posts').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));
  expect(Math.abs(topOffsets[0]-topOffsets[1])).toBeGreaterThanOrEqual(10);
});
test('small editorial labels retain readable contrast on colored paper',async({page})=>{
  await page.goto('/index.html');
  const ratio=await page.locator('.panel-wiki .panel-number').evaluate(el=>{
    const parse=value=>value.match(/\d+/g).slice(0,3).map(Number);
    const luminance=rgb=>rgb.map(value=>value/255).map(value=>value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4)).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
    const fg=luminance(parse(getComputedStyle(el).color));
    const bg=luminance(parse(getComputedStyle(el.closest('.paper-panel')).backgroundColor));
    return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
test('social icons live below the sidebar while no-JS footer links remain available',async({page,browser})=>{
  await page.goto('/index.html');
  const links=page.locator('.nav .nav-social-links a');
  await expect(links).toHaveCount(4);
  await expect(links.first()).toHaveClass(/footer-icon-link/);
  await expect(links.first().locator('svg')).toHaveCount(1);
  await expect(links.first()).toHaveAttribute('aria-label','GitHub');
  await expect(page.locator('.nav-links a')).toHaveCount(8);
  await expect(page.locator('.nav-links a',{hasText:'Status'})).toHaveCount(0);
  await expect(page.locator('.footer .footer-links')).toHaveCount(0);
  await expect(page.locator('.nav-social-links a[aria-label="Status"]')).toHaveAttribute('href','status.html');
  const iconMetrics=await links.evaluateAll(items=>items.map(item=>({
    width:item.getBoundingClientRect().width,
    height:item.getBoundingClientRect().height,
    background:getComputedStyle(item).backgroundColor
  })));
  expect(iconMetrics.every(item=>item.width<=34&&item.height<=34)).toBe(true);
  expect(iconMetrics.every(item=>item.background==='rgba(0, 0, 0, 0)')).toBe(true);

  const context=await browser.newContext({javaScriptEnabled:false});
  const fallback=await context.newPage();
  await fallback.goto('/index.html');
  await expect(fallback.locator('.footer-links')).toContainText('GitHub');
  await expect(fallback.locator('#nav-links a')).toHaveCount(8);
  await context.close();
});
test('failed Wiki navigation does not retain previous article TOC',async({page})=>{
  await page.goto('/wiki.html');
  await page.locator('#wiki-article-list .article-card').first().click();
  await expect(page.locator('.reading-toc')).toBeVisible();
  await page.locator('#wiki-back').click();
  await page.route('**/content/wiki/**',r=>r.abort());
  await page.locator('#wiki-article-list .article-card').nth(1).click();
  await expect(page.locator('#wiki-detail-body')).toContainText('Failed');
  await expect(page.locator('.reading-toc')).toHaveCount(0);
});
for(const width of [360,390,768,1024,1440]) test(`all routes at ${width}px retain landmarks and fit`,async({page})=>{
  await page.setViewportSize({width,height:900});
  for(const route of routes){
    await page.goto('/'+route+'.html'+(route==='article'?'?slug=hello-world':''));
    await page.waitForTimeout(100);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
  }
});
test('reading TOC, keyboard Wiki, wide content and no-JS navigation',async({page,browser})=>{
  await page.goto('/article.html?slug=hello-world');
  await expect(page.locator('.reading-toc')).toBeVisible();
  await page.locator('.reading-toc summary').click();
  await page.locator('.reading-toc a').first().click();
  expect(new URL(page.url()).hash).toBeTruthy();
  await page.setViewportSize({width:360,height:800});
  await page.locator('.article-detail').evaluate(el=>{
    const pre=document.createElement('pre');pre.textContent='long-code-'.repeat(100);el.append(pre);
    const table=document.createElement('table');const row=table.insertRow();for(let i=0;i<20;i++)row.insertCell().textContent='wide table';el.append(table);
    const p=document.createElement('p');p.textContent='https://example.com/'+ 'long-url'.repeat(100);el.append(p);
  });
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:800}});
  const fallback=await context.newPage();await fallback.goto('/index.html');
  await expect(fallback.locator('#nav-links a')).toHaveCount(8);
  await expect(fallback.locator('#nav-links a').last()).toBeVisible();
  await context.close();
  await page.goto('/wiki.html');
  await page.locator('#wiki-article-list .article-card').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#wiki-detail-body h2').first()).toBeVisible();
  const wikiURL=page.url();
  await page.locator('.reading-toc summary').click();
  await page.locator('.reading-toc a').last().click();
  expect(page.url()).toBe(wikiURL);
  await expect(page.locator('#wiki-detail-view')).toBeVisible();
});
test('Blog and Wiki reading surfaces use the available desktop width',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/article.html?slug=hello-world');
  await expect(page.locator('.article-detail')).toBeVisible();
  expect((await page.locator('.article-detail').boundingBox()).width).toBeGreaterThanOrEqual(880);

  await page.goto('/wiki.html');
  await page.locator('#wiki-article-list .article-card').first().click();
  await expect(page.locator('#wiki-detail-body')).toBeVisible();
  expect((await page.locator('#wiki-detail-body').boundingBox()).width).toBeGreaterThanOrEqual(880);
});
test('Reader filtering, keyboard source and source links',async({page})=>{
  await page.goto('/reader.html');const cards=page.locator('#source-cards [role="button"]');await expect(cards.first()).toBeVisible();
  await page.locator('#source-search').fill('zzzznomatch');await expect(page.locator('#source-feedback')).toContainText('没有');
  await page.locator('#source-clear').click();await cards.first().focus();await page.keyboard.press('Enter');
  await expect(page.locator('#reader-list a').first()).toHaveAttribute('href',/^https:\/\//);
});
test('Status presents public GitHub activity and safe repository links',async({page})=>{
  await page.route('**/public/data/github-stats.json',route=>route.fulfill({json:{
    generated:'2026-09-10T00:00:00+08:00',profile:{login:'Jingtine',url:'https://github.com/Jingtine',publicRepos:12,followers:34},
    summary:{totalContributions:9,activeDays:3,busiestDay:{date:'2026-09-02',count:5},stars:11},
    months:[{key:'2026-08',label:'Aug',count:4},{key:'2026-09',label:'Sep',count:5}],
    calendar:[{date:'2026-09-01',count:3,level:2},{date:'2026-09-02',count:5,level:4},{date:'2026-09-03',count:1,level:1}],
    repositories:[{name:'jingtine-agent-site',url:'https://github.com/Jingtine/jingtine-agent-site',description:'Personal knowledge archive',stars:7,forks:2,language:'JavaScript',updatedAt:'2026-09-09T00:00:00Z'}]
  }}));
  await page.goto('/status.html');
  await expect(page.getByRole('heading',{name:'GitHub, by the numbers.'})).toBeVisible();
  await expect(page.locator('[data-github-stat="repositories"]')).toContainText('12');
  await expect(page.locator('[data-github-stat="contributions"]')).toContainText('9');
  await expect(page.locator('.github-month-bar')).toHaveCount(2);
  await expect(page.locator('.github-calendar-day')).toHaveCount(3);
  const project=page.getByRole('link',{name:/jingtine-agent-site/});
  await expect(project).toHaveAttribute('href','https://github.com/Jingtine/jingtine-agent-site');
  await expect(project).toHaveAttribute('rel','noopener noreferrer');
});
for(const kind of ['empty','failure']) test(`Status and Reader ${kind} states`,async({page})=>{
  for(const [route,file,target] of [['status','status','#status-dashboard'],['reader','rss-items','#source-cards']]){
    await page.route('**/public/data/'+file+'.json',r=>kind==='failure'?r.abort():r.fulfill({json:file==='status'?{}:{items:[]}}));
    await page.goto('/'+route+'.html');
    await expect(page.locator(target)).toContainText(kind==='failure'?'Failed':route==='status'?'暂无':'No sources');
    if(kind==='failure')await expect(page.getByRole('button',{name:'重试'})).toBeVisible();
    await page.screenshot({path:`artifacts/redesign/after/${route}-${kind}.png`,fullPage:true});
    await page.unrouteAll();
  }
});
test('Assistant no results and empty data',async({page})=>{
  await page.goto('/assistant.html');await expect(page.locator('#assistant-ask')).toBeEnabled();
  await page.locator('#assistant-input').fill('zzzznomatch');await page.locator('#assistant-ask').click();
  await expect(page.locator('#assistant-answer-text')).toContainText('没有足够信息');
  await page.route('**/public/data/wiki.json',r=>r.fulfill({json:{pages:[]}}));await page.reload();
  await expect(page.locator('#assistant-feedback')).toContainText('暂无');
});
test('menu is accessible on mobile and tablet and Escape preserves unrelated focus', async ({page}) => {
  for (const width of [390,1024]) {
    await page.setViewportSize({width,height:800});
    await page.goto('/assistant.html');
    const toggle=page.locator('.nav-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    await expect(page.locator('#nav-links')).toBeHidden();
    await toggle.click();
    await expect(page.locator('#nav-links a')).toHaveCount(8);
    await expect(page.locator('.nav-social-links')).toBeVisible();
    await expect(page.locator('[aria-current="page"]')).toHaveText('Assistant');
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(page.locator('#nav-links')).toBeHidden();
    await page.locator('#assistant-input').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#assistant-input')).toBeFocused();
  }
});
test('assistant reports index failure and offers retry', async ({page}) => {
  await page.route('**/public/data/wiki.json',r=>r.abort());
  await page.goto('/assistant.html');
  await expect(page.locator('#assistant-feedback')).toContainText('加载失败');
  await expect(page.getByRole('button',{name:'重试'})).toBeVisible();
});
test('assistant has keyboard accessible sources and empty input feedback',async({page})=>{
  await page.goto('/assistant.html');
  await expect(page.locator('#assistant-ask')).toBeEnabled();
  await page.locator('#assistant-ask').click();
  await expect(page.locator('#assistant-feedback')).toContainText('输入');
  await page.locator('#assistant-input').fill('Agent');
  await page.locator('#assistant-ask').click();
  await expect(page.locator('#assistant-source-list a').first()).toBeVisible();
});
