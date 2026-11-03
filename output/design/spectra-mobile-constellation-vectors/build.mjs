import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {getCombinedDemoTracks} from '../../../src/taste/demoUniverses.js';
import {buildTasteState} from '../../../src/taste/buildTasteState.js';
import {buildAvatarState} from '../../../src/avatar/buildAvatarState.js';
import {projectSpectra} from '../../../src/reflection/projectSpectra.js';

const out=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const {Resvg}=require('/private/tmp/spectra-poster-tools/node_modules/@resvg/resvg-js');
for(const dir of ['svg','png','previews','sources'])fs.mkdirSync(path.join(out,dir),{recursive:true});
const tracks=getCombinedDemoTracks();
const taste=buildTasteState(tracks);
const avatar=buildAvatarState(taste,tracks);
// A clearly labeled design fixture adds a denser, more varied example like the
// supplied screenshot, without claiming access to its personal song library.
const sampleGenres=[['electronic',16],['house',12],['pop',10],['indie',6],['jazz',5],['rock',4],['ambient',4],['r&b',4],['neo soul',3],['disco',2],['techno',2],['classical',2],['drum and bass',2]];
const sampleTracks=sampleGenres.flatMap(([genre,count],g)=>Array.from({length:count},(_,i)=>({id:`illustrative-${g}-${i}`,name:`Design sample ${g+1}-${i+1}`,artists:'Illustrative data',genres:[genre],energy:.6,valence:.5})));
const sampleAvatar=buildAvatarState(buildTasteState(sampleTracks),sampleTracks);
fs.writeFileSync(path.join(out,'sources/illustrative-avatar-state.json'),JSON.stringify({illustrative:true,trackCount:sampleTracks.length,avatar:sampleAvatar},null,2));
const source={trackCount:tracks.length,method:'buildTasteState → buildAvatarState → projectSpectra',taste,avatar};
fs.writeFileSync(path.join(out,'sources/avatar-state.json'),JSON.stringify(source,null,2));
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const n=value=>Number(value.toFixed(4));
const schemes=[
 {file:'01-spectra-glow-transparent',label:'Original · Transparent',yaw:0,pitch:0},
 {file:'02-spectra-glow-dark',label:'Original · Dark background',yaw:0,pitch:0,bg:'#090d16'},
 {file:'03-spectra-rotation-a',label:'Rotation A · Transparent',yaw:.72,pitch:-.24},
 {file:'04-spectra-rotation-b',label:'Rotation B · Transparent',yaw:-.64,pitch:.42},
 {file:'05-spectra-crisp-color',label:'Print · Solid color',yaw:0,pitch:0,flat:true},
 {file:'06-spectra-crisp-white',label:'Print · White ink',yaw:0,pitch:0,flat:true,white:true},
 {file:'07-spectra-stars-only',label:'Separate layer · Stars',yaw:0,pitch:0,starsOnly:true},
 {file:'08-spectra-links-only',label:'Separate layer · Connections',yaw:0,pitch:0,linksOnly:true},
 {file:'09-spectra-dense-example',label:'Dense example · Transparent',yaw:0,pitch:0,illustrative:true},
 {file:'10-spectra-dense-example-dark',label:'Dense example · Dark',yaw:0,pitch:0,illustrative:true,bg:'#090d16'},
];
function draw(variant){
 const a=projectSpectra(variant.illustrative?sampleAvatar:avatar,{yaw:variant.yaw,pitch:variant.pitch,zoom:1});
 const points=a.nodes;
 // Shared square frame across all exports, with room for the complete aura.
 const minX=Math.min(...points.map(p=>p.x-p.radius*6)),maxX=Math.max(...points.map(p=>p.x+p.radius*6));
 const minY=Math.min(...points.map(p=>p.y-p.radius*6)),maxY=Math.max(...points.map(p=>p.y+p.radius*6));
 const extent=Math.max(maxX-minX,maxY-minY)*1.18;
 // Default, stars-only and links-only have identical coordinates and frame.
 const vx=(minX+maxX-extent)/2,vy=(minY+maxY-extent)/2;
 const color=p=>variant.white?'#ffffff':p.color;
 const defs=`<defs>${a.nodes.map((p,i)=>`<radialGradient id="star-${i}"><stop stop-color="${p.color}" stop-opacity=".5"/><stop offset=".35" stop-color="${p.color}" stop-opacity=".14"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></radialGradient>`).join('')}${a.regions.map((r,i)=>`<radialGradient id="region-${i}"><stop stop-color="${r.color}" stop-opacity=".15"/><stop offset=".35" stop-color="${r.color}" stop-opacity=".042"/><stop offset="1" stop-color="${r.color}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`;
 const ambient=!variant.flat&&!variant.linksOnly?`<g id="region-auras">${a.regions.slice(0,8).map((r,i)=>`<circle cx="${n(r.x)}" cy="${n(r.y)}" r="${n(40+r.strength*28)}" fill="url(#region-${i})"/>`).join('')}</g>`:'';
 const links=!variant.starsOnly?`<g id="connections" fill="none" stroke-linecap="round">${a.edges.map((e,i)=>`<line id="link-${i}" x1="${n(e.a.x)}" y1="${n(e.a.y)}" x2="${n(e.b.x)}" y2="${n(e.b.y)}" stroke="${variant.white?'#fff':e.color}" stroke-width="${e.secondary?.65:.8}" opacity="${variant.flat?(e.secondary?.4:.68):(e.secondary?.18:.34)}"/>`).join('')}</g>`:'';
 const stars=!variant.linksOnly?`<g id="stars">${a.nodes.map((p,i)=>`<g id="star-node-${i}" data-track-id="${esc(p.id)}" opacity="${variant.flat?1:n(p.opacity)}"><title>${esc(p.title)}</title>${!variant.flat?`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.radius*5)}" fill="url(#star-${i})"/>`:''}<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.radius)}" fill="${color(p)}"/>${!variant.white?`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.radius*.43)}" fill="#fff"/>`:''}${p.radius>4?`<path d="M${n(p.x-6)} ${n(p.y)}h12 M${n(p.x)} ${n(p.y-6)}v12" fill="none" stroke="#fff" stroke-width=".45" opacity=".45"/>`:''}</g>`).join('')}</g>`:'';
 return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="4096" height="4096" viewBox="${n(vx)} ${n(vy)} ${n(extent)} ${n(extent)}" role="img" aria-labelledby="title desc"><title id="title">SPECTRA — ${variant.label}</title><desc id="desc">Example generated with the application's own mobile constellation geometry from ${variant.illustrative?'72 illustrative design samples':'69 demo tracks'}; ${a.nodes.length} vector stars and ${a.edges.length} connections. No embedded raster images. This is not the personal 1932-track library shown in the reference.</desc>${defs}${variant.bg?`<rect id="background" x="${n(vx)}" y="${n(vy)}" width="${n(extent)}" height="${n(extent)}" fill="${variant.bg}"/>`:''}${ambient}${links}${stars}</svg>`;
}
const manifest=[];
for(const variant of schemes){
 const svg=draw(variant);
 fs.writeFileSync(path.join(out,'svg',variant.file+'.svg'),svg);
 for(const [folder,width]of [['png',4096],['previews',1000]]){
  const png=new Resvg(svg,{fitTo:{mode:'width',value:width}}).render().asPng();
  fs.writeFileSync(path.join(out,folder,variant.file+'.png'),png);
 }
 const base=variant.illustrative?sampleAvatar:avatar;
 manifest.push({...variant,svg:'svg/'+variant.file+'.svg',png:'png/'+variant.file+'.png',width:4096,height:4096,stars:base.nodes.length,connections:base.edges.length});
 console.log('Exported',variant.file);
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({sourceTracks:tracks.length,vector:true,embeddedRaster:false,variants:manifest},null,2));
fs.writeFileSync(path.join(out,'START-HERE.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SPECTRA — Constellation Vectors</title><style>*{box-sizing:border-box}body{background:#090d16;color:#f0f3fb;font:16px system-ui,sans-serif;margin:0;padding:4vw}h1{font-size:clamp(32px,5vw,72px);letter-spacing:-.05em;margin-bottom:16px}header p{color:#9aadc8;line-height:1.7}button,a{display:inline-block;border:1px solid #43526c;border-radius:30px;background:none;color:inherit;padding:10px 18px;text-decoration:none;cursor:pointer;margin-right:8px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:32px}article{border:1px solid #29374b;border-radius:16px;overflow:hidden;padding-bottom:20px}.stage{aspect-ratio:1;background:#090d16}.light .stage{background:#eeeef0}.stage img{width:100%;height:100%;object-fit:contain}article h2,article p,article nav{margin-left:20px;margin-right:20px}article h2{font-size:18px}article p{color:#9aadc8;font-size:13px}.note{max-width:900px;color:#9aadc8;line-height:1.7}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:550px){.grid{grid-template-columns:1fr}}</style><header><p>SPECTRA / MOBILE CONSTELLATION</p><h1>확대해도 선명한 나의 스펙트라</h1><p>앱의 실제 생성 코드 · 데모 69곡 기반 8종 + 디자인용 72개 샘플 기반 2종 · SVG 10종 · PNG 4096 × 4096</p><button onclick="document.body.classList.toggle('light')">미리보기 배경 바꾸기</button><a href="README.md">사용 안내</a></header><main class="grid">${manifest.map(v=>`<article><div class="stage"><img src="previews/${v.file}.png" alt="${v.label}" loading="lazy"></div><h2>${v.label}</h2><p>실제 벡터 · 선 / 원 / 그라디언트</p><nav><a href="${v.svg}" download>SVG ↗</a><a href="${v.png}" download>4K PNG ↗</a></nav></article>`).join('')}</main><p class="note">SVG는 스크린샷을 감싼 파일이 아니라 개별 선·원·방사형 그라디언트로 구성되어 있습니다. 투명 배경에서 흰색 버전은 어두운 바탕에 사용하세요. 첨부 화면의 개인 라이브러리 1,932곡과 같은 형태를 복원한 것은 아니며, 현재 프로젝트의 데모 데이터로 생성한 예시입니다. 01 / 07 / 08은 같은 좌표와 프레임이므로 겹쳐서 편집할 수 있습니다.</p></html>`);
