// Exercise real sharing UI with local service fixtures; no maps are published.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5194';
const output = 'output/review/kakao-sharing';
await mkdir(output, { recursive: true });
const errors = [], findings = [];
const storageFixture = `
export async function listOwnSharedMaps() { return [...window.shareFixture.maps]; }
export async function publishSharedMap(tracks, options) {
    window.shareFixture.published++;
    const id = 'fixture-current';
    window.shareFixture.maps.unshift({id, title: options.title, created_at: '2026-10-20T12:00:00Z'});
    return id;
}
export async function revokeSharedMap(id) {
    if (window.shareFixture.failRevoke) throw new Error('SHARE_REVOKE_FAILED');
    window.shareFixture.maps = window.shareFixture.maps.filter(item => item.id !== id);
}
export async function fetchSharedMap() { return null; }
`;
const kakaoFixture = `
export const kakaoShareConfigured = true;
export function validCardImage(value) { return value; }
export async function loadKakaoShare() { return {}; }
export function kakaoShareError() { return '공유 카드를 준비하지 못했어요. 이미지 저장은 이용할 수 있어요.'; }
export async function prepareKakaoCard(file, title, id) {
    if (window.shareFixture.failUpload) throw new Error('KAKAO_IMAGE_FAILED');
    return {kakao: {Share: {sendDefault() { window.shareFixture.sent++; }}}, settings: {content: {link: {webUrl: location.origin + '/share/map/' + id}}}};
}
`;
async function inViewport(locator, height) {
    const box = await locator.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= height + 1, JSON.stringify(box));
}
async function noOverflow(page) {
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.spectra-share-dialog, .spectra-share-body, .share-map-record')].some(el => el.scrollWidth > el.clientWidth + 1)), false);
}
try {
    for (const viewport of [{ width: 320, height: 640 }, { width: 430, height: 780 }, { width: 1024, height: 768 }]) {
        const page = await browser.newPage({ viewport, hasTouch: true });
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
            const tracks = Array.from({ length: 69 }, (_, i) => ({ id: `fixture-${i}`, name: `Song ${i}`, artists: 'Artist', genres: ['dream pop'], valence: i / 69, energy: .5 }));
            sessionStorage.setItem('spectra:taste:v5', JSON.stringify({ tracks, mapId: 'kakao-layout', featuresSource: 'lastfm', updatedAt: new Date().toISOString(), stats: { isDemo: false, totalAvailable: 69, processedCount: 69 } }));
            window.shareFixture = { maps: Array.from({ length: 4 }, (_, i) => ({ id: `old-${i}`, title: i ? `나의 스펙트라 ${i}` : '아주긴제목의음악취향지도가작은화면에서도버튼을밀어내지않고잘보이는지확인하는기록', created_at: '2026-10-20T12:00:00Z' })), published: 0, sent: 0, failUpload: false, failRevoke: false };
            Object.defineProperty(navigator, 'canShare', { value: () => false });
        });
        await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        await page.route(/\/src\/share\/sharedMapStorage\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: storageFixture }));
        await page.route(/\/src\/share\/kakaoShare\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: kakaoFixture }));
        await page.goto(base + '/taste-map?tab=map');
        await page.getByRole('button', { name: '내 취향 지도 공유하기', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '내 취향 지도 공유하기' });
        await dialog.locator('.spectra-share-preview > img').waitFor();
        await dialog.locator('.spectra-share-kakao > summary').click();
        assert.equal(await page.evaluate(() => window.shareFixture.published), 0);
        await dialog.getByRole('button', { name: '카카오톡 공유 준비', exact: true }).click();
        await dialog.getByRole('button', { name: '카카오톡 열기', exact: true }).waitFor();
        await dialog.getByRole('button', { name: '카카오톡 열기', exact: true }).click();
        assert.equal(await page.evaluate(() => window.shareFixture.sent), 1);
        await page.screenshot({ path: `${output}/ready-${viewport.width}.png` });
        await dialog.locator('.share-map-settings > summary').click();
        const revoke = dialog.getByRole('button', { name: '지도 공유 해제', exact: true });
        assert.notEqual(await revoke.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(254, 229, 0)');
        assert.equal(await dialog.locator('.kakao-share-primary').count(), 1);
        await dialog.locator('.share-map-manager > summary').click();
        assert.equal(await dialog.locator('.share-map-record').count(), 4);
        await dialog.locator('.spectra-share-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
        await inViewport(dialog.getByRole('button', { name: '공유 창 닫기' }), viewport.height);
        await inViewport(dialog.getByRole('link', { name: '이미지 저장' }), viewport.height);
        await noOverflow(page);
        await page.screenshot({ path: `${output}/settings-${viewport.width}.png` });
        // Keep the same public map when changing card artwork in this dialog.
        await dialog.getByRole('button', { name: '별자리', exact: true }).click();
        await dialog.getByRole('button', { name: '카카오톡 공유 준비', exact: true }).waitFor();
        await dialog.getByRole('button', { name: '카카오톡 공유 준비', exact: true }).click();
        await dialog.getByRole('button', { name: '카카오톡 열기', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => window.shareFixture.published), 1);
        assert.equal(await dialog.getByRole('link', { name: '지도 직접 보기' }).getAttribute('href'), base + '/share/map/fixture-current');
        await page.evaluate(() => { window.shareFixture.failRevoke = true; });
        await revoke.click();
        await dialog.getByRole('alert').filter({ hasText: '공유를 해제하지 못했어요' }).waitFor();
        assert.equal(await dialog.getByRole('link', { name: '지도 직접 보기' }).count(), 1);
        await page.evaluate(() => { window.shareFixture.failRevoke = false; });
        await revoke.click();
        await dialog.getByRole('button', { name: '카카오톡 공유 준비', exact: true }).waitFor();
        assert.equal(await dialog.getByRole('link', { name: '지도 직접 보기' }).count(), 0);
        assert.equal(await revoke.count(), 0);
        // Upload retry must reuse the map already saved before the upload failed.
        await page.evaluate(() => { window.shareFixture.failUpload = true; });
        await dialog.getByRole('button', { name: '카카오톡 공유 준비', exact: true }).click();
        await dialog.getByRole('alert').filter({ hasText: '공유 카드를 준비하지 못했어요' }).waitFor();
        await page.evaluate(() => { window.shareFixture.failUpload = false; });
        await dialog.getByRole('button', { name: '카카오톡 공유 준비', exact: true }).click();
        await dialog.getByRole('button', { name: '카카오톡 열기', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => window.shareFixture.published), 2);
        findings.push({ viewport, singlePrimaryButton: true, settingsSeparated: true, fixedHeaderAndFooter: true, noOverflow: true, styleChangeReusesMap: true, revokeAndUploadRetry: true });
        await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ findings, errors }, null, 2));
} finally { await browser.close(); }
