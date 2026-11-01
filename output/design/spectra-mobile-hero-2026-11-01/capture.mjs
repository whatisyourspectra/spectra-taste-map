import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '/private/tmp/spectra-mobile-hero-tools/node_modules/playwright/index.mjs';
import { getCombinedDemoTracks } from '../../../src/taste/demoUniverses.js';

const out=path.dirname(fileURLToPath(import.meta.url));
const tracks=getCombinedDemoTracks().filter(t=>t.coverUrl.startsWith('/demo-covers/'));
const errors=[];
const server=await createServer({server:{host:'127.0.0.1',port:5194,strictPort:true}});
let browser;
try {
  await server.listen();console.log('Local server ready.');
  browser=await chromium.launch({headless:true,timeout:20000,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--hide-scrollbars']});console.log('Chrome ready.');
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:4,isMobile:true,hasTouch:true,locale:'en-US',colorScheme:'dark',reducedMotion:'reduce'});
  await context.addInitScript(tracks=>{
    localStorage.setItem('spectra-tastemap-lang-v1','en');
    sessionStorage.setItem('spectra:taste:v5',JSON.stringify({tracks,mapId:'poster-mobile-demo',featuresSource:'spotify',stats:{isDemo:true,fetchedCount:tracks.length}}));
  },tracks);
  // A local demo capture, with no real account, cloud writes, or recommendations.
  await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/,route=>route.fulfill({contentType:'application/javascript',body:'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}'}));
  await context.route('**/api/**',route=>route.fulfill({json:{tracks:[]}}));
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5194/taste-map?lang=en',{waitUntil:'domcontentloaded',timeout:30000});console.log('Page loaded.');
  await page.locator('.public-map-peek-tracks > button').first().waitFor({timeout:15000});console.log('Map ready.');
  await page.evaluate(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]);await Promise.race([Promise.all([...document.images].filter(i=>i.getBoundingClientRect().height>0).map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,4000))]);});
  await page.waitForTimeout(650);
  await page.screenshot({path:path.join(out,'sources/mobile-map-en.png'),timeout:15000});console.log('Map captured.');
  await page.getByRole('button',{name:'Constellation',exact:true}).click();
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(out,'sources/mobile-map-constellation-en.png'),timeout:15000});
  await page.getByRole('button',{name:'Album bubbles',exact:true}).click();
  // Use a real library selection rather than fabricating a discovery result.
  await page.locator('.public-map-peek-tracks > button').filter({hasText:'Space Song'}).click();
  await page.locator('.public-map-track h2').filter({hasText:'Space Song'}).waitFor();
  await page.waitForTimeout(350);
  await page.screenshot({path:path.join(out,'sources/mobile-selected-en.png'),timeout:15000});console.log('Selection captured.');
  await page.getByRole('button',{name:'Explore my taste',exact:true}).click();
  await page.locator('.mtm-overview-dialog[open]').waitFor();
  await page.waitForTimeout(1800);
  await page.screenshot({path:path.join(out,'sources/mobile-overview-en.png')});
  await fs.writeFile(path.join(out,'sources/capture-audit.json'),JSON.stringify({date:'2026-11-01',source:'current local SPECTRA React application',route:'/taste-map?lang=en',viewport:{width:393,height:852},deviceScaleFactor:4,screenPixels:{width:1572,height:3408},tracks:tracks.map(({id,name,artists,coverUrl})=>({id,name,artists,coverUrl})),demo:true,account:null,uiAlterations:false,errors},null,2));
  if(errors.length)throw Error(errors.join('\n'));
  console.log(`Captured map, selection, overview at 1572 × 3408. ${tracks.length} real demo tracks. No UI changes.`);
} finally {await browser?.close();await server.close();}
