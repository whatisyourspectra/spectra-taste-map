// Local auth/cloud fixtures: no provider login or remote account writes.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
mkdirSync('output/review/personal-map-entry', { recursive: true });
const personalTrack = { id: 'personal-song', name: 'My saved song', artists: 'My artist', genres: ['indie'], valence: .4, energy: .6, coverUrl: '/demo-covers/currents.jpg' };
const cloud = { map_id: 'personal-map', tracks: [personalTrack], features_source: 'lastfm', stats: { isDemo: false }, updated_at: '2026-10-26T00:00:00Z' };

async function prepare(context, accountMap) {
    await context.addInitScript(() => {
        localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
        if (sessionStorage.getItem('fixture:seeded')) return;
        sessionStorage.setItem('fixture:seeded', '1');
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ mapId: 'legacy-demo', tracks: [{ id: 'demo-old-0', name: 'Demo song', artists: 'Demo artist' }], stats: { isDemo: true } }));
    });
    await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `
        const user = { id: 'fixture-user', email: 'fixture@example.test' };
        const listeners = new Set();
        const session = () => sessionStorage.getItem('fixture:signed-in') ? { user } : null;
        const cloud = ${JSON.stringify(accountMap)};
        export const supabase = {
            auth: {
                getSession: async () => ({ data: { session: session() }, error: null }),
                onAuthStateChange: callback => { listeners.add(callback); return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }; },
                signInWithOAuth: async () => ({ data: { url: location.origin + '/auth/callback?code=fixture' }, error: null }),
                signOut: async () => ({ error: null }),
            },
            from: () => ({
                select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cloud, error: null }) }) }),
                upsert: payload => {
                    const writes = JSON.parse(sessionStorage.getItem('fixture:writes') || '[]');
                    sessionStorage.setItem('fixture:writes', JSON.stringify([...writes, payload]));
                    return { select: () => ({ maybeSingle: async () => ({ data: { updated_at: payload.updated_at }, error: null }) }) };
                },
            }),
        };
        export async function finishGoogleLogin() {
            sessionStorage.setItem('fixture:signed-in', '1');
            for (const callback of listeners) callback('SIGNED_IN', { user });
            return { user };
        }
    ` }));
    await context.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    await context.route('**/itunes.apple.com/**', route => route.fulfill({ json: { results: [] } }));
}

async function assertPersonalMap(page, hasSongs) {
    await page.waitForURL('**/taste-map');
    if (hasSongs) {
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5:user:fixture-user') || 'null')?.tracks[0]?.id === 'personal-song');
        await page.locator('.tm-bubble-item[data-bubble-id="personal-song"], .public-map-star[aria-label="My saved song — My artist"]').waitFor();
        assert.equal(await page.locator('[data-bubble-id^="demo-"]').count(), 0);
    } else {
        await page.getByRole('heading', { name: /나의 취향 지도|My taste map/ }).waitFor();
        assert.equal(await page.locator('.tm-bubble-item, .public-map-star').count(), 0);
        assert.equal(await page.evaluate(() => sessionStorage.getItem('spectra:taste:v5:demo:fixture-user')), null);
    }
}

try {
    for (const [lang, width] of [['en', 1440], ['ko', 390], ['en', 320]]) for (const hasSongs of [true, false]) {
        const context = await browser.newContext({ locale: lang === 'ko' ? 'ko-KR' : 'en-US', viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await prepare(context, hasSongs ? cloud : null);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/?lang=${lang}`);
        await page.locator('.llp-nav-demo-btn').waitFor({ state: 'attached' });
        await page.locator('.llp-nav-auth .sa-account-button').click();
        assert.equal(new URL(page.url()).searchParams.get('returnTo'), '/taste-map');
        await page.getByRole('button', { name: lang === 'ko' ? 'Google로 계속하기' : 'Continue with Google', exact: true }).click();
        await assertPersonalMap(page, hasSongs);

        await page.goto(`${base}/?lang=${lang}`);
        const primary = page.locator('.llp-nav-return-btn');
        await primary.waitFor();
        assert.equal(await page.locator('.llp-nav-demo-btn').count(), 0);
        assert.equal(await primary.getAttribute('aria-label'), lang === 'ko' ? '내 지도로 가기' : 'Go to my map');
        const bounds = await primary.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
        await page.screenshot({ path: `output/review/personal-map-entry/${lang}-${width}-${hasSongs ? 'saved' : 'empty'}.png` });
        await primary.click();
        await assertPersonalMap(page, hasSongs);

        // An explicit demo remains available; the main action must restore the account map.
        await page.goto(`${base}/?lang=${lang}`);
        await page.locator('.llp-demo-launch-btn').first().click();
        await page.waitForURL('**/taste-map');
        await page.waitForFunction(() => Boolean(sessionStorage.getItem('spectra:taste:v5:demo:fixture-user')));
        // Return via SPA navigation to retain the currently open demo in the provider.
        await page.evaluate(() => { history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate')); });
        await page.locator('.llp-hero-cta-group .llp-btn-primary').click();
        // Old preview cache is allowed; the displayed map must be personal or empty.
        await page.waitForURL('**/taste-map');
        if (hasSongs) await assertPersonalMap(page, true);
        else await page.getByRole('heading', { name: /나의 취향 지도|My taste map/ }).waitFor();
        assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem('fixture:writes') || '[]')), []);

        // Signed-in QR/mobile entry must not create a demo for an empty account.
        await page.goto(`${base}/mobile-start`);
        await page.waitForURL('**/taste-map');
        if (!hasSongs) await page.getByRole('heading', { name: /나의 취향 지도|My taste map/ }).waitFor();
        assert.deepEqual(errors, []);
        console.log(`${lang} ${width}px ${hasSongs ? 'saved map' : 'empty account'}: login, primary actions, demo return and mobile entry passed`);
        await context.close();
    }
} finally { await browser.close(); }
