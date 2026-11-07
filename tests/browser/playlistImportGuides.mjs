// Real shared guide rendering and native file picker; no provider authorization.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
const services = [
    { id: 'spotify', label: 'Spotify', path: 'spotify-to-file', format: 'CSV', savedStep: 1 },
    { id: 'apple', label: 'Apple Music', path: 'apple-music-to-file', format: 'CSV / TXT', savedStep: 2 },
    { id: 'youtube', label: 'YouTube Music', path: 'youtube-music-to-file', format: 'TXT', savedStep: 3 },
];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
await mkdir('output/review/playlist-import-guides', { recursive: true });
try {
    for (const lang of ['ko', 'en']) for (const width of [1440, 390, 320]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: lang === 'ko' ? 'ko-KR' : 'en-US', reducedMotion: 'reduce' });
        await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        await context.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/?lang=${lang}`);
        for (const service of services) {
            await page.locator('.llp-platform-chip').filter({ hasText: service.label }).click();
            const guide = page.locator(`.playlist-import-guide[data-platform=${service.id}]`);
            const steps = guide.locator('.pi-guide-steps button');
            assert.equal(await page.locator('.playlist-import-guide').count(), 1);
            assert.deepEqual(await steps.allTextContents(), lang === 'ko'
                ? ['01계정 확인', '02목록 선택', '03파일 저장', '04지도 만들기']
                : ['01Check account', '02Select playlist', '03Save file', '04Create map']);
            assert.equal(await steps.first().getAttribute('aria-current'), 'step');
            assert.equal(await guide.locator('.pi-guide-device button').count(), 2);
            assert.equal(await guide.locator('.pi-guide-troubleshooting details').count(), 3);
            assert.equal(await guide.locator('.llp-export-link').getAttribute('href'), `https://www.tunemymusic.com/${lang === 'ko' ? 'ko/' : ''}transfer/${service.path}`);
            const sections = await guide.evaluate(root => ['pi-guide-intro', 'llp-export-link', 'pi-guide-handoff', 'pi-guide-device', 'pi-guide-steps', 'pi-guide-panel', 'pi-guide-actions', 'pi-guide-troubleshooting', 'pi-guide-shortcut'].map(name => [...root.children].findIndex(node => node.classList.contains(name))));
            assert.ok(sections.every((index, position) => index >= 0 && (position === 0 || index > sections[position - 1])), 'Common sections use the same order');
            assert.equal(await guide.locator('.import-video-guide').count(), service.id === 'spotify' ? 1 : 0);
            await guide.locator('.pi-guide-device button').first().click();
            for (let step = 0; step < 4; step++) {
                await steps.nth(step).click();
                assert.equal(await steps.nth(step).getAttribute('aria-current'), 'step');
                if (step === 2) assert.ok((await guide.locator('.pi-guide-panel').innerText()).includes(service.format));
                if (lang === 'en') assert.ok(!/[가-힣]/.test(await guide.innerText()), 'All service-specific content is translated');
                if (service.id === 'spotify') {
                    const video = guide.locator('.import-video-guide');
                    const id = ['connect', 'connect', 'export', 'upload'][step];
                    assert.equal(await video.locator('source').getAttribute('src'), `/guides/spotify-${id}.mp4`);
                    if (step === 2) {
                        await video.locator('summary').click();
                        await video.locator('video').waitFor({ state: 'visible' });
                        await video.locator('summary').click();
                        assert.equal(await video.locator('video').evaluate(node => node.paused), true);
                    }
                }
            }
            assert.ok((await guide.locator('.pi-guide-panel').innerText()).includes('Android'));
            const picker = page.waitForEvent('filechooser');
            await guide.locator('.pi-guide-primary').click();
            await (await picker).setFiles({ name: `${service.id}.txt`, mimeType: 'text/plain', buffer: Buffer.from('Frank Ocean - Nights\nBeach House - Space Song') });
            await page.getByRole('button', { name: lang === 'ko' ? '2곡으로 나의 taste맵 생성하기' : 'Create my map with 2 songs', exact: true }).waitFor();
            await steps.nth(1).click();
            await guide.locator('.pi-guide-troubleshooting summary').first().click();
            await guide.screenshot({ path: `output/review/playlist-import-guides/${lang}-${width}-${service.id}.png`, style: '.llp-nav-wrap, .llp-chapter-nav, .help-center-trigger { visibility: hidden !important; }' });
            await steps.nth(service.savedStep).click();
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
        }
        // Switching services and reloading must never carry one service's step into another.
        for (const service of services) {
            await page.locator('.llp-platform-chip').filter({ hasText: service.label }).click();
            assert.equal(await page.locator('.pi-guide-steps button').nth(service.savedStep).getAttribute('aria-current'), 'step');
        }
        await page.reload();
        for (const service of services) {
            await page.locator('.llp-platform-chip').filter({ hasText: service.label }).click();
            assert.equal(await page.locator('.pi-guide-steps button').nth(service.savedStep).getAttribute('aria-current'), 'step');
        }
        assert.deepEqual(errors, []);
        console.log(`${lang} ${width}px: all 3 services share 4 steps, device selector, export/upload/FAQ layout; translations, video, native picker and separate progress passed`);
        await context.close();
    }
    // Migrate previously saved Apple guide progress into the shared template.
    const page = await browser.newPage();
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.addInitScript(() => sessionStorage.setItem('spectra:apple-import-guide:v1', JSON.stringify({ step: 2, device: 'mobile' })));
    await page.goto(`${base}/?lang=en`);
    await page.locator('.llp-platform-chip').filter({ hasText: 'Apple Music' }).click();
    assert.equal(await page.locator('.pi-guide-steps button').nth(2).getAttribute('aria-current'), 'step');
    assert.equal(await page.locator('.pi-guide-device button').first().getAttribute('aria-pressed'), 'true');
    await page.close();
    console.log('Existing Apple Music guide progress migrates to the shared template.');
} finally { await browser.close(); }
