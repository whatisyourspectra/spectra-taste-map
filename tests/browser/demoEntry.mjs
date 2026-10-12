// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { DEMO_UNIVERSES } from '../../src/taste/demoUniverses.js';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const renderErrors = [];
    page.on('pageerror', error => renderErrors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error' && message.text().includes('Maximum update depth')) {
            renderErrors.push(message.text());
        }
    });
    await page.addInitScript(() => {
        window.layoutWorkerStarts = 0;
        const OriginalWorker = window.Worker;
        window.Worker = class extends OriginalWorker {
            constructor(...args) {
                super(...args);
                if (String(args[0]).includes('bubbleLayoutWorker')) window.layoutWorkerStarts++;
            }
        };
    });
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
        const settledWorkerStarts = await page.evaluate(() => window.layoutWorkerStarts);
        await page.waitForTimeout(700);
        assert.equal(await page.evaluate(() => window.layoutWorkerStarts), settledWorkerStarts,
            'Idle demo must not keep restarting the bubble layout worker');
        assert.deepEqual(renderErrors, [], 'Demo must not enter an infinite React update loop');
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
    // Saved-group filtering shares the discovery dependencies that caused the
    // demo loop. Exercise that path and returning to the complete library.
    await page.evaluate(() => {
        const taste = JSON.parse(sessionStorage.getItem('spectra:taste:v5:demo:guest'));
        const tracks = taste.tracks.slice(0, 2);
        localStorage.setItem(`spectra-custom-groups-v1.${taste.mapId}`, JSON.stringify({
            version: 1,
            groups: [{ id: 'browser-regression-group', name: 'Regression group', color: '#70d6ff',
                tracks, trackIds: tracks.map(track => track.id) }],
        }));
    });
    await page.reload();
    await page.locator('.tm-dock-action').last().click();
    await page.locator('.tm-saved-group-main').filter({ hasText: 'Regression group' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item').length === 2);
    await page.waitForTimeout(700);
    const groupWorkerStarts = await page.evaluate(() => window.layoutWorkerStarts);
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => window.layoutWorkerStarts), groupWorkerStarts);
    await page.getByRole('button', { name: '전체 곡 보기', exact: true }).click();
    await page.waitForFunction(count => document.querySelectorAll('.tm-bubble-item').length === count, total);
    assert.deepEqual(renderErrors, []);
    console.log('Saved group renders two tracks without worker churn; Show all restores the library.');
} finally { await browser.close(); }
