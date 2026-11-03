// Real Vite Worker, saved-library read, region chips and session cache reload.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const output = 'output/review/genre-clustering';
await mkdir(output, { recursive: true });
const frankTags = ['rnb', 'soul', 'hip-hop', 'r&b', 'neo-soul', 'alternative rnb', 'american', 'pop'];
const profiles = [frankTags, ['taiwanese indie', 'chinese indie', 'indie', 'indie pop'], ['japanese indie', 'indie', 'indie rock'], []];
const tracks = profiles.flatMap((genres, group) => Array.from({ length: 12 }, (_, i) => ({
    id: `genre-qa-${group}-${i}`, name: `Fixture Song ${group}-${i}`, artists: group === 0 ? 'Frank Ocean' : `Fixture Artist ${group}`,
    genres, spotifyGenres: genres, valence: .5, energy: .5, danceability: .5, acousticness: .3, instrumentalness: .1,
    coverUrl: '/demo-covers/currents.jpg',
})));
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
    await page.addInitScript(tracks => {
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'genre-regression', featuresSource: 'lastfm', stats: {} }));
        localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
        // A stale cache must never be read by the new implementation.
        sessionStorage.setItem('taste-map-cluster-v4|stale', JSON.stringify({ assignments: tracks.map(() => 0) }));
    }, tracks);
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.goto(`${base}/taste-map`);
    const chips = page.locator('.tm-map-tag-chip[data-region]');
    await page.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 4);
    const names = (await chips.allTextContents()).sort();
    assert.ok(names.includes('Mixed / Other'));
    const frankChip = chips.filter({ hasText: /R&B/ }).first();
    await frankChip.click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 12);
    const frankIds = await page.locator('.tm-bubble-item.cluster-focus').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId));
    assert.ok(frankIds.every(id => id.startsWith('genre-qa-0-')));
    await page.screenshot({ path: `${output}/frank-rnb.png` });
    const sceneChip = chips.filter({ hasText: /Chinese Indie|Taiwanese Indie/ }).first();
    await sceneChip.click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 12 &&
        [...document.querySelectorAll('.tm-bubble-item.cluster-focus')].every(node => node.dataset.bubbleId.startsWith('genre-qa-1-')));
    const cache = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('taste-map-cluster-v5|')));
    assert.equal(cache.length, 1);
    await page.evaluate(key => {
        const oldKey = key.replace('cluster-v5', 'cluster-v4').replace('genre-anchor-v1', 'dbscan-v3');
        const entry = JSON.parse(sessionStorage.getItem(key));
        entry.payload.assignments.fill(0);
        entry.payload.centroids = [entry.payload.centroids[0]];
        entry.payload.effectiveClusterBasis = 'genre';
        sessionStorage.setItem(oldKey, JSON.stringify(entry));
        sessionStorage.removeItem(key);
    }, cache[0]);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 4);
    assert.deepEqual((await chips.allTextContents()).sort(), names);
    await chips.filter({ hasText: /R&B/ }).first().click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 12);
    assert.deepEqual((await page.locator('.tm-bubble-item.cluster-focus').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId))).sort(), frankIds.sort());
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 4);
    assert.deepEqual((await chips.allTextContents()).sort(), names, 'New cache restores the same genre regions');
    await page.locator('[data-map-view=constellation]').click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-map-tag-chip[data-region]').length === 4);
    await chips.filter({ hasText: /R&B/ }).first().click();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item.cluster-focus').length === 12);
    assert.ok((await page.locator('.tm-bubble-item.cluster-focus').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId))).every(id => id.startsWith('genre-qa-0-')),
        'Spectra also groups from the Last.fm field');
    assert.deepEqual(errors, []);
    console.log('Frank Ocean fixture, regional separation, unknown group, and cached reload passed in the real browser Worker.');
} catch (error) {
    await page.screenshot({ path: `${output}/failure.png` });
    console.error(JSON.stringify({ errors, chips: await page.locator('.tm-map-tag-chip').allTextContents(), text: (await page.locator('body').innerText()).slice(0, 1800) }));
    throw error;
} finally { await browser.close(); }
