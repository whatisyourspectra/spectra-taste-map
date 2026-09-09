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

// Local storage separation only; this is not account/cloud map synchronization.
export function loadLocalTaste(storage, ownerId = null) {
    try {
        const existing = parseTaste(storage.getItem(tasteStorageKey(ownerId)));
        if (existing) return existing;
        if (!ownerId) return null;
        const guest = parseTaste(storage.getItem(GUEST_TASTE_STORAGE_KEY));
        if (!guest) return null;
        // Preserve an existing guest import through the first sign-in, then
        // remove the guest alias so a different account cannot claim it later.
        storage.setItem(tasteStorageKey(ownerId), JSON.stringify(guest));
        storage.removeItem(GUEST_TASTE_STORAGE_KEY);
        return guest;
    } catch { return null; }
}

export function persistLocalTaste(storage, ownerId, data) {
    try { storage.setItem(tasteStorageKey(ownerId), JSON.stringify(data)); }
    catch { /* Storage failures must not interrupt the visible map. */ }
}
