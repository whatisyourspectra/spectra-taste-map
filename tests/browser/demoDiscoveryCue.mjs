// Verify real controls with provider fixtures; visual hints must never search.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { getCombinedDemoTracks } from '../../src/taste/demoUniverses.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
const out = 'output/review/demo-discovery-cue';
await mkdir(out, { recursive: true });
const catalog = getCombinedDemoTracks(), errors = [];

async function open(demo = true) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    const calls = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/api/discover?**', route => {
        calls.push(new URL(route.request().url()));
        return route.fulfill({ json: { tracks: catalog.slice(0, 2).map((track, i) => ({ ...track, id: `cue-discovery-${i}`, name: `A new discovery ${i}`, artists: 'A new artist' })) } });
    });
    await page.addInitScript(({ catalog, demo }) => {
        localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
        const tracks = demo ? catalog : catalog.map((track, i) => ({ ...track, id: `personal-${i}`, demoUniverseId: undefined }));
        sessionStorage.setItem(demo ? 'spectra:taste:v5:demo:guest' : 'spectra:taste:v5', JSON.stringify({ tracks, mapId: 'cue-fixture', featuresSource: 'spotify-genres', stats: { isDemo: demo, totalAvailable: tracks.length, processedCount: tracks.length } }));
    }, { catalog, demo });
    await page.goto(`${base}/taste-map?lang=ko`);
    await page.locator('.tm-bubble-item').first().waitFor();
    return { page, calls };
}

try {
    const { page, calls } = await open();
    const newMusic = page.locator('.tm-dock-action').filter({ hasText: '새 음악 찾기' });
    assert.ok(await newMusic.evaluate(node => node.classList.contains('is-demo-discovery-cued')));
    await page.mouse.move(700, 200);
    assert.match(await newMusic.evaluate(node => getComputedStyle(node).animationName), /demo-discovery-breathe/);
    await page.waitForTimeout(600);
    assert.equal(calls.length, 0, 'Affordance animations never request recommendations');
    await page.screenshot({ path: `${out}/new-music.png` });
    const before = await newMusic.boundingBox();
    await newMusic.hover();
    const after = await newMusic.boundingBox();
    assert.ok(Math.abs(before.x - after.x) < .5 && Math.abs(before.y - after.y) < .5 && before.width === after.width, 'The button stays in place under the pointer');
    assert.equal(await newMusic.evaluate(node => getComputedStyle(node).animationName), 'none');
    await newMusic.click();
    await page.locator('.tm-discovery-panel').waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.tm-discovery-song-list li').length === 2);
    assert.ok(calls.length > 0);
    assert.equal(await newMusic.evaluate(node => node.classList.contains('is-demo-discovery-cued')), false, 'A used control stops inviting attention');
    await page.getByRole('button', { name: '추천 목록 닫기', exact: true }).click();
    assert.equal(await newMusic.evaluate(node => node.classList.contains('is-demo-discovery-cued')), false, 'Closing the panel must not restart the cue');
    await page.locator('.tm-bubble-item .tm-bubble').first().dispatchEvent('click');
    const popup = page.locator('.ccp-card');
    await popup.waitFor();
    await page.waitForTimeout(360);
    const popupBox = await popup.boundingBox();
    assert.ok(Math.abs(popupBox.x + popupBox.width / 2 - 720) < 2 && Math.abs(popupBox.y + popupBox.height / 2 - 500) < 2, 'Demo constellation preview is centered in the viewport');
    const similar = popup.getByRole('button', { name: /비슷한 곡 찾기/ });
    assert.ok(await similar.evaluate(node => node.classList.contains('is-demo-discovery-cued')));
    await page.mouse.move(700, 200);
    assert.match(await similar.evaluate(node => getComputedStyle(node).animationName), /demo-discovery-breathe/);
    const beforeSimilar = calls.length;
    await page.screenshot({ path: `${out}/similar-songs.png` });
    assert.equal(calls.length, beforeSimilar, 'Opening song details does not fetch recommendations');
    await similar.click({ trial: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await similar.evaluate(node => node.getAnimations({ subtree: true }).length), 0, 'Reduced motion removes every cue animation');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await similar.focus();
    await similar.press('Enter');
    await page.waitForFunction(() => !document.querySelector('.ccp-card .is-demo-discovery-cued'));
    await page.waitForFunction(count => document.querySelectorAll('.tm-discovery-song-list li').length === count, 2);
    assert.ok(calls.length > beforeSimilar && calls.at(-1).searchParams.get('seedTracks'), 'Similar songs searches from the selected song');
    await page.waitForTimeout(500);
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 640 }]) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        const docked = await popup.boundingBox();
        assert.equal(await popup.evaluate(node => node.classList.contains('is-docked')), true);
        assert.ok(Math.abs(docked.x + docked.width - (viewport.width - 24)) < 2 && docked.x > viewport.width / 2, 'Similar-song exploration moves the card to the right and clears the map center');
        assert.ok(docked.y >= 16 && docked.y + docked.height <= viewport.height - 64, 'Docked card remains clear of the help button');
        assert.match(await popup.evaluate(node => getComputedStyle(node).boxShadow), /^rgba\(3, 5, 11, 0\)/, 'Exploration removes the full-map dimming');
        await page.screenshot({ path: `${out}/similar-docked-${viewport.width}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await popup.getByRole('button', { name: '닫기', exact: true }).click();
    await newMusic.click();
    await page.locator('.tm-discovery-panel').waitFor({ state: 'detached' });
    await page.locator('.tm-bubble-item .tm-bubble').first().dispatchEvent('click');
    await popup.waitFor();
    assert.equal(await popup.locator('.is-demo-discovery-cued').count(), 0, 'Opening another preview does not restart a completed cue');
    assert.equal(await popup.evaluate(node => node.classList.contains('is-docked')), false, 'Returning to normal song inspection restores the centered card');
    await page.close();

    const { page: personal, calls: personalCalls } = await open(false);
    const personalNewMusic = personal.locator('.tm-dock-action').filter({ hasText: '새 음악 찾기' });
    assert.ok(await personalNewMusic.evaluate(node => node.classList.contains('is-demo-discovery-cued')),
        'Personal maps invite new-music discovery too');
    await personal.mouse.move(700, 200);
    assert.match(await personalNewMusic.evaluate(node => getComputedStyle(node).animationName), /demo-discovery-breathe/);
    await personal.locator('.tm-bubble-item .tm-bubble').first().dispatchEvent('click');
    await personal.locator('.ccp-card').waitFor();
    await personal.waitForTimeout(360);
    const personalPopup = personal.locator('.ccp-card');
    const personalSimilar = personalPopup.getByRole('button', { name: /비슷한 곡 찾기/ });
    assert.ok(await personalSimilar.evaluate(node => node.classList.contains('is-demo-discovery-cued')));
    assert.equal(await personalSimilar.locator('.demo-discovery-arrow').count(), 1);
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 640 }]) {
        await personal.setViewportSize(viewport);
        const box = await personalPopup.boundingBox();
        assert.ok(Math.abs(box.x + box.width / 2 - viewport.width / 2) < 2 && Math.abs(box.y + box.height / 2 - viewport.height / 2) < 2, 'Personal preview stays centered after resize');
        assert.ok(box.x >= 16 && box.y >= 16 && box.y + box.height <= viewport.height - 16, 'Preview fits the viewport');
    }
    await personalPopup.locator('.ccp-evidence > summary').click();
    const expanded = await personalPopup.boundingBox();
    assert.ok(expanded.y >= 16 && expanded.y + expanded.height <= 624, 'Expanded evidence stays inside a short screen');
    await personal.screenshot({ path: `${out}/centered-short-screen.png` });
    assert.equal(await personal.locator('.demo-discovery-action').count(), 2, 'Personal maps share both discovery highlights');
    assert.equal(personalCalls.length, 0);
    await personal.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await personalNewMusic.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    assert.equal(await personalSimilar.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    await personal.keyboard.press('Escape');
    assert.equal(await personalPopup.count(), 0, 'Escape still closes the centered preview');
    await personal.setViewportSize({ width: 1440, height: 1000 });
    await personalNewMusic.click();
    await personal.waitForFunction(() => document.querySelectorAll('.tm-discovery-song-list li').length === 2);
    assert.ok(personalCalls.length > 0);
    assert.equal(await personalNewMusic.evaluate(node => node.classList.contains('is-demo-discovery-cued')), false);
    await personal.getByRole('button', { name: '추천 목록 닫기', exact: true }).click();
    assert.equal(await personalNewMusic.evaluate(node => node.classList.contains('is-demo-discovery-cued')), false,
        'Closing personal discovery does not restart its animation');
    await personal.locator('.tm-bubble-item .tm-bubble').first().dispatchEvent('click');
    await personalPopup.waitFor();
    const beforePersonalSimilar = personalCalls.length;
    await personalSimilar.focus();
    await personalSimilar.press('Enter');
    await personal.waitForFunction(() => !document.querySelector('.ccp-card .is-demo-discovery-cued'));
    await personal.waitForFunction(() => document.querySelectorAll('.tm-discovery-song-list li').length === 2);
    assert.ok(personalCalls.length > beforePersonalSimilar && personalCalls.at(-1).searchParams.get('seedTracks'));
    await personal.close();
    assert.deepEqual(errors, []);
    console.log('Demo and personal discovery cues passed: both controls are highlighted, pointer targets stay stable, clicks/Enter preserve discovery, used cues stop, reduced motion is static, and visual cues never request recommendations.');
} catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    console.error('Page errors:', errors);
    throw error;
} finally { await browser.close(); }
