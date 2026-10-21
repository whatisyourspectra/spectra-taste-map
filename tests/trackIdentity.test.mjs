import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateTracks } from '../src/utils/trackIdentity.js';
import { uniqueTracks } from '../src/taste/buildTasteState.js';
import { pendingImportTrack, mergeImportedTracks } from '../src/utils/importTracks.js';
import { rankTrackCandidates } from '../src/server/spotify.js';

test('separate enrichment batches resolving to one catalog song publish one node', () => {
    const inputs = [{ artist: 'Artist', title: 'Song' }, { artist: 'Artist', title: 'Song (Remastered)' }];
    const pending = inputs.map(pendingImportTrack);
    const collected = new Map(pending.map(track => [track.importKey, track]));
    const resolved = { id: 'catalog-song', name: 'Song', artists: 'Artist', coverUrl: 'album.jpg' };
    mergeImportedTracks(collected, [{ ...resolved, importKey: pending[0].importKey }]);
    assert.equal(uniqueTracks([...collected.values()]).length, 2);
    mergeImportedTracks(collected, [{ ...resolved, importKey: pending[1].importKey }]);
    const published = uniqueTracks([...collected.values()]);
    assert.equal(published.length, 1);
    assert.equal(published[0].id, 'catalog-song');
    assert.equal(collected.size, 2, 'source slots remain available for retry/resume');
});

test('identity collapses provider duplicates but preserves songs sharing album art and named versions', () => {
    const library = [
        { id: 'spotify', name: 'Song', artists: 'Artist', coverUrl: 'album.jpg' },
        { id: 'lastfm', name: ' Ｓｏｎｇ ', artists: ' ARTIST ', coverUrl: 'other.jpg' },
        { id: 'second', name: 'Song Two', artists: 'Artist', coverUrl: 'album.jpg' },
        { id: 'live', name: 'Song (Live)', artists: 'Artist', coverUrl: 'album.jpg' },
        { id: 'cover', name: 'Song', artists: 'Other Artist', coverUrl: 'album.jpg' },
    ];
    const before = JSON.stringify(library);
    assert.deepEqual(deduplicateTracks(library).map(track => track.id), ['spotify', 'second', 'live', 'cover']);
    assert.equal(JSON.stringify(library), before);
});

test('missing metadata does not collapse distinct IDs, and latest metadata for an ID wins', () => {
    const latest = { id: 'a', name: 'Corrected' };
    assert.deepEqual(deduplicateTracks([{ id: 'a' }, { id: 'b' }, latest]), [latest, { id: 'b' }]);
});

test('Spotify matching requires both artist and title, even when an album also matches', () => {
    assert.deepEqual(rankTrackCandidates([
        { id: 'wrong-artist', name: 'Stay', artist: 'Unrelated Singer', album: 'Album' },
        { id: 'wrong-song', name: 'Another Song', artist: 'Original Artist', album: 'Album' },
    ], 'Original Artist', 'Stay', 'Album'), []);
    const ranked = rankTrackCandidates([
        { id: 'wrong', name: 'Stay', artist: 'Unrelated Singer' },
        { id: 'correct', name: 'Stay', artist: 'Original Artist, Guest Singer' },
    ], 'Original Artist', 'Stay');
    assert.deepEqual(ranked.map(candidate => candidate.track.id), ['correct']);
    assert.deepEqual(rankTrackCandidates([{ name: 'Stay', artist: 'Kaiit' }], 'KAI', 'Stay'), []);
    assert.deepEqual(rankTrackCandidates([{ name: 'Lovely', artist: 'Artist' }], 'Artist', 'Love'), []);
});
