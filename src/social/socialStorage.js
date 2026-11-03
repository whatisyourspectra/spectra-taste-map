import { SOCIAL_PAGE_SIZE, cleanSocialText, isSocialId } from './socialSnapshot.js';

// Inject the existing signed-in Supabase client. No service key or anonymous
// localStorage fallback: a successful write must be confirmed by the database.
export function createSocialStore(client) {
    async function request(query) {
        if (!client) throw new Error('SOCIAL_UNAVAILABLE');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
            const { data, error } = await query.abortSignal(controller.signal);
            if (error) {
                if (String(error.message).includes('social_rate_limited')) throw new Error('SOCIAL_RATE_LIMIT');
                if (String(error.message).includes('social_profile_private')) throw new Error('SOCIAL_PRIVATE');
                throw new Error('SOCIAL_UNAVAILABLE');
            }
            return data;
        } finally { clearTimeout(timer); }
    }
    const ready = () => { if (!client) throw new Error('SOCIAL_UNAVAILABLE'); };
    const fields = 'user_id,display_name,headline,snapshot,is_public,published_at,updated_at';
    return {
        async listProfiles(offset = 0) {
            ready();
            return (await request(client.from('social_taste_profiles').select(fields).eq('is_public', true)
                .order('published_at', { ascending: false }).order('user_id', { ascending: false })
                .range(offset, offset + SOCIAL_PAGE_SIZE - 1))) || [];
        },
        async getProfile(id) {
            ready(); if (!isSocialId(id)) return null;
            return request(client.from('social_taste_profiles').select(fields).eq('user_id', id).maybeSingle());
        },
        async publish(userId, { displayName, headline, snapshot }) {
            ready();
            if (!isSocialId(userId)) throw new Error('SOCIAL_LOGIN');
            const name = cleanSocialText(displayName, 40);
            if (!name || !snapshot?.trackCount) throw new Error('SOCIAL_INVALID');
            const data = await request(client.from('social_taste_profiles').upsert({ user_id: userId, display_name: name,
                headline: cleanSocialText(headline, 160), snapshot, is_public: true }, { onConflict: 'user_id' }).select(fields).single());
            if (!data?.user_id || data.is_public !== true) throw new Error('SOCIAL_UNAVAILABLE');
            return data;
        },
        async unpublish(userId) {
            ready(); if (!isSocialId(userId)) throw new Error('SOCIAL_LOGIN');
            const data = await request(client.from('social_taste_profiles').update({ is_public: false })
                .eq('user_id', userId).select('user_id,is_public').single());
            if (data?.is_public !== false) throw new Error('SOCIAL_UNAVAILABLE');
        },
        async listComments(profileId, offset = 0) {
            ready(); if (!isSocialId(profileId)) return [];
            return (await request(client.from('social_taste_comments').select('id,profile_id,author_id,author_name,body,created_at')
                .eq('profile_id', profileId).order('created_at', { ascending: false }).order('id', { ascending: false })
                .range(offset, offset + 29))) || [];
        },
        async addComment(profileId, { name, body, requestId }) {
            ready();
            if (!isSocialId(profileId) || !isSocialId(requestId) || !cleanSocialText(name, 40) || !body.trim() || body.trim().length > 1000) throw new Error('SOCIAL_INVALID');
            const data = await request(client.rpc('add_social_taste_comment', { target_profile_id: profileId,
                comment_body: body.trim(), public_name: cleanSocialText(name, 40), request_id: requestId }));
            if (!data?.id) throw new Error('SOCIAL_UNAVAILABLE');
            return data;
        },
        async deleteComment(id) {
            ready(); if (!isSocialId(id)) throw new Error('SOCIAL_INVALID');
            const data = await request(client.from('social_taste_comments').delete().eq('id', id).select('id').single());
            if (data?.id !== id) throw new Error('SOCIAL_UNAVAILABLE');
        },
    };
}
