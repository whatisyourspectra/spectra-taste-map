import test from 'node:test';
import assert from 'node:assert/strict';
import { limitImportTracks, MAX_IMPORT_TRACKS } from '../src/utils/sampleTracks.js';

for (const count of [0, 1000, 1001, 4999, 5000]) {
    test(`imports all ${count} tracks in source order without reducing similar songs`, () => {
        const list = Object.freeze(Array.from({ length: count }, (_, i) => ({
            id: `track-${i}`, artist: 'Same Artist', album: 'Same Album',
        })));
        const result = limitImportTracks(list);
        assert.equal(MAX_IMPORT_TRACKS, 5000);
        assert.equal(result.items, list);
        assert.equal(result.capped, false);
        assert.equal(result.originalTotal, count);
    });
}

for (const count of [5001, 8000]) {
    test(`caps ${count} tracks at the first 5000 without reordering or changing the input`, () => {
        const list = Object.freeze(Array.from({ length: count }, (_, i) => ({ id: `track-${i}` })));
        const result = limitImportTracks(list);
        assert.equal(result.items.length, 5000);
        assert.deepEqual(result.items, list.slice(0, 5000));
        assert.equal(result.originalTotal, count);
        assert.equal(result.capped, true);
        assert.equal(list.length, count);
    });
}

test('invalid lists are handled safely', () => {
    for (const list of [null, undefined, {}, 'tracks']) {
        assert.deepEqual(limitImportTracks(list), { items: [], capped: false, originalTotal: 0 });
    }
});
