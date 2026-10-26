import { chromium } from '/tmp/spectra-brand-render/node_modules/playwright/index.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(dir,'../../images');
mkdirSync(out,{recursive:true});
const html=readFileSync(path.join(dir,'preview.html'),'utf8').replace('{ alpha: false }','{ alpha: false, willReadFrequently: true }');
console.log('Launching'); const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files','--force-color-profile=srgb','--disable-accelerated-2d-canvas','--disable-gpu']});
try {
 console.log('Browser launched'); const page=await browser.newPage({viewport:{width:4096,height:4096},deviceScaleFactor:1});
 await page.setContent(html,{waitUntil:'load'}); console.log('Loaded source');
 await page.evaluate(async()=>{
  await window.ready;
  document.documentElement.style.cssText='width:4096px;height:4096px;overflow:hidden;background:#060911';
  document.body.style.cssText='width:4096px;height:4096px;margin:0;overflow:hidden;background:#060911';
  canvas.width=canvas.height=4096;
  canvas.style.width=canvas.style.height='4096px';
  window.renderSquareHero=(copy=true)=>{
   const t=13.5, size=1080, scale=4096/size;
   ctx.setTransform(scale,0,0,scale,0,0);
   ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
   ctx.fillStyle='#060911';ctx.fillRect(0,0,size,size);
   glow(ctx,620,480,750,'#4648A7',.32);
   glow(ctx,350,800,630,'#762359',.13);
   ctx.save();ctx.globalCompositeOperation='screen';
   ctx.filter='none';
   ctx.filter='none';sculpture(ctx,t,{cx:540,cy:480,scale:325,rotation:1.175,tilt:.93,alpha:.21});
   ctx.restore();
   if(copy){
    const width=904;
    ctx.drawImage(images.logo,(size-width)/2,496-width*110/1200/2,width,width*110/1200);
    textLine('음악으로 발견하는 나의 스펙트라',540,637,28,{align:'center',weight:500,color:'#DCE4F5'});
    tracked('spectra-music.org',540,728,19,2.5,'#91A6C5','center');
    const g=ctx.createLinearGradient(490,0,590,0);g.addColorStop(0,'#ED70BC');g.addColorStop(1,'#70D6FF');
    ctx.strokeStyle=g;ctx.lineWidth=1.5;ctx.globalAlpha=.85;ctx.beginPath();ctx.moveTo(490,790);ctx.lineTo(590,790);ctx.stroke();ctx.globalAlpha=1;
   }
   const v=ctx.createRadialGradient(540,480,280,540,540,800);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.38)');
   ctx.fillStyle=v;ctx.fillRect(0,0,size,size);
   ctx.save();ctx.globalAlpha=.11;ctx.fillStyle=grainPattern;ctx.fillRect(0,0,size,size);ctx.restore();
   ctx.setTransform(1,0,0,1,0,0);
  };
  window.renderSquareHero(true); console.log('Rendered square');
 });
 writeFileSync(path.join(out,'spectra-hero-square-4096.png'),Buffer.from(await page.evaluate(()=>canvas.toDataURL('image/png').split(',')[1]),'base64'));
 await page.evaluate(()=>window.renderSquareHero(false));
 writeFileSync(path.join(out,'spectra-hero-square-background-4096.png'),Buffer.from(await page.evaluate(()=>canvas.toDataURL('image/png').split(',')[1]),'base64'));
 writeFileSync(path.join(out,'spectra-hero-square-notes.json'),JSON.stringify({dimensions:[4096,4096],source:'output/video/intro15/film.js',frame_reference_seconds:13.5,native_render:true,description:'Square composition using original film sculpture equations, wordmark, palette and type.'},null,2));
 console.log(out);
} finally {await browser.close();}
