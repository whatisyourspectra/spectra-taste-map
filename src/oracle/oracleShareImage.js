import { hash01 } from '../taste/constellationTopology.js';

function withAlpha(hex, alpha) {
    const match = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!match) return `rgba(169, 184, 255, ${alpha})`;
    const value = match[1];
    return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
}

function fitText(ctx, value, maxWidth, initialSize, weight = 600) {
    let size = initialSize;
    do {
        ctx.font = `${weight} ${size}px "Pretendard Variable", "Space Grotesk", sans-serif`;
        if (ctx.measureText(value).width <= maxWidth) break;
        size -= 2;
    } while (size > 24);
    return size;
}

function drawWrapped(ctx, value, x, y, maxWidth, lineHeight, maxLines = 2) {
    const lines = [];
    let line = '';
    for (const character of [...String(value || '')]) {
        if (ctx.measureText(line + character).width > maxWidth && line) {
            lines.push(line);
            line = '';
            if (lines.length === maxLines - 1) break;
        }
        line += character;
    }
    const consumed = lines.join('').length;
    const rest = [...String(value || '')].slice(consumed).join('');
    let last = rest;
    while (ctx.measureText(last).width > maxWidth && last) last = [...last].slice(0, -1).join('');
    lines.push(last !== rest ? `${[...last].slice(0, -1).join('')}…` : last);
    lines.forEach((text, index) => ctx.fillText(text, x, y + index * lineHeight));
}

export async function createOracleStoryImage({ result, track, day, lang = 'ko' }) {
    if (!result) throw new Error('Missing oracle result');
    await document.fonts?.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    const color = result.color || '#a9b8ff';
    const en = lang === 'en';
    const background = ctx.createLinearGradient(0, 0, 1080, 1920);
    background.addColorStop(0, '#111a2c');
    background.addColorStop(0.52, '#070b16');
    background.addColorStop(1, '#140d28');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1080, 1920);

    const glow = ctx.createRadialGradient(540, 760, 40, 540, 760, 610);
    glow.addColorStop(0, withAlpha(color, 0.2));
    glow.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 1500);

    for (let index = 0; index < 48; index++) {
        const x = 60 + hash01(`${day}:${index}:x`) * 960;
        const y = 310 + hash01(`${day}:${index}:y`) * 930;
        ctx.beginPath();
        ctx.arc(x, y, index % 7 === 0 ? 2.5 : 1.3, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha('#cbd9ff', 0.12 + hash01(`${index}:a`) * 0.24);
        ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#a8b9d8';
    ctx.font = '600 24px "Space Grotesk", sans-serif';
    ctx.fillText('S P E C T R A  /  TODAY', 540, 146);
    ctx.fillStyle = '#7d8ba9';
    ctx.font = '400 23px "Space Grotesk", sans-serif';
    ctx.fillText(String(day || '').replaceAll('-', ' . '), 540, 205);

    ctx.fillStyle = '#f3f5ff';
    fitText(ctx, en ? result.nameEn : result.name, 900, 70, 700);
    ctx.fillText(en ? result.nameEn : result.name, 540, 306);

    const point = (node) => ({ x: 108 + node.x * 2.4, y: 375 + node.y * 2.4 });
    ctx.lineCap = 'round';
    result.edges.forEach(([from, to]) => {
        const a = result.nodes[from];
        const b = result.nodes[to];
        if (!a || !b) return;
        const p1 = point(a);
        const p2 = point(b);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = withAlpha(color, 0.56);
        ctx.lineWidth = 2.8;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
    result.nodes.forEach((node) => {
        const p = point(node);
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, node.isSelected ? 44 : 27);
        halo.addColorStop(0, withAlpha(color, node.isSelected ? 0.6 : 0.4));
        halo.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(p.x - 45, p.y - 45, 90, 90);
        ctx.beginPath();
        ctx.arc(p.x, p.y, node.isSelected ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f8faff';
        ctx.fill();
    });

    ctx.fillStyle = '#8ea3c9';
    ctx.font = '600 23px "Pretendard Variable", sans-serif';
    ctx.fillText(en ? 'MY MOMENT' : '오늘의 순간', 540, 1240);
    ctx.fillStyle = '#d8e2f7';
    const context = en ? (result.contextEn || result.context) : result.context;
    fitText(ctx, context, 870, 36);
    drawWrapped(ctx, context, 540, 1302, 870, 48);
    ctx.fillStyle = '#f0f3ff';
    ctx.font = '600 37px "Pretendard Variable", sans-serif';
    drawWrapped(ctx, en ? result.lineEn : result.line, 540, 1424, 890, 50);

    ctx.fillStyle = withAlpha(color, 0.18);
    ctx.fillRect(112, 1530, 856, 178);
    ctx.strokeStyle = withAlpha(color, 0.36);
    ctx.strokeRect(112, 1530, 856, 178);
    ctx.fillStyle = color;
    ctx.font = '600 22px "Space Grotesk", sans-serif';
    ctx.fillText(en ? 'TODAY’S TRACK' : '오늘의 곡', 540, 1586);
    ctx.fillStyle = '#ffffff';
    fitText(ctx, track?.name || '', 750, 38, 700);
    ctx.fillText(track?.name || '', 540, 1642);
    ctx.fillStyle = '#aabbd7';
    fitText(ctx, track?.artists || '', 750, 25, 400);
    ctx.fillText(track?.artists || '', 540, 1680);

    ctx.fillStyle = '#8192b1';
    ctx.font = '500 24px "Pretendard Variable", sans-serif';
    ctx.fillText(en ? 'What does your sky look like today?' : '당신의 오늘은 어떤 별자리인가요?', 540, 1820);
    ctx.fillStyle = '#7183a4';
    ctx.font = '500 20px "Space Grotesk", sans-serif';
    ctx.fillText('SPECTRA · YOUR MUSIC, YOUR SKY', 540, 1860);

    return new Promise((resolve, reject) => canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')),
        'image/png',
    ));
}
