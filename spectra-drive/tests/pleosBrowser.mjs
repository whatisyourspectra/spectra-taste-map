import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5190';
const output = 'docs/design/pleos-connect';
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1320 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { queueMicrotask(() => { this.onresult?.({ results: [[{ transcript: '조금 더 신나게' }]] }); this.onend?.(); }); }
      abort() { this.onend?.(); }
    };
  });
  const ids = () => page.locator('.cp-up-next li').evaluateAll(items => items.map(item => item.dataset.trackId));
  async function assertCovers() {
    await page.waitForFunction(() => [...document.querySelectorAll('.cp-infotainment .track-art img')].every(image => image.complete && image.naturalWidth > 0));
    const artworks = await page.locator('.cp-infotainment .track-art').evaluateAll(async elements => Promise.all(elements.map(async element => {
      const image = element.querySelector('img');
      if (!image) return { loaded: false };
      await image.decode();
      const box = image.getBoundingClientRect();
      return { loaded: image.naturalWidth > 0, square: !box.width || Math.abs(box.width - box.height) < 1,
        fit: getComputedStyle(image).objectFit === 'cover' };
    })));
    assert.ok(artworks.every(item => item.loaded && item.square && item.fit), 'Every artwork should load and fill a square without stretching');
  }
  async function assertFits() {
    const overflow = await page.locator('.pc-app-window .cp-infotainment').evaluate(element => {
      const outer = element.getBoundingClientRect();
      return [...element.querySelectorAll('strong, button, li, .cp-reason')].filter(item => {
        const box = item.getBoundingClientRect();
        return box.width && (box.left < outer.left - 1 || box.right > outer.right + 1 || box.bottom > outer.bottom + 1);
      }).map(item => item.className || item.tagName);
    });
    assert.deepEqual(overflow, [], 'SPECTRA must fit the available app window');
    const regions = await page.locator('.pc-display').evaluate(element => {
      const app = element.querySelector('.pc-app-window').getBoundingClientRect();
      const shell = element.getBoundingClientRect();
      return { top: (app.top - shell.top) / shell.height, bottom: (app.bottom - shell.top) / shell.height };
    });
    assert.ok(regions.top >= .066 && regions.bottom <= .89, 'The app must reserve official status bar and GNB regions');
  }
  await page.goto(`${base}/pleos`);
  await page.locator('.pc-display[data-layout=single]').waitFor();
  await page.locator('.pc-official-shell').evaluate(async image => { await image.decode(); if (image.naturalWidth !== 2560) throw new Error('Official shell did not load'); });
  await page.evaluate(() => document.fonts.ready);
  await page.getByText('SPECTRA 데모 · 18곡', { exact: true }).waitFor();
  const demo = await (await page.request.get(`${base}/spectra-demo.json`)).json();
  assert.equal(demo.tracks.length, 18);
  assert.ok(await page.evaluate(async urls => {
    const images = await Promise.all(urls.map(async src => { const image = new Image(); image.src = src; await image.decode(); return image.naturalWidth > 0; }));
    return images.every(Boolean);
  }, [...new Set(demo.tracks.map(track => track.coverUrl))]), 'All 17 bundled demo covers must decode');
  await assertCovers();
  assert.match(await page.locator('.cp-player .track-art img').getAttribute('src'), /currents\.jpg$/);
  assert.equal(await page.locator('.cp-now-playing .track-art img').getAttribute('src'), await page.locator('.cp-player .track-art img').getAttribute('src'));
  await assertFits();
  const current = await page.locator('.cp-player-title strong').textContent();
  const initial = await ids();
  await page.locator('.cp-stage').screenshot({ path: `${output}/01-connect-s-single.png`, animations: 'disabled' });
  await page.getByRole('button', { name: /01.*퇴근길이니까/ }).click();
  await page.waitForFunction(() => document.querySelector('.cp-up-next ol').dataset.revision === '1');
  assert.notDeepEqual(await ids(), initial);
  assert.equal(await page.locator('.cp-player-title strong').textContent(), current);
  const calm = await ids();
  await page.getByRole('button', { name: '내비 + SPECTRA', exact: true }).click();
  await page.locator('.pc-display[data-layout=split]').waitFor();
  await assertCovers();
  await assertFits();
  assert.deepEqual(await ids(), calm, 'Changing window orientation must preserve the queue');
  const columns = await page.locator('.pc-display').evaluate(element => {
    const app = element.querySelector('.pc-app-window').getBoundingClientRect();
    const nav = element.querySelector('.pc-nav-window').getBoundingClientRect();
    return { sameWidth: Math.abs(app.width - nav.width) < 1, ordered: app.left > nav.right };
  });
  assert.deepEqual(columns, { sameWidth: true, ordered: true });
  await page.locator('.cp-stage').screenshot({ path: `${output}/02-connect-s-split.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Pleos 템플릿 음성 입력', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.cp-up-next ol').dataset.revision === '2');
  assert.notDeepEqual(await ids(), calm);
  assert.equal(await page.locator('.cp-player-title strong').textContent(), current);
  const adjusted = await ids();
  await page.locator('.cp-stage').screenshot({ path: `${output}/03-split-mood-updated.png`, animations: 'disabled' });
  await page.getByRole('button', { name: '한강 운전석', exact: true }).click();
  await page.locator('.pc-display').waitFor({ state: 'detached' });
  assert.deepEqual(await ids(), adjusted);
  await page.getByRole('button', { name: 'Pleos Connect 템플릿', exact: true }).click();
  await page.getByRole('button', { name: 'Pleos 앱 라이브러리 시안 열기', exact: true }).click();
  await page.getByRole('complementary', { name: '앱 라이브러리 시안' }).waitFor();
  await page.getByRole('button', { name: 'SPECTRA Drive', exact: true }).click();
  await page.locator('.pc-display[data-layout=single]').waitFor();
  await assertCovers();
  assert.deepEqual(await ids(), adjusted);
  const nextTitle = await page.locator('.cp-up-next li').first().locator('strong').textContent();
  const nextCover = await page.locator('.cp-up-next li').first().locator('.track-art img').getAttribute('src');
  await page.getByRole('button', { name: '다음 곡', exact: true }).click();
  await page.waitForFunction(value => document.querySelector('.cp-player-title strong').textContent === value, nextTitle);
  assert.equal(await page.locator('.cp-player .track-art img').getAttribute('src'), nextCover);
  assert.equal(await page.locator('.cp-now-playing .track-art img').getAttribute('src'), nextCover);
  await assertCovers();
  assert.equal((await ids()).includes(adjusted[0]), false, 'The new current track must leave the upcoming queue');
  await page.getByRole('button', { name: '내비 + SPECTRA', exact: true }).click();
  await page.getByRole('button', { name: 'SPECTRA 단독 화면으로 확대', exact: true }).click();
  await page.locator('.pc-display[data-layout=single]').waitFor();
  for (const width of [1600, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
  }
  await page.setViewportSize({ width: 1600, height: 1320 });
  await page.locator('.cp-tools summary').click();
  await page.getByLabel('운전자 시안 취향 JSON', { exact: true }).setInputFiles({ name: 'personal.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ tracks: [
    { name: 'Personal Current', artists: 'Personal', album: 'My album', coverUrl: '/missing-personal-cover.jpg', genres: ['indie'], energy: .5, valence: .5 },
    { name: 'Personal Next', artists: 'Personal', imageUrl: '/demo-covers/bewitched.jpg', genres: ['ambient'], energy: .15, valence: .5 },
  ] })) });
  await page.getByText('내 취향 · 2곡', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.cp-player .track-art img').getAttribute('src').startsWith('data:image/svg+xml'));
  await assertCovers();
  const samples = 96000; const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / 8000) * 500), 44 + i * 2);
  await page.getByLabel('운전자 시안 로컬 음원').setInputFiles({ name: 'Personal Current.wav', mimeType: 'audio/wav', buffer: wav });
  await page.getByRole('button', { name: '음악 재생', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('audio').paused && document.querySelector('audio').currentTime > 0);
  const beforeTime = await page.locator('audio').evaluate(audio => audio.currentTime);
  await page.getByRole('button', { name: '내비 + SPECTRA', exact: true }).click();
  await page.getByRole('button', { name: '한강 운전석', exact: true }).click();
  await page.getByRole('button', { name: 'Pleos Connect 템플릿', exact: true }).click();
  assert.equal(await page.locator('.cp-player-title strong').textContent(), 'Personal Current');
  assert.ok(await page.locator('audio').evaluate((audio, time) => !audio.paused && audio.currentTime >= time, beforeTime), 'Audio must continue across cockpit/template and window transitions');
  await page.getByRole('button', { name: '음악 일시정지', exact: true }).click();
  assert.deepEqual(errors, []);
  console.log('Pleos shell verified: original SPECTRA album covers load and stay synchronized across current/next songs and layouts; broken personal images use procedural fallback; system regions, 1:1 layout, speech adapter and real audio continuity work. No Pleos SDK/native OS tested.');
} finally { await browser.close(); }
