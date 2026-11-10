import test from 'node:test';
import assert from 'node:assert/strict';
import { createYouTubeResolver } from '../src/server/youtube.js';
import { YOUTUBE_MATCH_TTL_MS, youtubeMatchKey, isFreshYouTubeMatch, youtubeCacheControl, youtubeMatchExpiry } from '../src/audio/youtubeCachePolicy.js';

const start = Date.parse('2026-11-10T00:00:00Z');
const video = { videoId: 'test-video1', title: 'Artist Song Official Audio', channelTitle: 'Artist', thumbnailUrl: null };
const cached = { video, fetchedAt: start, expiresAt: start + YOUTUBE_MATCH_TTL_MS };
const response = (items = [{ id: { videoId: video.videoId }, snippet: video }]) => ({ ok: true, json: async () => ({ items }) });

test('prepared matches survive a new resolver and do not require a search key', async () => {
  const initialMatches = { [youtubeMatchKey('Artist', 'Song')]: cached };
  let calls = 0;
  for (let i = 0; i < 2; i++) {
    const resolver = createYouTubeResolver({ initialMatches, now: () => start + 1000, fetchImpl: () => { calls++; throw new Error('No network expected'); } });
    assert.equal((await resolver.resolve('Artist', 'Song')).video.videoId, video.videoId);
  }
  assert.equal(calls, 0);
});

test('simultaneous and repeated requests share one upstream search', async () => {
  let calls = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const resolver = createYouTubeResolver({ apiKey: 'test-key', now: () => start,
    fetchImpl: async url => { calls++; assert.equal(new URL(url).searchParams.get('regionCode'), 'KR'); await gate; return response(); } });
  const first = resolver.resolve('ARTIST', 'Song');
  const second = resolver.resolve('artist', 'Song');
  release();
  assert.deepEqual(await first, await second);
  await resolver.resolve('Artist', 'Song');
  assert.equal(calls, 1);
});

test('expired and foreign-region prepared matches do not serve stale/wrong-region data', async () => {
  for (const [region, now] of [['KR', start + YOUTUBE_MATCH_TTL_MS], ['US', start + 1000]]) {
    let calls = 0;
    const resolver = createYouTubeResolver({ apiKey: 'test-key', region, now: () => now,
      initialMatches: { [youtubeMatchKey('Artist', 'Song', 'KR')]: cached },
      fetchImpl: async () => { calls++; return response(); } });
    const next = await resolver.resolve('Artist', 'Song');
    assert.equal(calls, 1);
    assert.equal(next.fetchedAt, now);
  }
});

test('browser and CDN expiration cannot extend metadata beyond its original 30 days', () => {
  const overlong = { ...cached, expiresAt: start + YOUTUBE_MATCH_TTL_MS * 2 };
  assert.equal(youtubeMatchExpiry(overlong), start + YOUTUBE_MATCH_TTL_MS);
  assert.equal(isFreshYouTubeMatch(overlong, start + YOUTUBE_MATCH_TTL_MS + 1), false);
  assert.equal(youtubeCacheControl(cached, cached.expiresAt - 4500), 'public, max-age=0, s-maxage=4');
  assert.equal(youtubeCacheControl(cached, start + 1000), 'public, max-age=0, s-maxage=86400');
  assert.equal(youtubeCacheControl(cached, cached.expiresAt), 'no-store');
  assert.equal(isFreshYouTubeMatch({ ...cached, fetchedAt: start + 100 }, start), false);
});

test('empty results are cached briefly, then allowed to recover', async () => {
  let calls = 0, now = start;
  const resolver = createYouTubeResolver({ apiKey: 'test-key', now: () => now,
    fetchImpl: async () => { calls++; return response([]); } });
  const match = await resolver.resolve('Artist', 'Missing');
  assert.equal(match.video, null);
  await resolver.resolve('Artist', 'Missing');
  assert.equal(calls, 1);
  now += 5 * 60 * 1000;
  await resolver.resolve('Artist', 'Missing');
  assert.equal(calls, 2);
});

test('quota errors stop repeated searches temporarily while prepared matches still play', async () => {
  let calls = 0, now = start + 1;
  const resolver = createYouTubeResolver({ apiKey: 'test-key', now: () => now,
    initialMatches: { [youtubeMatchKey('Artist', 'Ready')]: cached }, fetchImpl: async () => {
      calls++; return { ok: false, status: 403, json: async () => ({ error: { message: 'Quota exceeded' } }) };
    } });
  await assert.rejects(resolver.resolve('Artist', 'New'), { code: 'YOUTUBE_QUOTA_OR_KEY' });
  await assert.rejects(resolver.resolve('Artist', 'Another'), { code: 'YOUTUBE_QUOTA_OR_KEY' });
  assert.equal((await resolver.resolve('Artist', 'Ready')).video.videoId, video.videoId);
  assert.equal(calls, 1);
  now += 60000;
  await assert.rejects(resolver.resolve('Artist', 'New'), { code: 'YOUTUBE_QUOTA_OR_KEY' });
  assert.equal(calls, 2);
});

test('failed concurrent requests are cleared so a retry can succeed', async () => {
  let calls = 0;
  const resolver = createYouTubeResolver({ apiKey: 'test-key', now: () => start, fetchImpl: async () => {
    calls++; if (calls === 1) throw new Error('Temporary failure'); return response();
  } });
  await assert.rejects(resolver.resolve('Artist', 'Song'), /Temporary failure/);
  assert.equal((await resolver.resolve('Artist', 'Song')).video.videoId, video.videoId);
  assert.equal(calls, 2);
});

test('bad inputs and unconfigured uncached requests never spend search quota', async () => {
  const resolver = createYouTubeResolver({ fetchImpl: () => { throw new Error('No network expected'); } });
  await assert.rejects(resolver.resolve('', 'Song'), { code: 'INVALID_TRACK' });
  await assert.rejects(resolver.resolve('Artist', 'Song'), { code: 'YOUTUBE_NOT_CONFIGURED' });
});

test('artist uploads outrank fan uploads and unrequested alternate versions are excluded', async () => {
  const choices = [
    { id: { videoId: 'fan-video01' }, snippet: { title: 'Artist Song Official Audio', channelTitle: 'Fan reuploads' } },
    { id: { videoId: '8daudio0001' }, snippet: { title: 'Artist Song 8D audio', channelTitle: 'Artist' } },
    { id: { videoId: 'jpversion01' }, snippet: { title: 'Artist Song (Japanese Ver.)', channelTitle: 'Artist' } },
    { id: { videoId: 'livevideo01' }, snippet: { title: 'Artist Song Live', channelTitle: 'Artist' } },
    { id: { videoId: 'artist00001' }, snippet: { title: 'Song', channelTitle: 'Artist - Topic' } },
  ];
  const resolver = createYouTubeResolver({ apiKey: 'test-key', now: () => start, fetchImpl: async () => response(choices) });
  const match = await resolver.resolve('Artist', 'Song');
  assert.equal(match.video.videoId, 'artist00001');
  assert.deepEqual(match.candidates.map(video => video.videoId), ['artist00001', 'fan-video01']);
});
