// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5188';
try {
    for (const [width, height] of [[1440, 900], [390, 844], [390, 667], [360, 640]]) {
        const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.addInitScript(() => {
            const tracks = Array.from({ length: 24 }, (_, i) => ({ id: `t${i}`, name: `Song ${i} — A Longer Song Title`, artists: 'Test Artist', genres: ['ambient'], valence: (i % 6) / 6, energy: (i % 4) / 4, danceability: 0.4, acousticness: 0.3, instrumentalness: 0.6, popularity: 40, coverUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23527794"/%3E%3Ccircle cx="40" cy="40" r="20" fill="%239fc6de"/%3E%3C/svg%3E' }));
            sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'voyage-test', stats: {}, featuresSource: 'lastfm' }));
            window.YT = {
                PlayerState: { PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5, ENDED: 0 },
                Player: class {
                    constructor(_, options) { this.events = options.events; window.testVoyagePlayer = this; setTimeout(() => this.events.onReady(), 0); }
                    loadVideoById() { setTimeout(() => this.events.onStateChange({ data: 1 }), 0); }
                    cueVideoById() { this.events.onStateChange({ data: 5 }); }
                    playVideo() { this.events.onStateChange({ data: 1 }); }
                    pauseVideo() { this.events.onStateChange({ data: 2 }); }
                    getCurrentTime() { return 1; }
                    getDuration() { return 180; }
                    destroy() {}
                },
            };
        });
        await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, (route) => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        let discoveryRequests = 0;
        let failDiscovery = false;
        await page.route('**/api/discover?**', (route) => {
            discoveryRequests++;
            if (failDiscovery) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
            const seed = new URL(route.request().url()).searchParams.get('seedTracks');
            const prefix = seed?.includes('New Star') ? 'beyond' : 'new';
            return route.fulfill({ json: { tracks: Array.from({ length: 8 }, (_, i) => ({ id: `${prefix}${i}`, name: prefix === 'new' ? `New Star ${i}` : `Beyond ${i}`, artists: 'New Artist', genres: ['ambient'] })) } });
        });
        await page.route('**/api/youtube/search?**', (route) => route.fulfill({ json: { video: { videoId: 'test-video1', title: 'Test video' } } }));
        if (width < 900) {
            await page.goto(`${baseURL}/taste-map/mobile`);
            await page.locator('.tmm-map-entry').waitFor();
            const entry = await page.locator('.tmm-map-entry').boundingBox();
            assert.ok(entry.y + entry.height < height, 'Main exploration entry is in the first viewport');
            await page.screenshot({ path: `/tmp/voyage-home-${width}-${height}.png` });
            await page.locator('.tmm-map-entry').click();
        } else await page.goto(`${baseURL}/taste-map`);
        await page.locator('.tm-bubble-item button.tm-bubble').first().waitFor({ timeout: 20000 });
        await page.waitForTimeout(1200);
        await page.locator('.tm-bubble-item button.tm-bubble').first().dispatchEvent('click');
        await page.locator('.ccp-voyage-launch-btn').waitFor();
        const title = await page.locator('.ccp-track-name').textContent();
        if (width > 900) { await page.locator('.tm-fullscreen-btn').dispatchEvent('click'); await page.waitForTimeout(200); }
        const before = await page.locator('.tm-bubble-item').first().getAttribute('style');
        await page.locator('.ccp-voyage-launch-btn').click();
        await page.locator('.cv-star').first().waitFor();
        assert.equal(await page.locator('.cv-star').count(), 8);
        assert.equal(await page.locator('.tm-bubble-item').count(), 0);
        const playingBefore = await page.locator('.cv-track-title').textContent();
        await page.locator('.cv-star:not(.selected)').first().click();
        assert.equal(await page.locator('.cv-track-title').textContent(), playingBefore, 'Selecting a star does not start playback');
        const selectedName = await page.locator('.cv-selection-copy strong').textContent();
        await page.locator('.cv-explore-toggle').click();
        await page.locator('.cv-recommendation').first().waitFor();
        assert.equal(await page.locator('.cv-explorer-seed strong').textContent(), selectedName);
        const listBox = await page.locator('.cv-explorer-results').boundingBox();
        assert.ok(listBox.height >= 210, `Recommendations remain usable: ${listBox.height}px`);
        const countBeforeAutoplay = discoveryRequests;
        await page.evaluate(() => window.testVoyagePlayer.events.onStateChange({ data: 0 }));
        await page.waitForFunction((name) => document.querySelector('.cv-track-title').textContent !== name, playingBefore);
        assert.equal(await page.locator('.cv-explorer-seed strong').textContent(), selectedName, 'Autoplay does not change exploration seed');
        assert.equal(discoveryRequests, countBeforeAutoplay);
        await page.screenshot({ path: `/tmp/voyage-sheet-${width}-${height}.png` });
        await page.locator('.cv-recommendation button').first().click();
        await page.locator('.cv-addition-toast').waitFor();
        assert.equal(await page.locator('.cv-star').count(), 9);
        assert.equal(await page.locator('.cv-explorer').count(), 0);
        assert.equal(await page.locator('.cv-selection-copy strong').textContent(), 'New Star 0');
        const newStar = await page.locator('.cv-star.just-added').boundingBox();
        const map = await page.locator('.cv-map-scroll').boundingBox();
        assert.ok(newStar.y >= map.y - 1 && newStar.y + 60 < map.y + map.height, 'Added star is brought into view');
        await page.screenshot({ path: `/tmp/voyage-added-${width}-${height}.png` });
        await page.getByRole('button', { name: '추가 취소', exact: true }).click();
        assert.equal(await page.locator('.cv-star').count(), 8);
        assert.equal(await page.locator('.cv-selection-copy strong').textContent(), selectedName);
        await page.locator('.cv-explore-toggle').click();
        await page.locator('.cv-recommendation button').first().click();
        await page.getByRole('button', { name: '탐색 계속', exact: true }).click();
        await page.locator('.cv-recommendation button').first().waitFor();
        assert.equal(await page.locator('.cv-recommendation button').first().isDisabled(), true);
        assert.equal(discoveryRequests, countBeforeAutoplay, 'Reopening exploration uses cached recommendations');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.cv-explorer').count(), 0);
        assert.equal(await page.locator('.cv-hud-root').count(), 1, 'Escape dismisses sheet before leaving constellation');
        await page.locator('.cv-explore-toggle').click(); // Selected new star becomes the next exploration seed.
        await page.locator('.cv-recommendation', { hasText: 'Beyond 0' }).locator('button').click();
        assert.equal(await page.locator('.cv-star').count(), 10);
        failDiscovery = true;
        await page.locator('.cv-explore-toggle').click();
        await page.locator('.cv-explorer [role=alert]').waitFor();
        failDiscovery = false;
        await page.locator('.cv-explorer [role=alert] button').click();
        await page.locator('.cv-recommendation button').first().waitFor();
        await page.locator('.cv-sheet-close').click();
        await page.keyboard.press('Escape');
        await page.locator('.ccp-track-name').waitFor();
        assert.equal(await page.locator('.ccp-track-name').textContent(), title);
        assert.equal(await page.locator('.cv-hud-root').count(), 0);
        assert.equal(await page.locator('.tm-bubble-item').first().getAttribute('style'), before);
        if (width > 900) assert.equal(await page.locator('.tm-root-fullscreen').count(), 1);
        // A selected song on the mobile home can deep-link directly to its constellation.
        if (width < 900) {
            await page.goto(`${baseURL}/taste-map?view=constellation&star=t3`);
            await page.locator('.cv-hud-root').waitFor();
            assert.match(await page.locator('.cv-selection-copy strong').textContent(), /^Song 3/);
            await page.locator('.cv-exit-btn').click();
            await page.locator('.ccp-track-name').waitFor();
            assert.match(await page.locator('.ccp-track-name').textContent(), /^Song 3/);
        }
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ width, height, recommendationHeight: listBox.height, restored: true, independentExploration: true, undo: true, errors }));
        await page.close();
    }
} finally { await browser.close(); }
