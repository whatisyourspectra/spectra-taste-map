import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Exercise the speech event adapter without requiring real microphone input.
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { queueMicrotask(() => { this.onresult?.({ results: [[{ transcript: '조금만 신나게' }]] }); this.onend?.(); }); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
  });
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5190');
  await page.getByRole('heading', { name: '나의 취향으로, 지금의 무드로.' }).waitFor();
  assert.equal(await page.locator('.track').count(), 6);
  assert.equal(await page.locator('.brand img').evaluate(image => image.complete && image.naturalWidth > 0), true);
  assert.equal(await page.locator('.field-star').count(), 12);
  assert.equal(await page.locator('.field-star.is-selected').count(), 6);
  const positions = await page.locator('.field-star').evaluateAll(stars => Object.fromEntries(stars.map(star => {
    const point = star.querySelector('circle:last-of-type');
    return [star.dataset.trackId, [point.getAttribute('cx'), point.getAttribute('cy')]];
  })));
  await page.getByRole('button', { name: /퇴근했어/ }).click();
  await page.getByRole('button', { name: /조금 더 밝게/ }).click();
  const savedBrightness = await page.getByLabel('밝기', { exact: true }).getAttribute('value');
  await page.getByRole('button', { name: /이거 퇴근 모드로 기억해/ }).click();
  await page.getByRole('button', { name: '활기 있게', exact: true }).click();
  assert.deepEqual(await page.locator('.field-star').evaluateAll(stars => Object.fromEntries(stars.map(star => {
    const point = star.querySelector('circle:last-of-type');
    return [star.dataset.trackId, [point.getAttribute('cx'), point.getAttribute('cy')]];
  }))), positions, 'A mood change must preserve track positions');
  await page.reload();
  await page.getByRole('button', { name: /퇴근 모드.*불러오기/ }).click();
  assert.equal(await page.getByLabel('밝기', { exact: true }).getAttribute('value'), savedBrightness);
  const previousEnergy = Number(await page.getByLabel('활기', { exact: true }).getAttribute('value'));
  await page.getByRole('button', { name: '음성으로 무드 바꾸기' }).click();
  await page.waitForFunction(value => Number(document.querySelector('meter[aria-label="활기"]').value) > value, previousEnergy);
  assert.equal(await page.getByRole('button', { name: '음성으로 무드 바꾸기' }).getAttribute('aria-pressed'), 'false');
  await page.getByLabel('무드 요청', { exact: true }).fill('알 수 없는 요청');
  await page.getByRole('button', { name: '무드 요청 보내기' }).click();
  assert.match(await page.locator('.reply').textContent(), /이해하지 못했어요/);

  // The saved scene includes lighting, and a route only suggests applying it.
  const appliedBefore = await page.locator('.cabin-readout').textContent();
  await page.getByLabel('시뮬레이션 목적지', { exact: true }).selectOption('home');
  await page.getByRole('button', { name: '퇴근 모드 적용', exact: true }).waitFor();
  await page.locator('.journey-context').screenshot({ path: '/tmp/spectra-drive-commute.png', animations: 'disabled' });
  assert.equal(await page.locator('.cabin-readout').textContent(), appliedBefore);
  await page.getByRole('button', { name: '퇴근 모드 적용', exact: true }).click();
  await page.locator('.commute-proposal').waitFor({ state: 'detached' });
  const lightBeforeMusicChange = await page.locator('.cabin-card').getAttribute('style');
  await page.locator('.suggestions').getByRole('button', { name: /음악만/ }).click();
  await page.waitForFunction(() => document.querySelector('.reply').textContent.includes('조명은 그대로'));
  assert.equal(await page.locator('.cabin-card').getAttribute('style'), lightBeforeMusicChange);

  await page.locator('.simulation-settings > summary').click();
  await page.getByLabel('시뮬레이션 조명 접근', { exact: true }).selectOption('read');
  await page.getByRole('button', { name: '활기 있게', exact: true }).click();
  await page.getByText(/조명은 읽기 전용이라 요청한 설정을 적용하지 못했어요/).waitFor();
  assert.equal(await page.locator('.cabin-card').getAttribute('style'), lightBeforeMusicChange);
  await page.getByLabel('시뮬레이션 조명 접근', { exact: true }).selectOption('read_write');
  await page.getByLabel('시뮬레이션 목적지', { exact: true }).selectOption('none');
  const workExit = page.getByRole('button', { name: '회사 영역 이탈 시뮬레이션', exact: true });
  assert.equal(await workExit.isDisabled(), true);
  await page.getByLabel('위치 SDK 지원 환경 가정', { exact: true }).check();
  await workExit.click();
  await page.getByText('저장한 회사 영역을 벗어났어요.').waitFor();
  await page.getByRole('button', { name: '지금은 유지', exact: true }).click();
  await page.getByLabel('시뮬레이션 차량 상태', { exact: true }).selectOption('driving');
  assert.equal(await page.getByLabel('내 취향 JSON 가져오기', { exact: true }).isDisabled(), true);
  assert.equal(await page.getByLabel('로컬 음원 연결', { exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: '음성으로 무드 바꾸기' }).isEnabled(), true);
  await page.getByLabel('시뮬레이션 차량 상태', { exact: true }).selectOption('parked');

  const upload = page.getByLabel('내 취향 JSON 가져오기', { exact: true });
  await upload.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.getByText('JSON 파일 형식을 확인해주세요.').waitFor();
  await upload.setInputFiles({ name: 'taste.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ tracks: [{ name: '내 개인 곡', artists: '나의 아티스트', genres: ['ambient'] }] })) });
  await page.getByRole('heading', { name: '내 개인 곡' }).waitFor();
  assert.equal(await page.locator('.track').count(), 1);
  assert.equal(await page.locator('.field-star').count(), 1);
  assert.match(await page.locator('.library-caption').textContent(), /내 취향 · 1곡/);
  assert.equal(await page.evaluate(() => localStorage.getItem('spectra-drive:mood:v1').includes('내 개인 곡')), false);
  // A real short WAV exercises HTMLAudioElement playback, not a fake progress timer.
  const samples = 16000;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) wav.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 220 / 8000) * 500), 44 + index * 2);
  await page.getByLabel('로컬 음원 연결', { exact: true }).setInputFiles({ name: '내 개인 곡.wav', mimeType: 'audio/wav', buffer: wav });
  await page.getByRole('button', { name: '내 개인 곡 재생', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.querySelector('audio').paused), true);
  await page.getByLabel('시뮬레이션 목적지', { exact: true }).selectOption('home');
  await page.getByRole('button', { name: '퇴근 모드 적용', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.querySelector('audio').paused), true, 'A route proposal must not autoplay');
  await page.getByRole('button', { name: '퇴근 모드 적용', exact: true }).click();
  await page.waitForFunction(() => { const audio = document.querySelector('audio'); return !audio.paused && audio.currentTime > 0; });
  assert.match(await page.locator('.audio-dock strong').textContent(), /재생 중/);
  assert.equal(await page.evaluate(() => localStorage.getItem('spectra-drive:mood:v1').includes('blob:')), false);
  await page.locator('audio').evaluate(audio => audio.pause());
  await page.reload();
  assert.equal(await page.locator('.track').count(), 6);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '/tmp/spectra-drive-desktop.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const voiceButton = await page.getByRole('button', { name: '음성으로 무드 바꾸기' }).boundingBox();
  assert.ok(voiceButton.y >= 0 && voiceButton.y + voiceButton.height <= 844, 'Voice action should be visible on the initial mobile screen');
  await page.screenshot({ path: '/tmp/spectra-drive-mobile.png', animations: 'disabled' });
  await page.locator('.taste-field').screenshot({ path: '/tmp/spectra-drive-constellation.png', animations: 'disabled' });
  await page.locator('.cabin-card').screenshot({ path: '/tmp/spectra-drive-cabin.png', animations: 'disabled' });
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: scoped music/lighting, commute proposal and consent, capability fallback, location support gating, driving UI, real local WAV playback, speech adapter, persistence, import, responsive layout. Real microphone/Gleo/Pleos not tested.');
} finally { await browser.close(); }
