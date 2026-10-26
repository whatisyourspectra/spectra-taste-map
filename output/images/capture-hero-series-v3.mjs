import {chromium} from '/tmp/spectra-brand-render/node_modules/playwright/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir='output/images/hero-series-v3/sources';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-unsafe-swiftshader','--force-color-profile=srgb']});
const audit=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:4096/1440,locale:'ko-KR'});
 page.setDefaultTimeout(12000);
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
 await page.addInitScript(()=>{localStorage.setItem('spectra:map-guide:v2:desktop','seen');});
 await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
 const seeded=await page.evaluate(async()=>{
  const {getCombinedDemoTracks}=await import('/src/taste/demoUniverses.js');
  const {getDemoCover}=await import('/src/taste/demoCoverAssets.js');
  const tracks=getCombinedDemoTracks().filter(t=>getDemoCover(t.artists,t.name)).map(t=>{
   const url=getDemoCover(t.artists,t.name);return {...t,coverUrl:url,albumArt:url,imageUrl:url};
  });
  for(const t of tracks){const image=new Image();image.src=t.coverUrl;await image.decode();if(image.naturalWidth<100)throw Error('Invalid cover '+t.name);}
  const data={tracks,mapId:'verified-cover-demo',featuresSource:'spotify-genres',stats:{isDemo:true,demoUniverse:null,fetchedCount:tracks.length,totalAvailable:tracks.length,processedCount:tracks.length,failedCount:0,backgroundEnriching:false},updatedAt:new Date().toISOString()};
  sessionStorage.setItem('spectra:taste:v5:demo:guest',JSON.stringify(data));
  return tracks.map(t=>({id:t.id,name:t.name,artists:t.artists,cover:t.coverUrl}));
 });
 console.log('VERIFIED LIBRARY',seeded.length);
 await page.goto('http://127.0.0.1:5173/taste-map',{waitUntil:'domcontentloaded'});
 await page.locator('.tm-bubble-item').first().waitFor();
 await page.waitForTimeout(5500);

 async function verify(name){
  const result=await page.evaluate(async()=>{
   const elements=[...document.querySelectorAll('.tm-bubble,.tm-constellation-cover,img')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>5&&r.height>5&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&s.visibility!=='hidden'&&s.display!=='none';});
   const urls=[...new Set(elements.flatMap(e=>e.tagName==='IMG'?[e.currentSrc||e.src]:[...getComputedStyle(e).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map(m=>m[1])).filter(Boolean))];
   const results=[];
   for(const url of urls){try{const i=new Image();i.src=url;await i.decode();const c=document.createElement('canvas');c.width=c.height=24;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(i,0,0,24,24);let variation=null;try{const pixels=ctx.getImageData(0,0,24,24).data;let sum=0,sq=0,n=0;for(let k=0;k<pixels.length;k+=4){const v=(pixels[k]+pixels[k+1]+pixels[k+2])/3;sum+=v;sq+=v*v;n++;}variation=Math.sqrt(Math.max(0,sq/n-(sum/n)**2));}catch(e){if(e.name!=='SecurityError')throw e;}results.push({url,width:i.naturalWidth,variation,ok:i.naturalWidth>20&&(variation===null||variation>3)});}catch(e){results.push({url,ok:false,error:e.message});}}
   const missing=[...document.querySelectorAll('.cv-cover')].filter(e=>{const r=e.getBoundingClientRect();return r.width>5&&r.height>5&&r.top<innerHeight&&r.bottom>0&&!e.querySelector('img');}).length;
   if(missing)results.push({ok:false,error:`${missing} fallback covers present`});
   return {results,bubbleCount:document.querySelectorAll('.tm-bubble-item').length,body:document.body.innerText.slice(-1800)};
  });
  audit.push({name,...result});writeFileSync(`${dir}/capture-audit.json`,JSON.stringify(audit,null,2));
  if(result.results.some(r=>!r.ok))throw Error('Unloaded/blank cover detected for '+name);
  console.log('COVER AUDIT',name,result.results.length,'loaded; bubbles',result.bubbleCount);
 }
 await verify('01-map');
 await page.mouse.move(1400,700);
 await page.screenshot({path:`${dir}/01-map-source.png`});
 await page.locator('.tm-map-tag-chip').filter({hasText:'드림팝 & 인디 별자리'}).evaluate(e=>e.click());
 await page.waitForTimeout(1100);
 await page.getByRole('button',{name:/Breathe Deeper — Tame Impala/}).click({force:true});
 await page.waitForTimeout(1000);
 await verify('02-track-exploration');
 await page.screenshot({path:`${dir}/track-detail-extra.png`});
 await page.locator('.ccp-voyage-launch-btn').click();
 await page.locator('.cv-explore-toggle').waitFor();
 if(await page.locator('.cv-cruise-toggle-btn').getAttribute('aria-label')==='일시정지')await page.locator('.cv-cruise-toggle-btn').click();
 await page.waitForTimeout(1100);
 console.log('VOYAGE',(await page.locator('body').innerText()).slice(-2200));
 await verify('03-constellation');
 await page.screenshot({path:`${dir}/03-constellation-source.png`});
 await page.locator('.cv-explore-toggle').click();
 await page.locator('.cv-recommendation').first().waitFor({timeout:25000});
 await page.waitForTimeout(4000);
 console.log('DISCOVERY',(await page.locator('body').innerText()).slice(-3200));
 await verify('02-music-exploration');
 await page.screenshot({path:`${dir}/02-explore-source.png`});
 writeFileSync(`${dir}/verified-demo-tracks.json`,JSON.stringify(seeded,null,2));
}finally{await browser.close();}
