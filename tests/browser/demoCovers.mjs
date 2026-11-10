// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { getCombinedDemoTracks } from '../../src/taste/demoUniverses.js';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
    const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
    const review = process.env.DEMO_REVIEW_DIR;
    if (review) await mkdir(review, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const externalSearches = [];
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/itunes.apple.com/**', route => { externalSearches.push(route.request().url()); return route.abort(); });
    await page.route('**/*.mzstatic.com/**', route => route.abort());
    await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    await page.addInitScript(() => localStorage.setItem('spectra:map-guide:v2:desktop', 'seen'));
    await page.goto(`${base}/`);
    await page.locator('#demo').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
        const images = [...document.querySelectorAll('.lj-demo-bubble img')];
        return images.length === 18 && images.every(img => img.complete && img.naturalWidth > 0 && img.src.includes('/demo-covers/'));
    });
    assert.equal(externalSearches.length, 0);
    if (process.env.COVER_SCREENSHOT) await page.locator('.llp-demo-grid').screenshot({ path: process.env.COVER_SCREENSHOT });
    const tracks = getCombinedDemoTracks();
    assert.ok(tracks.length > 200);
    const paths = [...new Set(tracks.map(track => track.coverUrl))];
    const images = await page.evaluate(paths => Promise.all(paths.map(path => new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve({ path, width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve({ path, width: 0, height: 0 });
        image.src = path;
    }))), paths);
    for (const image of images) {
        assert.ok(image.width >= 400 && image.height >= 400, `Missing or undersized demo cover: ${image.path}`);
    }
    await page.locator('.llp-demo-launch-btn').first().click();
    await page.waitForURL('**/taste-map');
    await page.locator('.tm-map-tag-chip--all').click();
    await page.waitForFunction(count => document.querySelectorAll('.tm-bubble-item').length === count, tracks.length);
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5:demo:guest')).tracks.length), tracks.length);
    assert.equal(externalSearches.length, 0, 'The complete demo should not require live artwork searches');
    await page.waitForTimeout(1000); // Let the All camera transition settle before measuring screen geometry.
    const geometry = await page.locator('.tm-bubble-layer').evaluate(layer => {
        const covers = [...layer.querySelectorAll('.tm-bubble-item .tm-bubble')].map(element => {
            const box = element.getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2, size: box.width };
        });
        const crowded = new Set();
        for (let i = 0; i < covers.length; i++) for (let j = i + 1; j < covers.length; j++) {
            const a = covers[i], b = covers[j];
            if (Math.hypot(a.x - b.x, a.y - b.y) < (a.size + b.size) / 2) { crowded.add(i); crowded.add(j); }
        }
        const nearest = covers.map((a, i) => Math.min(...covers.filter((_, j) => i !== j).map(b =>
            Math.hypot(a.x - b.x, a.y - b.y) / ((a.size + b.size) / 2)
        ))).sort((a, b) => a - b);
        return { count: covers.length, crowded: crowded.size,
            nearest, compact: nearest.filter(distance => distance < 1).length,
            spanX: Math.max(...covers.map(cover => cover.x)) - Math.min(...covers.map(cover => cover.x)),
            spanY: Math.max(...covers.map(cover => cover.y)) - Math.min(...covers.map(cover => cover.y)),
            scale: Number(layer.style.getPropertyValue('--tm-bubble-scale')) };
    });
    assert.equal(geometry.count, tracks.length);
    assert.ok(geometry.compact > tracks.length * .2 && geometry.compact < tracks.length * .8,
        `Overview should mix compact and loose neighborhoods (${geometry.compact} compact covers)`);
    assert.ok(geometry.nearest[0] > .45, 'Compact groups must not bury cover centers');
    assert.ok(geometry.nearest[Math.floor(tracks.length * .9)] / geometry.nearest[Math.floor(tracks.length * .1)] > 1.7,
        'Overview should retain visibly different neighborhood densities');
    assert.ok(geometry.spanX > 900 && geometry.spanY > 650, 'The full map should spread across the viewport');
    if (review) await page.screenshot({ path: `${review}/desktop-240.png` });
    await page.getByRole('button', { name: 'zoom in', exact: true }).click();
    await page.getByRole('button', { name: 'zoom in', exact: true }).click();
    await page.waitForFunction(before => Number(document.querySelector('.tm-bubble-layer').style.getPropertyValue('--tm-bubble-scale')) > before, geometry.scale);
    if (review) { await page.waitForTimeout(500); await page.screenshot({ path: `${review}/desktop-zoom.png` }); }
    for (const width of [390, 320]) {
        const mobile = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
        const errors = [];
        mobile.on('pageerror', error => errors.push(error.message));
        await mobile.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        await mobile.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
        await mobile.route(/(?:itunes\.apple\.com|mzstatic\.com)/, route => { externalSearches.push(route.request().url()); return route.abort(); });
        await mobile.goto(`${base}/mobile-start`);
        await mobile.locator('.mobile-taste-map').waitFor();
        assert.ok((await mobile.locator('.mtm-intro h1').textContent()).includes(String(tracks.length)));
        assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (review) await mobile.screenshot({ path: `${review}/mobile-${width}.png` });
        await mobile.locator('.public-map-find').click();
        await mobile.locator('.public-map-search input').fill('Frank Ocean');
        assert.equal(await mobile.locator('.public-map-song-list > button').count(), 4);
        await mobile.locator('.public-map-song-list > button').first().click();
        assert.equal(await mobile.locator('.public-map-track h2').textContent(), 'Pink + White');
        if (width === 390) {
            const mapId = await mobile.evaluate(() => {
                const key = 'spectra:taste:v5:demo:guest';
                const taste = JSON.parse(sessionStorage.getItem(key));
                taste.tracks = taste.tracks.slice(0, 3);
                delete taste.stats.demoCatalogVersion;
                sessionStorage.setItem(key, JSON.stringify(taste));
                return taste.mapId;
            });
            await mobile.reload();
            await mobile.locator('.mobile-taste-map').waitFor();
            assert.ok((await mobile.locator('.mtm-intro h1').textContent()).includes(String(tracks.length)), 'Legacy previews should upgrade on reload');
            assert.equal(await mobile.evaluate(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5:demo:guest')).mapId), mapId);
        }
        assert.deepEqual(errors, []);
        await mobile.close();
    }
    assert.equal(externalSearches.length, 0);
    console.log(`${tracks.length} demo songs and ${paths.length} local album covers load with Apple search and image CDN blocked.`);
    console.log(`Exploratory overview: ${geometry.compact} covers in compact neighborhoods, with loose tracks between them; zoom reveals larger artwork.`);
    console.log('Mobile demo shows all songs without horizontal overflow; new artists can be searched and selected at 390px and 320px.');
} finally { await browser.close(); }
