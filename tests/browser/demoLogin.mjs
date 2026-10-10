// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
    for (const savedMap of [true, false]) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        await page.addInitScript(({ savedMap }) => {
            window.hasSavedMap = savedMap;
            window.cloudWrites = [];
            localStorage.setItem('spectra:map-guide:v1:desktop', 'seen');
        }, { savedMap });
        await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({
            contentType: 'application/javascript',
            body: `export const supabase = {
                auth: {
                    getSession: async () => ({data:{session:null}}),
                    onAuthStateChange: callback => {
                        window.testSignIn = () => callback('SIGNED_IN', {user:{id:'account', email:'test@example.com'}});
                        return {data:{subscription:{unsubscribe(){}}}};
                    }
                },
                from: () => ({
                    select: () => ({eq: () => ({maybeSingle: async () => ({data: window.hasSavedMap ? {
                        map_id:'personal-map', features_source:'spotify-genres', stats:{}, updated_at:'2026-01-01T00:00:00Z',
                        tracks:[{id:'personal-track', name:'My personal song', artists:'My artist', genres:['indie'], valence:.5, energy:.5}]
                    } : null})})}),
                    upsert: payload => { window.cloudWrites.push(payload); return {select: () => ({maybeSingle: async () => ({data:{}})})}; }
                })
            }; export function finishGoogleLogin() { return Promise.resolve(); }`
        }));
        await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
        await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5188'}/`);
        await page.locator('.llp-hero-cta-group .llp-btn-primary').click();
        await page.locator('.tm-demo-badge').waitFor();
        await page.evaluate(() => window.testSignIn());
        if (savedMap) {
            await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5:user:account') || 'null')?.mapId === 'personal-map');
            await page.locator('.tm-root').waitFor();
            assert.equal(await page.locator('.tm-demo-badge').count(), 0);
        } else {
            await page.waitForURL(`${process.env.BASE_URL || 'http://127.0.0.1:5188'}/`);
            await page.locator('.llp-hero-title').waitFor();
        }
        assert.equal(await page.evaluate(() => window.cloudWrites.length), 0);
        await page.close();
    }
    console.log('Demo sign-in restores the saved personal map; empty accounts return to import; no demo cloud writes.');
} finally { await browser.close(); }
