const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch();const errors=[];const results=[];
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['index','about','projects','blog','papers','wiki','reader','assistant','status','contact','knowledge','library']){
  await page.goto('http://127.0.0.1:8082/'+route+'.html');await page.waitForTimeout(250);
  await page.screenshot({path:`artifacts/redesign/after/${route}-audit.png`});
  await page.evaluate(()=>document.body.style.zoom='2');
  results.push({route,zoom:'CSS 200% reflow',fits:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)});
 }
 await page.setViewportSize({width:1024,height:900});await page.goto('http://127.0.0.1:8082/index.html');await page.screenshot({path:'artifacts/redesign/after/home-1024.png',fullPage:true});
 await page.route('**/assets/images/**',r=>r.abort());await page.reload();
 results.push({imageFailure:await page.locator('h1').isVisible() && await page.locator('.panel-intro .btn').first().isVisible()});
 const palette=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return Object.fromEntries(['paper','surface','ink','muted','accent','accent-ink','accent-soft','blue','blue-soft','rule','success','warning','danger'].map(x=>[x,s.getPropertyValue('--'+x).trim()]));});
 function lum(hex){const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
 const contrasts=[];for(const [fg,bg] of [['ink','surface'],['muted','paper'],['muted','surface'],['accent','surface'],['accent-ink','accent-soft'],['blue','blue-soft'],['rule','surface'],['success','surface'],['warning','surface'],['danger','surface']]){let a=lum(palette[fg]),b=lum(palette[bg]);contrasts.push({fg,bg,ratio:Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2))});}
 fs.writeFileSync('artifacts/redesign/audit.json',JSON.stringify({errors,results,contrasts},null,2));
 await browser.close();
})();
