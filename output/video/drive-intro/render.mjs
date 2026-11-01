import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/private/tmp/spectra-auth-check/node_modules/playwright/index.mjs');
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const sources = path.join(dir, 'sources'); mkdirSync(sources, { recursive: true });
const preview = process.argv.includes('--preview');
const ffmpeg = execFileSync(path.join(root, 'output/video/render-env/bin/python'), ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim();
const base = process.env.BASE_URL || 'http://127.0.0.1:5190';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1400 }, deviceScaleFactor: 2, locale: 'ko-KR', reducedMotion: 'reduce' });
const errors = []; page.on('pageerror', error => errors.push(error.message));
const queue = () => page.locator('.cp-up-next li').evaluateAll(items => items.map(item => item.dataset.trackId));
const stars = () => page.locator('.field-star').evaluateAll(items => items.map(item => {
  const circle = item.querySelector('circle:last-of-type'); return [item.dataset.trackId, circle.getAttribute('cx'), circle.getAttribute('cy')];
}).sort((a, b) => a[0].localeCompare(b[0])));
async function loaded() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
}
async function shot(name, selector) {
  await loaded(); await page.locator(selector).screenshot({ path: path.join(sources, `${name}.png`), animations: 'disabled' });
  console.log(`Captured ${name}`);
}
let audit;
try {
  await page.goto(`${base}/drive`, { waitUntil: 'networkidle' });
  await page.locator('.cp-infotainment .field-star').first().waitFor();
  await page.addStyleTag({ content: '.cp-stage-actions,.cp-stage-tag,.cp-scene-caption{visibility:hidden!important}' });
  await shot('car', '.cp-stage');
  // Dispatch the page's own handler even while the filming-only controls are hidden.
  if (!await page.locator('.cp-stage').evaluate(el => el.classList.contains('is-focused'))) {
    await page.locator('.cp-view-switch').first().dispatchEvent('click');
  }
  await shot('baseline', '.cp-infotainment');
  const initialQueue = await queue(); const initialStars = await stars();
  const current = await page.locator('.cp-player-title strong').textContent();
  await page.getByRole('button', { name: /01.*퇴근길이니까/ }).click();
  await page.locator('.cp-voice-strip.is-listening').waitFor();
  await shot('listeningCalm', '.cp-infotainment');
  await page.waitForFunction(() => document.querySelector('.cp-up-next ol').dataset.revision === '1');
  await shot('calm', '.cp-infotainment');
  const calmQueue = await queue();
  assert.notDeepEqual(calmQueue, initialQueue); assert.deepEqual(await stars(), initialStars);
  assert.equal(await page.locator('.cp-player-title strong').textContent(), current);
  await page.getByRole('button', { name: /02.*조금 더 신나게/ }).click();
  await page.locator('.cp-voice-strip.is-listening').waitFor();
  await shot('listeningUplift', '.cp-infotainment');
  await page.waitForFunction(() => document.querySelector('.cp-up-next ol').dataset.revision === '2');
  await shot('uplift', '.cp-infotainment');
  const upliftQueue = await queue(); assert.notDeepEqual(upliftQueue, calmQueue);
  assert.deepEqual(await stars(), initialStars); assert.equal(await page.locator('.cp-player-title strong').textContent(), current);
  await page.getByRole('button', { name: 'Pleos Connect 템플릿', exact: true }).click();
  await shot('pleos', '.pc-display');
  await page.getByRole('button', { name: '내비 + SPECTRA', exact: true }).click();
  await shot('split', '.pc-display');
  audit = { captured_at: new Date().toISOString(), source: base + '/drive', current_track: current, current_track_preserved: true, constellation_coordinates_preserved: true, initial_queue: initialQueue, calm_queue: calmQueue, uplift_queue: upliftQueue, page_errors: errors, method: 'Actual React example-request controls; voice input and vehicle events are simulated. UI screenshots are composited with presentation motion.' };
  assert.deepEqual(errors, []); writeFileSync(path.join(sources, 'capture-audit.json'), JSON.stringify(audit, null, 2));
} finally { await page.close(); }

const mime = file => file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.ttf') ? 'font/ttf' : 'image/png';
const data = file => `data:${mime(file)};base64,${readFileSync(file).toString('base64')}`;
const assets = Object.fromEntries(['car', 'baseline', 'listeningCalm', 'calm', 'listeningUplift', 'uplift', 'pleos', 'split'].map(name => [name, data(path.join(sources, `${name}.png`))]));
assets.logo = data(path.join(root, 'public/spectra-wordmark.svg'));
const font = data(path.join(root, 'output/video/intro15/assets/Syne-SemiBold.ttf'));
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><style>@font-face{font-family:Syne;src:url('${font}');font-weight:600}*{margin:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#060b13}canvas{display:block}</style><canvas width="1920" height="1080"></canvas><script>window.FILM_ASSETS=${JSON.stringify(assets)}</script><script>${readFileSync(path.join(dir, 'film.js'), 'utf8')}</script></html>`;
const film = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'ko-KR' });
film.on('pageerror', error => errors.push(error.message));
await film.setContent(html, { waitUntil: 'load' }); await film.evaluate(() => window.ready); await film.evaluate(() => document.fonts.load('600 32px Syne'));
mkdirSync(path.join(dir, 'previews'), { recursive: true });
for (const t of [2.5, 6.7, 9, 13, 17, 20, 24.5, 28.5]) {
  await film.evaluate(t => window.renderFrame(t), t);
  await film.screenshot({ path: path.join(dir, 'previews', `${t.toFixed(1)}.jpg`), type: 'jpeg', quality: 95 });
}
if (preview) { await browser.close(); console.log('Preview frames complete'); process.exit(0); }

// The two short spoken requests are synthetic demonstration input, not recorded microphone recognition.
for (const [name, line] of [['calm', '퇴근길이니까, 좀 편안하게.'], ['uplift', '조금 더 신나게.']]) {
  const aiff = path.join('/private/tmp', `spectra-drive-${name}.aiff`);
  execFileSync('/usr/bin/say', ['-v', 'Yuna', '-r', '175', '-o', aiff, line]);
  if (statSync(aiff).size < 5000) throw new Error('Speech synthesis produced no audio');
  execFileSync(ffmpeg, ['-hide_banner', '-y', '-i', aiff, '-ar', '48000', '-ac', '2', path.join(dir, `request-${name}.wav`)], { stdio: ['ignore', 'ignore', 'pipe'] });
}
const audio = path.join(dir, 'soundtrack.wav');
const audioFilter = '[0:a]volume=0.19,afade=t=in:d=1.3,afade=t=out:st=28.4:d=1.6[bed];[1:a]volume=1.0,adelay=5850|5850[c];[2:a]volume=1.0,adelay=16000|16000[u];[bed][c][u]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.89,atrim=duration=30[a]';
execFileSync(ffmpeg, ['-hide_banner', '-y', '-stream_loop', '-1', '-i', path.join(root, 'output/audio/spectra-dream-synth-preview.wav'), '-i', path.join(dir, 'request-calm.wav'), '-i', path.join(dir, 'request-uplift.wav'), '-filter_complex', audioFilter, '-map', '[a]', '-t', '30', '-ar', '48000', '-ac', '2', audio], { stdio: ['ignore', 'ignore', 'pipe'] });
const output = path.join(dir, 'spectra-drive-intro-30s-1080p.mp4');
const encoder = spawn(ffmpeg, ['-hide_banner', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', '30', '-i', 'pipe:0', '-i', audio, '-t', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-metadata', 'title=SPECTRA Drive — 내 취향 그대로. 다음 곡은, 한마디로.', output], { stdio: ['pipe', 'ignore', 'pipe'] });
let log = ''; encoder.stderr.on('data', data => { log += data.toString(); });
const done = once(encoder, 'close'); encoder.stdin.on('error', () => {});
const started = Date.now();
for (let frame = 0; frame < 900; frame++) {
  await film.evaluate(t => window.renderFrame(t), frame / 30);
  const jpeg = await film.screenshot({ type: 'jpeg', quality: 95 });
  if (!encoder.stdin.write(jpeg)) await once(encoder.stdin, 'drain');
  if (frame % 60 === 0) console.log(`Rendered ${frame}/900 frames (${Math.round((Date.now() - started) / 1000)}s elapsed)`);
}
encoder.stdin.end(); const [code] = await done; writeFileSync(path.join(dir, 'encode.log'), log);
await browser.close();
if (code !== 0) throw new Error(log.slice(-5000));
assert.deepEqual(errors, []);
writeFileSync(path.join(dir, 'production-notes.json'), JSON.stringify({ title: 'SPECTRA Drive — 내 취향 그대로. 다음 곡은, 한마디로.', duration_seconds: 30, width: 1920, height: 1080, fps: 30, frames: 900, codec: 'H.264 / AAC stereo / yuv420p', screen_source: audit, audio: 'Existing original SPECTRA dream-synth score, looped and mixed under two Yuna synthetic example requests.', limitations: 'Web prototype; no real vehicle, Gleo or native Pleos integration. Current demo audio tracks are not played. Driver background is an existing AI-generated concept image.', chapters: [[0, 5, 'Driver context and value'], [5, 10.5, 'Calm request and reranked queue'], [10.5, 15.5, 'Current song and taste preserved'], [15.5, 21.5, 'Uplift request'], [21.5, 26.5, 'Pleos single and split UI concepts'], [26.5, 30, 'Brand close']] }, null, 2));
console.log(`Completed ${output} (${(statSync(output).size / 1024 / 1024).toFixed(1)} MB)`);
