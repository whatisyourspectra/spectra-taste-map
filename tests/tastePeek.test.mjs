import test from 'node:test';
import assert from 'node:assert/strict';
import { publicTastePeek } from '../src/social/tastePeek.js';
import { readSocialSnapshot } from '../src/social/socialSnapshot.js';

const songs = [
    { id: 'public-0', name: 'First song', artists: 'One', genres: ['house', 'electronic'] },
    { id: 'public-1', name: 'Second song', artists: 'Two', genres: ['rnb', 'soul'] },
    { id: 'public-2', name: 'Third song', artists: 'Three', genres: ['soul'] },
];

test('a genre peek only labels matching publicly shared songs as genre matches', () => {
    const snapshot = { tracks: songs, trackCount: 1932 };
    assert.deepEqual(publicTastePeek(snapshot, 'R&B').tracks.map(track => track.id), ['public-1']);
    assert.deepEqual(publicTastePeek(snapshot, 'SOUL').tracks.map(track => track.id), ['public-1', 'public-2']);
    assert.equal(publicTastePeek(snapshot, 'house').genreMatched, true);
    const before = JSON.stringify(snapshot);
    publicTastePeek(snapshot, 'electronic');
    assert.equal(JSON.stringify(snapshot), before);
});

test('missing genre links use an explicitly unmatched public sample, including old publications', () => {
    const noMatch = publicTastePeek({ tracks: songs }, 'jazz');
    assert.equal(noMatch.genreMatched, false);
    assert.equal(noMatch.hasPublicTracks, true);
    assert.deepEqual(noMatch.tracks, songs);
    const legacy = publicTastePeek({ tracks: songs.map(({ genres: _genres, ...track }) => track) }, 'house');
    assert.equal(legacy.genreMatched, false);
    assert.equal(legacy.tracks.length, 3);
});

test('genre-only publications never invent songs from the private collection count', () => {
    assert.deepEqual(publicTastePeek({ trackCount: 1932, tracks: [], genreProfile: [{ genre: 'house', strength: 1 }] }, 'house'), {
        tracks: [], genreMatched: false, hasPublicTracks: false,
    });
    assert.equal(publicTastePeek(null, 'house').tracks.length, 0);
});

test('public snapshot readers retain only bounded, canonical published song tags', () => {
    const snapshot = readSocialSnapshot({ version: 1, tracks: [{ name: 'Public', artists: 'Artist', privateToken: 'secret',
        genres: ['RNB', 'r&b', { secret: 'house' }, null, ' soul ', 'jazz', 'house', 'pop', 'not-retained'] }] });
    assert.deepEqual(snapshot.tracks[0].genres, ['r&b', 'soul', 'jazz', 'house', 'pop']);
    assert.doesNotMatch(JSON.stringify(snapshot), /secret|privateToken|not-retained/);
    assert.deepEqual(readSocialSnapshot({ version: 1, tracks: [{ name: 'Legacy', artists: 'Artist' }] }).tracks[0].genres, []);
});
