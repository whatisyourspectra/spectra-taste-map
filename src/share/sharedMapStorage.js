import { translate } from '../i18n/translate.js';
import { supabase } from '../auth/supabaseClient';
async function authWithinDeadline() {
    let timer;
    try {
        return await Promise.race([supabase.auth.getUser(), new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('SHARE_AUTH_TIMEOUT')), 10000);
        })]);
    } finally {clearTimeout(timer);}
}
async function databaseWithinDeadline(request) {
    const controller = new AbortController();
    let timer;
    try {
        return await Promise.race([request.abortSignal(controller.signal), new Promise((_, reject) => {
            timer = setTimeout(() => {controller.abort(); reject(new Error('SHARE_DATABASE_TIMEOUT'));}, 12000);
        })]);
    } finally {clearTimeout(timer);}
}
const trim = (value, max = 200) => String(value || '').slice(0, max);
export function publicMapSnapshot(tracks, { title, style = 'constellation', genres = [] } = {}) {
    return { version: 1, title: trim(title || translate("친구의 스펙트라"), 80), style: style === 'bubbles' ? 'bubbles' : 'constellation',
        genres: genres.slice(0, 5).map(value => trim(value, 60)),
        tracks: tracks.slice(0, 2000).map((track, index) => ({ id: `star-${index}`, name: trim(track.name || track.title), artists: trim(track.artists || track.artist),
            coverUrl: /^https:\/\//.test(track.coverUrl || '') ? trim(track.coverUrl, 1000) : '',
            x: Number.isFinite(track.valence) ? Math.max(0, Math.min(1, track.valence)) : (index % 13) / 12,
            y: Number.isFinite(track.energy) ? Math.max(0, Math.min(1, track.energy)) : (index % 17) / 16,
        })).filter(track => track.name && track.artists) };
}
export async function publishSharedMap(tracks, options) {
    if (!supabase) throw new Error('SHARE_NOT_CONFIGURED');
    const { data: auth, error: authError } = await authWithinDeadline();
    if (authError || !auth?.user) throw new Error('SHARE_LOGIN_REQUIRED');
    const snapshot = publicMapSnapshot(tracks, options);
    if (!snapshot.tracks.length) throw new Error('SHARE_EMPTY');
    const { data, error } = await databaseWithinDeadline(supabase.from('shared_taste_maps').insert({ owner_id: auth.user.id, snapshot }).select('id').single());
    if (error || !data?.id) throw new Error('SHARE_STORAGE_UNAVAILABLE');
    return data.id;
}
export async function fetchSharedMap(id) {
    if (!supabase || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id || '')) return null;
    const { data, error } = await databaseWithinDeadline(supabase.rpc('get_shared_taste_map', { share_id: id }));
    if (error) throw new Error('SHARE_READ_FAILED');
    return data || null;
}
export async function revokeSharedMap(id) {
    const { error } = await databaseWithinDeadline(supabase.from('shared_taste_maps').delete().eq('id', id));
    if (error) throw new Error('SHARE_REVOKE_FAILED');
}
export async function listOwnSharedMaps() {
    if (!supabase) return [];
    const { data: auth } = await authWithinDeadline();
    if (!auth?.user) return [];
    const { data, error } = await databaseWithinDeadline(supabase.from('shared_taste_maps').select('id,created_at,title:snapshot->>title').eq('owner_id', auth.user.id).order('created_at', { ascending: false }).limit(20));
    if (error) return [];
    return data || [];
}
