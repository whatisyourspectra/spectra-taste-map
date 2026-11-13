// Real Vite Worker, saved-library read, region chips and session cache reload.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { partitionGenreTracks } from '../../src/taste/genreClustering.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
const server = process.env.START_VITE === '1' ? spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', new URL(base).port, '--strictPort'], { stdio: 'ignore' }) : null;
let browser;
try {
if (server) {
    let ready = false;
    for (let i = 0; i < 80; i++) {
        if (server.exitCode !== null) throw new Error('Temporary Vite server exited');
        try { ready = (await fetch(base)).ok; } catch { /* wait for startup */ }
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error('Temporary Vite server did not start');
}
browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const output = 'output/review/genre-clustering';
await mkdir(output, { recursive: true });
const frankTags = ['rnb', 'soul', 'hip-hop', 'r&b', 'neo-soul', 'alternative rnb', 'american', 'pop'];
const profiles = [frankTags, ['taiwanese indie', 'chinese indie', 'indie', 'indie pop'], ['japanese indie', 'indie', 'indie rock'], []];
const tracks = profiles.flatMap((genres, group) => Array.from({ length: 12 }, (_, i) => ({
    id: `genre-qa-${group}-${i}`, name: `Fixture Song ${group}-${i}`, artists: group === 0 ? 'Frank Ocean' : `Fixture Artist ${group}`,
    // Deliberately conflicting, empty and missing Spotify metadata must never
    // replace the original Spectra classification or feature coordinates.
    genres, spotifyGenres: i % 3 === 0 ? [] : i % 3 === 1 ? ['techno'] : undefined,
    spotifyFeatures: { valence: .95, energy: .05 },
    valence: .5, energy: .5, danceability: .5, acousticness: .3, instrumentalness: .1,
    coverUrl: '/demo-covers/currents.jpg',
})));
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
    await page.addInitScript(tracks => {
        window.clusterRequests = [];
        window.layoutRequests = [];
        const OriginalWorker = window.Worker;
        window.Worker = class extends OriginalWorker {
            constructor(url, options) {
                super(url, options);
                this.isCluster = String(url).includes('kmeansWorker');
                this.isLayout = String(url).includes('bubbleLayoutWorker');
            }
            postMessage(data, ...rest) {
                if (this.isCluster) window.clusterRequests.push(data);
                if (this.isLayout) window.layoutRequests.push(data);
                return super.postMessage(data, ...rest);
            }
        };
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'genre-regression', featuresSource: 'lastfm', stats: {} }));
        localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
        // A stale cache must never be read by the new implementation.
        sessionStorage.setItem('taste-map-cluster-v5|stale', JSON.stringify({ assignments: tracks.map(() => 0) }));
    }, tracks);
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    await page.goto(`${base}/taste-map`);
    const chips = page.locator('.tm-map-tag-chip[data-region]');
    await page.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 4);
    const names = (await chips.locator('.tm-map-tag-name').allTextContents()).sort();
    assert.ok(names.includes('Mixed'));
    const frankChip = chips.filter({ hasText: /R&B/ }).first();
    await frankChip.click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 12);
    const frankIds = await page.locator('.tm-bubble-item.cluster-focus').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId));
    assert.ok(frankIds.every(id => id.startsWith('genre-qa-0-')));
    await page.screenshot({ path: `${output}/frank-rnb.png` });
    const sceneChip = chips.filter({ hasText: /Indie Pop/ }).first();
    await sceneChip.click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 12 &&
        [...document.querySelectorAll('.tm-bubble-item.cluster-focus')].every(node => node.dataset.bubbleId.startsWith('genre-qa-1-')));
    const cache = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('taste-map-cluster-v6|')));
    assert.equal(cache.length, 1);
    assert.ok(cache[0].includes('|s:lastfm|'), 'Both renderers use the Spectra cache namespace');
    const expected = partitionGenreTracks(tracks);
    const initial = await page.evaluate(key => ({
        payload: JSON.parse(sessionStorage.getItem(key)).payload,
        requests: window.clusterRequests.length,
    }), cache[0]);
    assert.deepEqual(initial.payload.assignments, expected.labels);
    assert.deepEqual(await page.evaluate(() => window.clusterRequests.at(-1).tracks.map(track => track.genres)), tracks.map(track => track.genres));
    // Keep a valid-looking obsolete Spotify cache to verify it cannot win when
    // returning to the bubble renderer, even across a reload.
    await page.evaluate(key => {
        const stale = JSON.parse(sessionStorage.getItem(key));
        stale.payload.assignments.fill(0);
        stale.payload.centroids = [stale.payload.centroids[0]];
        stale.payload.genreGroups = [{ key: 'techno', name: 'Techno', count: stale.payload.assignments.length }];
        sessionStorage.setItem(key.replace('|s:lastfm|', '|s:spotify|'), JSON.stringify(stale));
    }, cache[0]);
    for (const view of ['constellation', 'spotify', 'constellation', 'spotify']) {
        await page.locator(`[data-map-view=${view}]`).click();
        await page.waitForFunction(view => document.querySelector(`[data-map-view=${view}]`)?.classList.contains('active'), view);
        for (let id = 0; id < initial.payload.genreGroups.length; id++) {
            const expectedIds = tracks.filter((_, index) => expected.labels[index] === id).map(track => track.id).sort();
            await page.locator(`.tm-map-tag-chip[data-region="cluster-${id}"]`).click();
            await page.waitForFunction(ids => {
                const current = [...document.querySelectorAll('.tm-bubble-item.cluster-focus')].map(node => node.dataset.bubbleId).sort();
                return JSON.stringify(current) === JSON.stringify(ids);
            }, expectedIds);
        }
        assert.deepEqual((await chips.locator('.tm-map-tag-name').allTextContents()).sort(), names);
        assert.equal(await page.evaluate(() => window.clusterRequests.length), initial.requests,
            'Switching renderers reuses assignments without restarting clustering');
        await page.locator('.tm-map-tag-chip--all').click();
        await page.waitForFunction(count => window.layoutRequests.at(-1)?.tracks.length === count &&
            window.layoutRequests.at(-1).tracks.every(track => track.valence === .5 && track.energy === .5), tracks.length);
        assert.deepEqual(await page.evaluate(() => window.layoutRequests.at(-1).assignmentEntries),
            tracks.map((track, index) => [track.id, expected.labels[index]]));
    }
    await page.evaluate(key => {
        const oldKey = key.replace('cluster-v6', 'cluster-v5').replace('genre-partition-v2', 'genre-anchor-v1');
        const entry = JSON.parse(sessionStorage.getItem(key));
        entry.payload.assignments.fill(0);
        entry.payload.centroids = [entry.payload.centroids[0]];
        entry.payload.effectiveClusterBasis = 'genre';
        sessionStorage.setItem(oldKey, JSON.stringify(entry));
        sessionStorage.removeItem(key);
    }, cache[0]);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 4);
    assert.deepEqual((await chips.locator('.tm-map-tag-name').allTextContents()).sort(), names);
    await chips.filter({ hasText: /R&B/ }).first().click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 12);
    assert.deepEqual((await page.locator('.tm-bubble-item.cluster-focus').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId))).sort(), frankIds.sort());
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 4);
    assert.deepEqual((await chips.locator('.tm-map-tag-name').allTextContents()).sort(), names, 'New cache restores the same genre regions');
    await page.locator('[data-map-view=constellation]').click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 4);
    await chips.filter({ hasText: /R&B/ }).first().click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 12);
    assert.ok((await page.locator('.tm-bubble-item.cluster-focus').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId))).every(id => id.startsWith('genre-qa-0-')),
        'Spectra also groups from the Last.fm field');

    const diverse = Array.from({ length: 80 }, (_, i) => ({ id: `partition-${i}`, name: `Song ${i}`, artists: `Artist ${i}`,
        genres: [`style ${Math.floor(i / 2)} house`], spotifyGenres: [`style ${Math.floor(i / 2)} house`], valence: .5, energy: .5 }));
    diverse.push(...Array.from({ length: 5 }, (_, i) => ({ id: `pending-${i}`, name: `Pending ${i}`, artists: `Artist ${i}`, genres: [], spotifyGenres: [], valence: null, metadataPending: true })));
    async function partitionPage(mobile = false) {
        const next = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1600, height: 1100 }, reducedMotion: 'reduce' });
        next.on('pageerror', err => errors.push(err.message));
        await next.addInitScript(tracks => {
            sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'complete-partition', featuresSource: 'lastfm', stats: { metadataPendingCount: 5 } }));
            localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
        }, diverse);
        await next.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        await next.goto(`${base}/taste-map`);
        return next;
    }
    const complete = await partitionPage();
    await complete.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 15);
    assert.equal(await complete.locator('.tm-map-tag-count').evaluateAll(nodes => nodes.reduce((sum, node) => sum + Number(node.textContent), 0)), diverse.length);
    const data = await complete.evaluate(() => JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(key => key.startsWith('taste-map-cluster-v6|')))).payload);
    assert.equal(data.assignments.length, diverse.length, 'Pending tracks are not removed from the field');
    assert.equal(data.genreGroups.length, 15);
    assert.ok(data.assignments.every(id => Number.isInteger(id) && id >= 0 && id < 15));
    assert.equal(data.genreGroups.reduce((sum, group) => sum + group.count, 0), diverse.length);
    await complete.locator('.tm-map-tag-chip').filter({ hasText: 'Mixed' }).click();
    await complete.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 5);
    assert.ok((await complete.locator('.tm-bubble-item.cluster-focus').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId))).every(id => id.startsWith('pending-')));
    await complete.screenshot({ path: `${output}/complete-15-tags.png` });
    await complete.reload();
    await complete.waitForFunction(() => document.querySelectorAll('.tm-map-tag-count').length === 15);
    assert.equal(await complete.locator('.tm-map-tag-count').evaluateAll(nodes => nodes.reduce((sum, node) => sum + Number(node.textContent), 0)), diverse.length);
    const mobile = await partitionPage(true);
    await mobile.waitForFunction(() => document.querySelectorAll('.mtm-genres > button').length === 16);
    assert.equal(await mobile.locator('.mtm-genres > button:not(:first-child) small').evaluateAll(nodes => nodes.reduce((sum, node) => sum + Number(node.textContent), 0)), diverse.length);
    await mobile.screenshot({ path: `${output}/complete-mobile-tags.png` });
    await mobile.close(); await complete.close();
    assert.deepEqual(errors, []);
    console.log('Shared Spectra partition passed: repeated view switches preserve every membership and feature without reclustering; conflicting Spotify metadata and obsolete caches ignored; 15 tags cover all 85 imports, with matching desktop/mobile counts and cached reload.');
} catch (error) {
    await page.screenshot({ path: `${output}/failure.png` });
    console.error(JSON.stringify({ errors, chips: await page.locator('.tm-map-tag-chip').allTextContents(), text: (await page.locator('body').innerText()).slice(0, 1800) }));
    throw error;
} finally { await browser.close(); }
} finally { if (server) { server.kill('SIGTERM'); await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); }); } }
