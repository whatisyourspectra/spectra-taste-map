import * as THREE from '/node_modules/three/build/three.module.js';
import { RoomEnvironment } from '/node_modules/three/examples/jsm/environments/RoomEnvironment.js';

// A photographic device set made with actual 3D geometry and real app captures.
// No generated UI and no duplicated demo tracks are used.
const query=new URLSearchParams(location.search),alpha=query.has('alpha');
document.body.classList.toggle('alpha',alpha);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,3));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.06;
renderer.setClearColor(0x070b13,alpha?0:1);
document.body.append(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(29,innerWidth/innerHeight,.1,100);
camera.position.set(.1,.05,19.1);camera.lookAt(0,0,0);
const pmrem=new THREE.PMREMGenerator(renderer);
const room=new RoomEnvironment();
scene.environment=pmrem.fromScene(room,.035).texture;
scene.environmentIntensity=.72;
const key=new THREE.DirectionalLight(0xfff8f1,2.2);key.position.set(-4,7,9);scene.add(key);
const fill=new THREE.DirectionalLight(0xd6e7ff,1.35);fill.position.set(6,1,5);scene.add(fill);
const rimPink=new THREE.PointLight(0xed70bc,25,16,2);rimPink.position.set(-5,1,1.3);scene.add(rimPink);
const rimBlue=new THREE.PointLight(0x70d6ff,30,18,2);rimBlue.position.set(5,3,1.2);scene.add(rimBlue);
const low=new THREE.DirectionalLight(0xcec2ff,1);low.position.set(0,-4,5);scene.add(low);

function roundedShape(w,h,r){const x=-w/2,y=-h/2,s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function roundedPlane(w,h,r){const g=new THREE.ShapeGeometry(roundedShape(w,h,r),48),p=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+w/2)/w,(p.getY(i)+h/2)/h);return g;}
function shell(w,h,d,r,material){const g=new THREE.ExtrudeGeometry(roundedShape(w,h,r),{depth:d,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:6,steps:1,curveSegments:36});g.translate(0,0,-d/2);return new THREE.Mesh(g,material);}
const metal=new THREE.MeshStandardMaterial({color:0xbab8b7,metalness:1,roughness:.23});
const polished=new THREE.MeshStandardMaterial({color:0xd2d4db,metalness:1,roughness:.15});
const black=new THREE.MeshStandardMaterial({color:0x050609,metalness:.13,roughness:.23});
const seam=new THREE.MeshStandardMaterial({color:0x30343b,metalness:.7,roughness:.42});
const glass=new THREE.MeshStandardMaterial({color:0x020409,metalness:.1,roughness:.12});

async function image(url){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});}
function roundCanvas(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
async function screenTexture(url){
  const source=await image(url),c=document.createElement('canvas');c.width=1572;c.height=3600;const ctx=c.getContext('2d');
  ctx.fillStyle='#070b13';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,0,150,1572,3408);
  // Presentational OS chrome, separate from the actual unchanged web UI.
  ctx.fillStyle='#f7f5ef';ctx.font='600 53px Arial';ctx.fillText('9:41',112,105);
  for(let i=0;i<4;i++){roundCanvas(ctx,1222+i*18,99-i*9,11,17+i*9,2);ctx.fill();}
  ctx.strokeStyle='#f7f5ef';ctx.lineWidth=5;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(1352,106,17+i*12,-Math.PI*.78,-Math.PI*.22);ctx.stroke();}
  ctx.lineWidth=4;roundCanvas(ctx,1410,62,83,42,10);ctx.stroke();roundCanvas(ctx,1419,71,65,24,4);ctx.fill();ctx.fillRect(1498,76,7,14);
  roundCanvas(ctx,560,3575,450,13,7);ctx.fill();
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;return texture;
}
function bodyButton(group,x,y,w,h,d){const m=shell(w,h,d,.018,polished);m.position.set(x,y,-.015);group.add(m);}
function phone(texture){
  const group=new THREE.Group(),w=3.13,h=7.02;
  const chassis=shell(w,h,.245,.43,metal);group.add(chassis);
  const border=shell(w+.012,h+.012,.035,.438,polished);border.position.z=.102;group.add(border);
  const bezel=new THREE.Mesh(roundedPlane(w-.065,h-.065,.41),black);bezel.position.z=.155;group.add(bezel);
  const displayW=w-.145,displayH=h-.145;
  const display=new THREE.Mesh(roundedPlane(displayW,displayH,.365),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));display.position.z=.158;group.add(display);
  const island=new THREE.Mesh(roundedPlane(.82,.22,.11),glass);island.position.set(0,h/2-.255,.168);group.add(island);
  const cameraDot=new THREE.Mesh(new THREE.CircleGeometry(.043,32),new THREE.MeshPhysicalMaterial({color:0x0b1931,metalness:.6,roughness:.09,clearcoat:1}));cameraDot.position.set(.278,h/2-.255,.172);group.add(cameraDot);
  const glint=new THREE.Mesh(new THREE.CircleGeometry(.014,16),new THREE.MeshBasicMaterial({color:0x324a80,toneMapped:false}));glint.position.set(.27,h/2-.243,.174);group.add(glint);
  bodyButton(group,-w/2-.015,1.95,.045,.3,.085);bodyButton(group,-w/2-.015,1.22,.045,.56,.09);bodyButton(group,-w/2-.015,.48,.045,.56,.09);bodyButton(group,w/2+.015,1.1,.045,.91,.09);
  // Fine antenna breaks, visible on the frame under grazing studio light.
  for(const x of [-w/2-.009,w/2+.009])for(const y of [-2.54,2.54]){const a=new THREE.Mesh(new THREE.BoxGeometry(.035,.029,.2),seam);a.position.set(x,y,-.006);group.add(a);}
  const bottom=new THREE.Mesh(new THREE.BoxGeometry(.37,.024,.07),black);bottom.position.set(0,-h/2-.008,0);group.add(bottom);
  for(let j=0;j<2;j++)for(let i=0;i<6;i++){const hole=new THREE.Mesh(new THREE.SphereGeometry(.017,12,8),black);hole.scale.set(1,.45,1);hole.position.set((j?1:-1)*(.42+i*.085),-h/2-.008,0);group.add(hole);}
  return group;
}
const textures=await Promise.all([screenTexture('./sources/mobile-map-69.png'),screenTexture('./sources/mobile-selected-69.png')]);
const rig=new THREE.Group();scene.add(rig);
const front=phone(textures[0]);front.position.set(-1.58,-.5,.62);front.rotation.set(-.055,-.32,-.43);rig.add(front);
const rear=phone(textures[1]);rear.position.set(1.77,.53,-.69);rear.rotation.set(.035,-.43,.055);rig.add(rear);

// Delicate poster graphics are geometry, separate from the live UI textures.
if(!alpha){
 const ring=(rx,ry,angle,color,opacity)=>{const p=[];for(let i=0;i<=256;i++){const a=i/256*Math.PI*2;p.push(new THREE.Vector3(Math.cos(a)*rx,Math.sin(a)*ry,0));}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),new THREE.LineBasicMaterial({color,transparent:true,opacity}));line.position.z=-1.3;line.rotation.z=angle;scene.add(line);};
 ring(5.4,1.28,.33,0xcec2ff,.24);ring(5.52,1.34,.33,0x70d6ff,.055);
 function spark(x,y,r,color){const s=new THREE.Shape();s.moveTo(0,r);s.quadraticCurveTo(.04,.04,r,0);s.quadraticCurveTo(.04,-.04,0,-r);s.quadraticCurveTo(-.04,-.04,-r,0);s.quadraticCurveTo(-.04,.04,0,r);const m=new THREE.Mesh(new THREE.ShapeGeometry(s,32),new THREE.MeshBasicMaterial({color,toneMapped:false}));m.position.set(x,y,-.8);scene.add(m);}
 spark(-4.5,1.8,.27,0xed70bc);spark(4.7,-1.42,.35,0x70d6ff);spark(2.8,4,.15,0xcec2ff);
}
function render(){renderer.render(scene,camera);}
render();document.documentElement.classList.add('ready');
window.__STUDIO__={ready:true,mode:'WebGL',frames:0,tracks:69,source:'Actual SPECTRA UI screenshots',renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER),stats:()=>({triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,textureSize:textures[0].image.width+'x'+textures[0].image.height,maxTextureSize:renderer.capabilities.maxTextureSize}),export:()=>renderer.domElement.toDataURL('image/png'),pose:(x=0,y=0)=>{rig.rotation.y=x;rig.rotation.x=y;render();}};
window.addEventListener('pointermove',e=>{rig.rotation.y=(e.clientX/innerWidth-.5)*.06;rig.rotation.x=(e.clientY/innerHeight-.5)*.035;render();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render();});
console.log('SPECTRA_WEBGL_READY',window.__STUDIO__.stats());
