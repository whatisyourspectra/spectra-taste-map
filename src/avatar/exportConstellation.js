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
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.fillStyle = '#080c13';
        ctx.fillRect(0, 0, 1080, 1350);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#93a7c3';
        ctx.font = '18px sans-serif';
        ctx.fillText('S P E C T R A', 540, 95);
        ctx.fillStyle = '#e6edf8';
        ctx.font = '40px sans-serif';
        ctx.fillText(title, 540, 170);
        ctx.drawImage(image, 60, 205, 960, 960);
        ctx.fillStyle = '#b5c4d9';
        ctx.font = '24px sans-serif';
        ctx.fillText(genres.join('  ·  '), 540, 1160, 920);
        ctx.fillStyle = '#8999b0';
        ctx.font = '19px sans-serif';
        ctx.fillText(`${count.toLocaleString()} TRACKS / ONE CONSTELLATION`, 540, 1220);
        return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
}
