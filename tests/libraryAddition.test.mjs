import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { findLibraryTrack, prepareLibraryAddition } from '../src/taste/libraryAddition.js';
import { persistLocalTaste, loadLocalTaste } from '../src/taste/tasteStorage.js';

const library = Array.from({ length: 151 }, (_, i) => ({ id: `t${i}`, name: `Song ${i}`, artists: 'Artist', genres: ['electronic'], valence: (i % 7) / 7, energy: (i % 5) / 5 }));
const candidate = { id: 'new', name: 'New Song', artists: 'New Artist', genres: ['house'], valence: .8, energy: .7 };
const workerSource = readFileSync(new URL('../src/workers/bubbleLayoutWorker.js', import.meta.url), 'utf8');
function layout(tracks, affinityEntries = [], options = {}) {
    let result;
    const self = { postMessage: data => { result = data.nodes; } };
    vm.runInNewContext(workerSource, { self });
    self.onmessage({ data: { tracks, affinityEntries, fieldW: 1200, fieldH: 900, worldScale: 2.8, xAxis: 'valence', yAxis: 'energy', assignmentEntries: tracks.map(t => [t.id, 0]), playWeightEntries: [], ...options } });
    return structuredClone(result);
}

test('discoveries retain their own genre evidence and persist placement with the library', () => {
    const added = prepareLibraryAddition(library, candidate, 't4');
    assert.equal(added.tasteMapPlacement.anchorId, 't4');
    assert.deepEqual(added.genres, ['house']);
    assert.ok(added.addedAt);
    assert.equal(findLibraryTrack([...library, added], { ...candidate, id: 'provider-alias', name: ' NEW  SONG ' }), added);
    assert.equal(prepareLibraryAddition(library, { ...library[0], id: 'alias' }), library[0]);
    const storage = new Map();
    const adapter = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
    persistLocalTaste(adapter, null, { tracks: [...library, added], mapId: 'mine', featuresSource: 'lastfm', stats: {} });
    const restored = loadLocalTaste(adapter, null);
    assert.equal(restored.tracks.length, 152);
    assert.equal(restored.tracks.at(-1).tasteMapPlacement.anchorId, 't4');
});

test('unknown provenance uses musical evidence and never selects an arbitrary first song', () => {
    assert.equal(prepareLibraryAddition(library, { id: 'unknown', name: 'Unknown', artists: 'Someone' }).tasteMapPlacement, undefined);
    const added = prepareLibraryAddition(library, candidate);
    assert.ok(library.some(t => t.id === added.tasteMapPlacement.anchorId));
});

test('Spotify discoveries retain source fields when switching or reopening maps', () => {
    const added = prepareLibraryAddition(library, { ...candidate, featuresSource: 'spotify-genres' }, 't4');
    assert.deepEqual(added.spotifyGenres, candidate.genres);
    assert.equal(added.spotifyFeatures.energy, candidate.energy);
    const lastfm = prepareLibraryAddition(library, { ...candidate, featuresSource: 'lastfm' }, 't4');
    assert.equal(lastfm.spotifyGenres, undefined, 'Last.fm evidence must not be relabeled as Spotify evidence');
});

test('adding a discovery leaves existing layout unchanged and finds space near its seed', () => {
    const original = layout(library);
    const added = layout([...library, candidate], [['new', 't4']]);
    for (let i = 0; i < original.length; i++) assert.deepEqual(added[i], original[i]);
    const displayX = n => n.nX + (n.nRawX - n.nX) * .18;
    const displayY = n => n.nY + (n.nRawY - n.nY) * .18;
    const node = added.at(-1), anchor = added.find(t => t.id === 't4');
    assert.ok(Math.hypot((displayX(node) - displayX(anchor)) * 3360, (displayY(node) - displayY(anchor)) * 2520) < 400);
    assert.ok(added.slice(0, -1).every(other => Math.hypot((displayX(node) - displayX(other)) * 3360, (displayY(node) - displayY(other)) * 2520) >= (node.size + other.size) / 2 + 11.9));
    assert.deepEqual(layout([...library, candidate], [['new', 't4']]), added, 'Reload reconstructs the same placement');
});

test('chained additions and stale or cyclic anchors never drop songs', () => {
    const second = { ...candidate, id: 'second' };
    for (const entries of [[['new', 't4'], ['second', 'new']], [['new', 'deleted']], [['new', 'second'], ['second', 'new']]]) {
        const nodes = layout([...library, candidate, second], entries);
        assert.equal(new Set(nodes.map(n => n.id)).size, library.length + 2);
        assert.ok(nodes.every(n => Number.isFinite(n.nX) && Number.isFinite(n.nY)));
    }
    assert.equal(layout([candidate, second], [['new', 'second'], ['second', 'new']]).length, 2);
});

test('incremental map keeps positions even when genre assignments are recalculated', () => {
    const original = layout(library);
    const nodes = layout([...library, candidate], [['new', 't4']], {
        fixedBaseEntries: original.map(node => [node.id, node]),
        assignmentEntries: [...library, candidate].map((track, i) => [track.id, i % 3]),
    });
    original.forEach((node, i) => {
        for (const key of ['nX', 'nY', 'nRawX', 'nRawY']) assert.ok(Math.abs(nodes[i][key] - node[key]) < 1e-12);
    });
});
