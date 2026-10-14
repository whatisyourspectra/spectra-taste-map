import { drawSpectraLogo, BRAND_TAGLINE } from '../brand/drawSpectraLogo';

// Capture the rendered SVG with its current colors and animation pose, without
// external stylesheets or images that could taint the export canvas.
export async function createConstellationImage(source, { title, genres, count }) {
    if (!source) throw new Error('Missing constellation');
    const clone = source.cloneNode(true);
    const originals = [source, ...source.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];
    const properties = ['color', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
        'stroke-linecap', 'stroke-dasharray', 'opacity', 'visibility', 'transform', 'transform-origin'];
    originals.forEach((node, index) => {
        const computed = getComputedStyle(node);
        const target = copies[index];
        target.removeAttribute('style');
        for (const property of properties) {
            // Keep local gradient references instead of computed absolute page URLs.
            if (property === 'fill' && node.getAttribute('fill')?.startsWith('url(')) continue;
            target.style.setProperty(property, computed.getPropertyValue(property));
        }
        target.style.animation = 'none';
    });
    clone.querySelectorAll('.lc-reaction, .lc-drop-thread').forEach((node) => node.remove());
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '960');
    clone.setAttribute('height', '960');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
    try {
        const image = new Image();
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
        await document.fonts?.ready;
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        paintStoryBackground(ctx);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#93a7c3';
        ctx.font = '18px sans-serif';
        await drawSpectraLogo(ctx, { top: 186 });
        ctx.font = '20px sans-serif';
        ctx.fillText(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), 540, 280);
        ctx.fillStyle = '#e6edf8';
        ctx.font = '52px sans-serif';
        ctx.fillText(title, 540, 400);
        ctx.drawImage(image, 60, 490, 960, 960);
        ctx.fillStyle = '#b5c4d9';
        ctx.font = '24px sans-serif';
        ctx.fillText(genres.join('  ·  '), 540, 1510, 900);
        ctx.fillStyle = '#8999b0';
        ctx.font = '19px sans-serif';
        ctx.fillText(`${count.toLocaleString()} TRACKS / ONE SPECTRA`, 540, 1570);
        return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
}


function paintStoryBackground(ctx, accent = '#a9bff1') {
    ctx.fillStyle = '#080c13';
    ctx.fillRect(0, 0, 1080, 1920);
    const glow = ctx.createRadialGradient(540, 820, 20, 540, 820, 850);
    glow.addColorStop(0, `${accent}18`); glow.addColorStop(1, `${accent}00`);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1920);
    ctx.strokeStyle = '#9aafd433'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(460, 1660); ctx.lineTo(620, 1660); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#8395b2'; ctx.font = '18px sans-serif';
    ctx.fillText(BRAND_TAGLINE, 540, 1720);
}
function ellipsis(ctx, value, width) {
    const original = String(value || '');
    let text = original;
    while (text && ctx.measureText(text).width > width) text = [...text].slice(0, -1).join('');
    if (text !== original) {
        while (text && ctx.measureText(`${text}…`).width > width) text = [...text].slice(0, -1).join('');
        return `${text}…`;
    }
    return text;
}
function wrap(ctx, text, width) {
    const lines = []; let line = '';
    for (const character of text) {
        if (ctx.measureText(line + character).width > width && line) { lines.push(line.trim()); line = ''; }
        line += character;
    }
    if (line) lines.push(line.trim());
    return lines;
}
export async function createDailyStoryImage({ theme, day, tracks, lang }) {
    await document.fonts?.ready;
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    paintStoryBackground(ctx, theme.color);
    const en = lang === 'en';
    ctx.textAlign = 'center'; ctx.fillStyle = '#a5b5ce'; ctx.font = '22px sans-serif';
    await drawSpectraLogo(ctx, { top: 166 });
    ctx.fillText('DAILY', 540, 240);
    ctx.font = '20px sans-serif'; ctx.fillText(day.replaceAll('-', ' . '), 540, 275);
    ctx.strokeStyle = `${theme.color}55`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(540, 450, 230, 75, -.25, 0, Math.PI * 2); ctx.stroke();
    const basePoints = [[330, 490], [440, 395], [565, 460], [695, 370], [745, 505]];
    const points = (tracks.slice(0, 5).length ? tracks.slice(0, 5) : [{}]).map((track, i) => {
        const bp = basePoints[i] || [330 + i * 100, 450];
        const v = Number.isFinite(track?.valence) ? track.valence : 0.5;
        const e = Number.isFinite(track?.energy) ? track.energy : 0.5;
        return [
            Math.round(bp[0] + (v - 0.5) * 32),
            Math.round(bp[1] - (e - 0.5) * 44),
        ];
    });
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();

    for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];
        const t = tracks[i];
        const isDisc = t?.dailyOrigin === 'discovery';
        const halo = ctx.createRadialGradient(x, y, 0, x, y, 32);
        halo.addColorStop(0, theme.color);
        halo.addColorStop(1, `${theme.color}00`);
        ctx.fillStyle = halo;
        ctx.fillRect(x - 32, y - 32, 64, 64);

        if (isDisc) {
            ctx.save();
            ctx.translate(x, y);
            ctx.fillStyle = theme.color;
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(7, 0);
            ctx.lineTo(0, 9);
            ctx.lineTo(-7, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.fillStyle = theme.color;
    ctx.font = '24px sans-serif';
    ctx.fillText(en ? 'Your daily music reading' : '오늘의 스펙트라', 540, 620);
    ctx.fillStyle = '#ecedf8';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(theme.name[en ? 1 : 0], 540, 700);

    ctx.fillStyle = '#b0bdd3';
    ctx.font = '26px sans-serif';
    wrap(ctx, theme.message[en ? 1 : 0], 820).slice(0, 3).forEach((line, i) => ctx.fillText(line, 540, 775 + i * 44));

    if (theme.tags?.[en ? 1 : 0]) {
        ctx.fillStyle = `${theme.color}dd`;
        ctx.font = '600 20px sans-serif';
        ctx.fillText(theme.tags[en ? 1 : 0].join('   ·   '), 540, 915);
    }

    ctx.font = '18px sans-serif';
    ctx.fillStyle = theme.color;
    ctx.fillText(`${tracks.length} TRACKS / TODAY’S SELECTION`, 540, 995);

    tracks.slice(0, 5).forEach((track, i) => {
        const y = 1080 + i * 115;
        const isDisc = track.dailyOrigin === 'discovery';
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.color;
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(String(i + 1).padStart(2, '0'), 130, y);

        ctx.fillStyle = '#e2e7f4';
        ctx.font = '600 28px sans-serif';
        ctx.fillText(ellipsis(ctx, track.name, 680), 195, y);

        ctx.fillStyle = '#8fa2be';
        ctx.font = '21px sans-serif';
        const sub = `${track.artists || 'Unknown'}${isDisc ? (en ? '  ·  ✦ NEW FIND' : '  ·  ✦ 새로운 발견') : ''}`;
        ctx.fillText(ellipsis(ctx, sub, 720), 195, y + 36);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#5a6c86';
    ctx.font = '16px sans-serif';
    ctx.fillText(BRAND_TAGLINE, 540, 1780);

    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
}

// Bubble card uses local/approved album images, with initials when loading fails.
export async function createBubbleShareImage(tracks, { title, genres, count }) {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    paintStoryBackground(ctx, '#a9bff1');
    await drawSpectraLogo(ctx, { top: 186 });
    ctx.textAlign = 'center'; ctx.fillStyle = '#e6edf8'; ctx.font = '52px sans-serif';
    ctx.fillText(title, 540, 400, 940);
    const sample = tracks.slice(0, 18);
    const images = await Promise.all(sample.map(track => new Promise(resolve => {
        const value = track.coverUrl || track.imageUrl;
        if (!value) { resolve(null); return; }
        const img = new Image(); img.crossOrigin = 'anonymous';
        const timer = setTimeout(() => { img.src = ''; resolve(null); }, 4000);
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = value;
    })));
    sample.forEach((track, index) => {
        const column = index % 3, row = Math.floor(index / 3);
        const x = 240 + column * 300 + (row % 2 ? 25 : -25);
        const y = 560 + row * 142;
        const radius = 64 + (index % 3) * 8;
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = ['#334f75', '#574779', '#784761'][index % 3]; ctx.fillRect(x-radius, y-radius, radius*2, radius*2);
        if (images[index]) ctx.drawImage(images[index], x-radius, y-radius, radius*2, radius*2);
        else { ctx.fillStyle = '#dce6ff'; ctx.font = '32px sans-serif'; ctx.fillText(String(track.name || track.title || '♪').slice(0, 2), x, y+10); }
        ctx.restore(); ctx.strokeStyle = '#b9cbeb77'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.stroke();
    });
    ctx.fillStyle = '#b5c4d9'; ctx.font = '24px sans-serif'; ctx.fillText(genres.join(' · '), 540, 1510, 940);
    ctx.fillStyle = '#8999b0'; ctx.font = '19px sans-serif'; ctx.fillText(`${count.toLocaleString()} TRACKS / MY TASTE IN BUBBLES`, 540, 1570);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed')),'image/png'));
}
