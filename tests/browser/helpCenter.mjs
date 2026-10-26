// Local map and feedback fixtures; no remote account or feedback writes.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { openHelp, openFeedback } from './helpCenterActions.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
mkdirSync('output/review/help-center', { recursive: true });
const tracks = Array.from({ length: 12 }, (_, index) => ({ id: `help-song-${index}`, name: `Song ${index}`, artists: 'Artist', genres: ['indie'], valence: .4, energy: .6, coverUrl: '/demo-covers/currents.jpg' }));
try {
    for (const [width, lang, route] of [[1440, 'ko', '/taste-map'], [390, 'ko', '/taste-map'], [320, 'en', '/taste-map'], [1440, 'en', '/']]) {
        const context = await browser.newContext({ locale: lang === 'ko' ? 'ko-KR' : 'en-US', viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await context.addInitScript(tracks => {
            localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
            sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'help-map', stats: {} }));
        }, tracks);
        await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `
            export const supabase = {
                auth: {
                    getSession: async () => ({ data: { session: null }, error: null }),
                    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
                },
                rpc: (_, payload) => ({ abortSignal: async () => {
                    window.helpRequests = [...(window.helpRequests || []), payload];
                    return window.helpRequests.length === 1 ? { error: { message: 'unavailable' } } : { data: payload.p_request_id };
                } }),
            };
            export async function finishGoogleLogin() { throw new Error('unused'); }
        ` }));
        await context.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}${route}?lang=${lang}`);
        await page.locator(route === '/' ? '.llp-root' : width > 900 ? '.tm-bubble-item' : '.mtm-intro').first().waitFor();
        assert.equal(await page.locator('.feedback-tab, .map-guide-reopen').count(), 0, 'Only the combined help entry remains');
        assert.equal(await page.locator('.help-center-trigger').isVisible(), route === '/' || width > 900);
        let help = await openHelp(page);
        assert.equal(await help.locator('section').count(), 3);
        assert.equal(await help.locator('.help-center-tour').count(), route === '/taste-map' && width > 900 ? 1 : 0);
        if (lang === 'en') assert.doesNotMatch(await help.innerText(), /[가-힣]/);
        const bounds = await help.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 900);
        await page.screenshot({ path: `output/review/help-center/${lang}-${width}-${route === '/' ? 'landing' : 'map'}.png` });
        await page.keyboard.press('Escape');
        const focusSelector = width <= 900 && route !== '/' ? '.mtm-more-menu > summary' : '.help-center-trigger';
        await page.waitForFunction(selector => document.activeElement?.matches(selector), focusSelector);
        if (width > 900 && route === '/taste-map') {
            help = await openHelp(page);
            await help.locator('.help-center-tour').click();
            const tour = page.locator('.map-guide-panel');
            await tour.waitFor();
            assert.equal(await page.locator('.help-center-dialog[open]').count(), 0);
            await tour.locator('.map-guide-next').click();
            await tour.locator('.map-guide-count').filter({ hasText: '2/6' }).waitFor();
            await tour.locator('.map-guide-dismiss').click();
            await tour.waitFor({ state: 'detached' });
        }
        await openFeedback(page);
        const feedback = page.locator('.feedback-dialog[open]');
        assert.equal(await page.locator('.help-center-dialog[open]').count(), 0, 'Feedback replaces help instead of stacking dialogs');
        await feedback.locator('input').first().fill('A retained question');
        await feedback.locator('textarea').fill('I would like some help exploring my music map.');
        await feedback.getByRole('checkbox').check();
        await page.keyboard.press('Escape');
        await page.waitForFunction(selector => document.activeElement?.matches(selector), focusSelector);
        await openFeedback(page);
        assert.equal(await feedback.locator('input').first().inputValue(), 'A retained question');
        await feedback.locator('button[type="submit"]').click();
        await feedback.getByRole('alert').waitFor();
        await feedback.locator('button[type="submit"]').click();
        await feedback.locator('.feedback-success').waitFor();
        const requests = await page.evaluate(() => window.helpRequests);
        assert.equal(requests.length, 2);
        assert.equal(requests[0].p_request_id, requests[1].p_request_id);
        assert.equal(requests[0].p_page_path, route);
        await feedback.locator('.feedback-primary').click();
        await page.waitForFunction(selector => document.activeElement?.matches(selector), focusSelector);
        assert.deepEqual(errors, []);
        console.log(`${lang} ${width}px ${route}: combined entry, guide, feedback draft/retry and focus passed`);
        await context.close();
    }
} finally { await browser.close(); }
