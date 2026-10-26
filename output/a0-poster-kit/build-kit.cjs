const fs=require('node:fs'),path=require('node:path');
const {Resvg}=require('/tmp/spectra-brand-render/node_modules/@resvg/resvg-js');
const QR=require('../../node_modules/qrcode');
const root=path.resolve(__dirname,'../..'),out=__dirname;
const fontFiles=[path.join(root,'output/video/intro15/assets/Syne-SemiBold.ttf'),path.join(root,'output/video/intro15/assets/Syne-ExtraBold.ttf')];
const TAU=Math.PI*2,palette=['#70D6FF','#ED70BC','#B5A0FF'];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const data=(file,mime='image/png')=>`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
const logo=data(path.join(root,'public/spectra-wordmark.svg'),'image/svg+xml');
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function hslRgb(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l);return '#'+[0,8,4].map(n=>{const k=(n+h/30)%12,v=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*v).toString(16).padStart(2,'0');}).join('');}
const manifest=[];
const common=`<defs><radialGradient id="glow"><stop stop-color="#8279DD" stop-opacity=".22"/><stop offset="1" stop-color="#111629" stop-opacity="0"/></radialGradient><linearGradient id="brand"><stop stop-color="#ED70BC"/><stop offset=".5" stop-color="#C084FC"/><stop offset="1" stop-color="#70D6FF"/></linearGradient></defs>`;
function svg(w,h,body){return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${common}${body}</svg>`;}
function text(s,x,y,size=26,color='#DDE6F9',weight=500,anchor='start'){return `<text x="${x}" y="${y}" font-family="Apple SD Gothic Neo" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;}
function tracked(s,x,y,size=20,color='#98AECB',anchor='start'){return `<text x="${x}" y="${y}" font-family="Syne" font-size="${size}" font-weight="600" letter-spacing="3" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;}
function bg(w,h){return `<rect width="${w}" height="${h}" fill="#060911"/><ellipse cx="${w*.6}" cy="${h*.44}" rx="${w*.65}" ry="${h*.6}" fill="url(#glow)"/>`;}
function wire({cx=1200,cy=850,scale=420,rotation=1.175,tilt=.93,blend=0,alpha=.9,clock=8.37}={}){
 const project=(x,y,z)=>{const rx=x*Math.cos(rotation)-z*Math.sin(rotation),rz=x*Math.sin(rotation)+z*Math.cos(rotation),ry=y*Math.cos(tilt)-rz*Math.sin(tilt),depth=y*Math.sin(tilt)+rz*Math.cos(tilt),p=5/(5+depth);return [cx+rx*scale*p,cy+ry*scale*p,depth];};
 let body='';
 for(let s=0;s<96;s++){
  const v=s/96*TAU,pts=[];
  for(let step=0;step<=360;step++){
   const t=step/360*TAU,pulse=.13*Math.sin(t*3+clock),r=1.25+(.43+pulse)*Math.cos(t*3+v);
   const orbit=[r*Math.cos(t*2),r*Math.sin(t*2),.62*Math.sin(t*3+v)],field=[(t/TAU-.5)*4.6,Math.sin(t*1.7+v*.38)*.7+Math.cos(v)*.55,Math.sin(v)*.7+Math.cos(t*2+clock)*.3];
   const p=project(...orbit.map((n,i)=>n+(field[i]-n)*blend));pts.push(`${p[0].toFixed(2)},${p[1].toFixed(2)}`);
  }
  body+=`<polyline points="${pts.join(' ')}" fill="none" stroke="${hslRgb(195+s/96*130,88,67+12*Math.sin(v+clock*.4))}" stroke-opacity="${(.32+.24*Math.sin(v)**2)*alpha}" stroke-width="${s%8===0?1.7:.9}"/>`;
 }
 for(let i=0;i<700;i++){
  const t=rand(i+13)*TAU+clock*.18,v=rand(i+3000)*TAU,r=1.25+.43*Math.cos(t*3+v),orbit=[r*Math.cos(t*2),r*Math.sin(t*2),.62*Math.sin(t*3+v)],field=[(rand(i+13)-.5)*4.6,Math.sin(t*1.7+v*.38)*.7+Math.cos(v)*.55,Math.sin(v)*.7+Math.cos(t*2+clock)*.3];
  const p=project(...orbit.map((n,j)=>n+(field[j]-n)*blend));body+=`<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="${(.5+rand(i+30)*1.3).toFixed(2)}" fill="${palette[i%3]}" opacity="${alpha*.55}"/>`;
 }
 return body;
}
const groups=[
 [['currents','The Less I Know the Better','Tame Impala'],['depression-cherry','Space Song','Beach House'],['cigarettes-after-sex','Apocalypse','Cigarettes After Sex'],['show-me-how','Show Me How','Men I Trust'],['salad-days','Chamber of Reflection','Mac DeMarco'],['slow-rush','Breathe Deeper','Tame Impala']],
 [['random-access-memories','Get Lucky','Daft Punk'],['outrun','Nightcall','Kavinsky'],['justice','D.A.N.C.E.','Justice'],['after-hours','Blinding Lights','The Weeknd'],['discovery','Harder, Better, Faster, Stronger','Daft Punk'],['starboy','Starboy','The Weeknd']],
 [['geography','South of the River','Tom Misch'],['lady-lady','Tadow','Masego, FKJ'],['team-baby','Everything Goes','The Black Skirts'],['every-letter','Square','Yerin Baek'],['bewitched','From the Start','Laufey'],['geography','Disco Yes','Tom Misch']]
];
const covers=new Map(groups.flat().map(([key])=>[key,data(path.join(root,`public/demo-covers/${key}.jpg`),'image/jpeg')]));
function cover(key,x,y,r,id,color='#70D6FF',square=false){return `<defs><clipPath id="${id}">${square?`<rect x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" rx="${r*.3}"/>`:`<circle cx="${x}" cy="${y}" r="${r}"/>`}</clipPath></defs><image x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" preserveAspectRatio="xMidYMid slice" xlink:href="${covers.get(key)}" clip-path="url(#${id})"/>${square?`<rect x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" rx="${r*.3}" fill="none" stroke="${color}" stroke-opacity=".75" stroke-width="2"/>`:`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-opacity=".75" stroke-width="2"/>`}`;}
function atlas(stage,w=1200,h=1000,prefix='a'){
 const centers=[[28,35],[73,37],[49,73]],pts=[];let body='';
 if(stage>0)for(let g=0;g<3;g++)body+=`<ellipse cx="${centers[g][0]/100*w}" cy="${centers[g][1]/100*h}" rx="${w*.22}" ry="${h*.20}" fill="${palette[g]}" opacity=".055"/>`;
 for(let g=0;g<3;g++)for(let j=0;j<6;j++){
  const i=g*6+j,angle=stage===0?i*2.39996:j*Math.PI/3-.6,r=9+Math.sqrt(i)*8.1;
  const x=(stage===0?50+Math.cos(angle)*r:centers[g][0]+Math.cos(angle)*(stage===2?19:13))/100*w;
  const y=(stage===0?50+Math.sin(angle)*r*.83:centers[g][1]+Math.sin(angle)*(stage===2?18:12))/100*h;
  pts.push({x,y,g,j,key:groups[g][j][0]});
 }
 if(stage===2){const origin=pts[0],neighbors=pts.slice(1).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y)).slice(0,5);for(const p of neighbors)body+=`<line x1="${origin.x}" y1="${origin.y}" x2="${p.x}" y2="${p.y}" stroke="#70D6FF" stroke-width="2.5" opacity=".8"/>`;}
 for(let i=0;i<pts.length;i++){const p=pts[i],r=p.j===0?w*.042:w*(.028+p.j*.0018);body+=cover(p.key,p.x,p.y,r,`${prefix}-${i}`,palette[p.g]);}
 return body;
}
function constellation(w=1800,h=1200){
 const nodes=[['slow-rush',.48,.45],['currents',.35,.28],['depression-cherry',.68,.17],['cigarettes-after-sex',.28,.61],['salad-days',.12,.78],['show-me-how',.72,.68],['every-letter',.5,.82],['bewitched',.88,.46]];
 const edges=[[0,1],[1,2],[0,3],[3,4],[0,5],[5,6],[0,7]];let b='';
 for(const [i,j]of edges){const a=nodes[i],c=nodes[j];b+=`<line x1="${a[1]*w}" y1="${a[2]*h}" x2="${c[1]*w}" y2="${c[2]*h}" stroke="#70D6FF" stroke-width="3.5" opacity=".7"/>`;}
 for(let i=0;i<nodes.length;i++){const [key,x,y]=nodes[i];if(i===0)b+=`<circle cx="${x*w}" cy="${y*h}" r="81" fill="none" stroke="#B5A0FF" stroke-width="2" opacity=".6"/><circle cx="${x*w}" cy="${y*h}" r="97" fill="none" stroke="#70D6FF" opacity=".2"/>`;b+=cover(key,x*w,y*h,i===0?66:48,'const-'+i,palette[i%3],true);}
 return b;
}
async function save(name,w,h,body,px,role,alpha=false){
 const source=svg(w,h,body);fs.writeFileSync(path.join(out,name+'.svg'),source);
 const rendered=new Resvg(source,{fitTo:{mode:'width',value:px},font:{loadSystemFonts:true,fontFiles}}).render();
 fs.writeFileSync(path.join(out,name+'.png'),rendered.asPng());
 manifest.push({name,role,width:rendered.width,height:rendered.height,transparent:alpha,vector:true});console.log(name,rendered.width,rendered.height);
}
async function main(){
 await save('01-wire-sculpture-transparent',2400,2100,wire({cx:1200,cy:1050,scale:500,alpha:1}),6000,'메인 조형 / 투명 배경',true);
 await save('02-wire-ribbon-transparent',3000,1100,`<g transform="translate(0,240) scale(1,.55)">${wire({cx:1500,cy:550,scale:580,rotation:.2,tilt:.6,blend:.92,alpha:1})}</g>`,7000,'가로 구획·흐름 연결 그래픽 / 투명 배경',true);
 const hero=bg(2800,1700)+`<g opacity=".8">${wire({cx:1850,cy:880,scale:480,alpha:.65})}</g><image x="180" y="300" width="1520" height="140" xlink:href="${logo}"/>`+text('음악으로 발견하는 나의 스펙트라',190,560,62)+tracked('YOUR MUSIC TASTE MAP',195,665,30)+text('좋아하는 음악이 나만의 지도가 됩니다.',195,850,34,'#9CABCA');
 await save('03-main-hero-dark',2800,1700,hero,7000,'포스터 상단 메인 비주얼');
 const journey=[0,1,2].map((stage,i)=>`<g transform="translate(${i*1080},70)">${atlas(stage,1000,840,'journey'+stage)}${tracked('0'+(i+1),45,940,27,palette[i])}${text(['이해','분류','확장'][i],45,1010,64,'#DCE4F5',600)}${text(['좋아하는 음악에서 나를 이해해요.','닮은 곡을 모아 취향을 읽어요.','내 취향에서 새로운 음악으로.'][i],45,1070,31,'#A7B6D0')}</g>`).join('');
 await save('04-taste-journey-dark',3240,1240,bg(3240,1240)+journey,7200,'이해·분류·확장 3단계 설명 이미지');
 await save('05-album-atlas-transparent',1800,1500,atlas(1,1800,1500,'atlas'),6000,'장르별 취향 지도 / 투명 배경',true);
 await save('06-constellation-transparent',1800,1200,constellation(),6000,'음악 연결·별자리 / 투명 배경',true);
 let portals='';
 for(let g=0;g<3;g++){
  let b=`<circle cx="500" cy="430" r="285" stroke="${palette[g]}" opacity=".24" fill="none" stroke-width="2"/><circle cx="500" cy="430" r="204" stroke="${palette[g]}" opacity=".12" fill="none"/>`;
  for(let i=0;i<6;i++){const a=(i-1)*Math.PI/3;b+=cover(groups[g][i][0],500+Math.cos(a)*270,430+Math.sin(a)*245,70,`portal-${g}-${i}`,palette[g]);}
  b+=`<circle cx="500" cy="430" r="62" fill="${palette[g]}" opacity=".10"/><path d="M500 390 L509 420 L539 430 L509 439 L500 470 L490 439 L460 430 L490 420Z" fill="${palette[g]}"/>`;
  portals+=`<g transform="translate(${g*1080},40)">${b}${text(['드림팝 · 인디','신스웨이브 · 일렉트로','재즈 · 알앤비'][g],500,850,40,palette[g],500,'middle')}</g>`;
 }
 await save('07-genre-portals-transparent',3240,960,portals,7200,'3가지 데모 장르 포털 / 투명 배경',true);
 const portrait=bg(1682,2378)+`<g opacity=".45">${wire({cx:1070,cy:1250,scale:800,alpha:.6})}</g>`;
 await save('08-a0-content-background',1682,2378,portrait,4967,'A0 비율 무문자 배경 / SVG 인쇄용');
 fs.copyFileSync(path.join(root,'public/spectra-wordmark.svg'),path.join(out,'09-spectra-wordmark.svg'));
 await save('09-spectra-wordmark',2400,220,`<image width="2400" height="220" xlink:href="${logo}"/>`,7200,'공식 워드마크 / 투명 배경',true);
 fs.copyFileSync(path.join(root,'public/spectra-wordmark.svg'),path.join(out,'09-spectra-wordmark.svg'));
 const qr=await QR.toString('https://spectra-music.org',{type:'svg',margin:4,errorCorrectionLevel:'H',color:{dark:'#08101FFF',light:'#FFFFFFFF'}});
 fs.writeFileSync(path.join(out,'10-service-qr.svg'),qr);fs.writeFileSync(path.join(out,'10-service-qr.png'),new Resvg(qr,{fitTo:{mode:'width',value:1800}}).render().asPng());
 manifest.push({name:'10-service-qr',role:'서비스 접속 QR / 흰 바탕',width:1800,height:1800,transparent:false,vector:true});
 const qri=`data:image/svg+xml;base64,${Buffer.from(qr).toString('base64')}`;
 // A0 layout study: institutional band and author footer follow the supplied proportions.
 const a0=svg(1682,2378,`<rect width="1682" height="2378" fill="#FFF"/>${text('2026 ID40009 Graduation Design Studio',60,80,25,'#32383F')}${text('KAIST id',1622,80,26,'#6D737B',600,'end')}<g transform="translate(60,120)"><rect width="1562" height="2140" fill="#060911"/>
 <g transform="translate(60,60)"><image x="0" y="46" width="1380" height="126" xlink:href="${logo}"/>${text('음악으로 발견하는 나의 스펙트라',6,244,41)}${tracked('YOUR MUSIC TASTE MAP',8,310,21)}<g transform="translate(0,320)">${wire({cx:790,cy:330,scale:190,alpha:.96})}</g>${text('좋아하는 음악이, 나를 닮은 지도가 되다.',8,1030,47)}${text('음악 목록을 가져오고, 취향의 연결을 발견하고, 새로운 음악으로 넓혀갑니다.',8,1095,26,'#A7B6D0')}
 <g transform="translate(0,1170)">${[0,1,2].map((s,i)=>`<g transform="translate(${i*480},0)">${tracked('0'+(i+1),15,22,20,palette[i])}${text(['이해','분류','확장'][i],15,90,45)}<g transform="translate(0,100)">${atlas(s,450,350,'poster'+s)}</g>${text(['음악에서 나를 발견','닮은 곡끼리 연결','새로운 음악으로 확장'][i],15,500,23,'#ACBBD3')}</g>`).join('')}</g>
 <line x1="8" y1="1755" x2="1435" y2="1755" stroke="#28334C"/>${tracked('EXPLORE YOUR SPECTRA',8,1830,24)}${text('spectra-music.org',8,1900,39,'#A6BADE')}<image x="1245" y="1800" width="190" height="190" xlink:href="${qri}"/></g></g>${text('[Chang Hyun Park, 20200278]',60,2320,25,'#343A42')}`);
 const printSvg=a0.replace('width="1682" height="2378"','width="841mm" height="1189mm"');fs.writeFileSync(path.join(out,'A0-layout-example.svg'),printSvg);
 const preview=new Resvg(a0,{fitTo:{mode:'width',value:2523},font:{loadSystemFonts:true,fontFiles}}).render();fs.writeFileSync(path.join(out,'A0-layout-example.png'),preview.asPng());
 fs.writeFileSync(path.join(out,'asset-manifest.json'),JSON.stringify(manifest,null,2));
 const thumbs=manifest.map((a,i)=>{const x=(i%3)*560,y=Math.floor(i/3)*410;return `<g transform="translate(${x},${y})"><rect x="12" y="12" width="536" height="330" rx="14" fill="#101629"/><image x="25" y="25" width="510" height="300" preserveAspectRatio="xMidYMid meet" xlink:href="${data(path.join(out,a.name+'.png'))}"/>${text(a.name,25,373,20,'#CAD5EC')}</g>`;}).join('');
 fs.writeFileSync(path.join(out,'asset-contact-sheet.png'),new Resvg(svg(1680,1230,bg(1680,1230)+thumbs),{font:{loadSystemFonts:true,fontFiles}}).render().asPng());
 console.log('KIT COMPLETE');
}
main().catch(e=>{console.error(e);process.exit(1)});
