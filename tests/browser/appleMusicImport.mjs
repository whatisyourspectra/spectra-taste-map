// Local guide/navigation and upload fixtures; never signs in to Apple or sends account data.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
const server = process.env.START_VITE === '1' ? spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', new URL(base).port, '--strictPort'], { stdio: 'ignore' }) : null;
let browser;
try {
    if (server) {
        let ready = false;
        for (let i = 0; i < 80; i++) {
            if (server.exitCode !== null) throw new Error('Temporary Vite server exited');
            try { ready = (await fetch(base)).ok; } catch { /* Waiting for startup. */ }
            if (ready) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.ok(ready, 'Temporary Vite server started');
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
    await mkdir('output/review/apple-music-import', { recursive: true });
    const prepare = async context => {
        await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        await context.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
        await context.route('https://www.tunemymusic.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Local external-page fixture. No Apple sign-in.</p>' }));
    };
    for (const lang of ['ko', 'en']) for (const width of [1440, 390, 320]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: lang === 'ko' ? 'ko-KR' : 'en-US', reducedMotion: 'reduce' });
        await prepare(context);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/?lang=${lang}`);
        await page.locator('.llp-platform-chip').filter({ hasText: 'Apple Music' }).click();
        const guide = page.locator('.playlist-import-guide');
        const steps = guide.locator('.pi-guide-steps button');
        assert.equal(await steps.count(), 4);
        assert.equal(await steps.first().getAttribute('aria-current'), 'step');
        assert.ok((await guide.locator('.pi-guide-panel').innerText()).includes(lang === 'ko' ? 'iCloud 계정과 다를' : 'differ from your iCloud'));
        assert.ok((await guide.locator('.llp-export-link').getAttribute('href')).endsWith('/transfer/apple-music-to-file'));
        const popupPromise = page.waitForEvent('popup');
        await guide.locator('.llp-export-link').click();
        const popup = await popupPromise;
        await popup.waitForLoadState('domcontentloaded');
        assert.equal(await steps.first().getAttribute('aria-current'), 'step', 'Opening export never pretends a connection is complete');
        await popup.close();
        await guide.locator('.pi-guide-actions button').last().click();
        assert.equal(await steps.nth(1).getAttribute('aria-current'), 'step');
        assert.ok((await guide.locator('.pi-guide-panel').innerText()).includes(lang === 'ko' ? '곡 수' : 'song count'));
        await guide.locator('.pi-guide-troubleshooting summary').first().click();
        assert.ok((await guide.locator('.pi-guide-troubleshooting details').first().innerText()).includes('music.apple.com'));
        await guide.getByRole('button', { name: 'Mac / PC', exact: true }).click();
        assert.ok((await guide.locator('.pi-guide-troubleshooting details').first().innerText()).includes('Windows'));
        await guide.getByRole('button', { name: lang === 'ko' ? '모바일' : 'Mobile', exact: true }).click();
        assert.ok((await guide.locator('.pi-guide-troubleshooting details').first().innerText()).includes(lang === 'ko' ? '앱 → 음악' : 'Apps → Music'));
        // Keep selected step and device through locale changes, platform switches and reload.
        await page.getByRole('button', { name: lang === 'ko' ? 'EN' : '한국어', exact: true }).click();
        assert.equal(await steps.nth(1).getAttribute('aria-current'), 'step');
        await page.getByRole('button', { name: lang === 'ko' ? '한국어' : 'EN', exact: true }).click();
        await page.locator('.llp-platform-chip').filter({ hasText: 'Spotify' }).click();
        await page.locator('.llp-platform-chip').filter({ hasText: 'Apple Music' }).click();
        assert.equal(await steps.nth(1).getAttribute('aria-current'), 'step');
        await page.reload();
        await page.locator('.llp-platform-chip').filter({ hasText: 'Apple Music' }).click();
        assert.equal(await steps.nth(1).getAttribute('aria-current'), 'step');
        assert.equal(await guide.getByRole('button', { name: lang === 'ko' ? '모바일' : 'Mobile', exact: true }).getAttribute('aria-pressed'), 'true');
        await guide.locator('.pi-guide-troubleshooting summary').first().click();
        await guide.screenshot({ path: `output/review/apple-music-import/${lang}-${width}-playlist-help.png`, style: '.llp-nav-wrap, .llp-chapter-nav, .help-center-trigger { visibility: hidden !important; }' });
        await steps.nth(2).click();
        assert.ok((await guide.locator('.pi-guide-panel').innerText()).includes('Export to file'));
        await steps.nth(3).click();
        assert.ok((await guide.locator('.pi-guide-panel').innerText()).includes('iCloud Drive'));
        const picker = page.waitForEvent('filechooser');
        await guide.locator('.pi-guide-primary').click();
        await (await picker).setFiles({ name: 'apple-library.csv', mimeType: 'text/csv', buffer: Buffer.from('Track name,Artist name\nNights,Frank Ocean\nSpace Song,Beach House') });
        await page.getByRole('button', { name: lang === 'ko' ? '2곡으로 나의 taste맵 생성하기' : 'Create my map with 2 songs', exact: true }).waitFor();
        assert.equal(await page.locator('.llp-file-name').innerText(), 'apple-library.csv');
        if (lang === 'en') assert.ok(!/[가-힣]/.test(await guide.innerText()), 'Every guide message is translated');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
        assert.deepEqual(errors, []);
        console.log(`${lang} ${width}px: Apple guide, external handoff, missing-library help, device/locale changes, reload and real file chooser passed`);
        await context.close();
    }
    // Privacy/storage restrictions must not break navigation or trap an uploader.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await prepare(context);
    await context.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
        Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    });
    const page = await context.newPage();
    await page.goto(`${base}/?lang=en`);
    await page.locator('.llp-platform-chip').filter({ hasText: 'Apple Music' }).click();
    await page.locator('.pi-guide-steps button').nth(1).click();
    assert.equal(await page.locator('.pi-guide-steps button').nth(1).getAttribute('aria-current'), 'step');
    const picker = page.waitForEvent('filechooser');
    await page.locator('.pi-guide-shortcut button').click();
    await (await picker).setFiles({ name: 'music.txt', mimeType: 'text/plain', buffer: Buffer.from('Frank Ocean - Nights') });
    await page.getByRole('button', { name: 'Create my map with 1 songs', exact: true }).waitFor();
    await context.close();
    console.log('Apple guide also works with browser storage blocked.');
} finally { await browser?.close(); server?.kill('SIGTERM'); }
