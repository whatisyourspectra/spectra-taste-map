import {chromium} from '/tmp/spectra-brand-render/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-unsafe-swiftshader','--force-color-profile=srgb']});
try{
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2,locale:'ko-KR'});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
await page.addInitScript(()=>{localStorage.setItem('spectra:map-guide:v1:desktop','seen');});
await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
await page.locator('.llp-demo-launch-btn').first().click();
await page.waitForURL('**/taste-map');
await page.waitForTimeout(6500);
await page.locator('.map-guide-dismiss').click({timeout:2500}).catch(()=>{});
await page.getByText('드림팝 & 인디 별자리',{exact:true}).first().click({timeout:2500}).catch(()=>{});
await page.waitForTimeout(1800);
console.log('BUBBLES',await page.locator('.tm-bubble-item').count());
console.log('TEXT',(await page.locator('body').innerText()).slice(0,2000));
await page.screenshot({path:'output/images/spectra-service-map-source.png'});
if(await page.locator('.tm-bubble-item').count()){
 await page.locator('.tm-bubble-item').nth(5).click({force:true});
 await page.waitForTimeout(800);
 await page.screenshot({path:'output/images/spectra-service-selected-source.png'});
}
}finally{await browser.close();}
