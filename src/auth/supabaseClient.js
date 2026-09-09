import { createClient } from '@supabase/supabase-js';
import { readAuthConfig } from './authRouting';

const config = readAuthConfig(import.meta.env);
export const supabase = config ? createClient(config.url, config.key, {
    auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
}) : null;

// A code is single-use. Share the promise across React StrictMode remounts.
let pendingCode = null;
let pendingExchange = null;
export function finishGoogleLogin(code) {
    if (!supabase || !code) return Promise.reject(new Error('missing_auth_code'));
    if (pendingCode === code && pendingExchange) return pendingExchange;
    pendingCode = code;
    pendingExchange = supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error || !data.session) throw error || new Error('missing_session');
        return data.session;
    });
    return pendingExchange;
}
