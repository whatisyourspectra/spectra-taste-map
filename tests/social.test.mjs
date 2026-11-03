import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSocialSnapshot, readSocialSnapshot, socialDisplayName, safeSocialCover } from '../src/social/socialSnapshot.js';
import { createSocialStore } from '../src/social/socialStorage.js';
import { safeReturnTo } from '../src/auth/authRouting.js';
const user = '11111111-1111-4111-8111-111111111111';
const comment = '22222222-2222-4222-8222-222222222222';
const tracks = Array.from({ length: 100 }, (_, i) => ({ id: `private-${i}`, name: `Song ${i}`, artists: `Artist ${i % 20}`,
    genres: i % 2 ? ['rnb', 'soul'] : ['house', 'electronic'], coverUrl: 'https://example.com/art.jpg',
    addedAt: 'private-time', spotifyId: 'private-catalog-id', token: 'secret', valence: .5, energy: .5 }));

test('publication is a bounded explicit snapshot with no private IDs, history or credentials', () => {
    const before = JSON.stringify(tracks);
    const snapshot = buildSocialSnapshot(tracks);
    assert.equal(snapshot.trackCount, 100);
    assert.equal(snapshot.tracks.length, 24);
    assert.equal(snapshot.version, 1);
    assert.ok(snapshot.genreProfile.some(item => item.genre === 'r&b'));
    assert.ok(Math.abs(snapshot.genreProfile.reduce((sum, item) => sum + item.strength, 0) - 1) < 1e-10);
    assert.doesNotMatch(JSON.stringify(snapshot), /private-|secret|addedAt|spotifyId|token/);
    assert.equal(JSON.stringify(tracks), before);
    assert.deepEqual(buildSocialSnapshot(tracks, { includeTracks: false }).tracks, []);
    assert.throws(() => buildSocialSnapshot(tracks, { stats: { isDemo: true } }), /SOCIAL_DEMO/);
    assert.throws(() => buildSocialSnapshot([]), /SOCIAL_EMPTY/);
    assert.throws(() => buildSocialSnapshot([{ ...tracks[0], id: 'demo-hidden' }]), /SOCIAL_DEMO/);
});

test('public rendering drops unsupported snapshots and unsafe image URLs; nickname never falls back to email', () => {
    assert.equal(safeSocialCover('javascript:alert(1)'), '');
    assert.equal(safeSocialCover('https://secret:password@example.com/image'), '');
    assert.equal(socialDisplayName({ email: 'secret@example.com' }), 'Music explorer');
    assert.deepEqual(readSocialSnapshot({ version: 100, tracks }).tracks, []);
    const result = readSocialSnapshot({ version: 1, genreProfile: [{ genre: 'r&b', strength: .5 }, { genre: 'invalid', strength: Infinity }],
        tracks: [{ name: 'Song', artists: 'Artist', coverUrl: 'data:image/png;base64,xxx' }] });
    assert.equal(result.genreProfile.length, 1);
    assert.equal(result.tracks[0].coverUrl, '');
});

function mockStore(response) {
    const calls = [];
    const query = new Proxy({}, { get: (_, name) => (...args) => {
        calls.push([name, ...args]);
        return name === 'abortSignal' ? Promise.resolve(response) : query;
    } });
    return { store: createSocialStore(query), calls };
}
test('publish, unpublish and delete only report success after a confirmed database write', async () => {
    const missing = mockStore({ data: null, error: null });
    await assert.rejects(missing.store.publish(user, { displayName: 'Listener', snapshot: { trackCount: 1 } }), /SOCIAL_UNAVAILABLE/);
    await assert.rejects(missing.store.unpublish(user), /SOCIAL_UNAVAILABLE/);
    await assert.rejects(missing.store.deleteComment(comment), /SOCIAL_UNAVAILABLE/);
    const good = mockStore({ data: { user_id: user, is_public: true }, error: null });
    assert.equal((await good.store.publish(user, { displayName: 'Listener', headline: 'Hello', snapshot: { trackCount: 1 } })).user_id, user);
    assert.ok(good.calls.some(([name, payload]) => name === 'upsert' && payload.user_id === user && payload.is_public));
    assert.ok(good.calls.every(([name, table]) => name !== 'from' || table === 'social_taste_profiles'));
    await assert.rejects(createSocialStore(null).listProfiles(), /SOCIAL_UNAVAILABLE/);
});

test('comments use a stable caller-provided retry ID and leave author identity to authenticated RPC', async () => {
    const { store, calls } = mockStore({ data: { id: comment }, error: null });
    const draft = { name: 'Listener', body: '  Love this taste!  ', requestId: comment };
    await store.addComment(user, draft); await store.addComment(user, draft);
    const requests = calls.filter(([name]) => name === 'rpc').map(([, name, args]) => ({ name, args }));
    assert.deepEqual(requests[0], requests[1]);
    assert.equal(requests[0].args.comment_body, 'Love this taste!');
    assert.ok(!('author_id' in requests[0].args));
    await assert.rejects(store.addComment(user, { ...draft, body: ' ' }), /SOCIAL_INVALID/);
    await assert.rejects(store.addComment(user, { ...draft, body: 'x'.repeat(1001) }), /SOCIAL_INVALID/);
    const limited = mockStore({ error: { message: 'social_rate_limited' } });
    await assert.rejects(limited.store.addComment(user, draft), /SOCIAL_RATE_LIMIT/);
});

test('Social login returns to the exact public profile while dropping unsolicited URL data', () => {
    assert.equal(safeReturnTo('/social?access_token=secret'), '/social');
    assert.equal(safeReturnTo(`/social/${user}?redirect=https://evil.com#token`), `/social/${user}`);
    assert.equal(safeReturnTo('/social/not-a-uuid'), '/taste-map');
    assert.equal(safeReturnTo('/social//evil.com'), '/taste-map');
});
