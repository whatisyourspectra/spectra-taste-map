// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { DEMO_UNIVERSES } from '../../src/taste/demoUniverses.js';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.addInitScript(() => localStorage.setItem('spectra:map-guide:v1:desktop', 'seen'));
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/itunes.apple.com/search?**', async route => {
        await new Promise(resolve => setTimeout(resolve, 120));
        await route.fulfill({ json: { results: [{ artworkUrl100: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPd8AAAAASUVORK5CYII=' }] } });
    });
    await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
    const total = DEMO_UNIVERSES.reduce((sum, universe) => sum + universe.tracks.length, 0);
    for (let i = 0; i < DEMO_UNIVERSES.length; i++) {
        await page.goto(`${base}/`);
        await page.locator('.llp-demo-launch-btn').nth(i).click();
        await page.waitForURL('**/taste-map');
        const active = page.locator('.tm-map-tag-chip.active');
        await page.waitForFunction(name => document.querySelector('.tm-map-tag-chip.active')?.textContent.includes(name), DEMO_UNIVERSES[i].koreanName);
        // Wait for late cover batches, then assert both the selected filter and visible music.
        await page.waitForFunction(() => {
            const taste = JSON.parse(sessionStorage.getItem('spectra:taste:v5:demo:guest') || 'null');
            return taste?.tracks.every(track => track.coverUrl.startsWith('data:image/png') || track.coverUrl.startsWith('/demo-covers/'));
        });
        await page.waitForFunction(() => [...document.querySelectorAll('.tm-bubble-item')].filter(element => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
        }).length >= 10);
        await page.waitForFunction(id => { const nodes = [...document.querySelectorAll('.tm-bubble-item')]; return nodes.length >= 10 && nodes.every(node => node.dataset.bubbleId.startsWith(`demo-${id}-`)); }, DEMO_UNIVERSES[i].id);
        // Camera/layout transitions must settle and stay populated after all late updates.
        await page.waitForTimeout(700);
        assert.ok(await page.locator('.tm-bubble-item').count() >= 10);
        assert.ok((await active.innerText()).includes(DEMO_UNIVERSES[i].koreanName));
        assert.equal(await page.locator('.tm-map-tag-chip').count(), 4);
        assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5:demo:guest')).tracks.length), total);
        await page.locator('.tm-map-tag-chip--all').click();
        await page.waitForFunction(() => document.querySelector('.tm-map-tag-chip--all')?.classList.contains('active'));
        await page.waitForFunction(count => document.querySelectorAll('.tm-bubble-item').length === count, total);
        const next = (i + 1) % DEMO_UNIVERSES.length;
        await page.getByRole('button', { name: DEMO_UNIVERSES[next].koreanName, exact: true }).click();
        await page.waitForFunction(id => { const nodes = [...document.querySelectorAll('.tm-bubble-item')]; return nodes.length >= 10 && nodes.every(node => node.dataset.bubbleId.startsWith(`demo-${id}-`)); }, DEMO_UNIVERSES[next].id);
        await page.waitForTimeout(700);
        assert.ok((await active.innerText()).includes(DEMO_UNIVERSES[next].koreanName));
        assert.ok(await page.locator('.tm-bubble-item').count() >= 10);
        assert.ok((await page.locator('.tm-bubble-item').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId))).every(id => id.startsWith(`demo-${DEMO_UNIVERSES[next].id}-`)));
        await page.reload();
        await page.waitForFunction(name => document.querySelector('.tm-map-tag-chip.active')?.textContent.includes(name), DEMO_UNIVERSES[i].koreanName);
        await page.waitForFunction(id => { const nodes = [...document.querySelectorAll('.tm-bubble-item')]; return nodes.length >= 10 && nodes.every(node => node.dataset.bubbleId.startsWith(`demo-${id}-`)); }, DEMO_UNIVERSES[i].id);
        console.log(`Selected ${DEMO_UNIVERSES[i].id}, shared field ${total} tracks, All resets filter.`);
    }
} finally { await browser.close(); }
