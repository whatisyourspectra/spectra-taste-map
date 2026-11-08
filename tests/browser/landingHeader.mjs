// Local guest fixtures. No provider login or remote account writes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
const output = 'output/review/landing-header';
await mkdir(output, { recursive: true });
const findings = [];
try {
    for (const lang of ['ko', 'en']) {
        const context = await browser.newContext({ locale: lang === 'ko' ? 'ko-KR' : 'en-US', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
        await context.addInitScript(() => {
            localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
            window.AudioContext = undefined; window.webkitAudioContext = undefined;
        });
        await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null; export function finishGoogleLogin(){return Promise.reject();}' }));
        await context.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/?lang=${lang}`);
        const more = page.locator('.llp-nav-more');
        await more.waitFor();
        assert.equal(await page.locator('.llp-nav-map-entry').count(), 1);
        for (const width of [1440, 1024, 768, 390, 320]) {
            await page.setViewportSize({ width, height: 900 });
            const box = await page.locator('.llp-nav-actions').boundingBox();
            const logo = await page.locator('.llp-nav-brand').boundingBox();
            assert.ok(box.width <= 220 && box.x + box.width <= width && box.x >= logo.x + logo.width, 'The compact controls fit beside the logo');
            assert.ok(await more.boundingBox().then(item => item.height >= 40));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: `${output}/${lang}-${width}-closed.png` });
            await more.focus(); await more.press('ArrowDown');
            const menu = page.locator('.llp-nav-utility-panel');
            await menu.waitFor();
            await page.waitForFunction(() => document.activeElement?.closest('.llp-nav-utility-links'));
            const menuBox = await menu.boundingBox();
            assert.ok(menuBox.x >= 0 && menuBox.x + menuBox.width <= width && menuBox.y + menuBox.height <= 900);
            await menu.locator(`.language-switcher button[lang="${lang === 'ko' ? 'en' : 'ko'}"]`).click();
            assert.equal(await more.getAttribute('aria-expanded'), 'true', 'Changing language keeps settings open');
            await menu.locator(`.language-switcher button[lang="${lang}"]`).click();
            if (lang === 'en') assert.doesNotMatch((await menu.innerText()).replaceAll('한국어', ''), /[가-힣]/);
            await menu.locator('.llp-sound-toggle').click();
            await menu.locator('.llp-sound-status').waitFor();
            assert.equal(await menu.locator('.llp-sound-toggle').getAttribute('aria-pressed'), 'false');
            await page.screenshot({ path: `${output}/${lang}-${width}-open.png` });
            await page.keyboard.press('Escape');
            assert.equal(await menu.count(), 0);
            assert.ok(await more.evaluate(element => element === document.activeElement));
            await more.click();
            await page.mouse.click(6, 200);
            assert.equal(await menu.count(), 0, 'Clicking outside dismisses settings');
            findings.push({ lang, width, controlsWidth: Math.round(box.width) });
        }
        await more.click();
        await page.locator('.llp-nav-utility-links button').nth(1).click();
        await page.waitForFunction(() => document.activeElement?.closest('#import'));
        await page.waitForFunction(() => document.querySelector('#import').getBoundingClientRect().top < 120);
        assert.equal(await page.locator('.llp-nav-utility-panel').count(), 0);
        assert.equal(new URL(page.url()).pathname, '/', 'Import navigation does not create a demo');
        assert.deepEqual(errors, []);
        await context.close();
    }
    console.log('Landing header passed: compact controls, both languages, keyboard, outside dismiss, import focus and sound fallback.');
    console.log(JSON.stringify(findings));
} finally { await browser.close(); }
