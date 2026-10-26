/* SPECTRA / Your taste. In spectra. — deterministic 15 second brand film.
 * Geometry is adapted from src/pages/LaunchTasteMapHero.jsx.
 * Rendered at native 3840 × 2160, not an upscaled screen recording.
 */
const W = 1920, H = 1080, TAU = Math.PI * 2;
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const ratio = canvas.width / W;
const palette = ['#70D6FF', '#ED70BC', '#B5A0FF'];
const rand = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, p) => a + (b - a) * p;
const smooth = p => { p = clamp(p); return p * p * (3 - 2 * p); };
const out = p => 1 - Math.pow(1 - clamp(p), 4);
const ease = (t, start, duration) => smooth((t - start) / duration);
const show = (t, start, end, fade = .5) => ease(t, start, fade) * (1 - ease(t, end - fade, fade));
const images = {};
const loadImage = (src) => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (h, a) => `rgba(${rgb(h).join(',')},${clamp(a)})`;
const path = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function glow(c, x, y, radius, color, alpha = 1) {
  if (radius <= 0 || alpha <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgba(color, .22 * alpha));
  g.addColorStop(.25, rgba(color, .105 * alpha));
  g.addColorStop(.65, rgba(color, .025 * alpha));
  g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function tracked(text, x, y, size = 18, spacing = 3, color = '#AABAD2', align = 'left') {
  ctx.save(); ctx.font = `600 ${size}px Syne`; ctx.fillStyle = color;
  const chars = Array.from(text), widths = chars.map(s => ctx.measureText(s).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let xx = align === 'center' ? x - total / 2 : x;
  for (let i = 0; i < chars.length; i++) { ctx.fillText(chars[i], xx, y); xx += widths[i] + spacing; }
  ctx.restore();
}
function textLine(text, x, y, size, { color = '#F2F5FF', weight = 700, alpha = 1, align = 'left', family = 'Apple SD Gothic Neo', gradient = false } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.textAlign = align;
  ctx.font = `${weight} ${size}px "${family}", sans-serif`;
  if (gradient) {
    const width = ctx.measureText(text).width;
    const gx = align === 'center' ? x - width / 2 : x;
    const g = ctx.createLinearGradient(gx, y, gx + width, y);
    g.addColorStop(0, '#ED70BC'); g.addColorStop(.48, '#C0A0FF'); g.addColorStop(1, '#70D6FF'); ctx.fillStyle = g;
  } else ctx.fillStyle = color;
  ctx.fillText(text, x, y); ctx.restore();
}
function revealLine(text, x, y, size, t, start, opts = {}) {
  const p = out((t - start) / .7); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= p;
  ctx.beginPath(); ctx.rect(0, y - size - 16, W, size + 42); ctx.clip();
  textLine(text, x, y + (1 - p) * size * .9, size, opts); ctx.restore();
}

// Fine moving grain is deliberately much quieter than the luminous geometry.
const grain = document.createElement('canvas'); grain.width = grain.height = 256;
const gc = grain.getContext('2d'); const noise = gc.createImageData(256, 256);
for (let i = 0; i < 256 * 256; i++) { const v = Math.floor(rand(i + 190) * 255); noise.data.set([v, v, v, 28], i * 4); }
gc.putImageData(noise, 0, 0);
const grainPattern = ctx.createPattern(grain, 'repeat');
function background(t) {
  ctx.fillStyle = '#060911'; ctx.fillRect(0, 0, W, H);
  const pan = Math.sin(t * .18) * 60;
  glow(ctx, 1320 + pan, 430, 820, '#4648A7', .55);
  glow(ctx, 520, 900, 650, '#762359', .25);
  for (let i = 0; i < 125; i++) {
    const x = (rand(i + 1600) * (W + 200) - t * (1 + rand(i + 700) * 3) + W + 200) % (W + 200) - 100;
    const y = rand(i + 1700) * H;
    const a = (.1 + rand(i + 1800) * .25) * (.7 + .3 * Math.sin(t * .7 + i));
    ctx.fillStyle = `rgba(188,206,255,${a})`; path(ctx, x, y, .5 + rand(i + 1900) * .9); ctx.fill();
  }
}

// The same trefoil field as the landing, with an animated film camera.
const wireLayer = document.createElement('canvas'); wireLayer.width = 1920; wireLayer.height = 1080;
const wc = wireLayer.getContext('2d');
function sculpture(c, t, { cx = 1320, cy = 560, scale = 300, rotation = -.4, tilt = .85, blend = 0, alpha = 1, phase = 0 } = {}) {
  const clock = t * .62 + phase;
  const project = (x, y, z) => {
    const rx = x * Math.cos(rotation) - z * Math.sin(rotation);
    const rz = x * Math.sin(rotation) + z * Math.cos(rotation);
    const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
    const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
    const perspective = 5 / (5 + depth);
    return [cx + rx * scale * perspective, cy + ry * scale * perspective, depth];
  };
  c.save(); c.globalAlpha *= alpha;
  const strands = 88, samples = 220;
  for (let strand = 0; strand < strands; strand++) {
    const v = strand / strands * TAU;
    c.beginPath();
    for (let step = 0; step <= samples; step++) {
      const u = step / samples * TAU;
      const pulse = .11 * Math.sin(u * 3 + clock);
      const radius = 1.25 + (.43 + pulse) * Math.cos(u * 3 + v);
      const orbit = [radius * Math.cos(u * 2), radius * Math.sin(u * 2), .62 * Math.sin(u * 3 + v)];
      const field = [(u / TAU - .5) * 4.6, Math.sin(u * 1.7 + v * .38) * .7 + Math.cos(v) * .55, Math.sin(v) * .7 + Math.cos(u * 2 + clock) * .3];
      const p = project(...orbit.map((n, i) => mix(n, field[i], blend)));
      if (step === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]);
    }
    c.strokeStyle = `hsla(${195 + strand / strands * 130},88%,${68 + 12 * Math.sin(v + clock * .4)}%,${.32 + .32 * Math.sin(v) ** 2})`;
    c.lineWidth = strand % 8 === 0 ? 1.15 : .63; c.stroke();
  }
  for (let i = 0; i < 1050; i++) {
    const u = rand(i + 13) * TAU + clock * .18, v = rand(i + 3000) * TAU;
    const radius = 1.25 + .43 * Math.cos(u * 3 + v);
    const orbit = [radius * Math.cos(u * 2), radius * Math.sin(u * 2), .62 * Math.sin(u * 3 + v)];
    const field = [(rand(i + 13) - .5) * 4.6, Math.sin(u * 1.7 + v * .38) * .7 + Math.cos(v) * .55, Math.sin(v) * .7 + Math.cos(u * 2 + clock) * .3];
    const [x, y, depth] = project(...orbit.map((n, j) => mix(n, field[j], blend)));
    const size = Math.max(.5, (2.2 - depth * .45) * rand(i + 30));
    c.fillStyle = `hsla(${195 + rand(i + 60) * 130},90%,89%,${.35 + rand(i + 80) * .6})`;
    path(c, x, y, size * .65); c.fill();
  }
  // Two bright signals circulate through the filaments rather than a static glow.
  for (let i = 0; i < 2; i++) {
    const u = clock * .7 + i * 3.4, v = i * 2.8;
    const r = 1.25 + .43 * Math.cos(u * 3 + v);
    const p = project(r * Math.cos(u * 2), r * Math.sin(u * 2), .62 * Math.sin(u * 3 + v));
    glow(c, p[0], p[1], 95, i ? '#ED70BC' : '#70D6FF', 1.8);
    c.fillStyle = '#EEFAFF'; path(c, p[0], p[1], 2.4); c.fill();
  }
  c.restore();
}
function drawSculpture(t, opts) {
  wc.clearRect(0, 0, W, H); sculpture(wc, t, { ...opts, alpha: 1 });
  const inheritedAlpha = ctx.globalAlpha;
  ctx.save(); ctx.globalAlpha *= opts.alpha ?? 1;
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(9px)'; ctx.globalAlpha *= .27; ctx.drawImage(wireLayer, 0, 0);
  ctx.filter = 'none'; ctx.globalAlpha = inheritedAlpha * (opts.alpha ?? 1);
  ctx.drawImage(wireLayer, 0, 0); ctx.restore();
  // Crisp vector pass: the UHD master retains native 4K filament edges.
  ctx.save(); ctx.globalAlpha = (opts.alpha ?? 1) * .45; sculpture(ctx, t, { ...opts, alpha: 1 }); ctx.restore();
}

const coverNames = [
  'currents','show-me-how','cigarettes-after-sex','depression-cherry','slow-rush','salad-days',
  'geography','bewitched','lady-lady','team-baby','every-letter','show-me-how',
  'after-hours','discovery','random-access-memories','justice','starboy','outrun'
];
const regions = [
  { x: 420, y: 626, color: '#70D6FF', label: 'DREAM POP' },
  { x: 960, y: 612, color: '#ED70BC', label: 'INDIE & SOUL' },
  { x: 1480, y: 626, color: '#B5A0FF', label: 'ELECTRONIC' }
];
const offsets = [
  [-167,-48,64],[-53,-169,74],[105,-77,99],[-70,99,112],[140,136,69],[-151,239,54],
  [-163,-87,76],[10,-166,95],[167,-13,64],[-35,96,122],[152,198,63],[-173,215,54],
  [-156,-77,88],[37,-165,104],[189,2,70],[-28,95,122],[162,215,81],[-175,218,62]
];
function bubble(c, x, y, r, image, color, alpha = 1, t = 0, i = 0) {
  if (r < .5 || alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha;
  glow(c, x, y, r * 1.8, color, .7);
  c.save(); path(c, x, y, r); c.clip();
  c.drawImage(image, x - r, y - r, r * 2, r * 2);
  const shade = c.createLinearGradient(x - r, y - r, x + r * .7, y + r);
  shade.addColorStop(0, 'rgba(237,245,255,.12)'); shade.addColorStop(.35, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(2,6,18,.52)');
  c.fillStyle = shade; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  c.strokeStyle = rgba(color, .54); c.lineWidth = 1.2; path(c, x, y, r); c.stroke();
  c.strokeStyle = 'rgba(240,247,255,.42)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r - .8, -2.8, -1.15); c.stroke();
  c.restore();
}
function albumField(t, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  const enter = out((t - 3.05) / 1.3), collapse = ease(t, 7.12, .85);
  for (let g = 0; g < 3; g++) {
    const r = regions[g]; glow(ctx, r.x, r.y, 470, r.color, .95 * enter);
    ctx.save(); ctx.globalAlpha *= .18 * enter;
    ctx.strokeStyle = r.color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, 241 + Math.sin(t + g) * 6, 290, -.17 + g * .14, 0, TAU); ctx.stroke();
    ctx.restore();
    for (let j = 0; j < 6; j++) {
      const i = g * 6 + j, [ox, oy, baseR] = offsets[i];
      const p = out((t - 3.05 - j * .055 - g * .065) / 1.1);
      const driftX = Math.sin(t * .45 + i * 1.7) * 8, driftY = Math.cos(t * .52 + i * 1.4) * 9;
      const startA = i / 18 * TAU + t * .15;
      const startX = 1180 + Math.cos(startA) * 480, startY = 590 + Math.sin(startA) * 240;
      const endX = r.x + ox + driftX, endY = r.y + oy + driftY;
      const dest = constellationPosition(i * 3, t);
      const x = mix(mix(startX, endX, p), dest.x, collapse), y = mix(mix(startY, endY, p), dest.y, collapse);
      bubble(ctx, x, y, baseR * (.22 + .78 * p) * (1 - collapse * .92), images[coverNames[i]], r.color, p * (1 - collapse), t, i);
    }
    ctx.save(); ctx.globalAlpha *= enter * (1 - collapse);
    tracked(r.label, r.x, 994, 20, 3, r.color, 'center'); ctx.restore();
  }
  ctx.restore();
}

// Connected neighborhoods reflect the constellation UI used by the actual app.
const points = [];
const centers = [[-.74,-.34,0],[.12,.56,.1],[.86,-.27,.25]];
for (let g = 0; g < 3; g++) for (let j = 0; j < 20; j++) {
  const i = g * 20 + j, a = j * 2.399963 + g, r = .24 + Math.sqrt(rand(i + 214)) * .47;
  points.push({ x: centers[g][0] + Math.cos(a) * r, y: centers[g][1] + Math.sin(a) * r * .84, z: centers[g][2] + (rand(i + 544) - .5) * .9, g });
}
const edges = [];
for (let g = 0; g < 3; g++) {
  const seen = new Set([g * 20]);
  while (seen.size < 20) {
    let best = null, d = Infinity;
    for (const a of seen) for (let b = g * 20; b < (g + 1) * 20; b++) {
      if (seen.has(b)) continue;
      const p = points[a], q = points[b], dd = Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);
      if (dd < d) { d = dd; best = [a, b]; }
    }
    edges.push(best); seen.add(best[1]);
  }
  for (let j = 0; j < 4; j++) edges.push([g * 20 + j * 4, g * 20 + j * 4 + 3]);
}
edges.push([5, 24], [28, 44], [14, 53]);
function constellationPosition(i, t) {
  const p = points[i % points.length], a = -.16 + (t - 8) * .055, tilt = .14;
  const rx = p.x * Math.cos(a) - p.z * Math.sin(a), rz = p.x * Math.sin(a) + p.z * Math.cos(a);
  const yy = p.y * Math.cos(tilt) - rz * Math.sin(tilt), zz = p.y * Math.sin(tilt) + rz * Math.cos(tilt);
  const scale = 302 * 4.8 / (4.8 + zz);
  return { x: 1340 + rx * scale, y: 535 + yy * scale, z: zz, g: p.g };
}
function star(c, x, y, r, color, alpha = 1) {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha;
  const light = c.createRadialGradient(x, y, 0, x, y, r * 7);
  light.addColorStop(0, rgba(color, .8)); light.addColorStop(.12, rgba(color, .65)); light.addColorStop(.3, rgba(color, .2)); light.addColorStop(1, rgba(color, 0));
  c.fillStyle = light; c.fillRect(x-r*7,y-r*7,r*14,r*14);
  c.fillStyle = color; path(c, x, y, r); c.fill(); c.fillStyle = '#F5FCFF'; path(c,x,y,r*.48); c.fill(); c.restore();
}
function constellation(t, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  const settle = ease(t, 7.35, 1), positions = points.map((_, i) => constellationPosition(i, t));
  glow(ctx, 1340, 555, 520, '#5F54B7', .8);
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = edges[i], p = positions[a], q = positions[b];
    const progress = clamp((t - 7.52 - i * .012) / .6);
    const x = mix(p.x, q.x, progress), y = mix(p.y, q.y, progress);
    const gradient = ctx.createLinearGradient(p.x, p.y, q.x + .01, q.y + .01);
    gradient.addColorStop(0, rgba(palette[p.g], .38)); gradient.addColorStop(1, rgba(palette[q.g], .2));
    ctx.strokeStyle = gradient; ctx.lineWidth = i % 6 === 0 ? 1.4 : .9;
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(x,y); ctx.stroke();
    // Travelling light makes discovery legible without UI clutter.
    const s = ((t - 8.6) * .5 + i * .147) % 3;
    if (s >= 0 && s < 1 && t > 8.6 && i % 3 === 0) {
      const xx = mix(p.x,q.x,s), yy = mix(p.y,q.y,s);
      ctx.strokeStyle = rgba(palette[p.g], .8); ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(mix(p.x,q.x,Math.max(0,s-.18)),mix(p.y,q.y,Math.max(0,s-.18))); ctx.lineTo(xx,yy); ctx.stroke();
      star(ctx,xx,yy,1.7,palette[p.g],.9);
    }
  }
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i], a = ease(t, 7.35 + rand(i + 899) * .5, .5);
    const z = 2.1 + rand(i + 150) * 1.8 + .35 * Math.sin(t * 2 + i);
    star(ctx, p.x, p.y, z, palette[p.g], a);
  }
  const selected = positions[25], pulse = (t - 8.7) % 1.7;
  if (pulse >= 0) {
    ctx.strokeStyle = rgba('#70D6FF', .55 * (1 - pulse/1.7)); ctx.lineWidth = 1.2;
    path(ctx,selected.x,selected.y,12+pulse*28);ctx.stroke();
  }
  star(ctx,selected.x,selected.y,5.3,'#C5F1FF',settle);
  // A new branch is born on the right as the expansion motif lands.
  const expand = ease(t, 9.5, 1.1), anchor = positions[48];
  const branch = [[1760,417],[1820,335],[1722,281],[1835,480]];
  for (let i = 0; i < branch.length; i++) {
    const p = i ? branch[i - 1] : [anchor.x, anchor.y], q = branch[i];
    const n = clamp(expand * 4 - i);
    if (n <= 0) continue;
    ctx.strokeStyle = rgba('#70D6FF', .45);ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(mix(p[0],q[0],n),mix(p[1],q[1],n));ctx.stroke();
    star(ctx,q[0],q[1],3.3,'#70D6FF',smooth(n));
  }
  // Compact, authentic track detail from the app, not a fake full-screen UI.
  const card = show(t, 8.7, 11.7, .45);
  ctx.save(); ctx.globalAlpha *= card; const cy = 868 + (1-card) * 22;
  roundRect(ctx,1117,cy,440,100,24);ctx.fillStyle='rgba(15,22,38,.86)';ctx.fill();ctx.strokeStyle='rgba(156,174,216,.24)';ctx.lineWidth=1;ctx.stroke();
  ctx.save();roundRect(ctx,1133,cy+16,68,68,14);ctx.clip();ctx.drawImage(images['cigarettes-after-sex'],1133,cy+16,68,68);ctx.restore();
  textLine('Sunsetz',1220,cy+43,26,{weight:700});textLine('Cigarettes After Sex',1220,cy+72,20,{weight:400,color:'#A5B3CB'});
  const iconX=1522,iconY=cy+50;ctx.fillStyle='#70D6FF';ctx.beginPath();ctx.moveTo(iconX-6,iconY-10);ctx.lineTo(iconX+10,iconY);ctx.lineTo(iconX-6,iconY+10);ctx.closePath();ctx.fill();
  ctx.restore();ctx.restore();
}

function opening(t) {
  const alpha = 1 - ease(t, 3.1, .8); if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const pull = out(t / 2.9);
  const scale = mix(880, 305, pull);
  const cx = mix(1320, 1370, pull), cy = mix(650, 555, pull);
  drawSculpture(t, { cx, cy, scale, rotation: -.8 + t * .19, tilt: .74 + t * .06, blend: ease(t, 2.7, 1.1) * .72, alpha: .94 });
  const shade = ctx.createLinearGradient(0,0,1170,0);shade.addColorStop(0,'rgba(6,9,17,.99)');shade.addColorStop(.55,'rgba(6,9,17,.89)');shade.addColorStop(1,'rgba(6,9,17,0)');ctx.fillStyle=shade;ctx.fillRect(0,0,1300,H);
  const logoIn = ease(t, 0, .35);ctx.save();ctx.globalAlpha*=logoIn;ctx.drawImage(images.logo,128,94,260,260*110/1200);ctx.restore();
  revealLine('Your taste.', 120, 476, 142, t, .25, { family:'Syne',weight:800 });
  revealLine('In spectra.', 120, 639, 142, t, .78, { family:'Syne',weight:800,gradient:true });
  revealLine('좋아하는 음악이, 나를 그리다.',128,742,32,t,1.35,{weight:400,color:'#B4C0D6'});
  // An initial shock of light pulls the eye into the first half-second.
  const ring = clamp(t / 1.3);ctx.save();ctx.globalAlpha*=.32*(1-ring);ctx.strokeStyle='#70D6FF';ctx.lineWidth=1.2;path(ctx,1370,555,ring*1000+20);ctx.stroke();ctx.restore();
  ctx.restore();
}
function middleCopy(t) {
  const a = show(t, 3.35, 7.6, .45); if (!a) return;
  ctx.save();ctx.globalAlpha=a;
  revealLine('좋아하는 음악이',960,162,60,t,3.37,{align:'center',weight:500});
  revealLine('나만의 지도가 됩니다.',960,248,72,t,3.65,{align:'center',gradient:true,weight:700});
  ctx.restore();
}
function discoveryCopy(t) {
  const a=show(t,7.6,11.95,.45);if(!a)return;
  ctx.save();ctx.globalAlpha=a;
  const shade=ctx.createLinearGradient(0,0,900,0);shade.addColorStop(0,'rgba(6,9,17,.75)');shade.addColorStop(1,'rgba(6,9,17,0)');ctx.fillStyle=shade;ctx.fillRect(0,0,900,H);
  revealLine('취향을 잇고,',128,465,82,t,7.65,{weight:700});
  revealLine('발견을 넓혀요.',128,574,82,t,7.88,{weight:700,gradient:true});
  revealLine('이해하고 · 분류하고 · 확장하세요',132,667,28,t,8.3,{weight:400,color:'#B4C0D6'});
  ctx.restore();
}
function ending(t) {
  const a=ease(t,11.4,.7);if(a<=0)return;
  ctx.save();ctx.globalAlpha=a;
  ctx.fillStyle='rgba(6,9,17,.86)';ctx.fillRect(0,0,W,H);
  glow(ctx,960,520,780,'#6862B8',.9);
  drawSculpture(t,{cx:960,cy:545,scale:335,rotation:.5+t*.05,tilt:.93,alpha:.18});
  const p=out((t-11.8)/.85), width=1480;
  ctx.save();ctx.globalAlpha*=p;ctx.translate(960,504);ctx.scale(1+(1-p)*.07,1+(1-p)*.07);
  ctx.beginPath();ctx.rect(-width/2-20,-100,(width+40)*p,200);ctx.clip();
  ctx.drawImage(images.logo,-width/2,-width*110/1200/2,width,width*110/1200);
  ctx.globalCompositeOperation='screen';ctx.globalAlpha*=Math.pow(1-p,2)*.7;ctx.filter='blur(18px)';ctx.drawImage(images.logo,-width/2,-width*110/1200/2,width,width*110/1200);ctx.restore();
  revealLine('음악으로 발견하는 나의 스펙트라',960,667,34,t,12.23,{align:'center',weight:500,color:'#DCE4F5'});
  ctx.save();ctx.globalAlpha*=ease(t,12.55,.55);tracked('spectra-music.org',960,765,23,3,'#91A6C5','center');ctx.restore();
  const line=ease(t,12.1,.8);ctx.save();ctx.globalAlpha*=.85;const g=ctx.createLinearGradient(906,0,1014,0);g.addColorStop(0,'#ED70BC');g.addColorStop(1,'#70D6FF');ctx.strokeStyle=g;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(960-54*line,831);ctx.lineTo(960+54*line,831);ctx.stroke();ctx.restore();
  ctx.restore();
}
window.ready = (async () => {
  await Promise.all(Object.entries(window.FILM_ASSETS).map(async ([key, src]) => { images[key] = await loadImage(src); }));
  await document.fonts.ready;
})();
window.renderFrame = async t => {
  await window.ready;
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
  background(t);
  // Distant filaments hold visual continuity across the album and constellation shots.
  const middle=show(t,3,11.9,.8);
  if(middle>0)drawSculpture(t,{cx:1100,cy:610,scale:520,rotation:.2+t*.055,tilt:.94,blend:.65,alpha:middle*.11});
  opening(t);
  const albums=show(t,3.05,8.12,.6);if(albums>0)albumField(t,albums);
  const stars=show(t,7.28,12.1,.8);if(stars>0)constellation(t,stars);
  middleCopy(t);discoveryCopy(t);ending(t);
  // Gentle optical vignette and real, temporal grain bind all four shots.
  const vignette=ctx.createRadialGradient(960,520,400,960,540,1160);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.38)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.11;ctx.translate(-Math.floor(t*17)%256,-Math.floor(t*31)%256);ctx.fillStyle=grainPattern;ctx.fillRect(-256,-256,W+512,H+512);ctx.restore();
  ctx.setTransform(1,0,0,1,0,0);
};
