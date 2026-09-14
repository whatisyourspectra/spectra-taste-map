export const GUEST_TASTE_STORAGE_KEY = 'spectra:taste:v5';
export function tasteStorageKey(ownerId) {
    return ownerId ? `${GUEST_TASTE_STORAGE_KEY}:user:${ownerId}` : GUEST_TASTE_STORAGE_KEY;
}

function parseTaste(raw) {
    try {
        const data = JSON.parse(raw || 'null');
        return data && Array.isArray(data.tracks) ? data : null;
    } catch { return null; }
}

function getSafeLocalStorage() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch { /* disabled / sandbox */ }
    return null;
}

// Local storage separation with localStorage permanent caching fallback.
export function loadLocalTaste(storage, ownerId = null) {
    try {
        const key = tasteStorageKey(ownerId);
        let existing = parseTaste(storage.getItem(key));
        if (existing) return existing;

        // Fallback to permanent localStorage if sessionStorage is fresh/cleared
        const local = getSafeLocalStorage();
        if (local && local !== storage) {
            existing = parseTaste(local.getItem(key));
            if (existing) {
                try { storage.setItem(key, JSON.stringify(existing)); } catch { /* ignore */ }
                return existing;
            }
        }

        if (!ownerId) return null;
        const guest = parseTaste(storage.getItem(GUEST_TASTE_STORAGE_KEY)) || (local ? parseTaste(local.getItem(GUEST_TASTE_STORAGE_KEY)) : null);
        if (!guest) return null;

        // Preserve an existing guest import through the first sign-in, then
        // remove the guest alias so a different account cannot claim it later.
        storage.setItem(key, JSON.stringify(guest));
        storage.removeItem(GUEST_TASTE_STORAGE_KEY);
        if (local) {
            try {
                local.setItem(key, JSON.stringify(guest));
                local.removeItem(GUEST_TASTE_STORAGE_KEY);
            } catch { /* ignore */ }
        }
        return guest;
    } catch { return null; }
}

export function persistLocalTaste(storage, ownerId, data) {
    if (!data) return;
    const key = tasteStorageKey(ownerId);
    const serialized = JSON.stringify(data);
    try { storage.setItem(key, serialized); }
    catch { /* Storage failures must not interrupt the visible map. */ }

    // Mirror to localStorage so browser restart retains the map
    const local = getSafeLocalStorage();
    if (local && local !== storage) {
        try { local.setItem(key, serialized); } catch { /* ignore quota */ }
    }
}

export function clearLocalTaste(storage, ownerId) {
    const key = tasteStorageKey(ownerId);
    try {
        storage.removeItem(key);
        storage.removeItem('spectra:taste:v3');
        storage.removeItem('spectra:taste:v4');
    } catch { /* ignore */ }
    const local = getSafeLocalStorage();
    if (local) {
        try {
            local.removeItem(key);
            local.removeItem('spectra:taste:v3');
            local.removeItem('spectra:taste:v4');
        } catch { /* ignore */ }
    }
}

// Serialize reads and mutations per account, including across provider remounts.
const cloudQueues = new WeakMap();
function enqueueCloudOperation(client, ownerId, operation) {
    let accounts = cloudQueues.get(client);
    if (!accounts) {
        accounts = new Map();
        cloudQueues.set(client, accounts);
    }
    const previous = accounts.get(ownerId) || Promise.resolve();
    const result = previous.then(operation);
    // A failed request must not poison later explicitly requested operations.
    const settled = result.catch(() => {});
    accounts.set(ownerId, settled);
    settled.then(() => {
        if (accounts.get(ownerId) === settled) accounts.delete(ownerId);
    });
    return result;
}

export function shouldRestoreCloudTaste(local, cloud) {
    if (!cloud?.tracks?.length) return false;
    if (!local?.tracks?.length) return true;
    const localTime = Date.parse(local.updatedAt);
    const cloudTime = Date.parse(cloud.updatedAt);
    // Legacy browser caches have no revision timestamp: prefer the saved account map.
    if (!Number.isFinite(localTime)) return true;
    return Number.isFinite(cloudTime) && cloudTime > localTime;
}

export async function fetchCloudTaste(supabase, ownerId) {
    if (!supabase || !ownerId) return null;
    return enqueueCloudOperation(supabase, ownerId, async () => {
        const { data, error } = await supabase
            .from('user_taste_maps')
            .select('map_id, features_source, stats, tracks, updated_at')
            .eq('user_id', ownerId)
            .maybeSingle();
        // Failed reads must never be interpreted as permission to overwrite a map.
        if (error) throw error;
        if (!data) return null;
        if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
            throw new Error('Invalid cloud taste map');
        }
        return {
            tracks: data.tracks,
            featuresSource: data.features_source || 'none',
            stats: data.stats || null,
            mapId: data.map_id,
            updatedAt: data.updated_at,
        };
    });
}

export async function saveCloudTaste(supabase, ownerId, tasteData) {
    if (!supabase || !ownerId || !Array.isArray(tasteData?.tracks) || !tasteData.tracks.length) return null;
    const payload = {
        user_id: ownerId,
        map_id: tasteData.mapId || 'default-map',
        features_source: tasteData.featuresSource || 'none',
        stats: tasteData.stats || null,
        tracks: tasteData.tracks,
        updated_at: tasteData.updatedAt || new Date().toISOString(),
    };
    return enqueueCloudOperation(supabase, ownerId, async () => {
        const { data, error } = await supabase
            .from('user_taste_maps')
            .upsert(payload, { onConflict: 'user_id' })
            .select('updated_at')
            .maybeSingle();
        if (error) throw error;
        return data;
    });
}

export async function deleteCloudTaste(supabase, ownerId) {
    if (!supabase || !ownerId) return;
    return enqueueCloudOperation(supabase, ownerId, async () => {
        const { error } = await supabase.from('user_taste_maps').delete().eq('user_id', ownerId);
        if (error) throw error;
    });
}
