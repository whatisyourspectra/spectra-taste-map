// PLAYWRIGHT_MODULE points to an installed Playwright module; BASE_URL defaults to the local dev server.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const tracks = [
    { id: 'quiet', name: '밤의 산책', artists: 'Wave to Earth', energy: .2, valence: .3 },
    { id: 'bright', name: 'Morning Light', artists: 'Khruangbin', energy: .75, valence: .8 },
    { id: 'flow', name: 'A Walk', artists: 'Tycho', energy: .55, valence: .45 },
    { id: 'warm', name: '나의 하루', artists: '김사월', energy: .35, valence: .6 },
    { id: 'night', name: 'Open', artists: 'Rhye', energy: .25, valence: .5 },
    { id: 'spark', name: 'Loud Places', artists: 'Jamie xx', energy: .8, valence: .7 },
    { id: 'calm', name: 'Near Light', artists: 'Ólafur Arnalds', energy: .15, valence: .25 },
    { id: 'search', name: '내가 찾던 곡', artists: 'My Artist', energy: .95, valence: .95 },
].map(track => ({ ...track, genres: ['indie'], coverUrl: `https://covers.test/${track.id}.svg` }));
try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-05T14:00:00+09:00'));
    await page.addInitScript(tracks => {
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'mood-review', stats: {}, featuresSource: 'lastfm' }));
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            if (window.blockOracleSave && key.startsWith('spectra_oracle_log_')) throw new DOMException('Quota', 'QuotaExceededError');
            return original.call(this, key, value);
        };
    }, tracks);
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('https://covers.test/**', route => route.request().url().includes('/night.') ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#5e7b72"/><circle cx="60" cy="60" r="38" fill="#c4d1b0"/><circle cx="60" cy="60" r="15" fill="#263f48"/></svg>' }));
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5188'}/taste-map/mobile?oracle=1`);
    const oracle = page.locator('.sco-root');
    await oracle.locator('.sco-chip-btn').first().click();
    await oracle.locator('.sco-shift-card').first().click();
    const quietValue = await oracle.locator('input[type=range]').first().inputValue();
    await oracle.locator('.sco-shift-card').nth(1).click();
    assert.notEqual(await oracle.locator('input[type=range]').first().inputValue(), quietValue);
    await oracle.locator('.sco-shift-card').first().click();
    await oracle.locator('summary').click();
    await oracle.screenshot({ path: '/tmp/spectra-mood-direction.png' });
    await oracle.locator('.sco-continue').click();
    assert.equal(await oracle.locator('.sco-candidate-row').count(), 5);
    assert.equal(await oracle.locator('.sco-choice-constellation .oracle-art').isVisible(), true);
    const previewGeometry = await oracle.locator('.sco-choice-constellation .oracle-art').innerHTML();
    const covers = oracle.locator('.sco-candidate-select .sco-album-cover');
    assert.equal(await covers.count(), 5);
    await covers.locator('img').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('.sco-candidate-select .sco-album-cover img')].every(img => img.complete && (img.naturalWidth > 0 || img.style.display === 'none')));
    assert.equal(await covers.locator('img').evaluateAll(images => images.filter(img => img.style.display === 'none').length), 1);
    for (const width of [320, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Choice overflow at ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await oracle.screenshot({ path: '/tmp/spectra-mood-choice.png' });
    await oracle.locator('input[type=search]').fill('내가 찾던');
    assert.equal(await oracle.locator('.sco-candidate-row').count(), 1);
    assert.equal(await oracle.locator('.sco-choice-constellation .oracle-art').innerHTML(), previewGeometry);
    await oracle.getByRole('button', { name: '내가 찾던 곡 선택하기' }).click();
    assert.equal(await oracle.locator('.sco-track-name').textContent(), '내가 찾던 곡');
    await oracle.locator('.sco-track-box .sco-album-cover img').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.sco-track-box .sco-album-cover img')?.naturalWidth > 0);
    await oracle.locator('.oracle-art__star[role=button]').nth(1).press('Enter');
    assert.equal(await oracle.locator('.oracle-art__star[aria-pressed=true]').count(), 1);
    await oracle.locator('.sco-constellation-art').screenshot({ path: '/tmp/spectra-mood-art.png' });
    await page.evaluate(() => { window.blockOracleSave = true; });
    await oracle.locator('.sco-tear-btn').click();
    await oracle.locator('.sco-save-error').waitFor();
    assert.equal(await oracle.locator('.sco-stamped-bar').count(), 0);
    await page.evaluate(() => { window.blockOracleSave = false; });
    await oracle.locator('.sco-tear-btn').click();
    await oracle.locator('.sco-stamped-bar').waitFor();
    assert.equal(await page.locator('.mcc-day-cell.has-record .oracle-art').count(), 1);
    await page.locator('.mcc-root').screenshot({ path: '/tmp/spectra-mood-calendar.png' });
    await page.locator('.mcc-day-cell.has-record').click();
    assert.equal(await page.locator('.mcc-dialog').evaluate(dialog => dialog.open), true);
    assert.equal(await page.locator('.mcc-modal-track-info h6').textContent(), '내가 찾던 곡');
    await page.locator('.mcc-dialog').screenshot({ path: '/tmp/spectra-mood-record.png' });
    await page.keyboard.press('Escape');
    await page.locator('.mcc-dialog').waitFor({ state: 'detached' });
    await page.reload();
    await oracle.locator('.sco-stamped-bar').waitFor();
    assert.equal(await oracle.locator('.sco-track-name').textContent(), '내가 찾던 곡');
    for (const width of [320, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
    }
    const uiText = await page.locator('.sco-root, .mcc-root').allTextContents();
    assert.equal(/\p{Emoji_Presentation}|\uFE0F/u.test(uiText.join('')), false);
    assert.deepEqual(errors, []);
    console.log('Mood choice, direct search, selected star, save failure/retry, calendar, reload, responsive layout, and emoji checks passed.');
} finally {
    await browser.close();
}
