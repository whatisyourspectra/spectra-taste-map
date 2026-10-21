// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
const song = { id: 'catalog-song', name: 'Song', artists: 'Artist', valence: .5, energy: .6, genres: ['pop'], coverUrl: '/demo-covers/currents.jpg' };
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error' && /same key|Maximum update depth/.test(message.text())) errors.push(message.text());
    });
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({
        contentType: 'application/javascript', body: 'export const supabase=null; export function finishGoogleLogin(){return Promise.reject();}',
    }));
    await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    await page.addInitScript(song => {
        localStorage.setItem('spectra:map-guide:v1:desktop', 'seen');
        if (sessionStorage.getItem('test:duplicate-seeded')) return;
        sessionStorage.setItem('test:duplicate-seeded', '1');
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify({
            tracks: [song, { ...song }, { ...song, id: 'lastfm-song' }, { ...song, id: 'second', name: 'Second Song' }],
            mapId: 'legacy-duplicates', stats: { fetchedCount: 4 }, featuresSource: 'lastfm',
        }));
    }, song);
    await page.goto(`${base}/taste-map`);
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item').length === 2);
    const ids = await page.locator('.tm-bubble-item').evaluateAll(nodes => nodes.map(node => node.dataset.bubbleId));
    assert.deepEqual(new Set(ids), new Set(['catalog-song', 'second']));
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.tm-bubble-item').length === 2);
    console.log('Legacy duplicate IDs and provider aliases render once; different songs sharing artwork survive reload.');

    // Exercise the real provider import pipeline, including separately requested
    // preview/background batches that resolve different source rows to one ID.
    await page.route('**/api/taste/enrich', route => {
        const { tracks } = route.request().postDataJSON();
        return route.fulfill({ json: { featuresSource: 'lastfm', tracks: tracks.map(track => ({
            ...song, importKey: `${track.artist.toLowerCase()}|${track.title.toLowerCase()}`,
        })) } });
    });
    await page.evaluate(async () => {
        const reactModule = await import('/node_modules/.vite/deps/react.js');
        const React = reactModule.default || reactModule;
        const dom = await import('/node_modules/.vite/deps/react-dom_client.js');
        const createRoot = dom.createRoot || dom.default.createRoot;
        const { TasteDataProvider, useTasteData } = await import('/src/context/TasteDataContext.jsx');
        sessionStorage.removeItem('spectra:taste:v5');
        localStorage.removeItem('spectra:taste:v5');
        window.importSnapshots = [];
        function Harness() {
            const taste = useTasteData();
            React.useEffect(() => {
                window.importSnapshots.push(taste.tracks.map(track => track.id));
            }, [taste.tracks]);
            window.testImport = async preEnriched => {
                const list = Array.from({ length: 12 }, (_, i) => preEnriched
                    ? { id: 'catalog-song', name: 'Song', artists: 'Artist', valence: .5, energy: .6, coverUrl: '/demo-covers/currents.jpg' }
                    : { artist: 'Artist', title: `Song version ${i}` });
                return taste.importTracks(list, { preEnriched });
            };
            return React.createElement('span', { id: 'duplicate-import-result' }, `${taste.status}:${taste.tracks.length}`);
        }
        const host = document.createElement('div'); document.body.append(host);
        createRoot(host).render(React.createElement(TasteDataProvider, {}, React.createElement(Harness)));
    });
    await page.waitForFunction(() => typeof window.testImport === 'function');
    const result = await page.evaluate(() => window.testImport(false));
    assert.equal(result.count, 1);
    await page.waitForFunction(() => document.querySelector('#duplicate-import-result')?.textContent === 'ready:1');
    assert.ok((await page.evaluate(() => window.importSnapshots)).every(ids => new Set(ids).size === ids.length));
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5')).tracks.length), 1);
    await page.evaluate(() => window.testImport(true));
    await page.waitForFunction(() => document.querySelector('#duplicate-import-result')?.textContent === 'ready:1');
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5')).tracks.length), 1);
    assert.deepEqual(errors, []);
    console.log('Background and pre-enriched imports publish/persist one node per catalog song without duplicate React keys.');
} finally { await browser.close(); }
