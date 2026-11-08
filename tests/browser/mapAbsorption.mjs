// Local fixtures: animated recommendation-to-library transfer and reduced motion.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
const output = 'output/review/map-absorption';
await mkdir(output, { recursive: true });
const tracks = Array.from({ length: 48 }, (_, i) => ({
    id: `library-${i}`, name: `Library song ${i}`, artists: `Artist ${i % 6}`,
    genres: ['electronic'], spotifyGenres: ['electronic'],
    valence: .3 + (i % 6) * .1, energy: .3 + (i % 4) * .15,
    spotifyFeatures: { valence: .3 + (i % 6) * .1, energy: .3 + (i % 4) * .15 },
    coverUrl: `/demo-covers/${['currents', 'geography', 'discovery'][i % 3]}.jpg`,
}));
const errors = [];
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(tracks => {
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'absorption', featuresSource: 'lastfm', stats: {} }));
        localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
    }, tracks);
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/api/discover?**', route => route.fulfill({ json: { tracks: tracks.slice(0, 8).map((t, i) => ({ ...t, id: `new-${i}`, name: `Discovery ${i}` })) } }));
    await page.goto(`${base}/taste-map?lang=ko`);
    await page.locator('.tm-bubble-item').first().waitFor();
    await page.waitForTimeout(2800);
    await page.locator('.tm-dock-actions .tm-dock-action').filter({ hasText: '새 음악 찾기' }).click();
    await page.locator('.tm-rec-action-btn.add').first().waitFor();
    const available = async () => page.evaluate(() => {
        for (const element of document.querySelectorAll('.tm-rec-action-btn.add:not(:disabled)')) {
            const r = element.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
            if (x < 20 || y < 100 || x > innerWidth - 20 || y > innerHeight - 100) continue;
            if (document.elementFromPoint(x, y)?.closest('.tm-rec-action-btn.add') === element)
                return element.closest('[data-recommendation-id]').dataset.recommendationId;
        }
        return null;
    });
    const add = async () => {
        const id = await available();
        assert.ok(id, 'There must be a reachable recommendation on the map');
        // Source bubbles deliberately float continuously. The hit test above
        // verifies reachability; do not wait for their animation to stop.
        await page.locator(`[data-recommendation-id="${id}"] .tm-rec-action-btn.add`).click({ force: true });
        assert.equal(await page.evaluate(id => JSON.parse(sessionStorage.getItem('spectra:taste:v5')).tracks.filter(t => t.id === id).length, id), 1, 'Persistence completes before motion finishes');
        return id;
    };
    const first = await add();
    await page.locator(`[data-absorption-id="${first}"]`).waitFor();
    await page.locator(`[data-bubble-id="${first}"].is-absorbing`).waitFor({ state: 'attached' });
    await page.screenshot({ path: `${output}/transfer.png` });
    const second = await add();
    await page.locator(`[data-absorption-id="${second}"]`).waitFor();
    await page.getByRole('button', { name: 'zoom in' }).click();
    await page.waitForFunction(() => !document.querySelector('.tm-absorption-layer'));
    for (const id of [first, second]) {
        assert.equal(await page.locator(`[data-bubble-id="${id}"].is-absorbing`).count(), 0);
        assert.equal(await page.locator(`[data-recommendation-id="${id}"]`).count(), 0);
        assert.equal(await page.locator(`[data-bubble-id="${id}"]`).evaluate(element => getComputedStyle(element).opacity), '1');
    }
    await page.screenshot({ path: `${output}/settled.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const third = await add();
    assert.equal(await page.locator('.tm-absorption-layer').count(), 0, 'Reduced motion skips transfer entirely');
    await page.locator(`[data-bubble-id="${third}"]`).waitFor({ state: 'attached' });
    assert.equal(await page.locator(`[data-bubble-id="${third}"] .tm-bubble`).evaluate(element => getComputedStyle(element).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const fourth = await add();
    await page.locator(`[data-absorption-id="${fourth}"]`).waitFor();
    await page.goto(`${base}/auth/login`);
    await page.locator('.sa-card').waitFor();
    assert.equal(await page.locator('.tm-absorption-layer').count(), 0, 'Leaving the map cleans up the overlay');
    assert.deepEqual(errors, []);
    console.log('Map absorption passed: immediate save, concurrent transfers, moving camera, settled nodes, reduced motion and route cleanup.');
} catch (error) {
    for (const page of browser.contexts().flatMap(context => context.pages())) await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
    throw error;
} finally { await browser.close(); }
