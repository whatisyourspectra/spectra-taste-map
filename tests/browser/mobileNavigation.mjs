// Local fixtures only: navigation, discovery decisions, and direct Kakao entry.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5194';
const out = 'output/review/mobile-navigation';
await mkdir(out, { recursive: true });
const tracks = Array.from({ length: 69 }, (_, i) => ({ id: `personal-${i}`, name: i === 3 ? 'Movie' : `My song ${i + 1}`, artists: i === 3 ? 'Tom Misch' : 'My artist', genres: [['dream pop'], ['jazz'], ['electronic']][i % 3], valence: i % 10 / 10, energy: .3 + i % 6 / 10, coverUrl: '/demo-covers/currents.jpg' }));
const recommendations = Array.from({ length: 4 }, (_, i) => ({ id: `new-${i}`, name: `Discovery ${i + 1}`, artists: 'New artist', genres: ['jazz'], valence: .7, energy: .6, coverUrl: '/demo-covers/geography.jpg' }));
const errors = [], findings = [];
async function inside(locator, height) {
    const box = await locator.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= height + 1, JSON.stringify(box));
}
try {
    for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
        const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(tracks => {
            if (!sessionStorage.getItem('spectra:taste:v5')) sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'mobile-nav', featuresSource: 'lastfm', updatedAt: new Date().toISOString(), stats: { isDemo: false, totalAvailable: tracks.length, processedCount: tracks.length } }));
            Object.defineProperty(navigator, 'canShare', { value: () => false });
        }, tracks);
        await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        const calls = [];
        await page.route('**/api/discover?**', route => { calls.push(route.request().url()); return route.fulfill({ json: { tracks: recommendations } }); });
        await page.goto(base + '/taste-map');
        const nav = page.getByRole('navigation', { name: '모바일 음악 메뉴' });
        await nav.waitFor();
        assert.deepEqual(await nav.getByRole('button').allTextContents(), ['내 지도', '발견', '오늘']);
        assert.equal(calls.length, 0);
        await inside(page.getByRole('button', { name: '카카오톡으로 공유하기', exact: true }), viewport.height);
        assert.equal(await page.getByRole('button', { name: '문의 남기기', exact: true }).isVisible(), false);
        await page.getByLabel('더 보기', { exact: true }).click();
        await page.getByRole('button', { name: '문의 남기기', exact: true }).click();
        await page.getByRole('button', { name: '문의 창 닫기', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.screenshot({ path: `${out}/map-${viewport.width}.png` });
        await page.getByRole('button', { name: '카카오톡으로 공유하기', exact: true }).click();
        const share = page.getByRole('dialog', { name: '내 취향 지도 공유하기' });
        await share.locator('.spectra-share-preview > img').waitFor();
        assert.equal(await share.locator('.spectra-share-kakao').evaluate(el => el.open), true);
        await share.getByRole('button', { name: '카카오톡 공유 준비', exact: true }).waitFor();
        await inside(share.getByRole('button', { name: '공유 창 닫기' }), viewport.height);
        await page.screenshot({ path: `${out}/kakao-${viewport.width}.png` });
        await share.getByRole('button', { name: '공유 창 닫기' }).click();
        await share.waitFor({ state: 'detached' });
        await page.getByRole('button', { name: '내 음악에서 곡 찾기', exact: true }).click();
        await page.getByRole('searchbox', { name: '내 곡 또는 아티스트 검색' }).fill('Movie');
        await page.locator('.mtm-map-content .public-map-song-list > button').first().click();
        await page.getByRole('button', { name: '비슷한 곡 찾기', exact: false }).click();
        const discovery = page.locator('.mtm-discovery');
        await discovery.locator('.mtm-drop-card').waitFor();
        assert.equal(await nav.getByRole('button', { name: '발견', exact: true }).getAttribute('aria-current'), 'page');
        assert.equal(new URL(calls[0]).searchParams.get('seedTracks'), 'Tom Misch|Movie');
        await page.screenshot({ path: `${out}/discover-${viewport.width}.png` });
        await discovery.getByRole('button', { name: '관심 표시', exact: false }).click();
        await discovery.getByRole('button', { name: '넘기기', exact: false }).click();
        await discovery.getByRole('button', { name: '내 음악에 추가', exact: false }).click();
        const decisions = await page.evaluate(() => JSON.parse(localStorage.getItem('spectra:reflection:v1:guest:mobile-nav')).decisions);
        assert.deepEqual(decisions.map(item => item.action), ['dig', 'pop', 'absorb']);
        await nav.getByRole('button', { name: '내 지도', exact: true }).click();
        assert.ok((await page.locator('.mtm-intro h1').textContent()).includes('70곡'));
        assert.equal(await page.locator('.mtm-map-content .public-map-track h2').textContent(), 'Movie');
        // Compact screens give the selected song more room by hiding shortcuts.
        if (!await page.getByRole('button', { name: '내 취향 둘러보기', exact: true }).isVisible()) {
            await page.getByRole('button', { name: '내 곡 정보 닫기', exact: true }).click();
        }
        await page.getByRole('button', { name: '내 취향 둘러보기', exact: true }).click();
        const overview = page.getByRole('dialog', { name: '내 취향 둘러보기', exact: true });
        await overview.waitFor();
        assert.equal(await overview.locator('.sot-root').count(), 1);
        assert.equal(await overview.locator('.sco-root, .mcc-root, .tmm-drop').count(), 0);
        await page.screenshot({ path: `${out}/overview-${viewport.width}.png` });
        await overview.getByRole('button', { name: '취향 둘러보기 닫기' }).click();
        await overview.waitFor({ state: 'detached' });
        await nav.getByRole('button', { name: '오늘', exact: true }).click();
        const today = page.locator('.mtm-today');
        await today.getByRole('button', { name: '내 순간 직접 적기', exact: false }).click();
        await today.getByRole('textbox', { name: '나의 순간', exact: true }).fill('산책하며 듣고 싶은 음악');
        await nav.getByRole('button', { name: '내 지도', exact: true }).click();
        await nav.getByRole('button', { name: '오늘', exact: true }).click();
        assert.equal(await today.getByRole('textbox', { name: '나의 순간', exact: true }).inputValue(), '산책하며 듣고 싶은 음악');
        await page.screenshot({ path: `${out}/today-${viewport.width}.png` });
        await today.getByRole('button', { name: '기록 달력', exact: false }).click();
        await inside(page.locator('.mcc-header'), viewport.height);
        await page.screenshot({ path: `${out}/calendar-${viewport.width}.png` });
        await page.goBack();
        assert.equal(await nav.getByRole('button', { name: '내 지도', exact: true }).getAttribute('aria-current'), 'page');
        await page.goForward();
        assert.equal(await nav.getByRole('button', { name: '오늘', exact: true }).getAttribute('aria-current'), 'page');
        await page.getByLabel('더 보기', { exact: true }).click();
        await page.getByRole('button', { name: 'English', exact: true }).click();
        const englishNav = page.getByRole('navigation', { name: 'Mobile music menu' });
        assert.deepEqual(await englishNav.getByRole('button').allTextContents(), ['My map', 'Discover', 'Today']);
        await englishNav.getByRole('button', { name: 'My map', exact: true }).click();
        await page.getByRole('heading', { name: /My map/ }).waitFor();
        await page.getByLabel('More options', { exact: true }).click();
        await page.getByRole('button', { name: '한국어', exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.goto(base + '/taste-map/mobile?oracle=1');
        await today.waitFor();
        assert.ok(page.url().endsWith('/taste-map?tab=today'));
        findings.push({ viewport, threeTabs: true, directKakao: true, discoveryChoicesSaved: true, mapSelectionPreserved: true, todayDraftPreserved: true, legacyLink: true });
        await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ findings, errors }, null, 2));
} finally { await browser.close(); }
