import { toSvg } from 'html-to-image';

const VISUAL_LAYERS = '.tm-heatmap-layer, .tm-region-label-layer, .tm-bubble-layer, .tm-discovery-orbit';
const MAP_CONTROLS = '.tm-rec-actions, .tm-bubble-share-select, .tm-bubble-context-menu, .tm-group-panel';
const MISSING_IMAGE = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" data-spectra-missing="true"/>')}`;

function checkAbort(signal) {
    if (signal?.aborted) throw new DOMException('Capture cancelled', 'AbortError');
}

function captureFilter(root) {
    return node => {
        if (!(node instanceof Element)) return true;
        if (root.matches('.tm-bubble-wrap') && node.parentElement === root && !node.matches(VISUAL_LAYERS)) return false;
        if (node instanceof HTMLElement) {
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        }
        return !node.matches(MAP_CONTROLS);
    };
}

function resourceUrls(root, filter) {
    const urls = new Set();
    const visit = node => {
        if (!filter(node)) return;
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const background = style.backgroundImage;
        for (const match of background.matchAll(/url\(["']?(.*?)["']?\)/g)) urls.add(match[1]);
        if (node instanceof HTMLImageElement) urls.add(node.currentSrc || node.src);
        if (node instanceof SVGImageElement) urls.add(node.href.baseVal);
        for (const child of node.children) visit(child);
    };
    visit(root);
    return [...urls].filter(url => url && !url.startsWith('data:') && !url.startsWith('#'));
}

// Check assets before the renderer caches them. A failed/CORS-blocked cover
// must produce a recoverable error rather than an incomplete download.
async function checkResources(urls, signal) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(6, urls.length) }, async () => {
        while (next < urls.length) {
            checkAbort(signal);
            const response = await fetch(urls[next++], { signal, mode: 'cors', credentials: 'same-origin' });
            if (!response.ok) throw new Error('Map image could not be loaded');
            await response.blob();
        }
    }));
}

export function mapViewSize(root) {
    if (!root?.isConnected) throw new Error('Map is unavailable');
    const rect = root.getBoundingClientRect();
    const width = Math.round(rect.width), height = Math.round(rect.height);
    if (width < 1 || height < 1) throw new Error('Map is hidden');
    const ratio = Math.min(2, 8192 / Math.max(width, height), Math.sqrt(16000000 / (width * height)));
    return { width, height, outputWidth: Math.round(width * ratio), outputHeight: Math.round(height * ratio) };
}

// Capture only the rendered map. Camera, zoom, filter, visible labels, CSS
// transforms, constellation edges and the existing heatmap are preserved.
export async function createMapViewPng(root, { signal } = {}) {
    checkAbort(signal);
    const size = mapViewSize(root);
    const bounds = root.getBoundingClientRect();
    const count = [...root.querySelectorAll('.tm-bubble-item .tm-bubble, .tm-rec-bubble, .public-map-marker')].filter(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
            && rect.width > 0 && rect.height > 0 && rect.right > bounds.left && rect.left < bounds.right
            && rect.bottom > bounds.top && rect.top < bounds.bottom;
    }).length;
    const view = root.matches('.tm-constellation-view') || root.closest('.public-map-stage:not(.is-album-view)')
        ? 'constellation' : 'bubbles';
    const filter = captureFilter(root);
    await checkResources(resourceUrls(root, filter), signal);
    await document.fonts?.ready;
    checkAbort(signal);
    const svg = await toSvg(root, {
        width: size.width, height: size.height, filter,
        preferredFontFormat: 'woff2', includeQueryParams: true,
        imagePlaceholder: MISSING_IMAGE, fetchRequestInit: { signal },
        style: { margin: '0', transform: 'none', minHeight: '0', maxHeight: 'none',
            width: `${size.width}px`, height: `${size.height}px` },
    });
    checkAbort(signal);
    if (decodeURIComponent(svg).includes(MISSING_IMAGE)) throw new Error('Map image is incomplete');
    const image = new Image();
    await new Promise((resolve, reject) => {
        image.onload = resolve; image.onerror = () => reject(new Error('Map rendering failed'));
        image.src = svg;
    });
    checkAbort(signal);
    const canvas = document.createElement('canvas');
    canvas.width = size.outputWidth; canvas.height = size.outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = root.closest('.tm-theme-day') ? '#ffffff' : '#070b13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png'));
    checkAbort(signal);
    return { blob, width: canvas.width, height: canvas.height, count, view };
}
