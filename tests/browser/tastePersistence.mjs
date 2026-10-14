// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
const personal = { tracks: [{ id: 'personal-upload', name: 'My uploaded song', artists: 'My artist',
    coverUrl: '/demo-covers/currents.jpg', valence: .5, energy: .6, spotifyFeatures: { valence: .5, energy: .6 }, spotifyGenres: ['indie'] }],
    mapId: 'personal-map', featuresSource: 'spotify-genres', stats: { backgroundEnriching: false } };
try {
    for (const mode of ['legacy-no-date', 'legacy-older-date', 'save-failure', 'pre-enriched']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(({ mode, personal }) => {
            window.testWrites = [];
            window.allowWrites = mode !== 'save-failure';
            localStorage.setItem('spectra:map-guide:v1:desktop', 'seen');
            if (!localStorage.getItem('test:seeded') && mode !== 'pre-enriched') {
                const local = { ...personal, ...(mode === 'legacy-older-date' ? { updatedAt: '2026-10-01T00:00:00Z' } : {}) };
                sessionStorage.setItem('spectra:taste:v5:user:account', JSON.stringify(local));
                localStorage.setItem('spectra:taste:v5:user:account', JSON.stringify(local));
                localStorage.setItem('test:cloud-row', JSON.stringify({ map_id: 'old-demo', tracks: [{ id: 'demo-cosmic-dreampop-0' }],
                    stats: {}, updated_at: '2026-10-14T00:00:00Z' }));
                localStorage.setItem('test:seeded', '1');
            }
        }, { mode, personal });
        await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({
            contentType: 'application/javascript', body: `export const supabase = {
                auth: {getSession:async()=>({data:{session:{user:{id:'account',email:'test@example.com'}}}}),
                    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
                from:()=>({
                    select:()=>({eq:()=>({maybeSingle:async()=>({data:JSON.parse(localStorage.getItem('test:cloud-row')||'null')})})}),
                    upsert:payload=>({select:()=>({maybeSingle:async()=>{
                        window.testWrites.push(payload);
                        if(!window.allowWrites)return {error:{message:'Permission denied',code:'42501'}};
                        localStorage.setItem('test:cloud-row',JSON.stringify(payload));
                        return {data:{updated_at:payload.updated_at}};
                    }})})
                })
            }; export function finishGoogleLogin(){return Promise.resolve();}`,
        }));
        await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
        await page.goto(`${base}/taste-map`);
        if (mode === 'pre-enriched') {
            await page.locator('.tm-empty-account').waitFor();
            await page.evaluate(async personal => {
                const reactModule = await import('/node_modules/.vite/deps/react.js');
                const React = reactModule.default || reactModule;
                const dom = await import('/node_modules/.vite/deps/react-dom_client.js');
                const createRoot = dom.createRoot || dom.default.createRoot;
                const { TasteDataProvider, useTasteData } = await import('/src/context/TasteDataContext.jsx');
                function Harness() {
                    const taste = useTasteData();
                    window.testImport = () => taste.importTracks(personal.tracks, { preEnriched: true });
                    return React.createElement('span', { id: 'harness-status' }, taste.cloudSaveStatus);
                }
                const host = document.createElement('div'); document.body.append(host);
                createRoot(host).render(React.createElement(TasteDataProvider, { ownerId: 'account' }, React.createElement(Harness)));
            }, personal);
            await page.waitForFunction(() => typeof window.testImport === 'function');
            await page.evaluate(() => window.testImport());
            await page.waitForFunction(() => document.querySelector('#harness-status')?.textContent === 'saved');
        } else if (mode === 'save-failure') {
            await page.locator('.taste-save-status.error').waitFor();
            assert.ok(await page.evaluate(() => !!localStorage.getItem('spectra:taste:v5:user:account')));
            await page.evaluate(() => { window.allowWrites = true; });
            await page.getByRole('button', { name: '다시 시도', exact: true }).click();
            await page.locator('.taste-save-status.saved').waitFor();
        } else {
            await page.locator('.taste-save-status.saved').waitFor();
        }
        assert.ok(await page.evaluate(() => window.testWrites.some(row => row.tracks[0].id === 'personal-upload')));
        // Remove both browser copies: reload must restore the database row.
        await page.evaluate(() => {
            sessionStorage.removeItem('spectra:taste:v5:user:account');
            localStorage.removeItem('spectra:taste:v5:user:account');
        });
        await page.reload();
        await page.locator('.taste-save-status.saved').waitFor();
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5:user:account') || 'null')?.tracks[0]?.id === 'personal-upload');
        assert.deepEqual(errors, []);
        console.log(`${mode}: personal data saved and restored from database without browser copies.`);
        await page.close();
    }
} finally { await browser.close(); }
