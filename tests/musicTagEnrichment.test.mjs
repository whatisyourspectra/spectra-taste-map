import test from 'node:test';
import assert from 'node:assert/strict';

test('enrichment separates tags, falls back from mood-only tracks and shares artist requests', async () => {
    // Node runs test files in isolated processes. Force offline Spotify and
    // replace every Last.fm request before importing the actual API routes.
    process.env.SPOTIFY_MOCK = '1';
    process.env.LASTFM_MOCK = '0';
    process.env.LASTFM_API_KEY = 'local-fixture';
    const realFetch = globalThis.fetch;
    const artistCalls = [];
    globalThis.fetch = async url => {
        const parsed = new URL(url);
        assert.equal(parsed.hostname, 'ws.audioscrobbler.com', 'No unexpected external requests');
        const method = parsed.searchParams.get('method');
        const artist = parsed.searchParams.get('artist');
        const title = parsed.searchParams.get('track');
        if (method === 'track.getInfo') {
            const tags = title === 'Tagged Song' ? ['indie-rock', 'chill', '90s', 'female vocalists']
                : artist === 'Unknown Fixture' ? ['a private note'] : ['dreamy', '1980s'];
            return Response.json({ track: { name: title, artist: { name: artist }, toptags: { tag: tags.map(name => ({ name })) } } });
        }
        assert.equal(method, 'artist.getTopTags');
        artistCalls.push(artist);
        const tags = artist === 'Unknown Fixture' ? ['an unreviewed tag'] : ['RNB', 'hiphop', 'jazz'];
        return Response.json({ toptags: { tag: tags.map(name => ({ name })) } });
    };
    try {
        const { default: app } = await import('../server.js');
        const route = app._router.stack.find(layer => layer.route?.path === '/api/taste/enrich').route;
        const data = await new Promise((resolve, reject) => {
            route.stack[0].handle({ body: { tracks: [
                { artist: 'Tag Fixture', title: 'Tagged Song' },
                { artist: 'Tag Fixture', title: 'Mood Song A' },
                { artist: 'Tag Fixture', title: 'Mood Song B' },
                { artist: 'Unknown Fixture', title: 'Unknown Song' },
            ] } }, { json: resolve, status(code) { assert.equal(code, 200); return this; } }, reject);
        });
        const tagged = data.tracks.find(track => track.name === 'Tagged Song');
        assert.deepEqual(tagged.genres, ['indie rock']);
        assert.deepEqual(tagged.moodTags, ['chill']);
        assert.deepEqual(tagged.eraTags, ['1990s']);
        assert.deepEqual(tagged.contextTags, ['female vocalists']);
        assert.equal(tagged.genreSource, 'lastfm-track');
        assert.ok(tagged.rawTags.includes('indie-rock'));
        assert.ok(Math.abs(tagged.energy - (.68 + .25) / 2) < 1e-10);
        for (const name of ['Mood Song A', 'Mood Song B']) {
            const track = data.tracks.find(track => track.name === name);
            assert.deepEqual(track.genres, ['r&b', 'hip hop', 'jazz']);
            assert.deepEqual(track.moodTags, ['dreamy']);
            assert.deepEqual(track.eraTags, ['1980s']);
            assert.equal(track.genreSource, 'lastfm-artist');
        }
        assert.equal(artistCalls.filter(artist => artist === 'Tag Fixture').length, 1);
        const unknown = data.tracks.find(track => track.name === 'Unknown Song');
        assert.deepEqual(unknown.genres, []);
        assert.equal(unknown.genreSource, 'none');
        assert.deepEqual(unknown.otherTags, ['a private note', 'an unreviewed tag']);
    } finally { globalThis.fetch = realFetch; }
});
