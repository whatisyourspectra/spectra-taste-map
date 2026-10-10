import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnTo, readAuthConfig, rememberReturnTo, consumeReturnTo, savedReturnTo } from '../src/auth/authRouting.js';
import { loadLocalTaste, persistLocalTaste, clearLocalTaste, fetchCloudTaste, saveCloudTaste, deleteCloudTaste, tasteStorageKey, GUEST_TASTE_STORAGE_KEY } from '../src/taste/tasteStorage.js';
const storage = () => {
    const values = new Map();
    return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};

test('OAuth returns only to known local routes and removes unsolicited URL data', () => {
    for (const value of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/auth/callback?code=x', '/taste-map\n', null, '/%2f%2fevil.com']) assert.equal(safeReturnTo(value), '/taste-map');
    assert.equal(safeReturnTo('/'), '/');
    assert.equal(safeReturnTo('/taste-map/mobile'), '/taste-map/mobile');
    assert.equal(safeReturnTo('/taste-map?view=constellation&access_token=secret#fake'), '/taste-map?view=constellation');
});

test('return destination survives cancellation, then is consumed once on success', () => {
    const store = storage();
    rememberReturnTo(store, '/taste-map/mobile');
    assert.equal(savedReturnTo(store), '/taste-map/mobile');
    assert.equal(consumeReturnTo(store), '/taste-map/mobile');
    assert.equal(consumeReturnTo(store), '/taste-map');
});

test('missing, malformed and secret server configuration never starts browser auth', () => {
    assert.equal(readAuthConfig({}), null);
    const env = { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_testing' };
    assert.deepEqual(readAuthConfig(env), { url: 'https://project.supabase.co', key: 'sb_publishable_testing' });
    assert.deepEqual(readAuthConfig({ VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_key' }), { url: 'https://project.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_key' });
    assert.deepEqual(readAuthConfig({ VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sbp_testing_123' }), { url: 'https://project.supabase.co', key: 'sbp_testing_123' });
    assert.equal(readAuthConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_forbidden' }), null);
    assert.equal(readAuthConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'random_key' }), null);
    assert.equal(readAuthConfig({ ...env, VITE_SUPABASE_URL: 'http://remote.example' }), null);
    assert.equal(readAuthConfig({ ...env, VITE_SUPABASE_URL: 'not a url' }), null);
    assert.equal(readAuthConfig({ ...env, VITE_SUPABASE_URL: 'https://user:password@remote.example' }), null);
});

test('the first login preserves the guest map and keeps it out of other accounts', () => {
    const store = storage();
    const map = { mapId: 'existing-map', tracks: [{ id: 'one', name: 'One' }] };
    store.setItem(GUEST_TASTE_STORAGE_KEY, JSON.stringify(map));
    assert.deepEqual(loadLocalTaste(store, 'user-a'), map);
    assert.equal(store.getItem(GUEST_TASTE_STORAGE_KEY), null);
    assert.equal(loadLocalTaste(store, 'user-b'), null);
    assert.equal(loadLocalTaste(store), null);
    assert.deepEqual(loadLocalTaste(store, 'user-a'), map);
});

test('a returning account retains its map without overwriting a separate guest import', () => {
    const store = storage();
    const own = { mapId: 'own', tracks: [] };
    const guest = { mapId: 'guest', tracks: [] };
    persistLocalTaste(store, 'user-a', own);
    persistLocalTaste(store, null, guest);
    assert.deepEqual(loadLocalTaste(store, 'user-a'), own);
    assert.deepEqual(loadLocalTaste(store), guest);
    assert.equal(store.getItem(tasteStorageKey('user-b')), null);
});

test('unavailable storage and corrupt data do not crash the app', () => {
    const denied = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
    assert.equal(loadLocalTaste(denied, 'a'), null);
    assert.doesNotThrow(() => persistLocalTaste(denied, 'a', {}));
    const store = storage(); store.setItem(GUEST_TASTE_STORAGE_KEY, '{invalid');
    assert.equal(loadLocalTaste(store), null);
});

test('cloud sync helpers handle saving, fetching and deleting gracefully', async () => {
    let dbData = null;
    const fakeSupabase = {
        from: () => ({
            select: () => ({
                eq: (_col, id) => ({
                    maybeSingle: async () => ({
                        data: dbData ? { ...dbData, user_id: id } : null,
                        error: null,
                    }),
                }),
            }),
            upsert: (payload) => ({
                select: () => ({
                    maybeSingle: async () => {
                        dbData = payload;
                        return { data: { updated_at: payload.updated_at }, error: null };
                    },
                }),
            }),
            delete: () => ({
                eq: async () => {
                    dbData = null;
                    return { error: null };
                },
            }),
        }),
    };

    assert.equal(await fetchCloudTaste(null, 'u1'), null);
    assert.equal(await fetchCloudTaste(fakeSupabase, null), null);
    assert.equal(await fetchCloudTaste(fakeSupabase, 'u1'), null);

    const taste = { mapId: 'm1', tracks: [{ id: 't1' }], featuresSource: 'spotify' };
    await saveCloudTaste(fakeSupabase, 'u1', taste);
    const fetched = await fetchCloudTaste(fakeSupabase, 'u1');
    assert.deepEqual(fetched.tracks, taste.tracks);
    assert.equal(fetched.featuresSource, 'spotify');
    assert.equal(fetched.mapId, 'm1');

    await deleteCloudTaste(fakeSupabase, 'u1');
    assert.equal(await fetchCloudTaste(fakeSupabase, 'u1'), null);
});

test('demo previews never become the signed-in account map', () => {
    const store = storage();
    const demo = { mapId: 'demo-preview', tracks: [{ id: 'demo-cosmic-0' }] };
    // Legacy demos shared the guest key. They must not migrate on login.
    store.setItem(GUEST_TASTE_STORAGE_KEY, JSON.stringify(demo));
    assert.equal(loadLocalTaste(store, 'user-a'), null);
    assert.equal(store.getItem(tasteStorageKey('user-a')), null);
    // New previews preserve the user's personal cache.
    const own = { mapId: 'own', tracks: [{ id: 'personal' }] };
    persistLocalTaste(store, 'user-a', own);
    persistLocalTaste(store, 'user-a', demo);
    assert.deepEqual(loadLocalTaste(store, 'user-a'), own);
    persistLocalTaste(store, null, demo);
    assert.deepEqual(loadLocalTaste(store), demo);
    assert.equal(loadLocalTaste(store, 'user-b'), null);
});

test('legacy account demo caches are ignored on login', () => {
    const store = storage();
    store.setItem(tasteStorageKey('user-a'), JSON.stringify({ tracks: [{ id: 'demo-old-0' }] }));
    assert.equal(loadLocalTaste(store, 'user-a'), null);
});
