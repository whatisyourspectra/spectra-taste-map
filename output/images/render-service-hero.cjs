const {Resvg}=require('/tmp/spectra-brand-render/node_modules/@resvg/resvg-js');
const fs=require('node:fs');const path=require('node:path');
const dir=__dirname;const data=f=>'data:image/png;base64,'+fs.readFileSync(path.join(dir,f)).toString('base64');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="4096" height="4096" viewBox="0 0 4096 4096">
<defs>
<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#BB84FA"/><stop offset=".52" stop-color="#979CFF"/><stop offset="1" stop-color="#70D6FF"/></linearGradient>
<linearGradient id="line"><stop stop-color="#ED70BC"/><stop offset="1" stop-color="#70D6FF"/></linearGradient>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
<clipPath id="screen"><rect x="170" y="795" width="3756" height="2347.5" rx="86"/></clipPath>
</defs>
<image width="4096" height="4096" xlink:href="${data('spectra-hero-square-background-4096.png')}"/>
<rect x="160" y="785" width="3776" height="2367.5" rx="96" fill="#050812" stroke="url(#edge)" stroke-width="15" opacity=".6" filter="url(#glow)"/>
<rect x="158" y="783" width="3780" height="2371.5" rx="98" fill="#080C17" stroke="url(#edge)" stroke-width="5"/>
<image x="170" y="795" width="3756" height="2347.5" xlink:href="${data('spectra-service-selected-source.png')}" clip-path="url(#screen)"/>
<text x="2048" y="3430" text-anchor="middle" font-family="Apple SD Gothic Neo" font-size="105" font-weight="500" fill="#DCE4F5">음악으로 발견하는 나의 스펙트라</text>
<text x="2048" y="3660" text-anchor="middle" font-family="Syne" font-size="78" font-weight="600" letter-spacing="10" fill="#91A6C5">spectra-music.org</text>
<rect x="1858" y="3820" width="380" height="5" fill="url(#line)"/>
</svg>`;
fs.writeFileSync(path.join(dir,'spectra-hero-service-square-v2.svg'),svg);
const render=new Resvg(svg,{font:{loadSystemFonts:true,fontFiles:[path.resolve(dir,'../video/intro15/assets/Syne-SemiBold.ttf')]}});
const png=render.render().asPng();fs.writeFileSync(path.join(dir,'spectra-hero-service-square-4096-v2.png'),png);console.log('4096 × 4096 PNG:',png.length,'bytes');
