import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const api = (path) => `${API_BASE}${path}`;

const SpotifyAuthContext = createContext(null);

export function SpotifyAuthProvider({ children }) {
    const [user, setUser] = useState(null);      // { id, displayName }
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const res = await fetch(api('/api/me/profile'), { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(() => {
        const returnTo = window.location.pathname + window.location.search;
        const appOrigin = window.location.origin;
        window.location.href = api(`/auth/login?returnTo=${encodeURIComponent(returnTo)}&appOrigin=${encodeURIComponent(appOrigin)}`);
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch(api('/auth/logout'), { method: 'POST', credentials: 'include' });
        } catch { /* ignore */ }
        setUser(null);
    }, []);

    return (
        <SpotifyAuthContext.Provider value={{ user, loading, loggedIn: !!user, login, logout, checkAuth }}>
            {children}
        </SpotifyAuthContext.Provider>
    );
}

export function useSpotifyAuth() {
    const ctx = useContext(SpotifyAuthContext);
    if (!ctx) throw new Error('useSpotifyAuth must be used within SpotifyAuthProvider');
    return ctx;
}
