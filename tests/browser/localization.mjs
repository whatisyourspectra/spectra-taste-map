import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
mkdirSync('output/localization-review', { recursive: true });
const errors = [];
async function prepare(context) {
    await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await context.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    await context.addInitScript(() => localStorage.setItem('spectra:map-guide:v2:desktop', 'seen'));
}
async function koreanText(page) {
    return page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const found = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.parentElement.closest('script, style, [aria-hidden="true"], [hidden], dialog:not([open])')) continue;
            if (!node.parentElement.getClientRects().length) continue;
            if (/[가-힣]/.test(node.textContent) && node.textContent.trim() !== '한국어') found.push(node.textContent.trim());
        }
        return [...new Set(found)];
    });
}
try {
    for (const width of [1440, 390]) {
        const context = await browser.newContext({ locale: 'en-US', viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
        await prepare(context);
        const page = await context.newPage();
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(base);
        await page.getByRole('button', { name: 'EN', exact: true }).waitFor();
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        assert.deepEqual(await koreanText(page), [], 'English landing has no Korean interface text');
        await page.getByRole('button', { name: '한국어', exact: true }).click();
        assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
        await page.getByRole('button', { name: '텍스트 직접 붙여넣기', exact: true }).click();
        await page.locator('.llp-textarea').fill('Daft Punk - Get Lucky\nBeach House - Space Song');
        await page.getByRole('button', { name: 'EN', exact: true }).click();
        assert.ok((await page.locator('.llp-textarea').inputValue()).includes('Get Lucky'));
        await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByLabel(/^Subject/).fill('My feedback draft');
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: '한국어', exact: true }).click();
        await page.getByRole('button', { name: '문의 남기기', exact: true }).click();
        assert.equal(await dialog.getByLabel(/^제목/).inputValue(), 'My feedback draft');
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'EN', exact: true }).click();
        await page.locator('.llp-export-help > summary').click();
        await page.locator('.llp-platform-chip').filter({ hasText: /^Spotify$/ }).click();
        assert.ok((await page.locator('.llp-export-link').getAttribute('href')).includes('/transfer/spotify-to-file'));
        assert.ok(!(await page.locator('.llp-export-link').getAttribute('href')).includes('/ko/'));
        await page.screenshot({ path: `output/localization-review/${width}-landing.png` });
        await page.locator('.sa-account-button').click();
        await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor();
        assert.deepEqual(await koreanText(page), []);
        await page.reload();
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        await page.goto(`${base}/share/card`);
        await page.getByRole('heading', { name: 'Could not load the shared card' }).waitFor();
        assert.deepEqual(await koreanText(page), []);
        await page.goto(`${base}/share/map/missing`);
        await page.getByRole('heading', { name: 'Could not open the shared map' }).waitFor();
        assert.deepEqual(await koreanText(page), []);
        const sharedTracks = Array.from({length: 8}, (_, index) => ({ id: `star-${index}`, name: index ? `Song ${index}` : '밤편지', artists: index ? 'Test artist' : '아이유', x: .1 + index * .1, y: .2 + (index % 3) * .2 }));
        await page.route(/\/src\/share\/sharedMapStorage\.js(?:\?.*)?$/, route => route.fulfill({contentType: 'application/javascript', body: `
            export async function fetchSharedMap() { return ${JSON.stringify({title: 'Shared universe', genres: ['Indie'], tracks: sharedTracks})}; }
            export async function publishSharedMap() {} export async function revokeSharedMap() {} export async function listOwnSharedMaps() {return []}
        `}));
        await page.goto(`${base}/share/map/11111111-1111-4111-8111-111111111111`);
        await page.getByRole('heading', {name: 'Shared universe', exact: true}).waitFor();
        assert.deepEqual((await koreanText(page)).filter(text => /[가-힣]/.test(text.replaceAll('밤편지', '').replaceAll('아이유', ''))), []);
        const checkHeader = async () => {
            for (const button of await page.locator('.public-map-header .language-switcher button').all()) {
                const box = await button.boundingBox();
                assert.ok(box.x >= 0 && box.x + box.width <= page.viewportSize().width, 'Public-map language buttons fit the screen');
            }
        };
        await checkHeader();
        if (width <= 900) {
            await page.setViewportSize({width: 320, height: 640});
            await page.waitForTimeout(250);
            await checkHeader();
            const searchBounds = await page.locator('.public-map-find').boundingBox();
            assert.ok(searchBounds.x >= 0 && searchBounds.x + searchBounds.width <= 320, 'English map controls fit a small screen');
            await page.screenshot({ path: 'output/localization-review/320-shared-map.png' });
            await page.setViewportSize({width, height: 1000});
        }
        await page.getByRole('button', {name: 'Find a song in the shared map', exact: true}).click();
        await page.getByRole('searchbox').fill('밤편지');
        await page.locator('.public-map-song-list > button').click();
        await page.getByRole('heading', {name: '밤편지', exact: true}).waitFor();
        assert.deepEqual((await koreanText(page)).filter(text => /[가-힣]/.test(text.replaceAll('밤편지', '').replaceAll('아이유', ''))), []);
        await page.unroute(/\/src\/share\/sharedMapStorage\.js(?:\?.*)?$/);
        await page.goto(base);
        await page.locator(width > 900 ? '.llp-nav-demo-btn' : '.llp-hero-cta-group .llp-btn-primary').click();
        await page.waitForURL('**/taste-map');
        await page.waitForSelector(width > 900 ? '.tm-bubble-item' : '.mtm-intro');
        await page.waitForTimeout(700);
        assert.deepEqual(await koreanText(page), [], 'English map has no Korean interface text');
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
        await page.screenshot({ path: `output/localization-review/${width}-map.png` });
        if (width <= 900) {
            await page.getByRole('button', { name: 'Today', exact: true }).click();
            await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
            assert.deepEqual(await koreanText(page), [], 'Today and calendar are in English');
            await page.getByRole('button', { name: 'Discover', exact: true }).click();
            await page.getByRole('heading', { name: 'Discover', exact: true }).waitFor();
            assert.deepEqual(await koreanText(page), [], 'Discovery is in English');
            await page.getByRole('button', { name: 'My map', exact: true }).click();
            await page.getByRole('button', { name: 'Share my taste map', exact: true }).click();
            const share = page.getByRole('dialog');
            await share.getByRole('heading', { name: 'Share my taste map' }).waitFor();
            await share.locator('.spectra-share-kakao > summary').click();
            await share.getByRole('heading', { name: 'Send my map to a friend' }).waitFor();
            assert.deepEqual(await koreanText(page), [], 'Share dialog and Kakao options are in English');
            await share.getByRole('button', { name: 'Close sharing' }).click();
        }
        if (width <= 900) {
            await page.getByText('···', { exact: true }).click();
            await page.getByRole('button', { name: '한국어', exact: true }).click();
            await page.getByRole('heading', { name: /내 지도/ }).waitFor();
        } else {
            await page.locator('.tm-lang-btn').filter({ hasText: /KO/ }).click();
        }
        await page.goto(base);
        assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
        console.log(`${width}px: locale, navigation, drafts and map screens passed`);
        await context.close();
    }
    // A shareable locale link overrides a previous selection and survives navigation.
    const context = await browser.newContext({ locale: 'ko-KR' });
    await prepare(context);
    const page = await context.newPage();
    await page.goto(`${base}/?lang=en`);
    assert.equal(await page.evaluate(() => localStorage.getItem('spectra-tastemap-lang-v1')), 'en');
    await page.getByRole('button', { name: '한국어', exact: true }).click();
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
    await context.close();
    // Exercise the real feedback submitter against a local RPC stub, including a failed request.
    const feedbackContext = await browser.newContext({ locale: 'en-US' });
    await prepare(feedbackContext);
    await feedbackContext.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `
        export const supabase = {
            auth: {
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
                getSession: async () => ({ data: { session: null }, error: null }),
                getUser: async () => ({ data: { user: null }, error: null }),
            },
            rpc: (method, payload) => ({ abortSignal: async () => {
                window.feedbackRequests = [...(window.feedbackRequests || []), payload];
                return window.feedbackRequests.length === 1 ? {error: {message: 'unavailable'}} : {data: payload.p_request_id};
            } }),
        };
        export function finishGoogleLogin() { return Promise.reject(); }
    ` }));
    const feedbackPage = await feedbackContext.newPage();
    await feedbackPage.goto(base);
    await feedbackPage.getByRole('button', { name: 'Send feedback', exact: true }).click();
    const feedbackDialog = feedbackPage.getByRole('dialog');
    await feedbackDialog.getByLabel(/^Subject/).fill('A feedback test');
    await feedbackDialog.getByLabel(/^Message/).fill('The map is interesting. I would like to explore more music.');
    await feedbackDialog.getByRole('checkbox').check();
    await feedbackDialog.getByRole('button', { name: 'Submit feedback', exact: true }).click();
    await feedbackDialog.getByRole('alert').waitFor();
    assert.ok((await feedbackDialog.getByRole('alert').innerText()).includes('Your draft is safe'));
    await feedbackPage.keyboard.press('Escape');
    await feedbackPage.getByRole('button', { name: '한국어', exact: true }).click();
    await feedbackPage.getByRole('button', { name: '문의 남기기', exact: true }).click();
    assert.ok((await feedbackDialog.getByRole('alert').innerText()).includes('입력 내용은 유지됩니다'));
    await feedbackDialog.getByRole('button', { name: '의견 보내기', exact: true }).click();
    await feedbackDialog.getByRole('heading', { name: '소중한 의견을 받았어요.' }).waitFor();
    const requests = await feedbackPage.evaluate(() => window.feedbackRequests);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].p_request_id, requests[1].p_request_id);
    assert.equal(requests[0].p_subject, 'A feedback test');
    await feedbackContext.close();
    // Private browsing may block preference storage; switching still works in memory.
    const privateContext = await browser.newContext({ locale: 'ko-KR' });
    await prepare(privateContext);
    await privateContext.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new DOMException('blocked', 'SecurityError'); };
        Storage.prototype.setItem = () => { throw new DOMException('blocked', 'SecurityError'); };
    });
    const privatePage = await privateContext.newPage();
    await privatePage.goto(base);
    await privatePage.getByRole('button', { name: 'EN', exact: true }).click();
    await privatePage.getByRole('button', { name: 'Send feedback', exact: true }).waitFor();
    assert.equal(await privatePage.locator('html').getAttribute('lang'), 'en');
    await privateContext.close();
    assert.deepEqual(errors, []);
    console.log('Language detection, toggling, drafts, navigation, reload, public pages and demo maps passed.');
} finally { await browser.close(); }
