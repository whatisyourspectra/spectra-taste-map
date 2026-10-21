import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchDesktopRecommendations, DISCOVERY_BATCH_SIZE } from '../src/taste/desktopDiscovery.js';
import { clusterGenreName, getClusterEvidence } from '../src/taste/clusterEvidence.js';

const song = i => ({ id: `song-${i}`, name: `Song ${i}`, artists: 'Artist', genres: ['rock'] });
const request = { anchors: [{ id: 'a', x: .5, y: .4 }, { id: 'b', x: .2, y: .3 }], xAxis: 'valence', yAxis: 'energy', source: 'spotify', genres: ['rock'], exclude: [song(0)] };

test('one request returns a bounded ordered batch and excludes library aliases across anchors', async () => {
    const urls = [];
    const batch = await fetchDesktopRecommendations(request, { fetcher: async url => {
        urls.push(url);
        return { ok: true, json: async () => ({ tracks: [song(0), { ...song(0), id: 'other-provider' }, ...Array.from({ length: 15 }, (_, i) => song(i + 1))] }) };
    } });
    assert.equal(batch.length, DISCOVERY_BATCH_SIZE);
    assert.deepEqual(batch.map(item => item.track.id), Array.from({ length: 8 }, (_, i) => `song-${i + 1}`));
    assert.equal(urls.length, 2);
    assert.equal(new URL(urls[0], 'https://example.test').searchParams.get('source'), 'spotify');
});

test('more requests exclude previous results; all-known candidates return an honest empty batch', async () => {
    const fetcher = async () => ({ ok: true, json: async () => ({ tracks: Array.from({ length: 16 }, (_, i) => song(i)) }) });
    const first = await fetchDesktopRecommendations(request, { fetcher });
    const next = await fetchDesktopRecommendations({ ...request, exclude: [...request.exclude, ...first.map(item => item.track)] }, { fetcher });
    assert.deepEqual(next.map(item => item.track.id), Array.from({ length: 7 }, (_, i) => `song-${i + 9}`));
    assert.deepEqual(await fetchDesktopRecommendations({ ...request, exclude: Array.from({ length: 16 }, (_, i) => song(i)) }, { fetcher }), []);
});

test('request uses captured seed and passes cancellation; failures remain errors', async () => {
    const signal = new AbortController().signal;
    await fetchDesktopRecommendations({ ...request, seed: { ...song(2), artists: 'A & B' } }, { signal, fetcher: async (url, options) => {
        assert.equal(options.signal, signal);
        assert.equal(new URL(url, 'https://example.test').searchParams.get('seedTracks'), 'A & B|Song 2');
        return { ok: true, json: async () => ({ tracks: [] }) };
    } });
    await assert.rejects(fetchDesktopRecommendations(request, { fetcher: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
});

test('region names use real tags; evidence counts each song once and keeps representative order', () => {
    const members = [{ ...song(1), genres: ['metal', 'Metal', 'rock'] }, { ...song(2), genres: ['metal'] }, { ...song(2), genres: ['metal'] }];
    const before = JSON.stringify(members);
    const evidence = getClusterEvidence({ members, label: { nickname: 'Granite Rock' } }, 'spotify');
    assert.equal(clusterGenreName(['alternative rock', 'metal']), 'Alternative Rock · Metal');
    assert.equal(evidence.count, 2);
    assert.deepEqual(evidence.genres, [{ genre: 'metal', label: 'Metal', count: 2 }, { genre: 'rock', label: 'Rock', count: 1 }]);
    assert.deepEqual(evidence.examples.map(track => track.id), ['song-1', 'song-2']);
    assert.equal(evidence.nickname, 'Granite Rock');
    assert.equal(JSON.stringify(members), before);
});
