import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const api = (path) => `${API_BASE}${path}`;

const STORAGE_KEY = 'spectra:taste:v1';
const CHUNK_SIZE = 100;

const TasteDataContext = createContext(null);

function loadPersisted() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.tracks)) return null;
        return data;
    } catch {
        return null;
    }
}

function persist(data) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        /* quota / disabled storage — non-fatal */
    }
}

function newMapId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `map-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function TasteDataProvider({ children }) {
    const [initial] = useState(loadPersisted);

    const [tracks, setTracks] = useState(initial?.tracks || []);
    const [featuresSource, setFeaturesSource] = useState(initial?.featuresSource || 'none');
    const [stats, setStats] = useState(initial?.stats || null);
    const [mapId, setMapId] = useState(initial?.mapId || null);
    const [status, setStatus] = useState(initial?.tracks?.length ? 'ready' : 'idle');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [error, setError] = useState(null);

    const importTracks = useCallback(async (parsedList) => {
        const list = Array.isArray(parsedList) ? parsedList : [];
        if (list.length === 0) {
            setError('불러온 곡이 없습니다. 목록을 확인해 주세요.');
            setStatus('error');
            return { ok: false };
        }
        setStatus('importing');
        setError(null);
        setProgress({ done: 0, total: list.length });

        const collected = [];
        let source = 'none';
        try {
            for (let i = 0; i < list.length; i += CHUNK_SIZE) {
                const chunk = list.slice(i, i + CHUNK_SIZE);
                const res = await fetch(api('/api/taste/enrich'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tracks: chunk }),
                });
                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`HTTP ${res.status}: ${txt}`);
                }
                const data = await res.json();
                if (Array.isArray(data.tracks)) collected.push(...data.tracks);
                if (data.featuresSource && data.featuresSource !== 'none') source = data.featuresSource;
                setProgress({ done: Math.min(i + CHUNK_SIZE, list.length), total: list.length });
            }
        } catch (e) {
            setError(e.message || '트랙 분석에 실패했습니다.');
            setStatus('error');
            return { ok: false };
        }

        // Dedupe by resolved id across chunks.
        const seen = new Set();
        const finalTracks = [];
        for (const t of collected) {
            if (!t?.id || seen.has(t.id)) continue;
            seen.add(t.id);
            finalTracks.push(t);
        }

        const id = newMapId();
        const nextStats = {
            fetchedCount: finalTracks.length,
            totalAvailable: list.length,
        };
        setTracks(finalTracks);
        setFeaturesSource(source);
        setStats(nextStats);
        setMapId(id);
        setStatus('ready');
        persist({ tracks: finalTracks, featuresSource: source, stats: nextStats, mapId: id });
        return { ok: true, count: finalTracks.length };
    }, []);

    const reset = useCallback(() => {
        setTracks([]);
        setFeaturesSource('none');
        setStats(null);
        setMapId(null);
        setStatus('idle');
        setError(null);
        setProgress({ done: 0, total: 0 });
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }, []);

    // Keep sessionStorage in sync if tracks change after mount (e.g. re-import).
    useEffect(() => {
        if (status === 'ready' && tracks.length > 0) {
            persist({ tracks, featuresSource, stats, mapId });
        }
    }, [status, tracks, featuresSource, stats, mapId]);

    const value = {
        tracks,
        featuresSource,
        stats,
        mapId,
        status,
        progress,
        error,
        hasTaste: tracks.length > 0,
        importTracks,
        reset,
    };

    return (
        <TasteDataContext.Provider value={value}>
            {children}
        </TasteDataContext.Provider>
    );
}

// The provider and its companion hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export function useTasteData() {
    const ctx = useContext(TasteDataContext);
    if (!ctx) throw new Error('useTasteData must be used within TasteDataProvider');
    return ctx;
}
