// Dense library fixtures only; no production accounts, shares, or API writes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5194';
const out = 'output/review/album-map-density';
await mkdir(out, { recursive: true });
const covers = ['cigarettes-after-sex', 'depression-cherry', 'currents', 'show-me-how', 'salad-days', 'geography'];
const tracks = Array.from({ length: 2000 }, (_, i) => ({
    id: `density-${i}`, name: `Density Song ${i + 1}`, artists: `Artist ${i % 12}`,
    genres: [['dream pop', 'indie'], ['jazz', 'soul'], ['electronic']][i % 3],
    valence: (i * 73 % 100) / 100, energy: (i * 31 % 100) / 100,
    coverUrl: `/demo-covers/${covers[i % covers.length]}.jpg`,
    // Include hundreds of identical feature coordinates, like similar imported songs.
    x: i % 3 ? .05 + ((i * .6180339887) % 1) * .9 : .5,
    y: i % 3 ? .05 + ((i * .3819660113 + Math.sin(i * 1.7) * .2 + 1) % 1) * .9 : .5,
}));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const errors = [], results = [];

async function inspect(page) {
    const data = await page.locator('.public-map-canvas').evaluate(svg => {
        const bounds = svg.getBoundingClientRect();
        const albums = [...svg.querySelectorAll('.public-map-star')].map(star => {
            const circle = star.querySelector('.public-map-marker');
            const matrix = star.getScreenCTM();
            const center = new DOMPoint(Number(circle.getAttribute('cx')), Number(circle.getAttribute('cy'))).matrixTransform(matrix);
            return { index: Number(star.dataset.trackIndex), x: center.x, y: center.y, radius: Number(circle.getAttribute('r')) * Math.hypot(matrix.a, matrix.b), selected: star.classList.contains('is-selected') };
        });
        const controls = ['.public-map-stage-top', '.public-map-stage-bottom'].map(selector => {
            const rect = svg.parentElement.querySelector(selector).getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom };
        });
        return { albums, controls, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(data.overflow, false);
    assert.ok(data.albums.length > 0 && data.albums.length < 121);
    for (let i = 0; i < data.albums.length; i++) {
        const a = data.albums[i];
        assert.ok(a.radius < 34, 'Zoom must not inflate album covers');
        for (let j = i + 1; j < data.albums.length; j++) {
            const b = data.albums[j];
            assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius + 11.5, `Albums ${a.index} and ${b.index} overlap`);
        }
        if (!a.selected) {
            assert.ok(a.y - a.radius >= data.controls[0].bottom - .5, 'Albums clear the style controls');
            assert.ok(a.y + a.radius <= data.controls[1].top + .5, 'Albums clear the zoom controls');
        }
    }
    return data;
}

try {
    for (const scope of ['personal', 'shared']) for (const size of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
        const page = await browser.newPage({ viewport: size, isMobile: true, hasTouch: true });
        page.on('pageerror', error => errors.push(error.message));
        await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        await page.route('**/api/discover?**', route => route.fulfill({ json: { tracks: [] } }));
        if (scope === 'personal') {
            await page.addInitScript(({ tracks }) => sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'density-test', featuresSource: 'lastfm', updatedAt: new Date().toISOString(), stats: { isDemo: false, totalAvailable: tracks.length, processedCount: tracks.length } })), { tracks });
        } else {
            const data = { title: '앨범이 많은 친구의 지도', style: 'bubbles', genres: ['Dream Pop', 'Jazz', 'Electronic'], tracks };
            await page.route(/\/src\/share\/sharedMapStorage\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `export async function fetchSharedMap(){return ${JSON.stringify(data)}};export async function publishSharedMap(){};export async function revokeSharedMap(){};export async function listOwnSharedMaps(){return []}` }));
        }
        await page.goto(base + (scope === 'personal' ? '/taste-map?view=bubbles' : '/share/map/11111111-1111-4111-8111-111111111111'));
        await page.locator('.is-album-view').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);
        const overview = await inspect(page);
        assert.equal(await page.locator('.public-map-star title').count(), 0, 'Native tooltips cannot cover the mobile map');
        if (scope === 'personal') assert.equal(await page.locator('.mtm-map-caption').isVisible(), false, 'Map caption cannot overlap the density hint');
        await page.screenshot({ path: `${out}/${scope}-${size.width}-overview.png` });
        await page.locator('.public-map-stage').screenshot({ path: `${out}/${scope}-${size.width}-map.png` });
        await page.getByRole('button', { name: '확대', exact: true }).click();
        const expanded = await inspect(page);
        assert.ok(expanded.albums.some(a => !overview.albums.some(b => a.index === b.index)), 'Zoom reveals hidden songs');
        for (let i = 0; i < 5; i++) {
            await page.getByRole('button', { name: '확대', exact: true }).click();
            await inspect(page);
        }
        await page.getByRole('button', { name: scope === 'personal' ? '내 음악에서 곡 찾기' : '공유 지도에서 곡 찾기', exact: true }).click();
        await page.getByRole('searchbox').fill('Density Song 2000');
        await page.locator('.public-map-song-list > button').first().click();
        await page.waitForTimeout(400);
        assert.equal(await page.locator('.public-map-star.is-selected').getAttribute('data-track-index'), '1999');
        const selected = await inspect(page);
        assert.equal(selected.albums.at(-1).index, 1999);
        await page.screenshot({ path: `${out}/${scope}-${size.width}-selected.png` });
        const selectedAlbum = selected.albums.at(-1);
        assert.ok(Math.abs(selectedAlbum.x - selected.bounds.x - selected.bounds.width / 2) < 2);
        assert.ok(Math.abs(selectedAlbum.y - selected.bounds.y - selected.bounds.height / 2) < 2);
        assert.ok(selectedAlbum.y - selectedAlbum.radius - 6 >= selected.controls[0].bottom, 'Selected ring clears the style controls');
        assert.ok(selectedAlbum.y + selectedAlbum.radius + 6 <= selected.controls[1].top, 'Selected ring clears the zoom controls');
        results.push({ scope, width: size.width, total: tracks.length, visible: overview.albums.length, noOverlap: true, zoomRevealsSongs: true, hiddenSongSearch: true });
        await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ results, errors }, null, 2));
} finally {
    await browser.close();
}
