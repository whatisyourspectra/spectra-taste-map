import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCloudTaste, saveCloudTaste, deleteCloudTaste, shouldRestoreCloudTaste } from '../src/taste/tasteStorage.js';

const taste = (updatedAt, mapId = 'same-map') => ({ tracks: [{ id: 'track' }], mapId, updatedAt });
const earlier = '2026-09-08T00:00:00.000Z';
const later = '2026-09-09T00:00:00.000Z';

function fakeClient({ read, save, remove } = {}) {
    return { from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: read }) }),
        upsert: (payload) => ({ select: () => ({ maybeSingle: () => save(payload) }) }),
        delete: () => ({ eq: remove }),
    }) };
}

test('revision time determines restore, including updates to the same map', () => {
    assert.equal(shouldRestoreCloudTaste(taste(earlier), taste(later)), true);
    assert.equal(shouldRestoreCloudTaste(taste(later), taste(earlier, 'other-map')), false);
    assert.equal(shouldRestoreCloudTaste(taste(later), taste(later)), false);
    assert.equal(shouldRestoreCloudTaste(null, taste(later)), true);
    assert.equal(shouldRestoreCloudTaste(taste(later), null), false);
    assert.equal(shouldRestoreCloudTaste(taste(undefined), taste(later)), true);
    assert.equal(shouldRestoreCloudTaste(taste(later), taste('invalid')), false);
});

test('failed or malformed cloud reads are distinct from an empty account', async () => {
    const failure = new Error('network unavailable');
    for (const read of [
        async () => ({ error: failure }),
        async () => { throw failure; },
        async () => ({ data: { tracks: 'invalid' }, error: null }),
    ]) {
        await assert.rejects(fetchCloudTaste(fakeClient({ read }), 'user'));
    }
    assert.equal(await fetchCloudTaste(fakeClient({ read: async () => ({ data: null }) }), 'user'), null);
});

test('pending saves finish before reset deletes, and later imports remain in order', async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const events = [];
    let row = null;
    const client = fakeClient({
        save: async (payload) => {
            events.push(`start:${payload.map_id}`);
            if (payload.map_id === 'old') await gate;
            row = payload;
            events.push(`saved:${payload.map_id}`);
            return { data: { updated_at: payload.updated_at } };
        },
        remove: async () => { events.push('delete'); row = null; return {}; },
    });
    const oldSave = saveCloudTaste(client, 'user', taste(earlier, 'old'));
    const reset = deleteCloudTaste(client, 'user');
    const newSave = saveCloudTaste(client, 'user', taste(later, 'new'));
    await Promise.resolve();
    assert.deepEqual(events, ['start:old']);
    release();
    await Promise.all([oldSave, reset, newSave]);
    assert.deepEqual(events, ['start:old', 'saved:old', 'delete', 'start:new', 'saved:new']);
    assert.equal(row.map_id, 'new');
    assert.equal(row.updated_at, later);
});

test('a rejected mutation does not block the next request or a different account', async () => {
    const failure = new Error('permission denied');
    const client = fakeClient({
        save: async () => ({ error: failure }),
        read: async () => ({ data: null }),
        remove: async () => ({ error: failure }),
    });
    await assert.rejects(saveCloudTaste(client, 'user', taste(later)), failure);
    assert.equal(await fetchCloudTaste(client, 'user'), null);
    await assert.rejects(deleteCloudTaste(client, 'user'), failure);
    assert.equal(await fetchCloudTaste(client, 'other-user'), null);
});
