import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import opentype from '../../../node_modules/three/examples/jsm/libs/opentype.module.js';

const out = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(out, '../../..');
const require = createRequire(import.meta.url);
const { Resvg } = require(process.env.SPECTRA_RESVG || '/private/tmp/spectra-poster-tools/node_modules/@resvg/resvg-js');
const previewOnly = process.argv.includes('--preview');
const selected = process.argv.find(v => v.startsWith('--only='))?.slice(7);
const P = { ink:'#171719', paper:'#F7F5EF', white:'#FFFFFF', lilac:'#CEC2FF', purple:'#9B80F7', pink:'#ED70BC', cyan:'#70D6FF', acid:'#EEFF79' };
const fonts = {};
for (const [key, file] of Object.entries({bold:'output/video/intro15/assets/Syne-ExtraBold.ttf',regular:'output/video/intro15/assets/Syne-SemiBold.ttf',ko:'/Library/Fonts/KoPubWorld Dotum Bold.ttf'})) {
  const b = fs.readFileSync(path.isAbsolute(file) ? file : path.join(root,file));
  fonts[key] = opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
}
const official = fs.readFileSync(path.join(root,'public/spectra-wordmark.svg'),'utf8');
const logoGeometry = official.match(/<g[\s\S]*<\/g>/)[0].replace(/fill="url\(#spectra\)"/,'fill="currentColor"');
const TAU = Math.PI*2;
const f = v => Number(v.toFixed(2));
const rnd = i => {const v=Math.sin(i*127.1+41.73)*43758.5453;return v-Math.floor(v);};
const esc = v => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const manifest=[];
const bodies=new Map();
const defs=`<defs><linearGradient id="spectrum" x1="0" x2="1" y1="0" y2=".25"><stop stop-color="${P.pink}"/><stop offset=".5" stop-color="${P.purple}"/><stop offset="1" stop-color="${P.cyan}"/></linearGradient><linearGradient id="soft" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${P.lilac}"/><stop offset="1" stop-color="${P.cyan}"/></linearGradient></defs>`;
const wrap=(w,h,b,title='SPECTRA graphic element')=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${defs}${b}</svg>`;
const line=(x1,y1,x2,y2,c=P.ink,sw=2,extra='')=>`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${c}" stroke-width="${sw}" ${extra}/>`;
const circle=(x,y,r,c=P.ink,extra='')=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" ${extra}/>`;
const rect=(x,y,w,h,c,rx=0,extra='')=>`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${c}" ${extra}/>`;
function type(s,x,y,w,h,{color=P.ink,font='bold',outline=false,sw=1.8,align='left'}={}) {
  if(!s.trim())return '';
  const p=fonts[font].getPath(s,0,0,100,{kerning:true}),b=p.getBoundingBox();
  const scale=Math.min(w/(b.x2-b.x1),h/(b.y2-b.y1));
  const dx=align==='center'?(w-(b.x2-b.x1)*scale)/2:align==='right'?w-(b.x2-b.x1)*scale:0;
  return `<g aria-label="${esc(s)}" transform="translate(${f(x+dx)} ${f(y)}) scale(${f(scale)}) translate(${f(-b.x1)} ${f(-b.y1)})"><path d="${p.toPathData(3)}" fill="${outline?'none':color}"${outline?` stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"`:''}/></g>`;
}
function logo(x,y,w,color=P.ink,outline=false,h=w*110/1200) {
  let g=logoGeometry.replace('fill="currentColor"',outline?`fill="none" stroke="${color}" stroke-width=".8" stroke-linejoin="round"`:`fill="${color}"`);
  return `<g aria-label="SPECTRA" transform="translate(${x} ${y}) scale(${w/1200} ${h/110})">${g}</g>`;
}
const tag=(s,x,y,w=220,h=64,fill=P.lilac,color=P.ink)=>rect(x,y,w,h,fill,h/2)+type(s,x+19,y+17,w-38,h-34,{color,font:'regular',align:'center'});
function burst(cx,cy,r,points=16,inner=.7,fill=P.pink,rotation=0) {
  return `<path d="${Array.from({length:points*2},(_,i)=>{const a=i/points*Math.PI+rotation,rr=i%2?r*inner:r;return `${i?'L':'M'}${f(cx+Math.cos(a)*rr)} ${f(cy+Math.sin(a)*rr)}`;}).join(' ')}Z" fill="${fill}"/>`;
}
function asterisk(cx,cy,r,color=P.ink,arms=8,sw=40) {
  return `<g stroke="${color}" stroke-width="${sw}" stroke-linecap="round">${Array.from({length:arms},(_,i)=>{const a=i/arms*TAU;return `<path d="M${cx} ${cy}L${f(cx+Math.cos(a)*r)} ${f(cy+Math.sin(a)*r)}"/>`;}).join('')}</g>`;
}
function cross(x,y,r=16,color=P.ink,sw=2){return line(x-r,y,x+r,y,color,sw)+line(x,y-r,x,y+r,color,sw);}
function arrow(x,y,size=100,color=P.ink,angle=-45) {
  const points=[[-.5,-.055],[.29,-.055],[-.02,-.365],[.06,-.445],[.505,0],[.06,.445],[-.02,.365],[.29,.055],[-.5,.055]].map(([a,b])=>`${f(a*size)},${f(b*size)}`).join(' ');
  return `<g transform="translate(${x} ${y}) rotate(${angle})"><polygon points="${points}" fill="${color}"/></g>`;
}
function dots(w,h,inside,color=P.ink,step=15){let b='';for(let y=step;y<h;y+=step)for(let x=step;x<w;x+=step){const v=inside(x,y);if(v>0)b+=circle(x,y,Math.min(step*.49,Math.max(.6,v*step*.47)),color);}return b;}
function orbitHalftone(color=P.paper) {
  const W=1400,H=1300;
  let b=dots(W,H,(x,y)=>{let xx=(x-700)/560,yy=(y-650)/475;const a=-.36,px=xx*Math.cos(a)-yy*Math.sin(a),py=(xx*Math.sin(a)+yy*Math.cos(a))*1.25,r=Math.hypot(px,py);if(r>.99||r<.41)return 0;return .22+.78*Math.sqrt(Math.max(0,1-((r-.7)/.3)**2))*(.8+.2*Math.sin(x/300));},color,13);
  b+=`<ellipse cx="700" cy="650" rx="620" ry="168" fill="none" stroke="${color}" stroke-width="5" transform="rotate(-28 700 650)"/>`;
  b+=circle(700,650,110,P.lilac)+circle(700,650,37,P.ink)+asterisk(700,650,65,color,6,8);
  b+=burst(1195,400,55,4,.12,P.pink)+cross(187,1080,25,color,3);
  return b;
}
function halftoneTorus(color=P.lilac) {
  const points=[];for(let i=0;i<164;i++)for(let j=0;j<57;j++){
    const u=i/164*TAU,v=j/57*TAU,r=330+145*Math.cos(v),x=r*Math.cos(u),y=r*Math.sin(u),z=145*Math.sin(v);
    const xr=x*.9+z*.45,zr=-x*.45+z*.9,yr=y*.61-zr*.79,depth=y*.79+zr*.61;
    const px=700+(xr*Math.cos(.35)-yr*Math.sin(.35))*1.2,py=640+(xr*Math.sin(.35)+yr*Math.cos(.35))*1.2;
    points.push({x:px,y:py,z:depth,r:2.1+(depth+500)/1000*3.7});
  }return points.sort((a,b)=>a.z-b.z).map(p=>circle(p.x,p.y,p.r,color)).join('');
}
function cloud(color=P.paper){return dots(1300,1400,(x,y)=>{const dx=(x-650)/430,dy=(y-700)/580,a=Math.atan2(dy,dx),r=Math.hypot(dx,dy),edge=1+.16*Math.cos(a*3+.4)+.08*Math.sin(a*7);return r<edge?(.26+.74*Math.sqrt(1-(r/edge)**2))*(.72+.28*Math.cos(dx*2)):0;},color,13)+burst(650,650,135,4,.14,P.pink)+circle(650,650,22,P.ink);}
function constellation(color=P.ink,multi=false){
  const nodes=Array.from({length:36},(_,i)=>{const g=Math.floor(i/12),a=(i%12)*2.39996,r=52+Math.sqrt(i%12)*64;return{x:[365,990,700][g]+Math.cos(a)*r,y:[350,440,1030][g]+Math.sin(a)*r*.82,g};});
  let b='';for(let i=1;i<nodes.length;i++){const n=nodes[i],prev=nodes[i%12===0?i-5:i-1];b+=line(n.x,n.y,prev.x,prev.y,multi?[P.pink,P.purple,P.cyan][n.g]:color,2.2);if(i%3===0&&i%12>1)b+=line(n.x,n.y,nodes[i-2].x,nodes[i-2].y,color,1,'opacity=".4"');}
  for(let i=0;i<nodes.length;i++){const n=nodes[i],c=multi?[P.pink,P.purple,P.cyan][n.g]:color;b+=circle(n.x,n.y,i%12===0?37:8+rnd(i)*12,c);if(i%12===0)b+=circle(n.x,n.y,57,'none',`stroke="${c}" stroke-width="2"`);}
  [[120,150],[1240,950],[280,1210],[1100,120]].forEach(([x,y])=>b+=cross(x,y,18,color));return b;
}
function contours(color=P.purple){let b='';for(let i=0;i<23;i++){const rr=40+i*18,pts=[];for(let j=0;j<=180;j++){const a=j/180*TAU,r=rr*(1+.16*Math.sin(a*3)+.07*Math.cos(a*5+i*.06));pts.push(`${f(680+Math.cos(a)*r*1.22)},${f(650+Math.sin(a)*r*.96)}`);}b+=`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${i%5?1.7:3}"/>`;}return b+cross(680,650,35,color,3);}
function vinyl(x,y,r,fill=P.ink,label=P.lilac,stroke=P.paper){let b=circle(x,y,r,fill);for(let i=0;i<11;i++)b+=circle(x,y,r*(.39+i*.05),'none',`stroke="${stroke}" stroke-opacity=".35" stroke-width="1.2"`);return b+circle(x,y,r*.28,label)+circle(x,y,r*.052,P.paper);}
function stackRecords(){return `<g transform="translate(60 40) rotate(-14 600 600)">${rect(170,220,850,850,P.pink,22)}${rect(270,140,850,850,P.lilac,22)}${rect(340,70,850,850,P.cyan,22)}${vinyl(765,495,380,P.ink,P.pink)}${tag('YOUR MUSIC / YOUR MAP',400,850,650,72,P.paper)}${cross(420,150,20,P.ink,4)}</g>`;}
function portal(){let b='';for(let i=0;i<23;i++){const rx=500-i*16,ry=590-i*19;b+=`<ellipse cx="650" cy="700" rx="${rx}" ry="${ry}" fill="none" stroke="${i%3===0?P.pink:i%3===1?P.purple:P.cyan}" stroke-width="${i%4===0?9:3}"/>`;}return b+rect(630,140,40,1120,P.ink)+burst(650,700,160,12,.7,P.acid)+arrow(650,700,120,P.ink);}
function journey(color=P.ink){let b=`<path d="M110 990C190 170 650 1050 720 400S1200 100 1260 550" fill="none" stroke="${color}" stroke-width="5"/>`;
  [[110,990],[440,650],[720,400],[1110,200]].forEach(([x,y],i)=>{b+=circle(x,y,68,[P.pink,P.lilac,P.cyan,P.acid][i])+circle(x,y,92,'none',`stroke="${color}" stroke-width="2"`)+type(String(i+1).padStart(2,'0'),x-43,y-25,86,50,{align:'center'});});
  return b+arrow(1240,550,100,color,80);
}
function tape(label,fill=P.lilac,color=P.ink,{checker=false,w=2400}={}){
  const edge=[[24,42]];for(let x=24;x<w-24;x+=20)edge.push([Math.min(x+10,w-24),26],[Math.min(x+20,w-24),42]);
  edge.push([w-24,278]);for(let x=w-24;x>24;x-=20)edge.push([Math.max(x-10,24),294],[Math.max(x-20,24),278]);
  let b=`<polygon points="${edge.map(p=>p.join(',')).join(' ')}" fill="${fill}"/>`;
  for(let i=0;i<3;i++){const x=90+i*760;b+=type(label,x,108,630,94,{color})+asterisk(x+677,155,35,color,6,12);}
  if(checker)for(let x=30;x<w-25;x+=28)for(let y=252;y<277;y+=14)if((Math.floor(x/28)+Math.floor((y-252)/14))%2===0)b+=rect(x,y,14,14,color);
  return b;
}
function roundSeal(label,color=P.ink,fill=P.paper) {
  let b=circle(600,600,480,fill)+circle(600,600,460,'none',`stroke="${color}" stroke-width="3"`)+circle(600,600,310,'none',`stroke="${color}" stroke-width="2"`);
  const letters=[...label];for(let i=0;i<letters.length;i++){const a=-165+i/(letters.length-1)*330;b+=`<g transform="translate(600 600) rotate(${a}) translate(0 -400)">${type(letters[i],-20,-25,40,50,{color,align:'center'})}</g>`;}
  return b+asterisk(600,600,205,color,8,54);
}
function genreSticker(label,sub,fill,shape='pill'){
  const b=shape==='ticket'?`<path d="M90 60H1110V225a75 75 0 0 0 0 150V540H90V375a75 75 0 0 0 0-150Z" fill="${fill}" stroke="${P.ink}" stroke-width="4"/>`:rect(40,80,1120,440,fill,220,`stroke="${P.ink}" stroke-width="4"`);
  return b+type(label,210,190,780,145,{align:'center'})+type(sub,175,370,850,35,{font:'regular',align:'center'})+cross(132,300,23,P.ink,4)+cross(1068,300,23,P.ink,4);
}
function buddy(which,color=P.lilac){let b='';const stroke=`stroke="${P.ink}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"`;
  if(which==='headphones'){b=`<path d="M300 570C210 40 1050 40 960 570" fill="none" ${stroke}/><path d="M335 570C265 140 995 140 925 570" fill="none" ${stroke}/>`+circle(630,620,330,color,stroke)+rect(230,465,125,300,P.ink,58)+rect(905,465,125,300,P.ink,58);}
  if(which==='vinyl')b=vinyl(630,590,350,P.ink,color)+circle(630,590,225,color,stroke);
  if(which==='spark')b=burst(630,590,400,12,.66,color).replace('/>',` ${stroke}/>`);
  b+=`<g ${stroke} fill="none"><path d="M445 990l-30 110H285M795 990l30 110h130M300 710L160 830l-70-50M960 710l110-160 90 50"/></g>`;
  b+=`<ellipse cx="535" cy="590" rx="49" ry="67" fill="${P.paper}" ${stroke}/><ellipse cx="725" cy="590" rx="49" ry="67" fill="${P.paper}" ${stroke}/>`+circle(551,606,20,P.ink)+circle(741,606,20,P.ink)+`<path d="M555 735Q630 805 710 735" fill="none" ${stroke}/>`;
  if(which==='spark')b+=asterisk(1070,220,75,P.pink,4,16);return b;
}
function waveform(color=P.ink){let b='';for(let i=0;i<99;i++){const x=30+i*23.8,amp=20+Math.abs(Math.sin(i*.39)*Math.sin(i*.13+.4))*240;b+=rect(x,350-amp/2,12,amp,color,6);}return b;}
async function add(group,name,w,h,body,{px=6000,transparent=true,role='',bg='dark'}={}) {
  const full=`${group}/${name}`;bodies.set(name,{w,h,body});
  if(selected&&!new RegExp(selected).test(name))return;
  const dir=path.join(out,group);fs.mkdirSync(dir,{recursive:true});
  const source=wrap(w,h,body,role||name);fs.writeFileSync(path.join(dir,name+'.svg'),source);
  const render=new Resvg(source,{fitTo:{mode:'width',value:Math.round((previewOnly?760:px)*w/Math.max(w,h))}}).render();
  fs.writeFileSync(path.join(dir,name+'.png'),render.asPng());
  const thumb=new Resvg(source,{fitTo:{mode:'width',value:Math.round(460*w/Math.max(w,h))}}).render();
  fs.mkdirSync(path.join(out,'.thumbs'),{recursive:true});fs.writeFileSync(path.join(out,'.thumbs',name+'.png'),thumb.asPng());
  manifest.push({name,group,role,svg:full+'.svg',png:full+'.png',width:render.width,height:render.height,transparent,previewBackground:bg,outlined:true});
  console.log(`${name}: ${render.width} × ${render.height}`);
}

// Ten large hero graphics. Every texture is real vector geometry.
await add('01-hero','01-orbit-halftone-white',1400,1300,orbitHalftone(),{role:'하프톤 궤도 / 어두운 바탕',bg:'dark'});
await add('01-hero','02-orbit-halftone-ink',1400,1300,orbitHalftone(P.ink),{role:'하프톤 궤도 / 밝은 바탕',bg:'light'});
await add('01-hero','03-torus-halftone-lilac',1400,1300,halftoneTorus(),{role:'입체 하프톤 토러스',bg:'dark'});
await add('01-hero','04-taste-cloud-white',1300,1400,cloud(),{role:'음악 취향 하프톤 구름',bg:'dark'});
await add('01-hero','05-constellation-ink',1400,1400,constellation(),{role:'취향 군집과 연결 / 단색',bg:'light'});
await add('01-hero','06-constellation-spectrum',1400,1400,constellation(P.paper,true),{role:'취향 군집과 연결 / 스펙트럼',bg:'dark'});
await add('01-hero','07-taste-contours',1400,1300,contours(),{role:'취향 지형 등고선',bg:'light'});
await add('01-hero','08-record-stack',1400,1300,stackRecords(),{role:'음악 레코드와 카드 콜라주',bg:'light'});
await add('01-hero','09-spectrum-portal',1300,1400,portal(),{role:'새 음악으로 향하는 포털',bg:'dark'});
await add('01-hero','10-discovery-journey',1400,1200,journey(),{role:'음악 탐색 경로',bg:'light'});

// Official wordmark geometry is reused, without converting pixels to fake vectors.
for(const [n,c,bg]of [['11-wordmark-ink',P.ink,'light'],['12-wordmark-white',P.paper,'dark'],['13-wordmark-spectrum','url(#spectrum)','dark']])await add('02-type',n,2440,300,logo(20,40,2400,c),{px:8000,role:'공식 SPECTRA 워드마크',bg});
await add('02-type','14-wordmark-outline',2440,300,logo(20,40,2400,P.paper,true),{px:8000,role:'공식 워드마크 아웃라인',bg:'dark'});
await add('02-type','15-wordmark-stretched',1400,1050,logo(40,40,1320,P.ink,false,960),{px:6000,role:'세로로 확장한 에디토리얼 워드마크',bg:'light'});
await add('02-type','16-type-your-taste',1800,900,type('YOUR MUSIC.',40,40,1720,325)+type('YOUR MAP.',40,435,1720,325,{outline:true,sw:1.8})+type('음악으로 발견하는 나의 스펙트라',50,815,1550,48,{font:'ko'}),{role:'영문 헤드라인 / 한글 서브 카피',bg:'light'});
await add('02-type','17-type-korean-hero',1800,780,type('좋아하는 음악이',40,45,1720,275,{font:'ko'})+type('나만의 지도가 됩니다.',40,390,1720,275,{font:'ko'}),{role:'한글 메인 카피 / 아웃라인 벡터',bg:'light'});
await add('02-type','18-type-outline-stack',1600,1200,[0,1,2,3].map(i=>logo(40,45+i*288,1520,P.paper,true,225)).join(''),{role:'반복 워드마크 패턴',bg:'dark'});
for(const [i,ko,en]of [[1,'이해','UNDERSTAND'],[2,'분류','CLUSTER'],[3,'확장','EXPAND']])await add('02-type',`${18+i}-step-${en.toLowerCase()}`,1200,520,type('0'+i,40,30,220,190,{color:[P.pink,P.purple,P.cyan][i-1]})+type(ko,330,45,700,200,{font:'ko'})+type(en,45,350,1080,90,{outline:true}),{role:`서비스 단계 ${i} / ${ko}`,bg:'light'});

await add('03-tapes','22-tape-music-white',2400,320,tape('SPECTRA / MUSIC',P.paper),{px:8000,role:'백색 음악 타이포 테이프',bg:'dark'});
await add('03-tapes','23-tape-taste-lilac',2400,320,tape('YOUR TASTE MAP',P.lilac),{px:8000,role:'라일락 취향 지도 테이프',bg:'dark'});
await add('03-tapes','24-tape-discover-black',2400,320,tape('LISTEN + DISCOVER',P.ink,P.paper,{checker:true}),{px:8000,role:'검정 디스커버리 테이프',bg:'light'});
await add('03-tapes','25-tape-spectrum',2400,320,tape('FIND YOUR SPECTRA','url(#spectrum)'),{px:8000,role:'스펙트럼 컬러 테이프',bg:'dark'});
let check='';for(let y=0;y<6;y++)for(let x=0;x<64;x++)if((x+y)%2===0)check+=rect(20+x*37,20+y*37,37,37,P.paper);
await add('03-tapes','26-checker-strip-white',2408,262,check,{px:8000,role:'체커보드 구획 스트립',bg:'dark'});
await add('03-tapes','27-checker-strip-ink',2408,262,check.replaceAll(P.paper,P.ink),{px:8000,role:'체커보드 구획 스트립 / 검정',bg:'light'});
let scale=line(40,100,2360,100,P.paper,3);for(let i=0;i<=58;i++){const x=40+i*40;scale+=line(x,100,x,i%5===0?30:65,P.paper,2);if(i%5===0)scale+=type(String(i).padStart(2,'0'),x-18,140,80,35,{color:P.paper,font:'regular'});}
await add('03-tapes','28-coordinate-ruler',2400,220,scale,{px:8000,role:'좌표 눈금과 숫자',bg:'dark'});
await add('03-tapes','29-spectrum-waveform',2400,700,waveform('url(#spectrum)'),{px:8000,role:'스펙트럼 음파 스트립',bg:'dark'});

await add('04-stickers','30-taste-passport',1400,880,rect(40,40,1320,800,P.lilac,35,`stroke="${P.ink}" stroke-width="4"`)+logo(100,100,780)+type('TASTE PASSPORT',100,260,1130,140)+line(100,475,1290,475)+type('OWNER / 나의 음악 취향',105,525,760,50,{font:'ko'})+type('NO. 0001 / ALL GENRES WELCOME',105,670,1040,40,{font:'regular'})+burst(1190,140,78,12,.7,P.pink),{px:4500,role:'취향 패스포트 / 정보 카드',bg:'light'});
for(const [id,label,sub,fill]of [[31,'DREAM POP','SOFT EDGES / WIDE OPEN',P.lilac],[32,'JAZZ','FOLLOW THE UNEXPECTED',P.acid],[33,'ELECTRONIC','ENERGY IN EVERY DIRECTION',P.cyan],[34,'INDIE ROCK','YOUR OWN FREQUENCY',P.pink],[35,'R&B / SOUL','FIND YOUR GROOVE',P.lilac],[36,'GENRE FREE','ALL TASTES BELONG HERE',P.paper]])await add('04-stickers',`${id}-genre-${label.toLowerCase().replace(/[^a-z]+/g,'-')}`,1200,600,genreSticker(label,sub,fill,id%2?'pill':'ticket'),{px:4096,role:`장르 스티커 / ${label}`,bg:'light'});
await add('04-stickers','37-seal-made-of-music',1200,1200,roundSeal('MADE OF MUSIC / MADE OF ME / ',P.ink,P.paper),{px:4096,role:'음악으로 이뤄진 나 / 원형 실',bg:'dark'});
await add('04-stickers','38-seal-taste-orbit',1200,1200,roundSeal('YOUR TASTE IS THE MAP / ',P.ink,P.lilac),{px:4096,role:'취향 궤도 / 원형 실',bg:'light'});
await add('04-stickers','39-badge-press-play',1200,1200,burst(600,600,540,18,.83,P.acid)+type('PRESS',270,360,660,155,{align:'center'})+type('PLAY',280,565,640,205,{align:'center'})+arrow(600,900,95),{px:4096,role:'플레이 스타버스트 배지',bg:'light'});
await add('04-stickers','40-label-new-discovery',1600,500,rect(40,40,1520,420,P.paper,210,`stroke="${P.ink}" stroke-width="5"`)+type('NEW DISCOVERY',150,155,1110,160)+arrow(1400,250,130),{px:6000,role:'새로운 음악 발견 라벨',bg:'light'});

await add('05-symbols','41-starburst-pink',1200,1200,burst(600,600,550,20,.63,P.pink),{px:4096,role:'핑크 스타버스트',bg:'light'});
await add('05-symbols','42-asterisk-lilac',1200,1200,asterisk(600,600,460,P.lilac,8,120),{px:4096,role:'라일락 아스테리스크',bg:'dark'});
await add('05-symbols','43-orbital-rings',1400,1200,[0,60,120].map(a=>`<ellipse cx="700" cy="600" rx="580" ry="180" fill="none" stroke="${P.paper}" stroke-width="7" transform="rotate(${a} 700 600)"/>`).join('')+circle(700,600,80,P.pink),{px:5000,role:'음악 궤도 심볼',bg:'dark'});
for(const [id,which,color]of [[44,'headphones',P.lilac],[45,'vinyl',P.cyan],[46,'spark',P.paper]])await add('05-symbols',`${id}-buddy-${which}`,1260,1200,buddy(which,color),{px:5000,role:`음악 캐릭터 / ${which}`,bg:'light'});
await add('05-symbols','47-map-pin',1100,1400,`<path d="M550 1310C490 1220 130 780 130 500a420 420 0 1 1 840 0c0 280-360 720-420 810Z" fill="${P.pink}" stroke="${P.ink}" stroke-width="7"/>`+vinyl(550,500,275,P.ink,P.lilac)+asterisk(550,500,105,P.paper,6,20),{px:5000,role:'취향 지도 핀',bg:'light'});
await add('05-symbols','48-crosshair-ink',1200,1200,circle(600,600,420,'none',`stroke="${P.ink}" stroke-width="3"`)+circle(600,600,220,'none',`stroke="${P.ink}" stroke-width="3"`)+circle(600,600,40,P.pink)+cross(600,600,560,P.ink,3),{px:4096,role:'지도 좌표 크로스헤어',bg:'light'});
await add('05-symbols','49-discover-arrow',1200,1200,arrow(600,600,940,P.ink),{px:4096,role:'확장·탐색 화살표',bg:'light'});
let bloom='';for(let i=0;i<12;i++)bloom+=`<ellipse cx="600" cy="350" rx="80" ry="240" fill="none" stroke="${i%3===0?P.pink:i%3===1?P.purple:P.cyan}" stroke-width="6" transform="rotate(${i*30} 600 600)"/>`;
await add('05-symbols','50-sound-bloom',1200,1200,bloom+circle(600,600,110,P.acid),{px:4096,role:'음악 취향이 피어나는 사운드 블룸',bg:'light'});
await add('05-symbols','51-disc-icon',1200,1200,vinyl(600,600,540,P.ink,P.lilac),{px:4096,role:'레코드 심볼',bg:'light'});
await add('05-symbols','52-star-spark',1200,1200,burst(600,600,550,4,.08,P.paper,-Math.PI/2),{px:4096,role:'별자리 스파크',bg:'dark'});

// Practical inverse-color alternatives for both black and white poster grounds.
for(const [original,name,from,to,bg]of [
 ['17-type-korean-hero','53-type-korean-hero-white',P.ink,P.paper,'dark'],
 ['16-type-your-taste','54-type-your-taste-white',P.ink,P.paper,'dark'],
 ['14-wordmark-outline','55-wordmark-outline-ink',P.paper,P.ink,'light'],
 ['43-orbital-rings','56-orbital-rings-ink',P.paper,P.ink,'light'],
 ['49-discover-arrow','57-discover-arrow-white',P.ink,P.paper,'dark'],
 ['04-taste-cloud-white','58-taste-cloud-ink',P.paper,P.ink,'light'],
 ['03-torus-halftone-lilac','59-torus-halftone-ink',P.lilac,P.ink,'light'],
 ['52-star-spark','60-star-spark-ink',P.paper,P.ink,'light'],
]){const a=bodies.get(original);await add('06-inverse',name,a.w,a.h,a.body.replaceAll(from,to),{px:6000,role:'밝고 어두운 배경용 반전 컬러',bg});}

function place(name,x,y,w,h){const a=bodies.get(name),s=Math.min(w/a.w,h/a.h);return `<g transform="translate(${x} ${y}) scale(${s})">${a.body}</g>`;}
function masthead(w=1400,dark=true){const c=dark?P.paper:P.ink;return type('SPECTRA / GRADUATION DESIGN STUDIO 2026',65,55,w-130,27,{font:'regular',color:c})+line(65,110,w-65,110,c,1.5);}
function poster(dark=true){const w=1400,h=1980,c=dark?P.paper:P.ink;let b=rect(0,0,w,h,dark?P.ink:P.paper)+masthead(w,dark);
  if(dark){b+=logo(65,165,1270,P.paper)+place('03-torus-halftone-lilac',70,340,1260,1170)+place('22-tape-music-white',-90,940,1580,210)+`<g transform="rotate(-12 700 1150)">${place('25-tape-spectrum',-180,1110,1760,240)}</g>`+place('41-starburst-pink',1050,400,270,270)+place('49-discover-arrow',1115,465,130,130)+type('좋아하는 음악이',70,1530,1130,90,{font:'ko',color:c})+type('나만의 지도가 됩니다.',70,1650,1220,90,{font:'ko',color:c});}
  else{b+=logo(65,165,1270,P.ink)+place('02-orbit-halftone-ink',80,430,1240,1150)+tag('YOUR MUSIC TASTE MAP',65,345,670,75,P.lilac)+place('39-badge-press-play',1010,315,320,320)+place('06-constellation-spectrum',285,610,900,900)+`<g transform="rotate(-9 700 1400)">${place('24-tape-discover-black',-80,1220,1560,208)}</g>`+type('음악으로 발견하는',65,1590,1270,83,{font:'ko'})+type('나의 스펙트라',65,1705,1270,83,{font:'ko'});}
  b+=line(65,1820,1335,1820,c,2)+type('01 UNDERSTAND / 02 CLUSTER / 03 EXPAND',65,1860,1270,30,{color:c,font:'regular'})+type('CHANG HYUN PARK / 20200278',65,1920,850,23,{color:c,font:'regular'});return b;
}
for(const [name,dark]of [['A2-01-dark-collage',true],['A2-02-light-atlas',false]]){
  const body=poster(dark);await add('07-layout-examples',name,1400,1980,body,{px:7016,transparent:false,role:'A2 포스터 조합 예시 / 420 × 594 mm',bg:dark?'dark':'light'});
  const file=path.join(out,'07-layout-examples',name+'.svg');if(fs.existsSync(file))fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('width="1400" height="1980"','width="420mm" height="594mm"'));
}

fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({created:'2026-11-01',palette:P,vectorAssets:manifest.length,previewOnly,assets:manifest},null,2));

// Contact sheet thumbnails are embedded, making the overview a standalone image.
const cols=6,cw=460,ch=410,rows=Math.ceil(manifest.length/cols),sheetW=cols*cw,sheetH=rows*ch+240;
let sheet=rect(0,0,sheetW,sheetH,P.ink)+logo(40,38,1200,P.paper)+type('GRAPHIC MATERIALS / 2026.11',1600,65,1100,50,{color:P.lilac,font:'regular'});
manifest.forEach((a,i)=>{const x=(i%cols)*cw,y=210+Math.floor(i/cols)*ch,fill=a.previewBackground==='dark'?'#262629':P.paper;const base=fs.readFileSync(path.join(out,'.thumbs',a.name+'.png')).toString('base64');sheet+=rect(x+12,y+8,cw-24,320,fill,12)+`<image x="${x+28}" y="${y+25}" width="${cw-56}" height="285" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${base}"/>`+type(a.name,x+20,y+347,cw-40,24,{color:P.paper,font:'regular'})+type(`${a.width} × ${a.height} PX / SVG`,x+20,y+382,cw-40,14,{color:P.lilac,font:'regular'});});
fs.writeFileSync(path.join(out,'CONTACT-SHEET.png'),new Resvg(wrap(sheetW,sheetH,sheet)).render().asPng());

const cards=manifest.map(a=>`<article class="asset" data-group="${a.group}"><div class="art ${a.previewBackground}" tabindex="0" title="클릭해 배경 전환"><img src=".thumbs/${a.name}.png" alt="${esc(a.role)}" loading="lazy"></div><div class="detail"><h2>${a.name}</h2><p>${a.role}</p><small>${a.width.toLocaleString()} × ${a.height.toLocaleString()} px · ${a.transparent?'투명 PNG':'배경 포함'} · SVG</small><nav><a download href="${a.svg}">SVG ↓</a><a download href="${a.png}">PNG ↓</a></nav></div></article>`).join('');
const groups=[...new Set(manifest.map(a=>a.group))];
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SPECTRA — Graphic Materials</title><style>*{box-sizing:border-box}body{margin:0;background:#171719;color:#f7f5ef;font-family:Arial,'Apple SD Gothic Neo',sans-serif}header{padding:58px 4vw 40px;border-bottom:1px solid #444}header svg{max-width:900px;width:90%;height:auto;display:block}header h1{font-size:clamp(26px,4vw,58px);letter-spacing:-.05em;line-height:1.1;margin:28px 0 18px}header p{line-height:1.7;color:#cec2ff;max-width:800px}header small{color:#aaa}.filters{padding:26px 4vw;display:flex;gap:8px;flex-wrap:wrap;position:sticky;top:0;background:#171719f5;z-index:1}button{border:1px solid #666;background:none;color:inherit;border-radius:30px;padding:11px 17px;cursor:pointer}button.active{background:#cec2ff;color:#171719;border-color:#cec2ff}main{padding:0 4vw 60px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.asset{border:1px solid #444;border-radius:16px;overflow:hidden}.art{height:310px;display:grid;place-items:center;cursor:pointer;background-image:linear-gradient(45deg,#ffffff08 25%,transparent 25%),linear-gradient(-45deg,#ffffff08 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ffffff08 75%),linear-gradient(-45deg,transparent 75%,#ffffff08 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.art.light{background-color:#f7f5ef}.art.dark{background-color:#262629}.art img{max-width:92%;max-height:90%;object-fit:contain}.detail{padding:19px}.detail h2{font-size:17px;margin:0 0 8px;word-break:break-word}.detail p{font-size:14px;color:#cec2ff;margin:0 0 14px}.detail small{font-size:12px;color:#aaa}nav{display:flex;gap:10px;margin-top:18px}a{color:inherit;text-decoration:none;border:1px solid #666;border-radius:30px;padding:9px 18px;font-size:13px}a:hover{background:#cec2ff;color:#171719}footer{padding:30px 4vw 60px;border-top:1px solid #444;color:#aaa;line-height:1.8}.hidden{display:none}@media(max-width:1000px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){main{grid-template-columns:1fr}.art{height:300px}.filters{position:static}}</style><header>${wrap(1200,110,logo(0,0,1200,'url(#spectrum)'))}<h1>음악으로 그리는 나만의 지도.<br>포스터를 위한 그래픽 재료 ${manifest.length}종.</h1><p>하프톤 조형, 취향 군집, 장르 스티커, 타이포 리본과 음악 캐릭터.<br>도형과 글자를 편집할 수 있는 SVG + 고해상도 PNG를 함께 담았습니다.</p><small>2026.11.01 / PREVIEW BACKGROUND는 재료를 클릭하면 바뀝니다. / 모든 글자는 패스로 변환되어 폰트 설치가 필요 없습니다.</small></header><div class="filters"><button class="active" data-filter="all">ALL / ${manifest.length}</button>${groups.map(g=>`<button data-filter="${g}">${g}</button>`).join('')}</div><main>${cards}</main><footer>SVG는 실제 벡터 도형과 패스로 구성되어 확대와 색상 수정이 가능합니다. PNG는 RGB이며 투명 배경을 유지했습니다(조합 예시 제외).<br>A2 조합 예시: 420 × 594 mm SVG / 약 300 ppi PNG. 지도와 카피는 포스터 설명용 일러스트입니다.<br>레퍼런스: 사용자가 제공한 무드보드. Behance 링크는 열리지 않아 페이지 내용을 직접 차용하지 않았습니다.</footer><script>document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.asset').forEach(x=>x.classList.toggle('hidden',b.dataset.filter!=='all'&&x.dataset.group!==b.dataset.filter))});document.querySelectorAll('.art').forEach(x=>{const flip=()=>{x.classList.toggle('light');x.classList.toggle('dark')};x.onclick=flip;x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}}});</script></html>`;
fs.writeFileSync(path.join(out,'index.html'),html);
console.log(`COMPLETE: ${manifest.length} SVG + ${manifest.length} PNG. ${previewOnly?'PREVIEW RESOLUTION ONLY':'FULL RESOLUTION'}`);
