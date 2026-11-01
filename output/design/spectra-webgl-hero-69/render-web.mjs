import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium} from '/private/tmp/spectra-mobile-hero-tools/node_modules/playwright/index.mjs';
import {getCombinedDemoTracks} from '../../../src/taste/demoUniverses.js';

const out=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(out,'../../..');
const tracks=getCombinedDemoTracks();
if(tracks.length!==69||new Set(tracks.map(t=>t.id)).size!==69)throw Error('Expected the complete, unique 69-track demo.');
const errors=[],audit={date:'2026-11-01',tracks:tracks.length,artists:new Set(tracks.map(t=>t.artists)).size,localArtwork:tracks.filter(t=>t.coverUrl.startsWith('/demo-covers/')).length,proceduralArtwork:tracks.filter(t=>t.coverUrl.startsWith('data:')).length,uiModifications:false,duplicatedTracks:0,account:null,library:tracks.map(({id,name,artists})=>({id,name,artists})),captures:[],renders:[]};
const server=await createServer({server:{host:'127.0.0.1',port:5195,strictPort:true}});let browser;
try{
 await server.listen();console.log('Vite ready / port 5195.');
 browser=await chromium.launch({headless:true,timeout:20000,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--hide-scrollbars','--enable-unsafe-swiftshader']});
 if(!process.argv.includes('--reuse-screens')){
 const context=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:4,isMobile:true,hasTouch:true,locale:'en-US',colorScheme:'dark',reducedMotion:'reduce'});
 await context.addInitScript(tracks=>{localStorage.setItem('spectra-tastemap-lang-v1','en');sessionStorage.setItem('spectra:taste:v5',JSON.stringify({tracks,mapId:'full-demo-69-render',featuresSource:'spotify',stats:{isDemo:true,fetchedCount:tracks.length}}));},tracks);
 await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/,r=>r.fulfill({contentType:'application/javascript',body:'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}'}));
 await context.route('**/api/**',r=>r.fulfill({json:{tracks:[]}}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5195/taste-map?lang=en',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('.public-map-peek-tracks > button').first().waitFor({timeout:15000});
 await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]));
 await page.getByRole('button',{name:'Constellation',exact:true}).click();await page.waitForTimeout(350);
 const capture=async(name,kind)=>{await page.screenshot({path:path.join(out,'sources',name),timeout:20000});const overview=name.includes('overview');audit.captures.push({name,kind,viewport:{width:430,height:932},deviceScaleFactor:4,pixels:{width:1720,height:3728},...(overview?{renderedOverviewNodes:await page.locator('.mtm-overview-dialog .lc-star').count()}:{visibleStars:await page.locator('.public-map-star').count()}),libraryLabel:await page.locator('.mtm-intro h1').textContent()});console.log('CAPTURED',name,audit.captures.at(-1));};
 await capture('mobile-map-69.png','Unmodified actual app, all 69 demo tracks, constellation view');
 await page.locator('.public-map-peek-tracks > button').filter({hasText:'Space Song'}).click();await page.locator('.public-map-track h2').filter({hasText:'Space Song'}).waitFor();await page.waitForTimeout(350);
 await capture('mobile-selected-69.png','Unmodified actual app, Space Song selected');
 await page.getByRole('button',{name:'Explore my taste',exact:true}).click();await page.locator('.mtm-overview-dialog[open]').waitFor();
 const space=page.locator('.tmm-space-viewport');await space.focus();for(let i=0;i<3;i++)await space.press('+');await page.waitForTimeout(250);
 await capture('mobile-overview-69.png','Unmodified actual app, 3D overview, keyboard zoom to 1.3');
 await context.close();
 }else{audit.captures=JSON.parse(await fs.readFile(path.join(out,'capture-render-audit.json'),'utf8')).captures;console.log('Using captured actual UI screenshots.');}
 const film=await browser.newContext({viewport:{width:2000,height:1500},deviceScaleFactor:3,colorScheme:'dark'});
 const frame=await film.newPage();frame.on('pageerror',e=>{errors.push(e.message);console.error('WEBGL ERROR',e.message);});
 frame.on('console',m=>{if(m.text().includes('SPECTRA_WEBGL'))console.log(m.text());});
 const url='http://127.0.0.1:5195/output/design/spectra-webgl-hero-69/studio.html';
 for(const [name,suffix]of [['01-webgl-hero-transparent','?alpha'],['02-webgl-hero-poster-dark','']]){
  await frame.goto(url+suffix,{waitUntil:'domcontentloaded',timeout:30000});
  await frame.waitForFunction(()=>window.__STUDIO__?.ready,{},{timeout:60000});
  await frame.evaluate(()=>window.__STUDIO__.pose(0,0));
  const {data,stats,renderer}=await frame.evaluate(()=>({data:window.__STUDIO__.export(),stats:window.__STUDIO__.stats(),renderer:window.__STUDIO__.renderer}));
  await fs.writeFile(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));
  audit.renders.push({name,pixels:{width:6000,height:4500},renderer,stats});console.log('RENDERED',name,stats);
  // Render preview at normal browser pixel ratio, preserving the same camera.
  await frame.setViewportSize({width:1400,height:1050});
  await frame.evaluate(()=>{window.dispatchEvent(new Event('resize'));window.__STUDIO__.pose(0,0);});
  const preview=await frame.evaluate(()=>{const original=document.querySelector('canvas');const c=document.createElement('canvas');c.width=1400;c.height=1050;c.getContext('2d').drawImage(original,0,0,1400,1050);return c.toDataURL('image/png');});
  await fs.writeFile(path.join(out,name+'-preview.png'),Buffer.from(preview.split(',')[1],'base64'));
  await frame.setViewportSize({width:2000,height:1500});
 }
 audit.errors=errors;await fs.writeFile(path.join(out,'capture-render-audit.json'),JSON.stringify(audit,null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('DONE: 69 tracks, real UI, WebGL hardware, two 6000 × 4500 renders.');
}finally{await browser?.close();await server.close();}
