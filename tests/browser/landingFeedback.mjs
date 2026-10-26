import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5192';
mkdirSync('output/landing-feedback-review', { recursive: true });
try {
    for (const lang of ['en', 'ko']) for (const width of [1440, 390, 320]) {
        const context = await browser.newContext({ locale: lang === 'en' ? 'en-US' : 'ko-KR', viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await context.addInitScript(() => localStorage.setItem('spectra:map-guide:v2:desktop', 'seen'));
        await context.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
        await context.route('**/itunes.apple.com/search?**', route => route.fulfill({ json: { results: [] } }));
        const imports = [];
        await context.route('**/api/**', route => {
            if (route.request().url().includes('/taste/enrich')) imports.push(route.request().postDataJSON());
            return route.fulfill({ json: { tracks: [] } });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/?lang=${lang}`, { waitUntil: 'domcontentloaded' });
        await page.locator('.llp-textarea').waitFor({ state: 'attached' });
        assert.equal(await page.locator('.llp-export-help').getAttribute('open'), null);
        assert.equal(await page.locator('.llp-tabs button').first().getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('.lj-step-number').count(), 0);
        const numberedSections = ['hero', 'features', 'demo', 'import'];
        for (let index = 0; index < numberedSections.length; index++) {
            const heading = page.locator(`#${numberedSections[index]} .llp-art-eyebrow, #${numberedSections[index]} .llp-section-eyebrow`).first();
            assert.ok((await heading.innerText()).startsWith(`0${index + 1}`));
            assert.equal(await page.locator('.llp-chapter-nav button').nth(index).locator('span').first().textContent(), `0${index + 1}`);
        }
        const demoName = lang === 'en' ? 'Try the demo map' : '데모 지도 체험하기';
        for (const button of await page.locator('.llp-nav-demo-btn, .llp-hero-cta-group .llp-btn-primary, .llp-demo-launch-btn, .lj-track-detail button').all()) {
            assert.equal((await button.innerText()).replace('↗', '').replace('→', '').trim(), demoName);
        }
        if (lang === 'en') {
            assert.ok((await page.locator('#demo .llp-section-eyebrow').innerText()).includes('Before you explore your taste'));
            assert.ok((await page.locator('.llp-map-destination').innerText()).includes('added to your SPECTRA map'));
            assert.ok((await page.locator('.lj-method-note').innerText()).includes('Last.fm'));
            assert.ok((await page.locator('.lj-method-note').innerText()).includes('estimates from tags'));
        }
        const assertAccountFits = async () => { const box = await page.locator('.llp-nav-auth .sa-account-button').boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width, 'Account entry fits the screen'); };
        await assertAccountFits();
        await page.screenshot({ path: `output/landing-feedback-review/${lang}-${width}-hero.png` });
        await page.locator('.llp-textarea').fill('Daft Punk - Get Lucky\nBeach House - Space Song');
        const createName = lang === 'en' ? 'Create my map with 2 songs' : '2곡으로 나의 taste맵 생성하기';
        await page.getByRole('button', { name: createName, exact: true }).waitFor();
        await page.locator('.llp-tabs button').nth(1).click();
        await page.locator('.llp-dropzone').waitFor();
        await page.locator('.llp-tabs button').first().click();
        assert.ok((await page.locator('.llp-textarea').inputValue()).includes('Get Lucky'));
        assert.equal(imports.length, 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        for (const button of await page.locator('.llp-chapter-nav button').all()) { const box = await button.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width, 'Section navigation fits the screen'); }
        await page.screenshot({ path: `output/landing-feedback-review/${lang}-${width}-paste.png` });
        await page.getByRole('button', { name: createName, exact: true }).click();
        await page.waitForURL('**/taste-map');
        await page.waitForSelector(width > 900 ? '.tm-bubble-item' : '.mtm-intro');
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5:guest') || sessionStorage.getItem('spectra:taste:v5') || '{}').tracks?.length === 2);
        assert.ok(imports.length > 0);
        assert.equal(imports[0].tracks[0].artist, 'Daft Punk');
        assert.equal(imports[0].tracks[0].title, 'Get Lucky');
        // A demo CTA must open a demo, rather than only scrolling to a preview.
        await page.goto(`${base}/?lang=${lang}`, { waitUntil: 'domcontentloaded' });
        await assertAccountFits();
        await page.locator('.llp-hero-cta-group .llp-btn-primary').click();
        await page.waitForURL('**/taste-map');
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('spectra:taste:v5:demo:guest') || '{}').tracks?.length > 2);
        assert.deepEqual(errors, []);
        console.log(`${lang} ${width}px: consistent demo actions, section sequence, direct paste import and preserved draft passed`);
        await context.close();
    }
} finally { await browser.close(); }
