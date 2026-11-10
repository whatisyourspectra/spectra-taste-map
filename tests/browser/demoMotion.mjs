// Verify rendered movement, stable interaction targets and motion preferences.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const review = 'output/review/demo-motion';
await mkdir(review, { recursive: true });
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
    await page.route('**/api/**', route => route.fulfill({ json: { tracks: [] } }));
    await page.addInitScript(() => localStorage.setItem('spectra:map-guide:v2:desktop', 'seen'));
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5173'}/`);
    await page.locator('.llp-demo-launch-btn').first().click();
    await page.locator('.is-demo-alive .tm-bubble-item').first().waitFor();
    await page.waitForTimeout(900); // Let the representative entry camera finish before requesting All.
    await page.locator('.tm-map-tag-chip--all').click();
    await page.waitForFunction(() => document.querySelectorAll('.is-demo-alive .tm-bubble-item').length === 240
        && !document.querySelector('.tm-bubble-wrap.camera-moving'));
    await page.mouse.move(1430, 990);
    const snapshot = () => page.locator('.is-demo-alive .tm-bubble-item').evaluateAll(items => items.map(item => {
        const rect = item.querySelector('.tm-bubble').getBoundingClientRect();
        return { id: item.dataset.bubbleId, x: rect.x, y: rect.y, left: item.style.left, top: item.style.top };
    }));
    const before = await snapshot();
    await page.screenshot({ path: `${review}/before.png` });
    await page.evaluate(async () => {
        for (const element of document.querySelectorAll('.is-demo-alive .tm-bubble-item .tm-bubble-float')) {
            for (const animation of element.getAnimations()) animation.currentTime += 3000;
        }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const after = await snapshot();
    const displacement = after.map((item, i) => {
        assert.equal(item.left, before[i].left, 'Motion must preserve canonical map positions');
        assert.equal(item.top, before[i].top);
        return Math.hypot(item.x - before[i].x, item.y - before[i].y);
    });
    const mean = displacement.reduce((sum, distance) => sum + distance, 0) / displacement.length;
    assert.ok(mean > 5 && mean < 25, `Overview motion should be visible and bounded (${mean.toFixed(1)}px)`);
    assert.ok(Math.max(...displacement) < 55, 'Artwork must remain near its neighborhood');
    await page.screenshot({ path: `${review}/after.png` });
    const target = await page.evaluate(() => {
        for (const item of document.querySelectorAll('.is-demo-alive .tm-bubble-item')) {
            const button = item.querySelector('.tm-bubble'), rect = button.getBoundingClientRect();
            const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
            if (x > 350 && x < innerWidth - 100 && y > 180 && y < innerHeight - 160
                && document.elementFromPoint(x, y)?.closest('.tm-bubble') === button) return { id: item.dataset.bubbleId, x, y };
        }
    });
    assert.ok(target, 'A moving cover must remain reachable');
    await page.mouse.move(target.x, target.y);
    const item = page.locator(`[data-bubble-id="${target.id}"]`);
    const float = item.locator('.tm-bubble-float');
    await page.waitForFunction(id => getComputedStyle(document.querySelector(`[data-bubble-id="${id}"] .tm-bubble-float`))
        .animationPlayState.split(',').every(state => state.trim() === 'paused'), target.id);
    const held = await item.locator('.tm-bubble').boundingBox();
    await page.waitForTimeout(250);
    const still = await item.locator('.tm-bubble').boundingBox();
    assert.ok(Math.hypot(held.x - still.x, held.y - still.y) < .5, 'Hovered artwork must stop moving');
    await item.locator('.tm-bubble').click();
    await page.waitForFunction(id => document.querySelector(`[data-bubble-id="${id}"]`)?.classList.contains('detail-selected'), target.id);
    await page.mouse.move(1430, 990);
    assert.ok((await float.evaluate(element => getComputedStyle(element).animationPlayState)).includes('paused'), 'Selected artwork must remain still');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.is-demo-alive .tm-bubble-item .tm-bubble-float').evaluateAll(items =>
        items.some(element => element.getAnimations().length > 0)), false, 'Reduced motion must disable both animation layers');
    assert.deepEqual(errors, []);
    console.log(`Demo motion passed: mean ${mean.toFixed(1)}px travel over 3 seconds; hover/click/selection stay stable; reduced motion stops all currents.`);
} finally { await browser.close(); }
