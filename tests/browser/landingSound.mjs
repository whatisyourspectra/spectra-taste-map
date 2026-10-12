// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
        window.soundContexts = [];
        window.soundOscillators = 0;
        const Original = window.AudioContext;
        window.AudioContext = class extends Original {
            constructor(...args) { super(...args); window.soundContexts.push(this); }
            createOscillator() { window.soundOscillators++; return super.createOscillator(); }
        };
    });
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({
        contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}',
    }));
    await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    await page.goto(base);
    const toggle = page.locator('.llp-sound-toggle');
    await toggle.waitFor();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    await page.getByRole('button', { name: '빛의 파동 만들기' }).click();
    assert.equal(await page.evaluate(() => window.soundContexts.length), 0, 'Muted interactions must not create an audio context');
    await toggle.click();
    await page.waitForFunction(() => window.soundOscillators >= 12);
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    const beforeExpand = await page.evaluate(() => window.soundOscillators);
    await page.waitForTimeout(150);
    await page.locator('[data-sound="expand"]').click();
    await page.waitForFunction(before => window.soundOscillators > before, beforeExpand);
    const beforeCollect = await page.evaluate(() => window.soundOscillators);
    await page.waitForTimeout(150);
    await page.locator('[data-sound="collect"]').click();
    await page.waitForFunction(before => window.soundOscillators > before, beforeCollect);
    const ambientCount = await page.evaluate(() => window.soundOscillators);
    await page.waitForFunction(before => window.soundOscillators > before, ambientCount, { timeout: 4000 });
    const beforePulse = await page.evaluate(() => window.soundOscillators);
    await page.getByRole('button', { name: '빛의 파동 만들기' }).click();
    await page.waitForFunction(before => window.soundOscillators > before, beforePulse);
    await toggle.click();
    await page.waitForFunction(() => window.soundContexts[0].state === 'suspended');
    const mutedCount = await page.evaluate(() => window.soundOscillators);
    await page.getByRole('button', { name: '빛의 파동 만들기' }).click();
    await page.waitForTimeout(2100);
    assert.equal(await page.evaluate(() => window.soundOscillators), mutedCount, 'Muted BGM must not continue scheduling');
    await toggle.click();
    await page.waitForFunction(() => window.soundContexts[0].state === 'running');
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => window.soundContexts[0].state === 'suspended');
    await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => window.soundContexts[0].state === 'running');
    await page.locator('.llp-nav-auth .sa-account-button').click();
    await page.waitForFunction(() => window.soundContexts[0].state === 'closed');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/mobile-start`);
    await page.waitForURL('**/taste-map/mobile');
    await page.goto(base);
    await page.locator('.llp-nav-return-btn').waitFor();
    for (const width of [390, 360, 320]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const fits = await page.locator('.llp-sound-toggle').evaluate(button => {
            const sound = button.getBoundingClientRect();
            const brand = document.querySelector('.llp-nav-brand').getBoundingClientRect();
            return sound.width >= 36 && sound.left >= brand.right && sound.right <= innerWidth;
        });
        assert.ok(fits, `Sound control must fit alongside the logo at ${width}px`);
    }
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => window.soundContexts.length), 0);
    await page.evaluate(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    await toggle.click();
    assert.equal(await page.locator('.llp-sound-status').innerText(), '사운드를 재생할 수 없어요.');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.deepEqual(errors, []);
    console.log('Opt-in, cues, mute, background pause, cleanup, mobile layout, and unsupported-browser fallback passed.');
} finally { await browser.close(); }
