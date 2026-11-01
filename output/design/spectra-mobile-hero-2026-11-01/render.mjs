import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import opentype from '../../../node_modules/three/examples/jsm/libs/opentype.module.js';

const out=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(out,'../../..');
const require=createRequire(import.meta.url);
const {Resvg}=require('/private/tmp/spectra-poster-tools/node_modules/@resvg/resvg-js');
const fonts={};for(const [k,n]of [['bold','Syne-ExtraBold.ttf'],['regular','Syne-SemiBold.ttf']]){const b=fs.readFileSync(path.join(root,'output/video/intro15/assets',n));fonts[k]=opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}
const b64=file=>'data:image/png;base64,'+fs.readFileSync(path.join(out,'sources',file)).toString('base64');
const map=b64('mobile-map-constellation-en.png'),selected=b64('mobile-selected-en.png');
const f=n=>Number(n.toFixed(3));
const P={night:'#070B13',paper:'#F7F5EF',lilac:'#CEC2FF',pink:'#ED70BC',cyan:'#70D6FF'};
const logoSource=fs.readFileSync(path.join(root,'public/spectra-wordmark.svg'),'utf8');
const logoGroup=logoSource.match(/<g[\s\S]*<\/g>/)[0].replace('fill="url(#spectra)"','fill="currentColor"');
function type(s,x,y,w,h,c=P.paper,font='bold'){
  if(!s.trim())return '';
  const p=fonts[font].getPath(s,0,0,100),b=p.getBoundingBox(),scale=Math.min(w/(b.x2-b.x1),h/(b.y2-b.y1));
  return `<g aria-label="${s}" transform="translate(${x} ${y}) scale(${f(scale)}) translate(${f(-b.x1)} ${f(-b.y1)})"><path d="${p.toPathData(3)}" fill="${c}"/></g>`;
}
const rr=(x,y,w,h,r,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const circ=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
function spark(x,y,r,c){return `<path d="M${x} ${y-r}Q${x+6} ${y-6} ${x+r} ${y}Q${x+6} ${y+6} ${x} ${y+r}Q${x-6} ${y+6} ${x-r} ${y}Q${x-6} ${y-6} ${x} ${y-r}" fill="${c}"/>`;}
const common=`<defs><linearGradient id="spectra"><stop stop-color="${P.pink}"/><stop offset=".52" stop-color="#A68EFF"/><stop offset="1" stop-color="${P.cyan}"/></linearGradient><radialGradient id="ambient"><stop stop-color="#272540" stop-opacity=".6"/><stop offset="1" stop-color="${P.night}" stop-opacity="0"/></radialGradient><filter id="phone-shadow" x="-60%" y="-35%" width="230%" height="190%"><feDropShadow dx="0" dy="30" stdDeviation="22" flood-color="#000000" flood-opacity=".42"/></filter></defs>`;
function phone(id,screen,edge=P.lilac){
  let sides='';
  for(let i=21;i>=1;i--){const v=Math.round(70+Math.sin(i/21*Math.PI)*120);sides+=rr(i*.82,i*.26,460,1020,72,`rgb(${v},${v},${v+2})`);}
  const defs=`<defs><linearGradient id="${id}-metal" x1="0" x2="1" y1="0" y2=".25"><stop stop-color="#9C9B99"/><stop offset=".05" stop-color="#ECEAE6"/><stop offset=".12" stop-color="#6A6B6D"/><stop offset=".4" stop-color="#D4D2CF"/><stop offset=".8" stop-color="#8B8B8D"/><stop offset=".96" stop-color="#E6E3DD"/><stop offset="1" stop-color="#4A4A4B"/></linearGradient><linearGradient id="${id}-reflection" x1="0" x2="1" y1="0" y2=".8"><stop stop-color="#FFFFFF" stop-opacity=".06"/><stop offset=".32" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".9" stop-color="${edge}" stop-opacity=".025"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".07"/></linearGradient><clipPath id="${id}-display">${rr(15,15,430,990,59,'#FFFFFF')}</clipPath></defs>`;
  const hardware=rr(-4,140,6,50,3,'#797B7D')+rr(-4,230,6,92,3,'#ADB0B4')+rr(-4,342,6,92,3,'#8A8B8D')+rr(472,255,6,132,3,'#757678');
  const caseFront=rr(0,0,460,1020,72,`url(#${id}-metal)`)+rr(5,5,450,1010,68,'#050609')+rr(8,8,444,1004,65,'#131419',`stroke="#393B41" stroke-width=".8"`);
  let face=rr(15,15,430,990,59,P.night)+`<image x="15" y="62" width="430" height="932.214" preserveAspectRatio="none" href="${screen}"/>`;
  // Native device status bar is separate from the unmodified web screenshot.
  face+=type('9:41',46,30,62,16,P.paper,'regular')+rr(174,27,112,30,15,'#000000')+circ(271,42,5,'#09121E')+circ(271,42,2,'#1D3854');
  face+=[0,1,2,3].map((i)=>rr(341+i*5,43-i*3,3,5+i*3,1,P.paper)).join('');
  face+=`<path d="M370 36q9-9 18 0M373 40q6-6 12 0M377 44q2-2 4 0" fill="none" stroke="${P.paper}" stroke-width="2" stroke-linecap="round"/>`+rr(396,31,26,13,3,'none',`stroke="${P.paper}" stroke-width="1.4"`)+rr(399,34,20,7,1,P.paper)+rr(424,35,2,5,1,P.paper);
  face+=rr(166,996,128,4,2,'#CAD0DD');
  return defs+`<g><g filter="url(#phone-shadow)">${sides}${hardware}${caseFront}</g><g clip-path="url(#${id}-display)">${face}</g>${rr(15,15,430,990,59,'none',`stroke="#69707D" stroke-width=".6" stroke-opacity=".6"`)}<path d="M22 80Q25 20 80 17H370" fill="none" stroke="${edge}" stroke-opacity=".5" stroke-width="1.3"/></g>`;
}
function posed(id,screen,x,y,scale,angle,edge){return `<g transform="translate(${x} ${y}) scale(${scale})"><g transform="rotate(${angle} 230 510)">${phone(id,screen,edge)}</g></g>`;}
function pair(){return posed('rear',selected,1380,170,1.22,-5,P.cyan)+posed('front',map,650,420,1.22,33,P.pink);}
function curveWords(){
  const chars=[...'YOUR MUSIC. YOUR MAP. YOUR MUSIC. YOUR MAP.'];let b='';
  for(let i=0;i<chars.length;i++){const t=i/(chars.length-1),x=60+t*2300,y=1060+160*Math.sin(t*Math.PI*2+.4),a=Math.atan2(160*Math.cos(t*Math.PI*2+.4)*Math.PI*2,2300)*180/Math.PI;b+=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})">${type(chars[i],0,0,42,60,P.lilac,'regular')}</g>`;}return b;
}
const specs=[];
function save(name,w,h,body,pixels,{transparent=true,description='',svg=true}={}){
  const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="SPECTRA mobile hero"><title>SPECTRA mobile hero — actual application screenshots</title>${common}${body}</svg>`;
  if(svg)fs.writeFileSync(path.join(out,name+'.svg'),source);
  const rendered=new Resvg(source,{fitTo:{mode:'width',value:Math.round(pixels*w/Math.max(w,h))}}).render();fs.writeFileSync(path.join(out,name+'.png'),rendered.asPng());
  const thumb=new Resvg(source,{fitTo:{mode:'width',value:Math.round(1400*w/Math.max(w,h))}}).render();fs.writeFileSync(path.join(out,name+'-preview.png'),thumb.asPng());
  specs.push({name,width:rendered.width,height:rendered.height,transparent,description,svgContains:'Vector device frames, outlined type, embedded actual UI screenshots'});console.log(name,rendered.width,rendered.height);
}
save('01-mobile-hero-transparent',2400,1900,pair(),6000,{description:'Two floating silver devices, actual map and song selection screens, transparent background'});
const decor=`<ellipse cx="1240" cy="1080" rx="1070" ry="220" transform="rotate(-18 1240 1080)" fill="none" stroke="${P.lilac}" stroke-width="1.5" opacity=".3"/>${spark(220,620,57,P.pink)}${spark(2190,1270,74,P.cyan)}${spark(1940,170,36,P.lilac)}`;
save('02-mobile-hero-poster-dark',2400,2000,rr(0,0,2400,2000,0,P.night)+`<ellipse cx="1250" cy="1100" rx="1200" ry="900" fill="url(#ambient)"/>`+curveWords()+decor+`<g transform="translate(0 55)">${pair()}</g>`,6000,{transparent:false,description:'Poster-ready dark composition with curved lilac typography and minimal spectral accents'});
save('03-mobile-map-device',620,1180,posed('single-map',map,70,55,1,0,P.pink),4200,{description:'Individual map device on transparent background'});
save('04-mobile-song-device',620,1180,posed('single-song',selected,70,55,1,0,P.cyan),4200,{description:'Individual selected-song device on transparent background'});
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({date:'2026-11-01',uiSource:'Current local SPECTRA application, unmodified screenshots with 18 curated demo tracks',assets:specs},null,2));
const tiles=specs.map((s,i)=>{const file=fs.readFileSync(path.join(out,s.name+'-preview.png')).toString('base64'),x=(i%2)*1200,y=Math.floor(i/2)*1250;return rr(x+18,y+18,1164,1110,18,i===0?'#20222B':i===1?P.night:'#CEC2FF')+`<image x="${x+40}" y="${y+40}" width="1120" height="1050" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${file}"/>`+type(s.name,x+25,y+1150,1150,35)+type(`${s.width} x ${s.height} PX`,x+25,y+1205,1150,22,P.lilac,'regular');}).join('');
save('CONTACT-SHEET',2400,2500,rr(0,0,2400,2500,0,'#171719')+tiles,2500,{transparent:false,svg:false});
