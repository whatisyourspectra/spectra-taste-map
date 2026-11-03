import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium} from '/private/tmp/spectra-mobile-hero-tools/node_modules/playwright/index.mjs';

const out=path.dirname(fileURLToPath(import.meta.url));
const previewOnly=process.argv.includes('--preview');
const server=await createServer({server:{host:'127.0.0.1',port:5198,strictPort:true}});
let browser;const audit=[];const errors=[];
try{
  await server.listen();
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-unsafe-swiftshader','--force-color-profile=srgb']});
  const context=await browser.newContext({viewport:{width:1920,height:1440},deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await fs.mkdir(path.join(out,'previews'),{recursive:true});
  for(const [name,device] of [['03-macbook-front-8k','macbook-front'],['04-macbook-angle-8k','macbook-angle'],['05-imac-angle-8k','imac-angle']]){
    await page.goto('http://127.0.0.1:5198/output/design/spectra-premium-device-mockups-2026-11-02/studio.html?device='+device,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__MACBOOK__?.ready,{},{timeout:90000});
    if(!previewOnly){
      const data=await page.evaluate(()=>window.__MACBOOK__.export());
      await fs.writeFile(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));
    }
    const preview=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=1200;c.getContext('2d').drawImage(document.querySelector('canvas'),0,0,1600,1200);return c.toDataURL('image/png')});
    await fs.writeFile(path.join(out,'previews',name+'.png'),Buffer.from(preview.split(',')[1],'base64'));
    audit.push({name,device,width:previewOnly?1920:7680,height:previewOnly?1440:5760,stats:await page.evaluate(()=>window.__MACBOOK__.stats())});console.log('Rendered',name);
  }
  await fs.writeFile(path.join(out,previewOnly?'preview-audit.json':'render-audit.json'),JSON.stringify({renders:audit,errors},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser?.close();await server.close()}
