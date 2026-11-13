import { drawSpectraLogo } from '../brand/drawSpectraLogo.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Add a frame around the captured pixels; never crop or rearrange the map.
export function mapTemplateLayout(width, height) {
    const padding = Math.round(clamp(width * .025, 24, 80));
    const header = Math.round(clamp(width * .055, 100, 170));
    const footer = Math.round(clamp(width * .025, 40, 80));
    return { width: width + padding * 2, height: height + header + footer,
        map: { x: padding, y: header, width, height }, padding, header, footer };
}

export async function frameMapView(image, { lang = 'ko' } = {}) {
    const layout = mapTemplateLayout(image.width, image.height);
    const canvas = document.createElement('canvas');
    canvas.width = layout.width; canvas.height = layout.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, '#0b101a'); background.addColorStop(1, '#110d1d');
    ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const url = URL.createObjectURL(image.blob);
    try {
        const map = new Image();
        await new Promise((resolve, reject) => {
            map.onload = resolve; map.onerror = () => reject(new Error('Map image unavailable'));
            map.src = url;
        });
        ctx.drawImage(map, layout.map.x, layout.map.y, image.width, image.height);
    } finally { URL.revokeObjectURL(url); }
    ctx.strokeStyle = '#c0b3db35'; ctx.lineWidth = 1;
    ctx.strokeRect(layout.map.x - .5, layout.map.y - .5, image.width + 1, image.height + 1);

    const logoWidth = Math.min(320, image.width * .24);
    await drawSpectraLogo(ctx, { centerX: layout.padding + logoWidth / 2, top: layout.padding * .45, width: logoWidth });
    const en = lang === 'en';
    const titleSize = clamp(image.width * .016, 22, 40);
    ctx.fillStyle = '#eee8f7'; ctx.textAlign = 'left';
    ctx.font = `600 ${titleSize}px "Pretendard Variable", "Space Grotesk", sans-serif`;
    ctx.fillText(en ? 'MY TASTE MAP' : '나의 취향 지도', layout.padding, layout.header - 23);
    ctx.textAlign = 'right'; ctx.fillStyle = '#afa2c1';
    ctx.font = `400 ${clamp(image.width * .009, 16, 24)}px "Pretendard Variable", "Space Grotesk", sans-serif`;
    ctx.fillText(en ? `${image.count} ${image.count === 1 ? 'track' : 'tracks'} in view` : `${image.count}곡 표시`, canvas.width - layout.padding, layout.header - 23);

    ctx.font = `500 ${clamp(image.width * .006, 12, 17)}px "Space Grotesk", sans-serif`;
    const baseline = layout.map.y + image.height + layout.footer * .64;
    ctx.textAlign = 'left'; ctx.fillStyle = '#a99abf';
    ctx.fillText(image.view === 'constellation' ? 'SPECTRA' : 'TASTE FIELD', layout.padding, baseline);
    ctx.textAlign = 'right'; ctx.fillStyle = '#8b7d9f';
    ctx.fillText('SPECTRA-MUSIC.ORG', canvas.width - layout.padding, baseline);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png'));
    return { ...image, blob, width: canvas.width, height: canvas.height };
}
