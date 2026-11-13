import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { getCombinedDemoTracks } from '../../src/taste/demoUniverses.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const out = 'output/review/map-view-export';
await mkdir(out, { recursive: true });
const tracks = getCombinedDemoTracks().map((track, i) => ({ ...track, id: `capture-${i}`, demoUniverseId: undefined }));
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let apiCalls = 0;
await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
await page.route('**/api/**', route => { apiCalls++; return route.fulfill({ json: { tracks: [] } }); });
await page.addInitScript(tracks => {
    if (!sessionStorage.getItem('spectra:taste:v5')) sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'view-fixture', stats: {} }));
    localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
    window.layoutRequests = 0;
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
        constructor(url, options) { super(url, options); this.layout = String(url).includes('bubbleLayoutWorker'); }
        postMessage(data, ...rest) { if (this.layout) window.layoutRequests++; return super.postMessage(data, ...rest); }
    };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(source, ...rest) {
        if (source instanceof HTMLImageElement && source.src.startsWith('data:image/svg+xml')) {
            window.mapExportSvg = decodeURIComponent(source.src.slice(source.src.indexOf(',') + 1));
        }
        return drawImage.call(this, source, ...rest);
    };
}, tracks);
const dialog = page.locator('.map-view-export-dialog');
const image = dialog.locator('.spectra-share-preview img');
const open = async () => {
    await page.getByRole('button', { name: '현재 지도 PNG 저장', exact: true }).filter({ visible: true }).click();
    await image.waitFor({ timeout: 45000 });
};
async function assertDesktopSnapshot(name) {
    await page.waitForTimeout(500);
    const expected = await page.locator('.tm-bubble-wrap').evaluate(root => {
        const box = root.getBoundingClientRect();
        return { width: Math.round(box.width), height: Math.round(box.height),
            items: [...root.querySelectorAll('[data-bubble-id]')].map(node => ({ id: node.dataset.bubbleId, left: getComputedStyle(node).left, top: getComputedStyle(node).top })),
            edges: root.querySelectorAll('.tm-constellation-lines line').length,
            workers: window.layoutRequests };
    });
    const callsBefore = apiCalls;
    const source = await page.locator('.tm-bubble-wrap').screenshot();
    const landmarks = await page.locator('.tm-bubble-wrap').evaluate(root => {
        const box = root.getBoundingClientRect();
        return [...root.querySelectorAll('.tm-bubble')].map(node => {
            const rect = node.getBoundingClientRect(), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
            return { node, x, y };
        }).filter(({ node, x, y }) => x > box.x + 10 && x < box.right - 10 && y > box.y + 10 && y < box.bottom - 10
            && node.contains(document.elementFromPoint(x, y))).slice(0, 14).map(({ x, y }) => ({ x: x - box.x, y: y - box.y }));
    });
    await open();
    assert.equal(await dialog.getByRole('button', { name: '기본 템플릿', exact: true }).getAttribute('aria-pressed'), 'true');
    const framedSize = await image.evaluate(node => [node.naturalWidth, node.naturalHeight]);
    assert.ok(framedSize[0] > expected.width * 2 && framedSize[1] > expected.height * 2, 'Template adds an outer frame without shrinking the map');
    const capturedSvg = await page.evaluate(() => window.mapExportSvg);
    const framedEvent = page.waitForEvent('download');
    await dialog.getByRole('link', { name: 'PNG 저장', exact: true }).click();
    await (await framedEvent).saveAs(`${out}/${name}-framed.png`);
    await page.screenshot({ path: `${out}/${name}-framed-preview.png` });
    await dialog.getByRole('button', { name: '지도만', exact: true }).click();
    await image.waitFor();
    assert.equal(await page.evaluate(() => window.mapExportSvg), capturedSvg, 'Layout options reuse the same capture');
    assert.deepEqual(await image.evaluate(node => [node.naturalWidth, node.naturalHeight]), [expected.width * 2, expected.height * 2]);
    const actual = await page.evaluate(() => {
        const svg = new DOMParser().parseFromString(window.mapExportSvg, 'image/svg+xml');
        return { items: [...svg.querySelectorAll('[data-bubble-id]')].map(node => ({ id: node.getAttribute('data-bubble-id'), left: node.style.left, top: node.style.top })),
            edges: svg.querySelectorAll('.tm-constellation-lines line').length,
            controls: svg.querySelectorAll('.tm-overview-nav, .tm-dock-actions, .tm-rec-actions, .tm-group-panel').length,
            workers: window.layoutRequests };
    });
    assert.deepEqual(actual.items, expected.items, 'The camera, zoom, genre filter and all mounted positions are unchanged');
    assert.equal(actual.edges, expected.edges); assert.equal(actual.controls, 0);
    assert.equal(actual.workers, expected.workers, 'Saving never runs another layout');
    assert.equal(apiCalls, callsBefore, 'No enrichment/search or publishing requests');
    if (landmarks.length >= 3) {
        const difference = await page.evaluate(async ({ source, landmarks }) => {
            const decode = async url => { const img = new Image(); img.src = url; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); return ctx; };
            const screen = await decode(`data:image/png;base64,${source}`);
            const exported = await decode(document.querySelector('.map-view-export-dialog img').src);
            const errors = landmarks.map(({ x, y }) => {
                const a = screen.getImageData(Math.round(x), Math.round(y), 1, 1).data;
                const b = exported.getImageData(Math.round(x * 2), Math.round(y * 2), 1, 1).data;
                return (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
            });
            return { count: errors.length, close: errors.filter(error => error < 35).length };
        }, { source: source.toString('base64'), landmarks });
        assert.ok(difference.close >= difference.count * .7, 'Album/star colors remain at their on-screen positions');
    }
    const event = page.waitForEvent('download');
    await dialog.getByRole('link', { name: 'PNG 저장', exact: true }).click();
    const download = await event;
    assert.equal(download.suggestedFilename(), 'my-spectra-view.png');
    await download.saveAs(`${out}/${name}.png`);
    const png = await readFile(`${out}/${name}.png`);
    assert.equal(png.readUInt32BE(16), expected.width * 2); assert.equal(png.readUInt32BE(20), expected.height * 2);
    await page.screenshot({ path: `${out}/${name}-preview.png` });
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
}
try {
    await page.goto(`${base}/taste-map?lang=ko`);
    await page.locator('.tm-bubble-item').first().waitFor();
    await page.locator('.tm-map-tag-chip[data-region]').first().click();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'zoom in', exact: true }).click();
    await page.waitForTimeout(500);
    await page.mouse.move(1100, 400); await page.mouse.down(); await page.mouse.move(1190, 450, { steps: 8 }); await page.mouse.up();
    await assertDesktopSnapshot('filtered-zoomed-bubbles');
    await page.locator('[data-map-view=constellation]').click();
    await assertDesktopSnapshot('current-constellation');

    // Failure must not silently omit a cover, and retry must recover.
    await page.evaluate(() => {
        const taste = JSON.parse(sessionStorage.getItem('spectra:taste:v5'));
        taste.tracks.forEach(track => { track.coverUrl = '/capture-failure.jpg'; });
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify(taste));
    });
    const cover = '**/capture-failure.jpg';
    await page.route(cover, route => route.abort());
    await page.goto(`${base}/taste-map?lang=ko`);
    await page.locator('.tm-bubble-item').first().waitFor();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: '현재 지도 PNG 저장', exact: true }).filter({ visible: true }).click();
    await dialog.getByRole('button', { name: '다시 시도', exact: true }).waitFor({ timeout: 45000 });
    assert.equal(await dialog.getByRole('link').count(), 0);
    await page.unroute(cover);
    await page.route(cover, route => route.fulfill({ path: 'public/demo-covers/currents.jpg', contentType: 'image/jpeg' }));
    await dialog.getByRole('button', { name: '다시 시도', exact: true }).click();
    await image.waitFor({ timeout: 45000 });
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });

    await page.goto(`${base}/?lang=ko`);
    await page.locator('.llp-demo-launch-btn').first().click();
    await page.waitForURL('**/taste-map');
    await page.locator('.is-demo-alive .tm-bubble-item').first().waitFor();
    await assertDesktopSnapshot('current-demo-field');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/taste-map?lang=en`);
    await page.locator('.public-map-canvas').waitFor();
    await page.getByLabel('More options', { exact: true }).click();
    const size = await page.locator('.public-map-canvas').evaluate(node => { const r = node.getBoundingClientRect(); return [Math.round(r.width) * 2, Math.round(r.height) * 2]; });
    await page.getByRole('button', { name: 'Save current map as PNG', exact: true }).click();
    await image.waitFor({ timeout: 45000 });
    const framedSize = await image.evaluate(node => [node.naturalWidth, node.naturalHeight]);
    assert.ok(framedSize[0] > size[0] && framedSize[1] > size[1]);
    await page.screenshot({ path: `${out}/mobile-framed-preview.png` });
    await dialog.getByRole('button', { name: 'Map only', exact: true }).click();
    await image.waitFor();
    assert.deepEqual(await image.evaluate(node => [node.naturalWidth, node.naturalHeight]), size);
    await page.screenshot({ path: `${out}/mobile-preview.png` });
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    console.log('Current-view PNG passed: minimal frame and map-only reuse the same capture; exact viewport dimensions, pan/zoom/filter positions, cover/star pixel landmarks, no relayout/API calls, failed-cover recovery, demo and mobile views.');
} catch (error) {
    await page.screenshot({ path: `${out}/failure.png` });
    console.error(errors, await dialog.textContent().catch(() => 'No dialog'));
    throw error;
} finally { await browser.close(); }
