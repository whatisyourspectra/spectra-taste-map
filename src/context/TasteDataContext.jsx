import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const api = (path) => `${API_BASE}${path}`;

import {
    loadLocalTaste,
    persistLocalTaste,
    clearLocalTaste,
    fetchCloudTaste,
    saveCloudTaste,
    deleteCloudTaste,
    shouldRestoreCloudTaste,
} from '../taste/tasteStorage';
import { uniqueTracks } from '../taste/buildTasteState';
import { appendDecision, reflectionKey } from '../reflection/reflectionStorage';
import { supabase } from '../auth/supabaseClient';
const CHUNK_SIZE = 40;
const PREVIEW_TRACK_COUNT = 32;
const BACKGROUND_REQUEST_CONCURRENCY = 1;
const BACKGROUND_PUBLISH_EVERY = 5;
const REQUEST_RETRY_COUNT = 2;
const MIN_RECOVERY_CHUNK_SIZE = 10;

import { MAX_IMPORT_TRACKS, limitImportTracks } from '../utils/sampleTracks.js';
import { enrichTracksWithArtwork } from '../taste/demoArtwork.js';
export { MAX_IMPORT_TRACKS, limitImportTracks };

const TasteDataContext = createContext(null);

function newMapId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `map-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function splitPreviewTracks(list, previewCount = PREVIEW_TRACK_COUNT) {
    if (list.length <= previewCount) return { preview: list, remaining: [] };

    // Pick evenly across the imported history so the first map is more
    // representative than simply taking the first few rows of the file.
    const previewIndexes = new Set();
    for (let index = 0; index < previewCount; index += 1) {
        previewIndexes.add(Math.round((index * (list.length - 1)) / (previewCount - 1)));
    }
    return {
        preview: list.filter((_, index) => previewIndexes.has(index)),
        remaining: list.filter((_, index) => !previewIndexes.has(index)),
    };
}

async function requestEnrichedTracks(chunk) {
    const res = await fetch(api('/api/taste/enrich'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: chunk }),
    });
    if (!res.ok) {
        const txt = await res.text();
        const error = new Error(`HTTP ${res.status}: ${txt}`);
        error.status = res.status;
        throw error;
    }
    return res.json();
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRequestError(error) {
    const status = Number(error?.status);
    return !Number.isFinite(status) || status === 408 || status === 429 || status >= 500;
}

function shouldRecoverWithSmallerChunks(error) {
    const status = Number(error?.status);
    return !Number.isFinite(status) || status === 408 || status === 413 || status === 504;
}

async function requestChunkWithRecovery(chunk, mergeResponse, isActive, attempt = 0) {
    try {
        const data = await requestEnrichedTracks(chunk);
        if (!isActive()) return { failedCount: 0, cancelled: true };
        mergeResponse(data);
        return { failedCount: 0, cancelled: false };
    } catch (error) {
        if (!isActive()) return { failedCount: 0, cancelled: true };

        if (isRetryableRequestError(error) && attempt < REQUEST_RETRY_COUNT) {
            await wait(650 * (2 ** attempt));
            return requestChunkWithRecovery(chunk, mergeResponse, isActive, attempt + 1);
        }

        // A serverless timeout can be tied to the amount of work in one
        // invocation. Split only timeout/network-sized failures; splitting a
        // credential or validation error would just multiply bad requests.
        if (shouldRecoverWithSmallerChunks(error) && chunk.length > MIN_RECOVERY_CHUNK_SIZE) {
            const middle = Math.ceil(chunk.length / 2);
            const left = await requestChunkWithRecovery(
                chunk.slice(0, middle),
                mergeResponse,
                isActive,
            );
            if (left.cancelled) return left;
            const right = await requestChunkWithRecovery(
                chunk.slice(middle),
                mergeResponse,
                isActive,
            );
            return {
                failedCount: left.failedCount + right.failedCount,
                cancelled: right.cancelled,
            };
        }

        return { failedCount: chunk.length, cancelled: false };
    }
}

export function TasteDataProvider({ children, ownerId = null }) {
    const [initial] = useState(() => loadLocalTaste(sessionStorage, ownerId));
    const importRunRef = useRef(0);
    const resumeImportRef = useRef(
        initial?.stats?.backgroundEnriching && Array.isArray(initial?.pendingSourceList)
            ? initial.pendingSourceList
            : null,
    );

    const [tracks, setTracks] = useState(initial?.tracks || []);
    const [featuresSource, setFeaturesSource] = useState(initial?.featuresSource || 'none');
    const [stats, setStats] = useState(initial?.stats || null);
    const [mapId, setMapId] = useState(initial?.mapId || null);
    const [status, setStatus] = useState(() => {
        if (!initial?.tracks?.length) return 'idle';
        return initial?.stats?.backgroundEnriching ? 'enriching' : 'ready';
    });
    const [progress, setProgress] = useState(() => ({
        done: Number(initial?.stats?.processedCount) || 0,
        total: Number(initial?.stats?.totalAvailable) || 0,
    }));
    const [error, setError] = useState(null);
    const [cloudSyncing, setCloudSyncing] = useState(() => Boolean(ownerId && supabase && (!initial?.tracks || initial.tracks.length === 0)));

    const importTracks = useCallback(async (parsedList, options = {}) => {
        const rawList = Array.isArray(parsedList) ? parsedList : [];
        if (rawList.length === 0) {
            setError('불러온 곡이 없습니다. 목록을 확인해 주세요.');
            setStatus('error');
            return { ok: false };
        }

        const { items: list, capped, originalTotal } = limitImportTracks(rawList);

        // Instant path for pre-enriched demo tracks or tracks with precomputed features
        if (options.preEnriched || (rawList.length > 0 && typeof rawList[0].valence === 'number')) {
            const id = options.mapId || newMapId();
            const source = options.featuresSource || 'spotify-genres';
            const nextStats = {
                fetchedCount: list.length,
                totalAvailable: list.length,
                originalImportCount: originalTotal,
                isCapped: capped,
                processedCount: list.length,
                failedCount: 0,
                backgroundEnriching: false,
            };
            setTracks(list);
            setFeaturesSource(source);
            setStats(nextStats);
            setMapId(id);
            setStatus('ready');
            setError(null);
            persistLocalTaste(sessionStorage, ownerId, {
                tracks: list,
                featuresSource: source,
                stats: nextStats,
                mapId: id,
                updatedAt: new Date().toISOString(),
            });

            if (typeof window !== 'undefined' && list.length > 0) {
                enrichTracksWithArtwork(list, (updatedList) => {
                    setTracks(updatedList);
                    persistLocalTaste(sessionStorage, ownerId, {
                        tracks: updatedList,
                        featuresSource: source,
                        stats: nextStats,
                        mapId: id,
                        updatedAt: new Date().toISOString(),
                    });
                });
            }

            if (typeof options.onPreviewReady === 'function') {
                try {
                    options.onPreviewReady();
                } catch (e) {
                    console.error('[TasteData] onPreviewReady callback failed:', e);
                }
            }

            return { ok: true };
        }

        const seededTracks = Array.isArray(options.seedTracks) ? options.seedTracks : [];
        setStatus(seededTracks.length > 0 ? 'enriching' : 'importing');
        setError(null);
        setProgress({ done: 0, total: list.length, originalTotal, isCapped: capped });

        const runId = importRunRef.current + 1;
        importRunRef.current = runId;
        const id = options.mapId || newMapId();
        const collectedById = new Map(
            seededTracks.filter((track) => track?.id).map((track) => [track.id, track]),
        );
        let source = options.featuresSource || 'none';
        let processedCount = 0;
        let failedCount = 0;

        const mergeResponse = (data) => {
            if (Array.isArray(data?.tracks)) {
                data.tracks.forEach((track) => {
                    if (track?.id) collectedById.set(track.id, track);
                });
            }
            if (data?.featuresSource && data.featuresSource !== 'none') {
                source = data.featuresSource;
            }
        };

        const publish = (nextStatus) => {
            if (importRunRef.current !== runId) return;
            const nextTracks = [...collectedById.values()];
            const nextStats = {
                fetchedCount: nextTracks.length,
                totalAvailable: list.length,
                originalImportCount: originalTotal,
                isCapped: capped,
                processedCount,
                failedCount,
                backgroundEnriching: nextStatus === 'enriching',
            };
            setTracks(nextTracks);
            setFeaturesSource(source);
            setStats(nextStats);
            setMapId(id);
            setStatus(nextStatus);
            const pendingSourceList = nextStatus === 'enriching' ? list : null;
            const payloadToPersist = {
                tracks: nextTracks,
                featuresSource: source,
                stats: nextStats,
                mapId: id,
                pendingSourceList,
                updatedAt: new Date().toISOString(),
            };
            persistLocalTaste(sessionStorage, ownerId, payloadToPersist);
            return payloadToPersist;
        };

        try {
            const { preview, remaining } = splitPreviewTracks(list);
            const previewResult = await requestChunkWithRecovery(
                preview,
                mergeResponse,
                () => importRunRef.current === runId,
            );
            if (previewResult.cancelled || importRunRef.current !== runId) {
                return { ok: false, cancelled: true };
            }
            failedCount += previewResult.failedCount;
            if (collectedById.size === 0) {
                // If backend is offline or returns nothing, fallback to deterministic synthetic features
                const syntheticTracks = list.map((track, idx) => {
                    const hashVal = (str) => {
                        let h = 0;
                        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
                        return (h % 1000) / 1000;
                    };
                    const name = track.name || `Track ${idx + 1}`;
                    const artists = track.artists || 'Unknown Artist';
                    return {
                        id: `track-${idx}-${hashVal(name + artists)}`,
                        name,
                        artists,
                        album: track.album || `${artists} Single`,
                        valence: 0.25 + 0.55 * hashVal(`${name}:val`),
                        energy: 0.25 + 0.65 * hashVal(`${name}:eng`),
                        danceability: 0.3 + 0.55 * hashVal(`${name}:dan`),
                        acousticness: 0.1 + 0.7 * hashVal(`${name}:aco`),
                        instrumentalness: hashVal(`${name}:ins`) > 0.7 ? 0.6 : 0.05,
                        genres: [artists.toLowerCase().replace(/[^a-z0-9]/g, '') || 'music', 'indie', 'pop'],
                        spotifyGenres: ['indie', 'pop'],
                        featuresSource: 'synthetic',
                    };
                });
                syntheticTracks.forEach((t) => collectedById.set(t.id, t));
                source = 'synthetic';
            }
            processedCount = preview.length;
            setProgress({ done: processedCount, total: list.length });

            // Stop blocking the whole screen as soon as a representative map
            // can be drawn. The remaining catalog matching continues below.
            publish(remaining.length > 0 ? 'enriching' : 'ready');
            if (typeof options.onPreviewReady === 'function') {
                try {
                    options.onPreviewReady();
                } catch (e) {
                    console.error('[TasteData] onPreviewReady callback failed:', e);
                }
            }

            if (remaining.length > 0) {
                const chunks = [];
                for (let index = 0; index < remaining.length; index += CHUNK_SIZE) {
                    chunks.push(remaining.slice(index, index + CHUNK_SIZE));
                }
                let cursor = 0;
                let completedChunks = 0;
                const workers = Array.from(
                    { length: Math.min(BACKGROUND_REQUEST_CONCURRENCY, chunks.length) },
                    async () => {
                        while (importRunRef.current === runId) {
                            const chunkIndex = cursor;
                            cursor += 1;
                            if (chunkIndex >= chunks.length) return;
                            const chunk = chunks[chunkIndex];
                            try {
                                const result = await requestChunkWithRecovery(
                                    chunk,
                                    mergeResponse,
                                    () => importRunRef.current === runId,
                                );
                                if (result.cancelled || importRunRef.current !== runId) return;
                                failedCount += result.failedCount;
                            } catch {
                                // Recovery itself should not reject, but preserve the
                                // usable map if an unexpected client error occurs.
                                failedCount += chunk.length;
                            }
                            processedCount += chunk.length;
                            completedChunks += 1;
                            setProgress({ done: Math.min(processedCount, list.length), total: list.length });
                            if (
                                completedChunks % BACKGROUND_PUBLISH_EVERY === 0
                                || completedChunks === chunks.length
                            ) {
                                publish('enriching');
                            }
                        }
                    },
                );
                await Promise.all(workers);
            }
        } catch (e) {
            if (importRunRef.current !== runId) return { ok: false, cancelled: true };
            setError(e.message || '트랙 분석에 실패했습니다.');
            setStatus('error');
            return { ok: false };
        }

        if (importRunRef.current !== runId) return { ok: false, cancelled: true };
        const completedTaste = publish('ready');
        if (ownerId && supabase) {
            saveCloudTaste(supabase, ownerId, completedTaste).catch((error) => {
                console.error('[TasteStorage] Cloud save failed:', error);
            });
        }
        return { ok: true, count: collectedById.size, failedCount, isCapped: capped, originalImportCount: originalTotal };
    }, [ownerId]);

    useEffect(() => {
        let disposed = false;
        // Defer until after StrictMode's setup/cleanup probe, preserving resumable imports.
        Promise.resolve().then(() => {
            const pendingSourceList = resumeImportRef.current;
            if (disposed || !pendingSourceList?.length) return;
            resumeImportRef.current = null;
            importTracks(pendingSourceList, {
                seedTracks: initial?.tracks || [],
                mapId: initial?.mapId || null,
                featuresSource: initial?.featuresSource || 'none',
            });
        });
        return () => {
            disposed = true;
            importRunRef.current += 1;
        };
    }, [importTracks, initial]);

    useEffect(() => {
        if (!ownerId || !supabase) return undefined;
        let disposed = false;
        const runId = importRunRef.current;
        fetchCloudTaste(supabase, ownerId).then(async (cloud) => {
            // An import or reset performed while fetching takes precedence.
            if (disposed || importRunRef.current !== runId) return;
            if (shouldRestoreCloudTaste(initial, cloud)) {
                setTracks(cloud.tracks);
                setFeaturesSource(cloud.featuresSource);
                setStats(cloud.stats);
                setMapId(cloud.mapId);
                setStatus('ready');
                setProgress({
                    done: Number(cloud.stats?.processedCount) || cloud.tracks.length,
                    total: Number(cloud.stats?.totalAvailable) || cloud.tracks.length,
                });
                persistLocalTaste(sessionStorage, ownerId, cloud);
            } else if (initial?.tracks?.length && !initial?.stats?.backgroundEnriching
                && (!cloud || Date.parse(initial.updatedAt) > Date.parse(cloud.updatedAt))) {
                await saveCloudTaste(supabase, ownerId, initial);
            }
        }).catch((error) => {
            if (!disposed) console.error('[TasteStorage] Initial cloud sync failed:', error);
        }).finally(() => {
            if (!disposed) setCloudSyncing(false);
        });
        return () => { disposed = true; };
    }, [ownerId, initial]);

    useEffect(() => {
        if (tracks.length > 0 && tracks.some((t) => !t.coverUrl || t.coverUrl.startsWith('data:image/svg+xml'))) {
            enrichTracksWithArtwork(tracks, (updatedList) => {
                setTracks(updatedList);
                if (mapId) {
                    persistLocalTaste(sessionStorage, ownerId, {
                        tracks: updatedList,
                        featuresSource,
                        stats,
                        mapId,
                        updatedAt: new Date().toISOString(),
                    });
                }
            });
        }
    }, [mapId]);

    const reset = useCallback(() => {
        importRunRef.current += 1;
        setTracks([]);
        setFeaturesSource('none');
        setStats(null);
        setMapId(null);
        setStatus('idle');
        setError(null);
        setProgress({ done: 0, total: 0 });
        resumeImportRef.current = null;
        clearLocalTaste(sessionStorage, ownerId);
        if (ownerId && supabase) {
            deleteCloudTaste(supabase, ownerId).catch((error) => {
                console.error('[TasteStorage] Cloud delete failed:', error);
            });
        }
    }, [ownerId]);

    const recordDecision = useCallback((action, track, source = 'web') => {
        if (!track?.id) return;
        const currentMapId = mapId || initial?.mapId || 'default-map';
        const storageKey = reflectionKey(ownerId, currentMapId);

        if (typeof window !== 'undefined' && window.localStorage) {
            appendDecision(window.localStorage, storageKey, action, track, source);
        }

        if (action === 'absorb') {
            setTracks((prev) => {
                const updated = uniqueTracks([...prev, track]);
                const nextStats = {
                    fetchedCount: updated.length,
                    totalAvailable: updated.length,
                    processedCount: updated.length,
                    failedCount: stats?.failedCount || 0,
                    backgroundEnriching: false,
                };
                setStats(nextStats);
                const payload = {
                    tracks: updated,
                    featuresSource,
                    stats: nextStats,
                    mapId: currentMapId,
                    pendingSourceList: null,
                    updatedAt: new Date().toISOString(),
                };
                persistLocalTaste(sessionStorage, ownerId, payload);
                if (ownerId && supabase) {
                    saveCloudTaste(supabase, ownerId, payload).catch((err) => {
                        console.error('[TasteStorage] Cloud save on recordDecision failed:', err);
                    });
                }
                return updated;
            });
        }
    }, [mapId, initial?.mapId, ownerId, featuresSource, stats?.failedCount]);

    const value = {
        tracks,
        featuresSource,
        stats,
        mapId,
        status,
        progress,
        error,
        cloudSyncing,
        hasTaste: tracks.length > 0,
        importTracks,
        recordDecision,
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
