// Real application + accelerated browser clock; no provider searches or writes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { getCombinedDemoTracks } from '../../src/taste/demoUniverses.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
const out = 'output/review/demo-invite';
await mkdir(out, { recursive: true });
const errors = [];
const catalog = getCombinedDemoTracks();

async function pageFor(width = 1440, personal = false) {
    const page = await browser.newPage({ viewport: { width, height: width < 900 ? 844 : 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    await page.addInitScript(({ catalog, personal }) => {
        localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
        const tracks = personal ? catalog.map((track, i) => ({ ...track, id: `personal-${i}`, demoUniverseId: undefined })) : catalog;
        const data = { tracks, mapId: personal ? 'personal-fixture' : 'demo-invite-fixture', featuresSource: 'spotify-genres', stats: { isDemo: !personal, totalAvailable: tracks.length, processedCount: tracks.length } };
        sessionStorage.setItem(personal ? 'spectra:taste:v5' : 'spectra:taste:v5:demo:guest', JSON.stringify(data));
    }, { catalog, personal });
    await page.clock.install();
    await page.goto(`${base}/taste-map?lang=ko`);
    await page.locator(width < 900 ? '.mtm-intro' : '.tm-bubble-item').first().waitFor();
    return page;
}

try {
    const page = await pageFor();
    const card = page.locator('.demo-map-invite');
    const previousData = await page.evaluate(() => sessionStorage.getItem('spectra:taste:v5:demo:guest'));
    await page.locator('.tm-map-tag-chip--all').focus();
    await page.clock.fastForward(40000);
    assert.equal(await card.count(), 0, 'Do not show the invite immediately');
    await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.id = 'fixture-guide'; overlay.setAttribute('role', 'dialog');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10002;background:#111';
        document.body.append(overlay);
    });
    await page.clock.fastForward(60000);
    assert.equal(await card.count(), 0, 'Time spent reading a guide must not count');
    await page.evaluate(() => {
        const overlay = document.querySelector('#fixture-guide');
        overlay.removeAttribute('role');
        overlay.className = 'ccp-card';
    });
    await page.clock.fastForward(60000);
    assert.equal(await card.count(), 0, 'QR must wait while the centered constellation preview is open');
    await page.evaluate(() => {
        document.querySelector('#fixture-guide').remove();
        window.fixtureHidden = true;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.fixtureHidden });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.fastForward(60000);
    assert.equal(await card.count(), 0, 'A hidden tab must not consume exploration time');
    await page.evaluate(() => { window.fixtureHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.fastForward(6000);
    await card.waitFor();
    await card.getByRole('img', { name: '내 음악으로 지도 만드는 QR 코드' }).waitFor();
    assert.equal(await card.evaluate(node => node.matches(':modal') && node.contains(document.activeElement)), true, 'The centered dialog must contain keyboard focus');
    const desktopBox = await card.boundingBox();
    assert.ok(desktopBox.width >= 580, 'Desktop invitation should be substantially larger');
    assert.ok(Math.abs(desktopBox.x + desktopBox.width / 2 - 720) < 2 && Math.abs(desktopBox.y + desktopBox.height / 2 - 500) < 2, 'Dialog is centered in both directions');
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
    assert.equal(await card.evaluate(node => node.contains(document.activeElement)), true, 'Keyboard focus stays inside the modal');
    assert.equal(await page.locator('.tm-bubble-item').count() >= 10, true);
    assert.equal(await card.locator('.demo-invite-qr').getAttribute('href'), 'https://www.spectra-music.org/?lang=ko#import');
    await page.screenshot({ path: `${out}/desktop-ko.png` });
    await page.evaluate(async () => (await import('/src/i18n/locale.js')).setLanguage('en'));
    await card.getByRole('heading', { name: /Next up/ }).waitFor();
    await page.waitForFunction(() => document.querySelector('.demo-invite-qr')?.href.includes('lang=en'));
    await page.screenshot({ path: `${out}/desktop-en.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('tm-map-tag-chip--all')), true, 'Dismissal restores map focus');
    await page.clock.fastForward(120000);
    assert.equal(await card.count(), 0, 'Dismissal lasts for this map visit');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('spectra:taste:v5:demo:guest')), previousData, 'The invite must not mutate taste data');
    await page.close();

    for (const width of [390, 320]) {
        const mobile = await pageFor(width);
        await mobile.clock.fastForward(46000);
        const invite = mobile.locator('.demo-map-invite');
        await invite.getByRole('img').waitFor();
        const box = await invite.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 844, 'Dialog remains inside the viewport');
        assert.ok(Math.abs(box.x + box.width / 2 - width / 2) < 2 && Math.abs(box.y + box.height / 2 - 422) < 2, 'Mobile invitation stays centered');
        assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await mobile.screenshot({ path: `${out}/mobile-${width}.png` });
        await invite.getByRole('link', { name: '여기서 내 지도 만들기' }).click();
        await mobile.waitForURL('**/#import');
        await mobile.locator('#import').waitFor();
        assert.equal(await mobile.locator('.demo-map-invite').count(), 0);
        await mobile.close();
    }
    const personal = await pageFor(1440, true);
    await personal.clock.fastForward(120000);
    assert.equal(await personal.locator('.demo-map-invite').count(), 0, 'Personal maps never receive an exhibition invitation');
    await personal.close();
    assert.deepEqual(errors, []);
    console.log('Demo invitation passed: centered large modal, focus containment/restoration, Escape dismissal, delayed display, guides/hidden tabs pause, unchanged data, language QR, mobile 390/320 import CTA, personal-map exclusion.');
} catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) {
        await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    }
    console.error('Page errors:', errors);
    throw error;
} finally { await browser.close(); }
