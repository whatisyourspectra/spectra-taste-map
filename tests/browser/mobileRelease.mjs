// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || undefined});
try {
 const findings=[];
 for(const scenario of ['enriching','quota','growing']) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(({scenario})=>{
   const tracks=[{id:'a',name:'A',artists:'Artist',genres:['ambient'],energy:.4}];
   sessionStorage.setItem('spectra:taste:v5',JSON.stringify({tracks,mapId:'review',stats:{backgroundEnriching:scenario!=='quota'},pendingSourceList:scenario==='growing'?[{artist:'Artist',title:'A'},{artist:'Artist',title:'B'}]:null,featuresSource:'lastfm'}));
   const key='spectra:reflection:v1:guest:review';
   localStorage.setItem(key,JSON.stringify({version:1,decisions:[],snapshot:{at:100,ids:['a'],decisions:[],avatar:{nodes:[],edges:[],orbits:[],regions:[]}}}));
   if(scenario==='quota') {const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(!window.allowSave && k.startsWith('spectra:reflection:'))throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v);};}
  },{scenario});
  await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/,r=>r.fulfill({contentType:'application/javascript',body:'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}'}));
  await page.route('**/api/discover?**',r=>r.fulfill({json:{tracks:[]}}));
  await page.route('**/api/taste/enrich',async r=>{await new Promise(resolve=>setTimeout(resolve,300));return r.fulfill({json:{tracks:[{id:'a',name:'A',artists:'Artist',genres:['ambient']},{id:'b',name:'B',artists:'Artist',genres:['ambient']}],featuresSource:'lastfm'}});});
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5188'}/taste-map/mobile`);
  await page.locator('.daily-spectra').waitFor();
  await page.waitForTimeout(100);
  if(scenario==='enriching'){
   const lost=await page.evaluate(()=>JSON.parse(localStorage.getItem('spectra:reflection:v1:guest:review')).snapshot===null);
   assert.equal(lost,false); findings.push({scenario,previousSnapshotOverwrittenWithNull:lost});
  }else if(scenario==='quota'){
   await page.getByRole('button',{name:'오늘의 음악 펼쳐보기'}).click();
   await page.waitForFunction(()=>!document.querySelector('.daily-reveal .daily-primary').disabled);
   await page.getByRole('button',{name:'이 묶음을 나의 스펙트라에 담기'}).click();
   await page.waitForTimeout(100);
   const warning=page.locator('.daily-save-error');
   assert.equal(await warning.isVisible(),true);
   assert.equal(await page.getByRole('button',{name:'나의 스펙트라에 담았어요 ✓'}).count(),0);
   await page.evaluate(()=>{window.allowSave=true;});
   await page.getByRole('button',{name:'묶음 저장 다시 시도',exact:true}).click();
   await page.getByRole('button',{name:'나의 스펙트라에 담았어요 ✓'}).waitFor();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spectra:reflection:v1:guest:review')).decisions.length),1);
   findings.push({scenario,retrySaved:true,storageErrorVisible:true});
  }
  if(scenario==='growing'){
   await page.waitForFunction(()=>document.querySelector('.tmm-library-count')?.textContent.includes('2곡'));
   await page.getByRole('button',{name:'오늘의 음악 펼쳐보기'}).click();
   await page.waitForFunction(()=>!document.querySelector('.daily-reveal .daily-primary').disabled);
   assert.equal(await page.locator('.daily-track').count(),2);findings.push({scenario,latestLibraryUsed:true});
  }
  await page.close();
 }
 console.log(JSON.stringify(findings));
} finally {await browser.close();}
