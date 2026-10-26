import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5190';
const output = process.env.DRIVER_OUTPUT || 'docs/design/driver-view/hangang-v2';
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1250 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { queueMicrotask(() => { this.onresult?.({ results: [[{ transcript: '조금 더 신나게' }]] }); this.onend?.(); }); }
      abort() { this.onend?.(); }
    };
  });
  await page.goto(`${base}/drive`);
  await page.getByRole('heading', { name: '내 취향 그대로.다음 곡은, 한마디로.' }).waitFor();
  await page.locator('.cp-infotainment .field-star').first().waitFor();
  assert.equal(await page.locator('.cp-hangang-plate').evaluate(async image => { await image.decode(); return image.naturalWidth > 1600 && image.naturalHeight > 900; }), true, 'High-fidelity Hangang plate must load');
  await page.evaluate(() => document.fonts.ready);
  const getQueue = () => page.locator('.cp-up-next li').evaluateAll(items => items.map(item => item.dataset.trackId));
  const getStars = () => page.locator('.field-star').evaluateAll(stars => stars.map(star => {
    const point = star.querySelector('circle:last-of-type'); return [star.dataset.trackId, point.getAttribute('cx'), point.getAttribute('cy')];
  }).sort((a, b) => a[0].localeCompare(b[0])));
  const originalQueue = await getQueue();
  const originalStars = await getStars();
  const currentTrack = await page.locator('.cp-player-title strong').textContent();
  await page.locator('.cp-stage').screenshot({ path: `${output}/01-driver-ready.png`, animations: 'disabled' });
  await page.getByRole('button', { name: /01.*퇴근길이니까/ }).click();
  await page.waitForFunction(() => document.querySelector('.cp-up-next ol').dataset.revision === '1');
  assert.notDeepEqual(await getQueue(), originalQueue);
  assert.equal(await page.locator('.cp-player-title strong').textContent(), currentTrack);
  assert.deepEqual(await getStars(), originalStars);
  await page.locator('.cp-stage').screenshot({ path: `${output}/02-driver-calm.png`, animations: 'disabled' });
  await page.getByRole('button', { name: '화면 확대' }).click();
  const screen = page.locator('.cp-infotainment');
  const overflow = await screen.evaluate(element => {
    const box = element.getBoundingClientRect();
    return [...element.querySelectorAll('button, strong, li, .cp-reason, .cp-current-kept')].filter(item => {
      const b = item.getBoundingClientRect(); return b.width > 0 && (b.bottom > box.bottom + 1 || b.right > box.right + 1 || b.left < box.left - 1);
    }).map(item => item.className || item.tagName);
  });
  assert.deepEqual(overflow, [], 'App UI must fit its display');
  await page.locator('.cp-stage').screenshot({ path: `${output}/03-display-calm.png`, animations: 'disabled' });
  const calmQueue = await getQueue();
  await page.getByRole('button', { name: '직접 말하기', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.cp-up-next ol').dataset.revision === '2');
  assert.notDeepEqual(await getQueue(), calmQueue);
  assert.equal(await page.locator('.cp-player-title strong').textContent(), currentTrack);
  await page.locator('.cp-stage').screenshot({ path: `${output}/04-display-uplift.png`, animations: 'disabled' });
  await page.getByRole('button', { name: /03.*기본 취향으로/ }).click();
  await page.waitForFunction(() => document.querySelector('.cp-up-next ol').dataset.revision === '3');
  assert.deepEqual(await getQueue(), originalQueue);
  await page.clock.install();
  await page.getByRole('button', { name: '28초 자동 시연' }).click();
  await page.clock.fastForward(3000);
  await page.waitForFunction(() => document.querySelector('.cp-up-next ol').dataset.revision === '4');
  await page.getByRole('button', { name: '시연 멈추기' }).click();
  await page.clock.fastForward(30000);
  assert.equal(await page.locator('.cp-up-next ol').getAttribute('data-revision'), '4');
  await page.clock.resume();
  if (await page.evaluate(() => document.fullscreenEnabled)) {
    await page.getByRole('button', { name: '몰입 보기', exact: true }).click();
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains('cp-stage'));
    const fits = await page.locator('.cp-canvas').evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1; });
    assert.equal(fits, true, 'The whole composition must fit fullscreen without cropping');
    await page.getByRole('button', { name: '몰입 보기 종료', exact: true }).click();
    await page.waitForFunction(() => !document.fullscreenElement);
  }
  await page.locator('.cp-tools summary').click();
  await page.getByLabel('운전자 시안 취향 JSON', { exact: true }).setInputFiles({ name: 'taste.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ tracks: [
    { name: 'My Current', artists: 'Personal', genres: ['indie'], energy: .5, valence: .5 },
    { name: 'My Calm', artists: 'Personal', genres: ['ambient'], energy: .15, valence: .5 },
    { name: 'My Uplift', artists: 'Personal', genres: ['house'], energy: .8, valence: .8 },
  ] })) });
  await page.getByText('내 취향 · 3곡', { exact: true }).waitFor();
  assert.equal(await page.locator('.cp-player-title strong').textContent(), 'My Current');
  assert.equal(await page.locator('.cp-up-next li').count(), 2);
  const samples = 32000;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / 8000) * 500), 44 + i * 2);
  await page.getByLabel('운전자 시안 로컬 음원', { exact: true }).setInputFiles({ name: 'My Current.wav', mimeType: 'audio/wav', buffer: wav });
  await page.getByRole('button', { name: '음악 재생', exact: true }).click();
  await page.waitForFunction(() => { const audio = document.querySelector('audio'); return !audio.paused && audio.currentTime > 0; });
  await page.getByLabel('운전자 시안 텍스트 요청').fill('편안하게');
  await page.getByRole('button', { name: '요청 적용' }).click();
  assert.equal(await page.locator('.cp-player-title strong').textContent(), 'My Current');
  assert.equal(await page.locator('audio').evaluate(audio => audio.paused), false, 'A mood change must not interrupt the current audio');
  await page.getByRole('button', { name: '음악 일시정지', exact: true }).click();
  for (const width of [1600, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}`);
  }
  await page.goto(`${base}/drive`);
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({ path: `${output}/05-mobile.png`, fullPage: true, animations: 'disabled' });
  assert.deepEqual(errors, []);
  console.log('Driver view verified: stable taste sky, current song preserved, mood reranking/restoration, speech event adapter, automatic demo cancellation, personal import, real local WAV playback and responsive layout. Real microphone and Pleos are not tested.');
} finally { await browser.close(); }
