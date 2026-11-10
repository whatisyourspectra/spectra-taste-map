// Stub the provider; check the real player's cache behavior without spending quota.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const source = await (await fetch(`${base}/src/main.jsx`)).text();
const react = source.match(/from "([^"]*\/react\.js[^"]*)"/)?.[1];
const dom = source.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)?.[1];
assert.ok(react && dom, 'Use the same Vite React imports as the real application');
const harness = `import React from ${JSON.stringify(react)};
import ReactDOM from ${JSON.stringify(dom)};
import Player from '/src/pages/MetroYouTubePlayer.jsx';
const root=ReactDOM.createRoot(document.getElementById('root'));
window.renderTrack=id=>root.render(React.createElement(Player,{track:{id,name:'Song',artists:'Artist'},lang:'en',embedded:true}));
window.renderTrack('first');`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.YT = { PlayerState: { PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5, ENDED: 0 },
      Player: class {
        constructor(_, options) { this.events=options.events; setTimeout(()=>this.events.onReady(),0); }
        cueVideoById(id) { window.playbackVideo=id; }
        loadVideoById(id) { window.playbackVideo=id; }
        playVideo() {} pauseVideo() {} destroy() {} getCurrentTime() { return 0; } getDuration() { return 180; }
      } };
  });
  await page.route('**/src/main.jsx*', route => route.fulfill({ contentType: 'application/javascript', body: harness }));
  const fetchedAt = Date.now() - 29 * 24 * 60 * 60 * 1000;
  const expiresAt = fetchedAt + 30 * 24 * 60 * 60 * 1000;
  let calls = 0;
  await page.route('**/api/youtube/search?**', route => {
    calls++;
    return route.fulfill({ json: { video: { videoId: 'test-video1', title: 'Song', channelTitle: 'Artist' }, fetchedAt, expiresAt } });
  });
  await page.goto(base);
  try { await page.waitForFunction(() => window.playbackVideo === 'test-video1'); }
  catch (error) { assert.deepEqual(errors, []); throw error; }
  const read = () => page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('spectra.youtube-video.v1.'));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });
  assert.equal((await read()).expiresAt, expiresAt);
  assert.equal(calls, 1);
  await page.evaluate(() => window.renderTrack('same-song-new-id'));
  await page.waitForTimeout(100);
  assert.equal(calls, 1);
  await page.reload();
  await page.waitForFunction(() => window.playbackVideo === 'test-video1');
  assert.equal(calls, 1, 'Reloading a cached song does not search again');
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('spectra.youtube-video.v1.'));
    const match = JSON.parse(localStorage.getItem(key));
    match.expiresAt=Date.now()-1; localStorage.setItem(key,JSON.stringify(match));
  });
  await page.reload();
  await page.waitForFunction(() => window.playbackVideo === 'test-video1');
  assert.equal(calls, 2, 'Expired browser matches are resolved again');
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('spectra.youtube-video.v1.'));
    const match = JSON.parse(localStorage.getItem(key));
    match.expiresAt='invalid'; localStorage.setItem(key,JSON.stringify(match));
  });
  await page.reload();
  await page.waitForFunction(() => window.playbackVideo === 'test-video1');
  assert.equal(calls, 3, 'Malformed expiration must not keep a match forever');
  assert.deepEqual(errors, []);
  console.log('Player preserves source expiry, reuses matches across track IDs/reloads, and refreshes expired matches.');
} finally { await browser.close(); }
