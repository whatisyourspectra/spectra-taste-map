import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTracksEvenly, MAX_IMPORT_TRACKS } from '../src/utils/sampleTracks.js';

test('sampleTracksEvenly leaves lists within limit untouched', () => {
    const list = Array.from({ length: 500 }, (_, i) => ({ id: `track-${i}` }));
    const result = sampleTracksEvenly(list, 2000);
    assert.equal(result.capped, false);
    assert.equal(result.items.length, 500);
    assert.equal(result.originalTotal, 500);
    assert.deepEqual(result.items, list);
});

test('sampleTracksEvenly defaults to MAX_IMPORT_TRACKS (5000)', () => {
    const withinLimit = Array.from({ length: 4200 }, (_, i) => ({ id: `track-${i}` }));
    const resultWithin = sampleTracksEvenly(withinLimit);
    assert.equal(resultWithin.capped, false);
    assert.equal(resultWithin.items.length, 4200);

    const exceedLimit = Array.from({ length: 7500 }, (_, i) => ({ id: `track-${i}` }));
    const resultExceed = sampleTracksEvenly(exceedLimit);
    assert.equal(resultExceed.capped, true);
    assert.equal(resultExceed.items.length, MAX_IMPORT_TRACKS);
    assert.equal(resultExceed.originalTotal, 7500);
});

test('sampleTracksEvenly handles empty or invalid lists safely', () => {
    assert.deepEqual(sampleTracksEvenly([]), { items: [], capped: false, originalTotal: 0 });
    assert.deepEqual(sampleTracksEvenly(null), { items: [], capped: false, originalTotal: 0 });
    assert.deepEqual(sampleTracksEvenly(undefined), { items: [], capped: false, originalTotal: 0 });
});
