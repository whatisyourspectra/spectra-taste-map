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
        ctx.fillText('S P E C T R A', 540, 220);
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
    ctx.fillText('YOUR TASTE. YOUR UNIVERSE.', 540, 1720);
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
    ctx.fillText('D A I L Y   S P E C T R A', 540, 220);
    ctx.font = '20px sans-serif'; ctx.fillText(day.replaceAll('-', ' . '), 540, 275);
    ctx.strokeStyle = `${theme.color}55`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(540, 450, 230, 75, -.25, 0, Math.PI * 2); ctx.stroke();
    const points = [[325,490], [445,395], [575,455], [710,365], [745,510]];
    ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
    for (const [x,y] of points) {
        const halo = ctx.createRadialGradient(x,y,0,x,y,25); halo.addColorStop(0, theme.color); halo.addColorStop(1, `${theme.color}00`);
        ctx.fillStyle = halo; ctx.fillRect(x-25,y-25,50,50); ctx.fillStyle = '#f2f3ff'; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = theme.color; ctx.font = '24px sans-serif'; ctx.fillText(en ? 'Your daily music reading' : '오늘의 스펙트라', 540, 625);
    ctx.fillStyle = '#ecedf8'; ctx.font = '58px sans-serif'; ctx.fillText(theme.name[en ? 1 : 0], 540, 715);
    ctx.fillStyle = '#b0bdd3'; ctx.font = '28px sans-serif';
    wrap(ctx, theme.message[en ? 1 : 0], 820).slice(0, 3).forEach((line,i)=>ctx.fillText(line,540,800+i*46));
    ctx.font = '18px sans-serif'; ctx.fillStyle = theme.color; ctx.fillText(`${tracks.length} TRACKS / TODAY’S SELECTION`,540,990);
    tracks.slice(0,5).forEach((track,i)=>{
        const y = 1080 + i*100;
        ctx.textAlign = 'left'; ctx.fillStyle = theme.color; ctx.font = '20px sans-serif'; ctx.fillText(String(i+1).padStart(2,'0'),130,y);
        ctx.fillStyle = '#e2e7f4'; ctx.font = '30px sans-serif'; ctx.fillText(ellipsis(ctx,track.name,730),195,y);
        ctx.fillStyle = '#92a3bd'; ctx.font = '22px sans-serif'; ctx.fillText(ellipsis(ctx,track.artists,730),195,y+34);
    });
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
}
