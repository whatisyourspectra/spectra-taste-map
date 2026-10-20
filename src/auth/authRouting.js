const APP_ORIGIN = 'https://spectra.invalid';
const RETURN_KEY = 'spectra:auth:return-to:v1';

// OAuth redirects may only return to known application views.
export function safeReturnTo(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')
        || value.includes('\\') || [...value].some((char) => char.charCodeAt(0) < 32)) return '/taste-map';
    try {
        const url = new URL(value, APP_ORIGIN);
        if (url.origin !== APP_ORIGIN || !['/', '/taste-map', '/taste-map/mobile'].includes(url.pathname)) return '/taste-map';
        if (url.pathname === '/taste-map') {
            const tab = url.searchParams.get('tab');
            if (['discover', 'today'].includes(tab)) return `/taste-map?tab=${tab}`;
            const view = url.searchParams.get('view');
            if (['constellation', 'immersive'].includes(view)) return `/taste-map?view=${view}`;
        }
        if (url.pathname === '/taste-map/mobile' && url.searchParams.get('oracle') === '1') return '/taste-map?tab=today';
        return url.pathname;
    } catch { return '/taste-map'; }
}

export function rememberReturnTo(storage, value) {
    storage.setItem(RETURN_KEY, safeReturnTo(value));
}

export function savedReturnTo(storage) {
    try { return safeReturnTo(storage.getItem(RETURN_KEY)); }
    catch { return '/taste-map'; }
}

export function consumeReturnTo(storage) {
    try {
        const value = storage.getItem(RETURN_KEY);
        storage.removeItem(RETURN_KEY);
        return safeReturnTo(value);
    } catch { return '/taste-map'; }
}

export function readAuthConfig(env) {
    const url = String(env.VITE_SUPABASE_URL || '').trim();
    const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (!url || !key || key.startsWith('sb_secret_')) return null;
    try {
        const parsed = new URL(url);
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
        if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) return null;
        if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
        // Supports Supabase publishable keys (sb_publishable_*, sbp_*) and standard JWT anon keys (eyJ*)
        const isSupportedKey = key.startsWith('sb_publishable_') || key.startsWith('sbp_') || key.startsWith('eyJ');
        if (!isSupportedKey) return null;
        return { url: parsed.origin, key };
    } catch { return null; }
}
