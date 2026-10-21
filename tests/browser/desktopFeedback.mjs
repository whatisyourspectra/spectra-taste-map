// Local-only fixtures: explicit discovery batches, grouping evidence, and queue selection.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5188';
const output = 'output/review/desktop-feedback';
await mkdir(output, { recursive: true });
const tracks = Array.from({ length: 48 }, (_, i) => ({
    id: `library-${i}`, name: `Library Song ${i}`, artists: `Artist ${i % 6}`,
    genres: i % 2 ? ['jazz', 'soul'] : ['alternative rock', 'metal'],
    spotifyGenres: i % 2 ? ['jazz', 'soul'] : ['alternative rock', 'metal'],
    valence: .3 + (i % 6) * .1, energy: .3 + (i % 4) * .15, danceability: .5, acousticness: .4, instrumentalness: .2,
    spotifyFeatures: { valence: .3 + (i % 6) * .1, energy: .3 + (i % 4) * .15 },
    coverUrl: i % 2 ? '/demo-covers/geography.jpg' : '/demo-covers/currents.jpg',
}));
const errors = [];
const discoveryCalls = new WeakMap();
async function open(route = '/taste-map') {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    discoveryCalls.set(page, 0);
    page.on('request', request => { if (request.url().includes('/api/discover?')) discoveryCalls.set(page, discoveryCalls.get(page) + 1); });
    await page.addInitScript(tracks => {
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'desktop-feedback', featuresSource: 'lastfm', stats: {} }));
        localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
        window.YT = { PlayerState: { PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5, ENDED: 0 }, Player: class {
            constructor(_, options) { this.events = options.events; setTimeout(() => this.events.onReady(), 0); }
            loadVideoById() { setTimeout(() => this.events.onStateChange({ data: 1 }), 0); }
            cueVideoById() { this.events.onStateChange({ data: 5 }); }
            playVideo() { this.events.onStateChange({ data: 1 }); }
            pauseVideo() { this.events.onStateChange({ data: 2 }); }
            getCurrentTime() { return 1; } getDuration() { return 180; } destroy() {}
        } };
    }, tracks);
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/api/youtube/search?**', route => route.fulfill({ json: { video: { videoId: 'test-video1', title: 'Test video' } } }));
    await page.route('**/api/discover?**', route => route.fulfill({ json: { tracks: [] } }));
    await page.goto(base + route);
    await page.locator('.tm-bubble-item').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
}
try {
    const page = await open();
    let calls = 0, batch = 0, fail = false;
    await page.route('**/api/discover?**', async route => {
        calls++;
        await new Promise(resolve => setTimeout(resolve, 350));
        if (fail) return route.fulfill({ status: 503, json: { error: 'fixture' } });
        return route.fulfill({ json: { tracks: [tracks[0], { ...tracks[0], id: 'alias' }, ...Array.from({ length: 20 }, (_, i) => ({
            ...tracks[i], id: `new-${batch}-${i}`, name: `Recommendation ${batch}-${i}`, artists: 'Discovery Artist',
        }))] } });
    });
    await page.waitForTimeout(900);
    assert.equal(discoveryCalls.get(page), 0, 'Discovery must start only on user request');
    const chip = page.locator('.tm-map-tag-chip:not(.tm-map-tag-chip--all)').first();
    assert.doesNotMatch(await chip.innerText(), /Granite|Prism/);
    await chip.click();
    assert.equal(await page.locator('.tm-region-evidence').count(), 0, 'Selecting a region must not open an explanation overlay');
    await page.locator('.tm-map-tag-chip--all').click();
    const toggle = page.locator('.tm-dock-actions .tm-dock-action').filter({ hasText: '새 음악 찾기' });
    await toggle.click();
    const panel = page.locator('.tm-discovery-panel');
    await panel.waitFor();
    await panel.getByRole('status').filter({ hasText: '새 곡을 찾는 중' }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.tm-discovery-song-list li').length === 8);
    const mapOption = panel.getByRole('checkbox', { name: '추천곡을 지도에도 표시' });
    assert.equal(await mapOption.isChecked(), true, 'Recommendations always appear on the map');
    assert.equal(await mapOption.isDisabled(), true, 'Map display cannot be unchecked');
    const countAfterFirst = calls;
    await page.getByRole('button', { name: 'zoom in' }).click({ force: true });
    await page.waitForTimeout(600);
    assert.equal(calls, countAfterFirst, 'Changing camera must not replace or refetch the list');
    assert.equal(await panel.locator('.tm-discovery-list-meta strong').textContent(), '추천 8곡');
    await toggle.click(); await panel.waitFor({ state: 'detached' });
    await toggle.click(); await panel.waitFor();
    assert.equal(calls, countAfterFirst, 'Closing and reopening keeps the same recommendations');
    batch = 1;
    await panel.getByRole('button', { name: '새 곡 더 찾기', exact: true }).click();
    assert.equal(await panel.locator('ol li').count(), 8, 'Keep old results during the next batch');
    await page.waitForFunction(() => document.querySelectorAll('.tm-discovery-song-list li').length === 16);
    const countAfterMore = calls;
    await panel.getByRole('button', { name: '듣기: Recommendation 1-0', exact: true }).click();
    await page.locator('.tm2-youtube-now').filter({ hasText: 'Recommendation 1-0' }).waitFor();
    const player = page.locator('.tm-playback-dock');
    assert.equal((await player.getByLabel('재생 목록', { exact: true }).textContent()).replace(/\s/g, ''), '9/16');
    await player.getByRole('button', { name: '다음 곡', exact: true }).click();
    await player.locator('.tm2-youtube-now').filter({ hasText: 'Recommendation 1-1' }).waitFor();
    await player.getByRole('button', { name: '이전 곡', exact: true }).click();
    await player.locator('.tm2-youtube-now').filter({ hasText: 'Recommendation 1-0' }).waitFor();
    await panel.getByRole('button', { name: '내 지도에 추가: Recommendation 1-0', exact: true }).click();
    await panel.getByRole('button', { name: '추가됨: Recommendation 1-0', exact: true }).waitFor();
    assert.equal(calls, countAfterMore, 'Adding music must not invalidate the recommendation list');
    assert.equal(await panel.locator('ol li').count(), 16);
    fail = true;
    await panel.getByRole('button', { name: '새 곡 더 찾기', exact: true }).click();
    await panel.getByRole('alert').waitFor();
    assert.equal(await panel.locator('ol li').count(), 16, 'A failed request must preserve prior results');
    await page.screenshot({ path: `${output}/recommendation-list.png` });
    const countBeforeResize = calls;
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(600);
    const listBox = await panel.locator('ol').boundingBox();
    const panelBox = await panel.boundingBox();
    assert.ok(listBox.height >= 80 && panelBox.y + panelBox.height < 768, JSON.stringify({ listBox, panelBox }));
    assert.equal(calls, countBeforeResize, 'Resizing must not restart discovery');
    const list = panel.locator('.tm-discovery-song-list');
    const zoomBeforeScroll = await page.locator('.tm-dock-zoom-value').textContent();
    await list.evaluate(element => { element.scrollTop = 0; });
    await list.hover();
    await page.mouse.wheel(0, 240);
    await page.waitForFunction(() => document.querySelector('.tm-discovery-song-list').scrollTop > 0);
    assert.equal(await page.locator('.tm-dock-zoom-value').textContent(), zoomBeforeScroll, 'Scrolling recommendations must not zoom the map');
    await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.tm-dock-zoom-value').textContent(), zoomBeforeScroll, 'The list boundary must not pass wheel gestures to the map');
    await page.screenshot({ path: `${output}/recommendation-list-1024.png` });
    await page.close();

    const voyage = await open('/taste-map?view=constellation');
    await voyage.locator('.tm-bubble-item button.tm-bubble').first().dispatchEvent('click');
    await voyage.locator('.ccp-card').waitFor();
    assert.ok((await voyage.locator('.ccp-display-name').textContent()).includes('별칭'));
    await voyage.locator('.ccp-evidence > summary').click();
    assert.ok((await voyage.locator('.ccp-evidence').textContent()).includes('Last.fm의 곡·아티스트 태그'));
    await voyage.locator('.ccp-voyage-launch-btn').click();
    await voyage.locator('.cv-star').first().waitFor();
    await voyage.getByRole('button', { name: '재생 목록 열기', exact: true }).click();
    const queue = voyage.getByRole('complementary', { name: '별자리 재생 목록' });
    await queue.waitFor();
    assert.equal(await queue.locator('li').count(), 8);
    const requested = await queue.locator('li button strong').nth(3).textContent();
    await queue.locator('li button').nth(3).click();
    await voyage.waitForFunction(name => document.querySelector('.cv-track-title')?.textContent === name, requested);
    assert.equal(await queue.locator('[aria-current=true] strong').textContent(), requested);
    await voyage.screenshot({ path: `${output}/play-queue.png` });
    await voyage.keyboard.press('Escape');
    assert.equal(await queue.count(), 0);
    assert.equal(await voyage.locator('.cv-hud-root').count(), 1, 'Escape dismisses queue before leaving the constellation');
    await voyage.close();
    assert.deepEqual(errors, []);
    console.log('Explicit discovery batches, retained results/errors, grouping evidence, and direct queue playback passed.');
} finally { await browser.close(); }
