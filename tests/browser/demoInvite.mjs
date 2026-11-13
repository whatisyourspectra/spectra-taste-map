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
        window.guideOpenEvents = 0;
        window.guideCloseEvents = 0;
        window.addEventListener('spectra:close-map-guide', () => window.guideCloseEvents++);
        window.addEventListener('spectra:open-map-guide', () => {
            window.guideOpenEvents++;
            window.guideModalConflict = Boolean(document.querySelector('.demo-map-invite'));
        });
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
    await page.clock.fastForward(40000);
    assert.equal(await card.count(), 0, 'Do not show the invite immediately');
    await page.mouse.move(701, 201);
    await page.clock.fastForward(40000);
    assert.equal(await card.count(), 0, 'Pointer movement restarts the full idle interval');
    await page.mouse.wheel(0, 40);
    await page.clock.fastForward(40000);
    assert.equal(await card.count(), 0, 'Map wheel gestures reset the idle timer');
    await page.keyboard.press('Shift');
    await page.clock.fastForward(40000);
    assert.equal(await card.count(), 0, 'Keyboard input resets the idle timer');
    await page.locator('.tm-map-tag-chip--all').dispatchEvent('click');
    await page.clock.fastForward(40000);
    assert.equal(await card.count(), 0, 'Assistive clicks without pointer events also reset the timer');
    await page.mouse.down();
    await page.clock.fastForward(60000);
    assert.equal(await card.count(), 0, 'Do not interrupt an ongoing pointer gesture');
    await page.mouse.up();
    await page.locator('.tm-map-tag-chip--all').focus();
    await page.clock.fastForward(40000);
    assert.equal(await card.count(), 0, 'Releasing a drag starts a fresh idle interval');
    await page.clock.fastForward(6000);
    await card.waitFor();
    await card.getByRole('img', { name: '내 음악으로 지도 만드는 QR 코드' }).waitFor();
    assert.equal(await card.evaluate(node => node.tagName === 'ASIDE'), true, 'The invitation is a nonmodal popup');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('tm-map-tag-chip--all')), true, 'The popup does not steal keyboard focus');
    const desktopBox = await card.boundingBox();
    assert.ok(desktopBox.width >= 330 && desktopBox.width <= 380, 'The popup is compact enough to leave the map usable');
    assert.ok(Math.abs(desktopBox.x + desktopBox.width - 1416) < 2 && Math.abs(desktopBox.y - 84) < 2, 'Popup is anchored at the upper right below the account menu');
    await page.locator('.tm-map-tag-chip--all').click();
    assert.equal(await card.count(), 1, 'Visitors can use the map without dismissing the popup');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await card.evaluate(node => getComputedStyle(node).animationName), 'demo-invite-pop');
    await page.clock.fastForward(1000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await card.evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.equal(await page.locator('.tm-bubble-item').count() >= 10, true);
    assert.equal(await card.locator('.demo-invite-qr').getAttribute('href'), 'https://www.spectra-music.org/?lang=ko#import');
    await page.screenshot({ path: `${out}/desktop-ko.png` });
    await page.evaluate(async () => (await import('/src/i18n/locale.js')).setLanguage('en'));
    await card.getByRole('heading', { name: /Next up/ }).waitFor();
    await page.waitForFunction(() => document.querySelector('.demo-invite-qr')?.href.includes('lang=en'));
    await page.screenshot({ path: `${out}/desktop-en.png` });
    await page.keyboard.press('Escape');
    const guide = page.locator('.map-guide-panel');
    await guide.waitFor();
    assert.match(await guide.locator('.map-guide-count').textContent(), /^1\/6/, 'QR dismissal restarts the existing tutorial at its first step even if it was seen');
    assert.equal(await page.evaluate(() => window.guideOpenEvents), 1);
    assert.equal(await page.evaluate(() => window.guideModalConflict), false, 'The QR popup must close before the guide opens');
    assert.equal(await guide.evaluate(node => node.contains(document.activeElement)), true, 'The guide receives keyboard focus');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.map-guide-count')?.textContent.startsWith('2/6'));
    await guide.getByRole('button', { name: 'Close walkthrough' }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('tm-map-tag-chip--all')), true, 'Closing the tutorial returns focus to the map');
    await page.clock.fastForward(40000);
    assert.equal(await card.count(), 0, 'Closing the tutorial starts a fresh idle interval');
    await page.clock.fastForward(6000);
    await card.waitFor();
    assert.equal(await card.count(), 1, 'QR returns after another idle interval without revisiting the map');
    await card.getByRole('button', { name: 'Dismiss invitation' }).click();
    await guide.waitFor();
    assert.equal(await page.evaluate(() => window.guideOpenEvents), 2, 'Each QR dismissal starts one new walkthrough');
    await page.clock.fastForward(46000);
    await card.waitFor();
    assert.equal(await guide.count(), 0, 'An unattended walkthrough yields to the QR after the idle timeout');
    assert.equal(await page.evaluate(() => window.guideCloseEvents), 1);
    await page.clock.fastForward(60000);
    assert.equal(await card.count(), 1, 'Idle callbacks never stack multiple QR popups');
    assert.equal(await page.evaluate(() => window.guideOpenEvents), 2);
    await page.screenshot({ path: `${out}/recurring-idle.png` });
    assert.equal(await page.evaluate(() => sessionStorage.getItem('spectra:taste:v5:demo:guest')), previousData, 'The invite must not mutate taste data');
    await page.close();

    const blocked = await pageFor();
    await blocked.clock.fastForward(40000);
    await blocked.evaluate(() => {
        const dialog = document.createElement('dialog');
        dialog.id = 'fixture-form'; dialog.innerHTML = '<input aria-label="Feedback draft">';
        document.body.append(dialog); dialog.showModal();
    });
    await blocked.clock.fastForward(60000);
    assert.equal(await blocked.locator('.demo-map-invite').count(), 0, 'Do not interrupt another native modal or form');
    await blocked.evaluate(() => document.querySelector('#fixture-form').remove());
    await blocked.clock.fastForward(40000);
    assert.equal(await blocked.locator('.demo-map-invite').count(), 0, 'Closing a blocking modal starts a fresh timeout');
    await blocked.clock.fastForward(6000);
    await blocked.locator('.demo-map-invite').waitFor();
    await blocked.close();

    const background = await pageFor();
    await background.clock.fastForward(40000);
    await background.evaluate(() => {
        window.fixtureHidden = true;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.fixtureHidden });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await background.clock.fastForward(60000);
    assert.equal(await background.locator('.demo-map-invite').count(), 0, 'Hidden tabs do not trigger a QR');
    await background.evaluate(() => { window.fixtureHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await background.clock.fastForward(40000);
    assert.equal(await background.locator('.demo-map-invite').count(), 0, 'Returning to the tab grants a new full idle interval');
    await background.locator('.tm-bubble-item .tm-bubble').first().dispatchEvent('click');
    await background.locator('.ccp-card').waitFor();
    await background.clock.fastForward(40000);
    assert.equal(await background.locator('.demo-map-invite').count(), 0, 'Inspecting a song starts a fresh idle interval');
    await background.clock.fastForward(6000);
    await background.locator('.demo-map-invite').waitFor();
    await background.close();

    for (const method of ['close-button', 'escape']) {
        const desktop = await pageFor();
        await desktop.clock.fastForward(46000);
        const invite = desktop.locator('.demo-map-invite');
        await invite.getByRole('img').waitFor();
        if (method === 'close-button') await invite.getByRole('button', { name: '내 지도 만들기 안내 닫기' }).click();
        else await desktop.keyboard.press('Escape');
        await desktop.locator('.map-guide-panel').waitFor();
        assert.match(await desktop.locator('.map-guide-count').textContent(), /^1\/6/);
        assert.equal(await desktop.evaluate(() => window.guideOpenEvents), 1);
        assert.equal(await desktop.evaluate(() => window.guideModalConflict), false);
        assert.equal(await invite.count(), 0);
        if (method === 'close-button') await desktop.screenshot({ path: `${out}/tutorial-after-dismiss.png` });
        await desktop.close();
    }

    const importPage = await pageFor();
    await importPage.clock.fastForward(46000);
    await importPage.locator('.demo-map-invite').getByRole('link', { name: '여기서 내 지도 만들기' }).click();
    await importPage.waitForURL('**/#import');
    assert.equal(await importPage.locator('.map-guide-panel').count(), 0, 'Import CTA must not start a map tutorial after navigation');
    assert.equal(await importPage.evaluate(() => window.guideOpenEvents), 0);
    await importPage.close();

    for (const width of [390, 320]) {
        const mobile = await pageFor(width);
        await mobile.clock.fastForward(46000);
        const invite = mobile.locator('.demo-map-invite');
        await invite.getByRole('img').waitFor();
        const box = await invite.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 844, 'Popup remains inside the viewport');
        assert.ok(Math.abs(box.x + box.width - (width - 12)) < 2 && Math.abs(box.y - 80) < 2, 'Mobile invitation also sits at the upper right');
        assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await mobile.screenshot({ path: `${out}/mobile-${width}.png` });
        await invite.getByRole('button', { name: '내 지도 만들기 안내 닫기' }).click();
        await mobile.clock.fastForward(40000);
        assert.equal(await invite.count(), 0);
        await mobile.clock.fastForward(6000);
        await invite.waitFor();
        await invite.getByRole('link', { name: '여기서 내 지도 만들기' }).click();
        await mobile.waitForURL('**/#import');
        await mobile.locator('#import').waitFor();
        assert.equal(await mobile.locator('.demo-map-invite').count(), 0);
        assert.equal(await mobile.evaluate(() => window.guideOpenEvents), 0);
        await mobile.close();
    }
    const personal = await pageFor(1440, true);
    await personal.clock.fastForward(120000);
    assert.equal(await personal.locator('.demo-map-invite').count(), 0, 'Personal maps never receive an exhibition invitation');
    await personal.close();
    assert.deepEqual(errors, []);
    console.log('Idle QR passed: upper-right nonmodal popup, map controls remain usable, pop animation/reduced motion, input resets, recurring tutorial cycles, native-form/hidden-tab protection, mobile recurrence, import CTA and personal-map exclusion.');
} catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) {
        await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    }
    console.error('Page errors:', errors);
    throw error;
} finally { await browser.close(); }
