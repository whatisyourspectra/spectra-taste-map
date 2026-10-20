import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
mkdirSync('output/feedback-review', { recursive: true });
try {
    const scenarios = [['desktop', 1440, 1000, false], ['mobile', 390, 844, false], ['lan-mobile', 390, 844, true]];
    for (const [name, width, height, simulateLan] of scenarios) {
        const page = await browser.newPage({ viewport: { width, height } });
        if (simulateLan) await page.addInitScript(() => Object.defineProperty(crypto, 'randomUUID', { value: undefined }));
        const requests = [];
        await page.route('**/rest/v1/rpc/submit_user_feedback', route => {
            requests.push(route.request().postDataJSON());
            return route.fulfill(requests.length === 1
                ? { status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'storage unavailable', code: 'test' }) }
                : { status: 200, contentType: 'application/json', body: JSON.stringify(requests.at(-1).p_request_id) });
        });
        await page.goto(`${base}/?tracking=private`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '문의 남기기' }).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        await dialog.getByLabel(/^문의 유형/).selectOption('bug');
        await dialog.getByLabel(/^제목/).fill('지도를 확대할 때 곡 선택이 어려워요');
        await dialog.getByLabel(/^내용/).fill('지도를 확대하고 앨범을 눌렀는데 곡 상세 정보가 나타나지 않았어요.');
        await dialog.getByLabel(/^답변받을 이메일/).fill('feedback@example.com');
        await dialog.getByRole('checkbox').check();
        await page.keyboard.press('Escape');
        assert.equal(await dialog.isVisible(), false);
        await page.getByRole('button', { name: '문의 남기기' }).click();
        assert.equal(await dialog.getByLabel(/^제목/).inputValue(), '지도를 확대할 때 곡 선택이 어려워요');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const bounds = await dialog.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= height);
        await page.screenshot({ path: `output/feedback-review/${name}-form.png` });
        await dialog.getByRole('button', { name: '의견 보내기' }).click();
        await dialog.getByRole('alert').waitFor();
        assert.ok((await dialog.locator('textarea').inputValue()).includes('앨범을 눌렀는데'));
        await dialog.getByRole('button', { name: '의견 보내기' }).click();
        await dialog.getByRole('heading', { name: '소중한 의견을 받았어요.' }).waitFor();
        assert.equal(requests.length, 2);
        assert.equal(requests[0].p_request_id, requests[1].p_request_id);
        assert.equal(requests[0].p_page_path, '/');
        assert.equal(requests[0].p_device_type, width <= 900 ? 'mobile' : 'desktop');
        assert.match(requests[0].p_request_id, /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i);
        await page.screenshot({ path: `output/feedback-review/${name}-success.png` });
        await dialog.getByRole('button', { name: '닫기', exact: true }).click();
        assert.equal(await page.evaluate(() => document.activeElement?.textContent.includes('문의 남기기')), true);
        console.log(`${name}: form, failure, draft preservation, idempotent retry, success and focus passed`);
        await page.close();
    }
} finally { await browser.close(); }
