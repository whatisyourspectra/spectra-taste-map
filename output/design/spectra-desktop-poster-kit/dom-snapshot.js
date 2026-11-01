// Runs inside Chromium. Preserves layout as native SVG shapes and text runs.
// Image artwork and canvas layers are embedded; no foreignObject is used.
window.snapshotUI=async function(selector){
 const root=document.querySelector(selector);if(!root)throw Error('Missing UI: '+selector);
 const bounds=root.getBoundingClientRect();if(bounds.width<1||bounds.height<1)throw Error('Hidden UI: '+selector);
 const pad=20,defs=[],runs=[];let seq=0;
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const num=n=>Number(n.toFixed(3));
 const box=r=>({x:num(r.left-bounds.left+pad),y:num(r.top-bounds.top+pad),w:num(r.width),h:num(r.height)});
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 const transparent=c=>!c||c==='transparent'||c==='rgba(0, 0, 0, 0)';
 const cache=new Map();
 const data=async url=>{if(!url||url.startsWith('data:'))return url;if(cache.has(url))return cache.get(url);const promise=(async()=>{try{const r=await fetch(url);const blob=await r.blob();return await new Promise(res=>{const f=new FileReader();f.onload=()=>res(f.result);f.readAsDataURL(blob)});}catch{return null;}})();cache.set(url,promise);return promise;};
 function split(s){const out=[];let start=0,depth=0;for(let i=0;i<s.length;i++){if(s[i]==='(')depth++;if(s[i]===')')depth--;if(s[i]===','&&depth===0){out.push(s.slice(start,i).trim());start=i+1;}}out.push(s.slice(start).trim());return out;}
 function gradient(s,b){if(!s||s==='none')return '';const first=split(s)[0],radial=first.startsWith('radial-gradient('),linear=first.startsWith('linear-gradient(');if(!radial&&!linear)return '';const parts=split(first.slice(first.indexOf('(')+1,-1));let angle=180;if(parts[0].includes('deg'))angle=parseFloat(parts.shift());else if(!/^(#|rgb|hsl|transparent)/.test(parts[0]))parts.shift();const id='grad-'+seq++;const stops=parts.map((v,i)=>{const m=v.match(/^(rgba?\([^)]*\)|#[a-fA-F0-9]+|[a-z]+)(?:\s+([\d.]+)%?)?/);if(!m)return '';return `<stop offset="${m[2]?parseFloat(m[2])/100:i/Math.max(1,parts.length-1)}" stop-color="${m[1]}"/>`;}).join('');if(radial)defs.push(`<radialGradient id="${id}">${stops}</radialGradient>`);else{const a=angle*Math.PI/180,dx=Math.sin(a)/2,dy=-Math.cos(a)/2;defs.push(`<linearGradient id="${id}" x1="${.5-dx}" y1="${.5-dy}" x2="${.5+dx}" y2="${.5+dy}">${stops}</linearGradient>`);}return 'url(#'+id+')';}
 function textRuns(node){const s=getComputedStyle(node.parentElement);if(s.visibility==='hidden'||s.display==='none')return '';let current=null;const start=runs.length;
  const content=node.textContent;if(!content.trim())return '';
  for(let i=0;i<content.length;i++){const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;const b=box(r);if(!current||Math.abs(current.y-b.y)>.7||b.x<current.x-1){if(current)runs.push(current);current={text:'',x:b.x,y:b.y,width:0,height:b.h,size:parseFloat(s.fontSize),font:s.fontFamily,weight:parseInt(s.fontWeight)||400,color:s.color,spacing:parseFloat(s.letterSpacing)||0,transform:s.textTransform};}current.text+=content[i];current.width=b.x+b.w-current.x;
  }if(current)runs.push(current);
  let clip={left:bounds.left,top:bounds.top,right:bounds.right,bottom:bounds.bottom},opacity=1;
  for(let p=node.parentElement;p;p=p.parentElement){const st=getComputedStyle(p);opacity*=parseFloat(st.opacity)||0;if(p!==root&&/hidden|auto|scroll|clip/.test(st.overflow+' '+st.overflowY)){const r=p.getBoundingClientRect();clip={left:Math.max(clip.left,r.left),top:Math.max(clip.top,r.top),right:Math.min(clip.right,r.right),bottom:Math.min(clip.bottom,r.bottom)};}if(p===root)break;}
  const cb={x:clip.left-bounds.left+pad,y:clip.top-bounds.top+pad,w:Math.max(0,clip.right-clip.left),h:Math.max(0,clip.bottom-clip.top)};
  for(let i=start;i<runs.length;i++){runs[i].clip=cb;runs[i].opacity=opacity;}
  return '';
 }
 async function nativeSVG(el,b){const clone=el.cloneNode(true),orig=[el,...el.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];for(let i=0;i<orig.length;i++){const s=getComputedStyle(orig[i]),target=copies[i];for(const name of ['fill','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','stroke-dasharray','opacity','paint-order']){const v=s.getPropertyValue(name).replace(/url\(["']?[^)]*#([^"')]+)["']?\)/g,'url(#$1)');if(v)target.setAttribute(name,v);}target.removeAttribute('class');target.removeAttribute('style');if(orig[i].tagName==='image'){const href=await data(orig[i].getAttribute('href')||orig[i].getAttribute('xlink:href'));if(href){target.removeAttribute('xlink:href');target.setAttribute('href',href);}}}
  clone.querySelectorAll('text').forEach(t=>t.remove());clone.setAttribute('x',b.x);clone.setAttribute('y',b.y);clone.setAttribute('width',b.w);clone.setAttribute('height',b.h);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  return clone.outerHTML;
 }
 async function walk(el){
  const style=getComputedStyle(el),r=el.getBoundingClientRect();if(style.display==='none'||style.visibility==='hidden'||parseFloat(style.opacity)===0||r.width<.2||r.height<.2||el.tagName==='SCRIPT'||el.tagName==='STYLE')return '';
  const b=box(r),radius=parseFloat(style.borderTopLeftRadius)||0,rx=Math.min(b.w/2,b.h/2,style.borderTopLeftRadius.includes('%')?Math.min(b.w,b.h)*radius/100:radius);
  let body='';
  if(el instanceof SVGSVGElement){body+=await nativeSVG(el,b);const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(walker.nextNode())textRuns(walker.currentNode);return body;}
  if(!transparent(style.backgroundColor))body+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}" fill="${style.backgroundColor}"/>`;
  const grad=gradient(style.backgroundImage,b);if(grad)body+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}" fill="${grad}"/>`;
  const urls=[...style.backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)];if(urls.length){const href=await data(urls.at(-1)[1]);if(href){const id='bgclip-'+seq++;defs.push(`<clipPath id="${id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}"/></clipPath>`);body+=`<image x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" href="${esc(href)}" preserveAspectRatio="${style.backgroundSize==='contain'?'xMidYMid meet':'xMidYMid slice'}" clip-path="url(#${id})"/>`;}}
  const border=parseFloat(style.borderTopWidth);if(border&&!transparent(style.borderTopColor))body+=`<rect x="${b.x+border/2}" y="${b.y+border/2}" width="${Math.max(0,b.w-border)}" height="${Math.max(0,b.h-border)}" rx="${rx}" fill="none" stroke="${style.borderTopColor}" stroke-width="${border}"/>`;
  if(el instanceof HTMLImageElement){const href=await data(el.currentSrc||el.src);if(href){const id='clip-'+seq++;defs.push(`<clipPath id="${id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}"/></clipPath>`);body+=`<image x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" href="${esc(href)}" preserveAspectRatio="${style.objectFit==='contain'?'xMidYMid meet':'xMidYMid slice'}" clip-path="url(#${id})"/>`;}return body;}
  if(el instanceof HTMLCanvasElement){try{body+=`<image x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" href="${el.toDataURL()}"/>`;}catch{}return body;}
  if(el instanceof HTMLInputElement&&el.type!=='checkbox'){const text=el.value||el.placeholder;ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;if(text)runs.push({text,x:b.x+(parseFloat(style.paddingLeft)||8),y:b.y+(b.h-parseFloat(style.fontSize)*1.2)/2,width:Math.min(b.w-16,ctx.measureText(text).width),height:parseFloat(style.fontSize)*1.2,size:parseFloat(style.fontSize),font:style.fontFamily,weight:parseInt(style.fontWeight)||400,color:style.color,spacing:0,transform:'none',opacity:1,clip:{x:b.x,y:b.y,w:b.w,h:b.h}});}
  let children='';
  for(const child of el.childNodes){if(el instanceof HTMLDetailsElement&&!el.open&&child.nodeName!=='SUMMARY')continue;if(child.nodeType===Node.TEXT_NODE)children+=textRuns(child);else if(child.nodeType===Node.ELEMENT_NODE)children+=await walk(child);}
  if(['hidden','auto','scroll','clip'].includes(style.overflow)||['hidden','auto','scroll','clip'].includes(style.overflowY)){const id='clip-'+seq++;defs.push(`<clipPath id="${id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}"/></clipPath>`);children=`<g clip-path="url(#${id})">${children}</g>`;}
  return `<g opacity="${style.opacity}">${body}${children}</g>`;
 }
 const body=await walk(root);
 // Match the browser baseline using the loaded font's real metrics.
 for(const r of runs){ctx.font=`${r.weight} ${r.size}px ${r.font}`;const m=ctx.measureText(r.text);r.baseline=r.y+(r.height-(m.fontBoundingBoxAscent??r.size*.8)-(m.fontBoundingBoxDescent??r.size*.2))/2+(m.fontBoundingBoxAscent??r.size*.8);if(r.transform==='uppercase')r.text=r.text.toUpperCase();if(r.transform==='lowercase')r.text=r.text.toLowerCase();}
 return {selector,width:num(bounds.width+pad*2),height:num(bounds.height+pad*2),defs:defs.join(''),body,runs,sourceBounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},padding:pad};
};
