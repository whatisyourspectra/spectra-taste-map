import * as THREE from '/node_modules/three/build/three.module.js';
import {RoomEnvironment}from'/node_modules/three/examples/jsm/environments/RoomEnvironment.js';
const variant=new URLSearchParams(location.search).get('screen')||'field';
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,3));renderer.setClearColor(0x070b13,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,innerWidth/innerHeight,.1,100);camera.position.set(7,5.8,18.5);camera.lookAt(0,.5,0);
const env=new THREE.PMREMGenerator(renderer);scene.environment=env.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.8;
for(const [color,power,xyz]of [[0xfff7ef,2.6,[-7,9,10]],[0xd9e7ff,1.6,[7,3,6]],[0xcec2ff,.9,[-6,-2,3]]]){const light=new THREE.DirectionalLight(color,power);light.position.set(...xyz);scene.add(light);}
for(const [c,p,xyz]of [[0xed70bc,22,[-8,1,3]],[0x70d6ff,26,[7,0,3]]]){const l=new THREE.PointLight(c,p,20,2);l.position.set(...xyz);scene.add(l);}
const silver=new THREE.MeshStandardMaterial({color:0xb8b8ba,metalness:1,roughness:.27}),dark=new THREE.MeshStandardMaterial({color:0x050608,metalness:.12,roughness:.3}),edge=new THREE.MeshStandardMaterial({color:0x77787b,metalness:1,roughness:.2});
function shape(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function plate(w,h,d,r,mat){const g=new THREE.ExtrudeGeometry(shape(w,h,r),{depth:d,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:5,steps:1,curveSegments:40});g.translate(0,0,-d/2);return new THREE.Mesh(g,mat);}
function plane(w,h,r,mat){const g=new THREE.ShapeGeometry(shape(w,h,r),40),p=g.getAttribute('position'),u=g.getAttribute('uv');for(let i=0;i<p.count;i++)u.setXY(i,(p.getX(i)+w/2)/w,(p.getY(i)+h/2)/h);return new THREE.Mesh(g,mat);}
const laptop=new THREE.Group();scene.add(laptop);
const base=plate(11.3,7.22,.19,.23,silver);base.rotation.x=-Math.PI/2;base.position.set(0,-2.25,.30);laptop.add(base);
const lip=plate(11.29,7.2,.04,.24,edge);lip.rotation.x=-Math.PI/2;lip.position.set(0,-2.36,.30);laptop.add(lip);
const cut=plane(1.45,.065,.03,new THREE.MeshStandardMaterial({color:0x77787c,metalness:1,roughness:.38}));cut.rotation.x=-Math.PI/2;cut.position.set(0,-2.137,3.82);laptop.add(cut);
// The hinge is real geometry; the screen opens from the rear of the keyboard deck.
const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,10.2,40),dark);hinge.rotation.z=Math.PI/2;hinge.position.set(0,-2.09,-3.05);laptop.add(hinge);
const display=new THREE.Group();display.position.set(0,-2.13,-3.08);display.rotation.x=-.19;laptop.add(display);
const lid=plate(11.25,7.25,.13,.20,silver);lid.position.y=3.625;display.add(lid);
const bezel=plane(11.13,7.13,.15,dark);bezel.position.set(0,3.625,.094);display.add(bezel);
const loader=new THREE.TextureLoader(),files={field:'01-desktop-taste-field',spectra:'04-song-and-constellation',landing:'00-web-landing'};
const tex=await loader.loadAsync('./sources/'+files[variant]+'.png');tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
const screen=plane(10.98,6.8625,.1,new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));screen.position.set(0,3.64,.1);display.add(screen);
const notch=plane(1.22,.21,.075,dark);notch.position.set(0,7.07,.11);display.add(notch);const lens=new THREE.Mesh(new THREE.CircleGeometry(.031,24),new THREE.MeshStandardMaterial({color:0x0c1831,metalness:.55,roughness:.08}));lens.position.set(0,7.075,.114);display.add(lens);
// A texture atlas prints the real keyboard legends over raised geometric keys.
const keyboardCanvas=document.createElement('canvas');keyboardCanvas.width=2048;keyboardCanvas.height=760;const c=keyboardCanvas.getContext('2d');c.fillStyle='#08090c';c.fillRect(0,0,2048,760);c.textAlign='center';c.textBaseline='middle';c.font='24px Arial';
const keys=[['esc','◉','☀','☀','▣','⌕','◁','▷','◻','◁','▷','◀','▶','⌫'],['`','1','2','3','4','5','6','7','8','9','0','−','=','delete'],['tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],['caps','A','S','D','F','G','H','J','K','L',';',"'",'return'],['shift','Z','X','C','V','B','N','M',',','.','/','shift'],['fn','⌃','⌥','⌘','space','⌘','⌥','←','↓','→']];
const keyGeometry=new THREE.BoxGeometry(.55,.045,.45),keyMat=new THREE.MeshStandardMaterial({color:0x090a0d,roughness:.65,metalness:.12}),instances=new THREE.InstancedMesh(keyGeometry,keyMat,keys.flat().length),dummy=new THREE.Object3D();let index=0;
for(let row=0;row<keys.length;row++){const values=keys[row],gap=12,cellW=(2048-2*28-(values.length-1)*gap)/values.length;for(let col=0;col<values.length;col++){const x=28+col*(cellW+gap),y=18+row*121;c.fillStyle='#191b20';c.beginPath();c.roundRect(x,y,cellW,100,9);c.fill();c.fillStyle='#A2A6B0';c.font=(values[col].length>2?'18':'25')+'px Arial';c.fillText(values[col]==='space'?'':values[col],x+cellW/2,y+48);dummy.position.set((x+cellW/2-1024)/2048*8.95,-2.09,(y+50-380)/760*3.28-1.18);dummy.scale.set(cellW/2048*8.95/.55,1,100/760*3.28/.45);dummy.updateMatrix();instances.setMatrixAt(index++,dummy.matrix);}}
laptop.add(instances);
const keyTexture=new THREE.CanvasTexture(keyboardCanvas);keyTexture.colorSpace=THREE.SRGBColorSpace;keyTexture.anisotropy=16;const keyPrint=plane(8.95,3.28,.09,new THREE.MeshBasicMaterial({map:keyTexture,toneMapped:false}));keyPrint.rotation.x=-Math.PI/2;keyPrint.position.set(0,-2.055,-1.18);laptop.add(keyPrint);
const trackpad=plane(4.12,2.14,.12,new THREE.MeshStandardMaterial({color:0xb4b5b8,metalness:.85,roughness:.31}));trackpad.rotation.x=-Math.PI/2;trackpad.position.set(0,-2.133,1.72);laptop.add(trackpad);
const padRim=plate(4.16,2.18,.008,.13,edge);padRim.rotation.x=-Math.PI/2;padRim.position.set(0,-2.143,1.72);laptop.add(padRim);
const grillGeo=new THREE.BufferGeometry(),grill=[];for(const side of [-1,1])for(let row=0;row<44;row++)for(let col=0;col<7;col++)grill.push(side*(4.8+col*.053),-2.127,-2.66+row*.073);grillGeo.setAttribute('position',new THREE.Float32BufferAttribute(grill,3));laptop.add(new THREE.Points(grillGeo,new THREE.PointsMaterial({color:0x46484d,size:.014,sizeAttenuation:true})));
renderer.render(scene,camera);window.__MACBOOK__={ready:true,variant,stats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),export:()=>renderer.domElement.toDataURL('image/png')};
window.addEventListener('pointermove',e=>{laptop.rotation.y=(e.clientX/innerWidth-.5)*.025;renderer.render(scene,camera);});
