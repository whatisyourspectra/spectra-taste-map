import { chromium } from '/tmp/spectra-brand-render/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../..');
const preview=process.argv.includes('--preview');
const fps=30, duration=15, width=preview?1920:3840, height=preview?1080:2160;
const mime=f=>f.endsWith('.ttf')?'font/ttf':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.png')?'image/png':'image/jpeg';
const data=f=>`data:${mime(f)};base64,${readFileSync(f).toString('base64')}`;
const assets={logo:data(path.join(root,'public/spectra-wordmark.svg'))};
const coverNames=['currents','show-me-how','cigarettes-after-sex','depression-cherry','slow-rush','salad-days','geography','bewitched','lady-lady','team-baby','every-letter','after-hours','discovery','random-access-memories','justice','starboy','outrun'];
for(const key of coverNames)assets[key]=data(path.join(root,`public/demo-covers/${key}.jpg`));
const fontCss=`@font-face{font-family:Syne;font-weight:800;src:url('${data(path.join(dir,'assets/Syne-ExtraBold.ttf'))}')}@font-face{font-family:Syne;font-weight:600;src:url('${data(path.join(dir,'assets/Syne-SemiBold.ttf'))}')}`;
const html=`<!doctype html><meta charset="utf-8"><style>${fontCss}*{margin:0}html,body{background:#060911;width:${width}px;height:${height}px;overflow:hidden}canvas{display:block;width:${width}px;height:${height}px}</style><canvas width="${width}" height="${height}"></canvas><script>window.FILM_ASSETS=${JSON.stringify(assets)}</script><script>${readFileSync(path.join(dir,'film.js'),'utf8')}</script>`;
writeFileSync(path.join(dir,'preview.html'),html);
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files','--disable-web-security','--force-color-profile=srgb']});
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,locale:'ko-KR'});
page.on('pageerror',e=>console.error(e));
await page.setContent(html,{waitUntil:'load'});
await page.evaluate(()=>window.ready);
await page.evaluate(()=>document.fonts.load('800 142px Syne'));
if(preview){
  mkdirSync(path.join(dir,'frames'),{recursive:true});
  for(const t of [.0,.6,1.5,2.5,3.8,5.3,6.7,7.65,8.7,9.7,10.7,11.9,12.7,14.2]){
    await page.evaluate(t=>window.renderFrame(t),t);
    await page.screenshot({path:path.join(dir,'frames',`${t.toFixed(2)}.png`)});
    console.log(`Preview ${t}s`);
  }
}else{
  const ffmpeg=execFileSync(path.join(root,'output/video/render-env/bin/python'),['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
  const master=path.join(dir,'spectra-intro-15s-4k.mp4');
  const enc=spawn(ffmpeg,['-y','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-i',path.join(dir,'score.wav'),'-t',String(duration),'-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-profile:v','high','-level','5.1','-r',String(fps),'-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart','-metadata','title=SPECTRA — Your taste. In spectra.','-metadata','comment=15-second brand intro. Native 4K rendering of SPECTRA landing geometry.',master],{stdio:['pipe','ignore','pipe']});
  let errors='';enc.stderr.on('data',d=>{errors+=d.toString();if(errors.length>15000)errors=errors.slice(-15000)});
  const finished=once(enc,'close');
  enc.stdin.on('error',e=>console.error('Encoder pipe:',e.message));
  const start=Date.now();
  for(let frame=0;frame<fps*duration;frame++){
    const t=frame/fps;
    await page.evaluate(t=>window.renderFrame(t),t);
    const png=await page.screenshot({type:'png'});
    if(!enc.stdin.write(png))await once(enc.stdin,'drain');
    if(frame%30===0)console.log(`FRAME ${frame}/${fps*duration} | ${(Date.now()-start)/1000}s elapsed`);
    if(frame===405)writeFileSync(path.join(dir,'spectra-intro-poster-4k.png'),png);
  }
  enc.stdin.end();
  const [code]=await finished;if(code!==0)throw new Error(errors);
  console.log('4K MASTER COMPLETE',master);
  writeFileSync(path.join(dir,'encode.log'),errors);
}
await browser.close();
