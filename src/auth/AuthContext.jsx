import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { rememberReturnTo } from './authRouting';

const AuthContext = createContext(null);

const MOCK_SESSION_KEY = 'spectra:mock_session';

function readMockSession() {
    try {
        const raw = window.sessionStorage.getItem(MOCK_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const isMock = Boolean(import.meta.env.VITE_AUTH_MOCK === '1' || import.meta.env.VITE_AUTH_MOCK === 'true');
    const [auth, setAuth] = useState(() => {
        if (isMock) {
            const mock = readMockSession();
            return { user: mock, ready: true, error: null };
        }
        return { user: null, ready: !supabase, error: null };
    });
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (isMock) return undefined;
        if (!supabase) return undefined;
        let disposed = false;
        let eventReceived = false;
        const timeout = window.setTimeout(() => {
            if (!disposed && !eventReceived) setAuth({ user: null, ready: true, error: 'session_unavailable' });
        }, 15000);
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (disposed) return;
            eventReceived = true;
            window.clearTimeout(timeout);
            setAuth({ user: session?.user || null, ready: true, error: null });
        });
        supabase.auth.getSession().then(({ data, error }) => {
            if (disposed || eventReceived) return;
            window.clearTimeout(timeout);
            setAuth({ user: data.session?.user || null, ready: true, error: error ? 'session_unavailable' : null });
        }).catch(() => {
            if (!disposed && !eventReceived) setAuth({ user: null, ready: true, error: 'session_unavailable' });
        });
        return () => { disposed = true; window.clearTimeout(timeout); subscription.unsubscribe(); };
    }, [retry, isMock]);

    const signIn = useCallback(async (returnTo) => {
        if (isMock) {
            const mockUser = {
                id: 'spectra-mock-user-1',
                email: 'listener@spectra.local',
                user_metadata: { full_name: 'SPECTRA 리스너' },
            };
            try {
                window.sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(mockUser));
            } catch { /* ignore */ }
            setAuth({ user: mockUser, ready: true, error: null });
            return;
        }
        if (!supabase) throw new Error('auth_not_configured');
        // PKCE and the return path need storage in the same browser as the callback.
        rememberReturnTo(window.sessionStorage, returnTo);
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                skipBrowserRedirect: true,
                queryParams: { prompt: 'select_account' },
            },
        });
        if (error || !data.url) throw error || new Error('oauth_unavailable');
        window.location.assign(data.url);
    }, [isMock]);

    const signInMock = useCallback(async () => {
        const mockUser = {
            id: 'spectra-mock-user-1',
            email: 'listener@spectra.local',
            user_metadata: { full_name: 'SPECTRA 리스너' },
        };
        try {
            window.sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(mockUser));
        } catch { /* ignore */ }
        setAuth({ user: mockUser, ready: true, error: null });
    }, []);

    const signOut = useCallback(async () => {
        try {
            window.sessionStorage.removeItem(MOCK_SESSION_KEY);
        } catch { /* ignore */ }
        if (supabase) {
            // Log out this browser; do not unexpectedly sign out the user's phone.
            const { error } = await supabase.auth.signOut({ scope: 'local' });
            if (error) throw error;
        }
        setAuth({ user: null, ready: true, error: null });
    }, []);

    return <AuthContext.Provider value={{
        ...auth,
        configured: Boolean(supabase || isMock),
        isMock,
        signIn,
        signInMock,
        signOut,
        retrySession: () => setRetry((value) => value + 1),
    }}>
        {children}
    </AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth requires AuthProvider');
    return value;
}
