// Fixture-only sharing review: no cards or maps are published to external services.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5194';
const output = 'output/review/mobile-sharing';
await mkdir(output, { recursive: true });
const tracks = Array.from({ length: 36 }, (_, index) => ({ id: `share-${index}`, name: `My song ${index + 1}`, artists: 'My artist', genres: [['dream pop'], ['jazz'], ['electronic']][index % 3], valence: .3 + index % 5 / 10, energy: .2 + index % 7 / 10, coverUrl: '/demo-covers/currents.jpg' }));
const errors = [];
const findings = [];
async function open(viewport, { native = false, fail = false, route = '/taste-map' } = {}) {
    const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, acceptDownloads: true });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ tracks, native, fail }) => {
        sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'share-review', featuresSource: 'lastfm', updatedAt: new Date().toISOString(), stats: { isDemo: false, totalAvailable: tracks.length, processedCount: tracks.length } }));
        if (native) {
            Object.defineProperty(navigator, 'canShare', { value: () => true });
            Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files }) => { window.sharedFile = { name: files[0].name, size: files[0].size, type: files[0].type }; } });
        } else {
            Object.defineProperty(navigator, 'canShare', { value: () => false });
        }
        window.failExport = fail;
        const original = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (...args) {
            if (window.failExport) { args[0](null); return; }
            return original.apply(this, args);
        };
    }, { tracks, native, fail });
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/api/discover?**', route => route.fulfill({ json: { tracks: [] } }));
    await page.route('**/api.kakao.com/**', route => route.abort());
    await page.goto(base + route);
    await page.getByRole('button', { name: '내 취향 지도 공유하기', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
}
async function assertInViewport(locator, height) {
    const box = await locator.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= height + 1, JSON.stringify(box));
}
try {
    for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
        const page = await open(viewport);
        const entry = page.getByRole('button', { name: '내 취향 지도 공유하기', exact: true });
        await assertInViewport(entry, viewport.height);
        await page.getByLabel('더 보기', { exact: true }).click();
        await page.getByRole('button', { name: '문의 남기기', exact: true }).click();
        await page.getByRole('button', { name: '문의 창 닫기', exact: true }).click();
        await page.screenshot({ path: `${output}/map-${viewport.width}.png` });
        await entry.click();
        const dialog = page.getByRole('dialog', { name: '내 취향 지도 공유하기' });
        await dialog.waitFor();
        await dialog.getByRole('img', { name: '내 취향 지도 공유 카드 미리보기' }).waitFor();
        assert.equal(await dialog.getByRole('button', { name: '앨범 버블', exact: true }).getAttribute('aria-pressed'), 'true');
        await assertInViewport(dialog.getByRole('link', { name: '이미지 저장' }), viewport.height);
        assert.equal(await dialog.evaluate(element => element.scrollWidth > element.clientWidth), false);
        await page.screenshot({ path: `${output}/share-${viewport.width}.png` });
        const downloadEvent = page.waitForEvent('download');
        await dialog.getByRole('link', { name: '이미지 저장' }).click();
        const download = await downloadEvent;
        const data = await readFile(await download.path());
        assert.equal(data.readUInt32BE(16), 1080);
        assert.equal(data.readUInt32BE(20), 1920);
        await dialog.getByRole('button', { name: '별자리', exact: true }).click();
        await dialog.getByRole('img', { name: '내 취향 지도 공유 카드 미리보기' }).waitFor();
        // Rapid style changes must never show a revoked or mismatched image.
        await dialog.getByRole('button', { name: '앨범 버블', exact: true }).click();
        await dialog.getByRole('button', { name: '별자리', exact: true }).click();
        await page.waitForFunction(() => {
            const img = document.querySelector('.spectra-share-preview > img');
            return img?.complete && img.naturalWidth === 1080;
        });
        await page.screenshot({ path: `${output}/constellation-${viewport.width}.png` });
        await dialog.locator('.spectra-share-kakao > summary').click();
        await assertInViewport(dialog.getByRole('link', { name: '이미지 저장' }), viewport.height);
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'detached' });
        assert.equal(await entry.evaluate(element => element === document.activeElement), true);
        await page.locator('.public-map-peek-tracks > button').first().click();
        const selectedTitle = await page.locator('.public-map-track h2').textContent();
        await entry.click();
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'detached' });
        assert.equal(await page.locator('.public-map-track h2').textContent(), selectedTitle);
        await page.getByRole('button', { name: '내 취향 둘러보기', exact: true }).click();
        const overview = page.getByRole('dialog', { name: '내 취향 둘러보기', exact: true });
        await overview.waitFor();
        await page.screenshot({ path: `${output}/spectra-${viewport.width}.png` });
        assert.equal(await overview.locator('.sot-root').count(), 1);
        await page.getByRole('button', { name: '취향 둘러보기 닫기' }).click();
        await overview.waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');
        findings.push({ viewport, visibleEntries: true, bothStyles: true, savedPng: '1080×1920', focusRestored: true });
        await page.close();
    }
    const native = await open({ width: 390, height: 844 }, { native: true });
    await native.getByRole('button', { name: '내 취향 지도 공유하기', exact: true }).click();
    await native.getByRole('button', { name: '카드 공유하기', exact: true }).click();
    assert.equal((await native.evaluate(() => window.sharedFile)).type, 'image/png');
    await native.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new Error('share unavailable'); } }); });
    await native.getByRole('button', { name: '카드 공유하기', exact: true }).click();
    await native.getByRole('alert').filter({ hasText: '공유를 열지 못했어요' }).waitFor();
    assert.equal(await native.getByRole('link', { name: '이미지 저장' }).isVisible(), true);
    await native.close();
    const failed = await open({ width: 320, height: 640 }, { fail: true });
    await failed.getByRole('button', { name: '내 취향 지도 공유하기', exact: true }).click();
    await failed.getByRole('button', { name: '다시 만들기', exact: true }).click({ trial: true });
    await failed.evaluate(() => { window.failExport = false; });
    await failed.getByRole('button', { name: '다시 만들기', exact: true }).click();
    await failed.locator('.spectra-share-preview > img').waitFor();
    await failed.getByRole('button', { name: '공유 창 닫기' }).click();
    await failed.getByRole('button', { name: '내 취향 지도 공유하기', exact: true }).click();
    await failed.getByRole('button', { name: '공유 창 닫기' }).click();
    await failed.waitForTimeout(500);
    assert.equal(await failed.locator('.spectra-share-dialog').count(), 0);
    await failed.close();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ findings, nativeShare: true, exportRetry: true, closeWhileGenerating: true, errors }, null, 2));
} finally { await browser.close(); }
