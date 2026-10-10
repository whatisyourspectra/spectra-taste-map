// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE || undefined});
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5188';
const findings=[];
try {
 for (const mobile of [false,true]) {
  const page=await browser.newPage({viewport: mobile ? {width:390,height:844}:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/,r=>r.fulfill({contentType:'application/javascript',body:'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}'}));
  await page.route('**/api/**',r=>r.fulfill({json:{tracks:[]}}));
  await page.goto(`${baseUrl}/`);
  await page.locator('.llp-hero-title').waitFor();
  assert.equal(await page.locator('body').innerText().then(text=>text.includes('무드')),false);
  await page.locator('.llp-mobile-qr img').waitFor();
  await page.getByRole('button',{name:'곡으로 직접 체험 ↗'}).click();
  await page.locator('.lj-stage').scrollIntoViewIfNeeded();
  await page.locator('.lj-bubble').nth(2).click();
  assert.ok(await page.locator('.lj-track-detail strong').innerText());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  if(mobile) {
   await page.goto(`${baseUrl}/mobile-start`);
   await page.waitForURL('**/taste-map/mobile');
  } else {
   await page.locator('.llp-hero-cta-group .llp-btn-primary').click();
   await page.waitForURL('**/taste-map');
  }
  await page.locator('.map-guide-panel').waitFor();
  const count=mobile?4:5;
  for(let i=0;i<count;i++) {
   await page.waitForTimeout(450);
   assert.ok(await page.locator('.map-guide-highlight').count());
   if(i > 0) {
    const geometry = await page.evaluate(() => {
     const panel = document.querySelector('.map-guide-panel').getBoundingClientRect();
     const target = document.querySelector('.map-guide-highlight').getBoundingClientRect();
     return { inside: panel.left >= 0 && panel.top >= 0 && panel.right <= innerWidth && panel.bottom <= innerHeight,
      separate: panel.bottom <= target.top || panel.top >= target.bottom || panel.right <= target.left || panel.left >= target.right,
      anchored: Boolean(document.querySelector('.map-guide-panel').dataset.side) };
    });
    assert.deepEqual(geometry, {inside:true,separate:true,anchored:true});
   }
   await page.locator('.map-guide-next').click();
  }
  await page.locator('.map-guide-reopen').waitFor();
  await page.locator('.map-guide-reopen').click();
  await page.locator('.map-guide-panel').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.map-guide-reopen').waitFor();
  await page.reload();
  await page.locator('.map-guide-reopen').waitFor();
  assert.equal(await page.locator('.map-guide-panel').count(),0);
  assert.deepEqual(errors,[]);
  findings.push({mobile,guideSteps:count,noOverflow:true,noPageErrors:true,guidePersists:true});
  await page.close();
 }
 console.log(JSON.stringify(findings));
} finally {await browser.close();}
