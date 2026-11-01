const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const W = 1920, H = 1080;
const images = {};
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
window.ready = Promise.all(Object.entries(window.FILM_ASSETS).map(([key, source]) => new Promise(resolve => {
  const img = new Image(); img.onload = () => { images[key] = img; resolve(); }; img.src = source;
})));
function box(x, y, w, h, r = 18, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function text(value, x, y, size = 28, color = '#d9e4f2', weight = 400, align = 'left', font = 'Apple SD Gothic Neo') {
  ctx.font = `${weight} ${size}px "${font}", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillStyle = color;
  String(value).split('\n').forEach((line, index) => ctx.fillText(line, x, y + index * size * 1.4));
}
function tracked(value, x, y, size = 17, color = '#8dabc3', spacing = 3) {
  ctx.font = `600 ${size}px Syne, sans-serif`; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillStyle = color;
  for (const char of value) { ctx.fillText(char, x, y); x += ctx.measureText(char).width + spacing; }
}
function imageFit(img, x, y, w, h, cover = false) {
  const scale = cover ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function background(t) {
  const opacity = ctx.globalAlpha;
  ctx.fillStyle = '#060b13'; ctx.fillRect(0, 0, W, H);
  const gradient = ctx.createRadialGradient(1400 + Math.sin(t * .2) * 80, 510, 0, 1400, 510, 1050);
  gradient.addColorStop(0, '#152841'); gradient.addColorStop(.5, '#0c1423'); gradient.addColorStop(1, '#060b13');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 58; i++) {
    const x = (i * 673.27 + t * (i % 3 + 1) * 1.2) % W;
    const y = (i * 293.13 + Math.sin(t * .16 + i) * 15) % H;
    ctx.globalAlpha = opacity * (.13 + .11 * Math.sin(i + t * .6)); ctx.fillStyle = '#b0ccf6';
    ctx.beginPath(); ctx.arc(x, y, i % 8 === 0 ? 1.8 : 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = opacity;
}
function brand(chapter) {
  imageFit(images.logo, 96, 55, 234, 30);
  ctx.fillStyle = '#496078'; ctx.fillRect(352, 57, 1, 25);
  tracked('DRIVE', 375, 60, 17, '#b1c5dd', 5);
  tracked(chapter, 1400, 63, 15, '#91a9bf', 2);
  ctx.fillStyle = '#9db8d527'; ctx.fillRect(96, 111, 1728, 1);
}
function footer(t, mode = 'demo') {
  tracked('WEB PROTOTYPE', 96, 1025, 14, '#8ca1bb', 2);
  const copy = mode === 'car' ? 'AI 생성 운전자 배경 · 모의 주행 · 실제 차량 미연동'
    : mode === 'pleos' ? 'Pleos Connect 디자인 가이드 기반 웹 시안 · 시스템·내비게이션 미연동'
      : '실제 웹 시제품 화면 · 예시 요청 · 차량 기능 시뮬레이션';
  text(copy, 385, 1020, 19, '#99aabd');
  text('SPECTRA DRIVE  /  2026', 1824, 1025, 14, '#8497ad', 500, 'right', 'Syne');
  ctx.fillStyle = '#70d6ff'; ctx.fillRect(96, 1060, 1728 * clamp(t / 30), 2);
}
function reveal(t, start, draw) {
  const a = smooth((t - start) / .65);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 22); draw(); ctx.restore();
}
function display(a, b, blend, t, x = 96, y = 315, w = 1728, h = 656) {
  const zoom = 1 + .008 * Math.sin(t * .27);
  ctx.save();
  box(x, y, w, h, 24); ctx.clip();
  ctx.fillStyle = '#07101b'; ctx.fillRect(x, y, w, h);
  const dx = x - w * (zoom - 1) / 2, dy = y - h * (zoom - 1) / 2;
  imageFit(images[a], dx, dy, w * zoom, h * zoom);
  if (b) { ctx.globalAlpha *= clamp(blend); imageFit(images[b], dx, dy, w * zoom, h * zoom); }
  ctx.restore(); box(x, y, w, h, 24, null, '#8aa8ce55');
}
function waveform(t, start, end, x = 104, y = 263) {
  const active = t >= start && t < end;
  for (let i = 0; i < 18; i++) {
    const h = active ? 5 + 29 * (.5 + .5 * Math.sin(t * 17 + i * .81)) * Math.sin((i + 1) / 19 * Math.PI) : 5;
    box(x + i * 7, y - h / 2, 3, h, 2, active ? '#9ab5ff' : '#55758e');
  }
  text(active ? '예시 요청 · 합성 음성' : '예시 요청 · 시제품 명령 처리', x + 150, y - 13, 18, '#91a9c1');
}
function highlight(x, y, w, h, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = '#72d9f4'; ctx.shadowBlur = 18;
  box(x, y, w, h, 15, '#70d6ff06', '#91dfff'); ctx.restore();
}
function chip(value, x, y, w, active = false) {
  box(x, y, w, 48, 24, active ? '#70d6ff17' : '#182437bb', active ? '#70d6ff70' : '#819cbd3b');
  text(value, x + w / 2, y + 14, 21, active ? '#b0e9ff' : '#aabed7', 500, 'center');
}
const scenes = [
  [0, 5, (t, s) => {
    const scale = 1.01 + s * .025;
    imageFit(images.car, -W * (scale - 1) / 2, -H * (scale - 1) / 2, W * scale, H * scale, true);
    const shade = ctx.createLinearGradient(0, 0, W, 0); shade.addColorStop(0, '#050a13f5'); shade.addColorStop(.43, '#050a13b8'); shade.addColorStop(.78, '#050a1315'); shade.addColorStop(1, '#050a1322');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
    const lower = ctx.createLinearGradient(0, 800, 0, H); lower.addColorStop(0, '#060b1300'); lower.addColorStop(1, '#060b13'); ctx.fillStyle = lower; ctx.fillRect(0, 800, W, 280);
    brand('YOUR NEXT TRACK');
    reveal(t, .15, () => tracked('YOUR TASTE. YOUR NEXT TRACK.', 96, 250, 18, '#acc8e4', 2.7));
    reveal(t, .35, () => text('내 취향 그대로.', 96, 316, 83, '#f0f4fc', 600));
    reveal(t, .72, () => {
      const ink = ctx.createLinearGradient(96, 0, 950, 0); ink.addColorStop(0, '#8cddfb'); ink.addColorStop(.55, '#c0a5fa'); ink.addColorStop(1, '#ef96d3');
      text('다음 곡은, 한마디로.', 96, 420, 83, ink, 600);
    });
    reveal(t, 1.25, () => text('차 안의 음악 리스트를, 듣고 싶은 무드로.', 99, 566, 29, '#c1cedd'));
    reveal(t, 1.8, () => chip('취향 기반 음악 대기열', 98, 653, 290, true));
    footer(t, 'car');
  }],
  [5, 10.5, (t, s) => {
    brand('01 / SAY THE MOOD');
    reveal(t, 5.05, () => text('“퇴근길이니까, 좀 편안하게.”', 96, 153, 57, '#f0f4fc', 600));
    waveform(t, 5.85, 7.7);
    if (t < 6.15) display('baseline', 'listeningCalm', smooth((t - 5.6) / .4), t);
    else display('listeningCalm', 'calm', smooth((t - 7.5) / .6), t);
    highlight(980, 390, 790, 320, smooth((t - 8.0) / .5) * (.45 + .2 * Math.sin(t * 3)));
    footer(t);
  }],
  [10.5, 15.5, (t, s) => {
    brand('02 / KEEP YOUR TASTE');
    reveal(t, 10.55, () => text('지금 듣는 곡은 그대로.', 96, 153, 57, '#f0f4fc', 600));
    reveal(t, 10.75, () => {
      chip('현재 곡 유지', 96, 237, 210); chip('취향 지도 유지', 322, 237, 240); chip('다음 곡만 재선정', 578, 237, 278, true);
    });
    display('calm', null, 0, t);
    highlight(108, 862, 1704, 96, .38 + .18 * Math.sin(t * 2));
    footer(t);
  }],
  [15.5, 21.5, (t, s) => {
    brand('03 / SHIFT THE MOOD');
    reveal(t, 15.55, () => text('“조금 더 신나게.”', 96, 153, 59, '#f0f4fc', 600));
    waveform(t, 16.0, 17.4);
    if (t < 16.3) display('calm', 'listeningUplift', smooth((t - 15.9) / .4), t);
    else display('listeningUplift', 'uplift', smooth((t - 17.3) / .6), t);
    highlight(980, 390, 790, 320, smooth((t - 18.0) / .5) * (.45 + .2 * Math.sin(t * 3)));
    if (t > 18.5) {
      ctx.save(); ctx.globalAlpha = smooth((t - 18.5) / .5);
      chip('같은 취향 안에서, 분위기만 바꿔요', 985, 237, 690, true); ctx.restore();
    }
    footer(t);
  }],
  [21.5, 26.5, (t, s) => {
    brand('04 / ON THE DISPLAY');
    reveal(t, 21.55, () => text('차량 화면에 맞춰, 음악은 자연스럽게.', 96, 153, 54, '#f0f4fc', 600));
    reveal(t, 21.8, () => text('단독 화면부터 내비게이션과 나란히 쓰는 화면까지.', 98, 234, 27, '#a6bcd3'));
    display('pleos', 'split', smooth((t - 23.5) / .7), t, 360, 305, 1370, 680);
    reveal(t, 22.2, () => {
      tracked('PLEOS', 96, 438, 22, '#a6b7ce', 4);
      tracked('CONNECT', 96, 476, 18, '#a6b7ce', 3);
      text(t < 23.8 ? 'SPECTRA\n단독 화면' : '내비 + 음악\n분할 화면', 96, 552, 30, '#cfe2f4', 500);
      box(96, 650, 142, 3, 1, '#9fb2f5');
      text('웹 화면 시안', 96, 674, 22, '#91a7bf');
    });
    footer(t, 'pleos');
  }],
  [26.5, 30, (t, s) => {
    ctx.save(); ctx.globalAlpha = .17; imageFit(images.car, 0, 0, W, H, true); ctx.restore();
    const shade = ctx.createRadialGradient(960, 430, 100, 960, 430, 1000); shade.addColorStop(0, '#0a1423aa'); shade.addColorStop(1, '#050911f8'); ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
    reveal(t, 26.6, () => {
      imageFit(images.logo, 516, 330, 650, 86); tracked('DRIVE', 1220, 357, 32, '#c0d0e5', 8);
    });
    reveal(t, 26.9, () => text('내 취향을 잇는, 다음 드라이브.', 960, 496, 56, '#eaf1fb', 500, 'center'));
    reveal(t, 27.2, () => text('음성 무드 요청  ·  취향 기반 대기열  ·  차량 화면 시안', 960, 592, 27, '#a5bad3', 400, 'center'));
    reveal(t, 27.5, () => {
      chip('SPECTRA DRIVE / WEB PROTOTYPE', 635, 698, 650, true);
      text('현재 웹 시제품 단계 · 음성 비서 및 실제 차량 연동 전', 960, 793, 22, '#91a7bf', 400, 'center');
    });
    footer(t, 'car');
  }],
];
function drawScene(index, t) {
  background(t);
  const [start, end, draw] = scenes[index]; draw(t, clamp((t - start) / (end - start)));
}
window.renderFrame = t => {
  const index = scenes.findIndex(([start, end]) => t >= start && t < end);
  const i = index < 0 ? scenes.length - 1 : index;
  const start = scenes[i][0];
  if (i > 0 && t - start < .35) {
    drawScene(i - 1, start - .001); ctx.save(); ctx.globalAlpha = smooth((t - start) / .35); drawScene(i, t); ctx.restore();
  } else drawScene(i, t);
};
