// Personal library fixtures exercise the same layout as demo maps, without API writes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { getCombinedDemoTracks } from '../../src/taste/demoUniverses.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const out = 'output/review/common-map-spacing';
await mkdir(out, { recursive: true });
const catalog = getCombinedDemoTracks();
try {
    for (const count of [240, 1940]) {
        const tracks = Array.from({ length: count }, (_, i) => ({ ...catalog[i % catalog.length],
            id: `personal-${i}`, demoUniverseId: undefined, name: `${catalog[i % catalog.length].name} [${i}]` }));
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
        await page.addInitScript(tracks => {
            sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: `personal-spacing-${tracks.length}`,
                featuresSource: 'spotify-genres', stats: { isDemo: false, totalAvailable: tracks.length, processedCount: tracks.length } }));
            localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
        }, tracks);
        await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5173'}/taste-map`);
        await page.locator('.tm-bubble-item').first().waitFor();
        await page.locator('.tm-map-tag-chip--all').click();
        await page.waitForTimeout(700);
        assert.equal(await page.locator('.is-demo-alive').count(), 0, 'Exercise a personal map, not the demo path');
        assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5')).tracks.length), count);
        const geometry = await page.locator('.tm-bubble-item').evaluateAll(items => {
            const covers = items.map(item => {
                const r = item.getBoundingClientRect();
                return { x: r.x + r.width / 2, y: r.y + r.height / 2, size: r.width, id: item.dataset.bubbleId };
            });
            const nearest = covers.map((a, i) => Math.min(...covers.filter((_, j) => j !== i).map(b =>
                Math.hypot(a.x - b.x, a.y - b.y) / ((a.size + b.size) / 2)))).sort((a, b) => a - b);
            return { count: covers.length, compact: nearest.filter(d => d < 1).length,
                min: nearest[0], q25: nearest[Math.floor(nearest.length * .25)],
                p90: nearest[Math.floor(nearest.length * .9)] };
        });
        assert.ok(geometry.count >= Math.min(240, count) && geometry.count <= 800, 'Large imports keep DOM mounting bounded');
        assert.ok(geometry.compact > geometry.count * .35, 'Personal maps retain dense neighborhoods');
        if (count === 240) {
            assert.equal(geometry.count, count);
            assert.ok(geometry.min > .45 && geometry.q25 < .85 && geometry.p90 > 1,
                'Dense cores and loose outskirts should both remain visible');
        }
        await page.screenshot({ path: `${out}/personal-${count}.png` });
        const target = page.locator('.tm-bubble-item .tm-bubble').first();
        await target.focus();
        await page.keyboard.press('Enter');
        await page.locator('.ccp-track-name').waitFor();
        assert.deepEqual(errors, []);
        console.log(`Personal map ${count}: ${geometry.count} mounted covers, ${geometry.compact} in dense neighborhoods; selection works.`);
        await page.close();
    }
} finally { await browser.close(); }
