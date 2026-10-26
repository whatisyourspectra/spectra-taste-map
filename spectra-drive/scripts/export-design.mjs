import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DESIGN_SCENES, buildDesignScene } from '../src/design/scenario.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5190';
const output = resolve('docs/design');
await mkdir(`${output}/screens`, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1300, height: 1100 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const scene of DESIGN_SCENES) {
    await page.goto(`${base}/design?scene=${scene.id}&capture=1`);
    await page.locator(`.ds-vehicle-screen[data-scene=${scene.id}]`).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.ds-screen-brand img').evaluate(image => image.complete && image.naturalWidth > 0), true);
    const overflow = await page.locator('.ds-vehicle-screen').evaluate(screen => {
      const bounds = screen.getBoundingClientRect();
      return [...screen.querySelectorAll('button, h2, .ds-cabin-values, .ds-scene-footer, .ds-bottom-bar')].some(element => {
        const box = element.getBoundingClientRect();
        return box.right > bounds.right + 1 || box.bottom > bounds.bottom + 1;
      });
    });
    assert.equal(overflow, false, `${scene.id}: content must fit the vehicle screen`);
    await page.locator('.ds-vehicle-screen').screenshot({ path: `${output}/screens/${scene.number}-${scene.id}.png`, animations: 'disabled' });
  }
  await page.goto(`${base}/design/board`);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.ds-board .ds-vehicle-screen').count(), 4);
  await page.locator('.ds-board').screenshot({ path: `${output}/SPECTRA_Drive_Design_Board.png`, animations: 'disabled' });
  const boardSize = await page.locator('.ds-board').boundingBox();
  await page.addStyleTag({ content: `@page { size: ${Math.ceil(boardSize.width)}px ${Math.ceil(boardSize.height) + 8}px; margin: 0; } @media print { .ds-board { width: ${Math.ceil(boardSize.width)}px; max-width: none; padding: 30px; } }` });
  await page.pdf({ path: `${output}/SPECTRA_Drive_Design_Board.pdf`, printBackground: true, preferCSSPageSize: true });
  const pdf = await readFile(`${output}/SPECTRA_Drive_Design_Board.pdf`);
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1, 'The design board PDF must contain one page');

  // Check the prototype's actual state transitions and music/lighting separation.
  await page.goto(`${base}/design`);
  await page.getByRole('button', { name: /02.*이동/ }).click();
  await page.getByRole('button', { name: '시안에서 퇴근 모드 적용' }).click();
  await page.locator('.ds-vehicle-screen[data-scene=applied]').waitFor();
  const light = await page.locator('.ds-cabin-card').getAttribute('style');
  const title = await page.locator('.ds-sample-track strong').textContent();
  await page.getByRole('button', { name: '시안 음성 명령 장면 보기' }).click();
  await page.locator('.ds-vehicle-screen[data-scene=refined]').waitFor();
  assert.equal(await page.locator('.ds-cabin-card').getAttribute('style'), light);
  assert.notEqual(await page.locator('.ds-sample-track strong').textContent(), title);
  assert.deepEqual(buildDesignScene('applied').state.lighting, buildDesignScene('refined').state.lighting);
  assert.match(await page.locator('.ds-cabin-pill').textContent(), /조명 유지/);
  await page.clock.install();
  await page.getByRole('button', { name: '32초 시나리오 자동 재생' }).click();
  await page.locator('.ds-vehicle-screen[data-scene=ready]').waitFor();
  await page.clock.fastForward(8000);
  await page.locator('.ds-vehicle-screen[data-scene=suggestion]').waitFor();
  await page.getByRole('button', { name: '자동 재생 멈추기' }).click();
  assert.deepEqual(errors, []);
  console.log('Exported four 2000px vehicle UI images, a design board PNG/PDF, and verified prototype transitions.');
  console.log(output);
} finally { await browser.close(); }
