// Run with PLAYWRIGHT_MODULE and optional CHROMIUM_EXECUTABLE / BASE_URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const externalSearches = [];
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/itunes.apple.com/**', route => { externalSearches.push(route.request().url()); return route.abort(); });
    await page.route('**/*.mzstatic.com/**', route => route.abort());
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5188'}/`);
    await page.locator('#demo').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
        const images = [...document.querySelectorAll('.lj-demo-bubble img')];
        return images.length === 18 && images.every(img => img.complete && img.naturalWidth > 0 && img.src.includes('/demo-covers/'));
    });
    assert.equal(externalSearches.length, 0);
    if (process.env.COVER_SCREENSHOT) await page.locator('.llp-demo-grid').screenshot({ path: process.env.COVER_SCREENSHOT });
    console.log('All 18 demo covers load locally with Apple search and image CDN blocked.');
} finally { await browser.close(); }
