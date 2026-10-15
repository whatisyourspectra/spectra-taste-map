import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const api = (path) => `${API_BASE}${path}`;

import {
    loadLocalTaste,
    isDemoTaste,
    clearDemoTaste,
    persistLocalTaste,
    clearLocalTaste,
    fetchCloudTaste,
    saveCloudTaste,
    deleteCloudTaste,
    shouldRestoreCloudTaste,
    shouldUploadLocalTaste,
} from '../taste/tasteStorage';
import { pendingImportTrack, mergeImportedTracks } from '../utils/importTracks';
import { importTrackKey } from '../utils/parseTrackList';
import { uniqueTracks } from '../taste/buildTasteState';
import { appendDecision, reflectionKey } from '../reflection/reflectionStorage';
import { supabase } from '../auth/supabaseClient';
const CHUNK_SIZE = 5;
const PREVIEW_TRACK_COUNT = 5;
const BACKGROUND_REQUEST_CONCURRENCY = 2;
const BACKGROUND_PUBLISH_EVERY = 1;
const REQUEST_RETRY_COUNT = 1;
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
        signal: AbortSignal.timeout(20000),
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
        return { failedCount: Math.max(0, chunk.length - (data?.tracks?.length || 0)), cancelled: false };
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
    const [cloudSaveStatus, setCloudSaveStatus] = useState('local');
    const cloudSaveAttemptRef = useRef(0);
    const currentTasteRef = useRef(initial);

    const saveToAccount = useCallback(async (taste) => {
        if (!ownerId || !supabase || !taste?.tracks?.length || isDemoTaste(taste)) return false;
        const attempt = ++cloudSaveAttemptRef.current;
        setCloudSaveStatus('saving');
        try {
            await saveCloudTaste(supabase, ownerId, taste);
            if (attempt === cloudSaveAttemptRef.current) setCloudSaveStatus('saved');
            return true;
        } catch (error) {
            if (attempt === cloudSaveAttemptRef.current) setCloudSaveStatus('error');
            console.error('[TasteStorage] Account save failed:', error);
            return false;
        }
    }, [ownerId]);

    const importTracks = useCallback(async (parsedList, options = {}) => {
        const rawList = Array.isArray(parsedList) ? parsedList : [];
        if (rawList.length === 0) {
            setError('불러온 곡이 없습니다. 목록을 확인해 주세요.');
            setStatus('error');
            return { ok: false };
        }

        const { items: list, capped, originalTotal } = limitImportTracks(rawList);
        setCloudSaveStatus('local');

        // Instant path for pre-enriched demo tracks or tracks with precomputed features
        if (options.preEnriched || (rawList.length > 0 && typeof rawList[0].valence === 'number')) {
            const runId = ++importRunRef.current;
            const id = options.mapId || newMapId();
            const source = options.featuresSource || 'spotify-genres';
            const nextStats = {
                isDemo: isDemoTaste({ tracks: list }),
                demoUniverse: options.demoUniverse || null,
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
            const completedTaste = {
                tracks: list,
                featuresSource: source,
                stats: nextStats,
                mapId: id,
                updatedAt: new Date().toISOString(),
            };
            currentTasteRef.current = completedTaste;
            persistLocalTaste(sessionStorage, ownerId, completedTaste);

            if (typeof window !== 'undefined' && list.length > 0) {
                enrichTracksWithArtwork(list, (updatedList) => {
                    if (importRunRef.current !== runId) return;
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

            await saveToAccount(completedTaste);
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
            list.map(track => [importTrackKey(track), seededTracks.find(seed => (seed.importKey || importTrackKey(seed)) === importTrackKey(track)) || pendingImportTrack(track)]),
        );
        let source = options.featuresSource || 'none';
        let processedCount = 0;
        let failedCount = 0;

        const mergeResponse = (data) => {
            if (Array.isArray(data?.tracks)) {
                mergeImportedTracks(collectedById, data.tracks);
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
                metadataPendingCount: nextTracks.filter(track => track.metadataPending).length,
                backgroundEnriching: nextStatus === 'enriching',
            };
            setTracks(nextTracks);
            setFeaturesSource(source);
            setStats(nextStats);
            setMapId(id);
            setStatus(nextStatus);
            const pendingSourceList = nextStatus === 'enriching' || nextStats.metadataPendingCount > 0 ? list : null;
            const payloadToPersist = {
                tracks: nextTracks,
                featuresSource: source,
                stats: nextStats,
                mapId: id,
                pendingSourceList,
                updatedAt: new Date().toISOString(),
            };
            persistLocalTaste(sessionStorage, ownerId, payloadToPersist);
            currentTasteRef.current = payloadToPersist;
            return payloadToPersist;
        };

        // Make every imported title available immediately; enrich in the background.
        publish('enriching');
        options.onPreviewReady?.();
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
            if (previewResult.failedCount === preview.length) {
                failedCount = list.length;
                processedCount = list.length;
                setProgress({done: list.length, total: list.length});
                const retained = publish('ready');
                await saveToAccount(retained);
                return {ok: true, count: collectedById.size, failedCount};
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
        await saveToAccount(completedTaste);
        return { ok: true, count: collectedById.size, failedCount, isCapped: capped, originalImportCount: originalTotal };
    }, [ownerId, saveToAccount]);

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
                currentTasteRef.current = cloud;
                setCloudSaveStatus('saved');
            } else if (shouldUploadLocalTaste(initial, cloud)) {
                await saveToAccount(initial);
            } else if (cloud?.tracks?.length && !isDemoTaste(cloud)) {
                setCloudSaveStatus('saved');
            }
        }).catch((error) => {
            if (!disposed) {
                setCloudSaveStatus('error');
                console.error('[TasteStorage] Initial cloud sync failed:', error);
            }
        }).finally(() => {
            if (!disposed) setCloudSyncing(false);
        });
        return () => { disposed = true; };
    }, [ownerId, initial, saveToAccount]);

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
        currentTasteRef.current = null;
        cloudSaveAttemptRef.current++;
        setCloudSaveStatus('local');
        resumeImportRef.current = null;
        const demo = isDemoTaste({ tracks, stats });
        if (demo) clearDemoTaste(sessionStorage, ownerId);
        else clearLocalTaste(sessionStorage, ownerId);
        if (!demo && ownerId && supabase) {
            deleteCloudTaste(supabase, ownerId).catch((error) => {
                console.error('[TasteStorage] Cloud delete failed:', error);
            });
        }
    }, [ownerId, tracks, stats]);

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
                    isDemo: stats?.isDemo === true,
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
                currentTasteRef.current = payload;
                void saveToAccount(payload);
                return updated;
            });
        }
    }, [mapId, initial?.mapId, ownerId, featuresSource, stats?.failedCount, stats?.isDemo, saveToAccount]);

    const retryCloudSync = useCallback(async () => {
        if (!ownerId || !supabase) return;
        const runId = importRunRef.current;
        setCloudSyncing(true);
        try {
            // Read before retrying a save: another device may have a newer map.
            const cloud = await fetchCloudTaste(supabase, ownerId);
            if (importRunRef.current !== runId) return;
            const local = currentTasteRef.current;
            if (!local?.stats?.backgroundEnriching && shouldRestoreCloudTaste(local, cloud)) {
                currentTasteRef.current = cloud;
                setTracks(cloud.tracks);
                setFeaturesSource(cloud.featuresSource);
                setStats(cloud.stats);
                setMapId(cloud.mapId);
                setStatus('ready');
                persistLocalTaste(sessionStorage, ownerId, cloud);
                setCloudSaveStatus('saved');
            } else if (shouldUploadLocalTaste(local, cloud)) {
                await saveToAccount(local);
            } else {
                setCloudSaveStatus(cloud && !isDemoTaste(cloud) ? 'saved' : 'local');
            }
        } catch (error) {
            if (importRunRef.current === runId) setCloudSaveStatus('error');
            console.error('[TasteStorage] Retry failed:', error);
        } finally { setCloudSyncing(false); }
    }, [ownerId, saveToAccount]);

    const retryImportAnalysis = useCallback(() => {
        const taste = currentTasteRef.current;
        if (!taste?.pendingSourceList?.length || taste.stats?.backgroundEnriching) return;
        return importTracks(taste.pendingSourceList, {seedTracks: taste.tracks, mapId: taste.mapId, featuresSource: taste.featuresSource});
    }, [importTracks]);

    const value = {
        retryImportAnalysis,
        tracks,
        featuresSource,
        stats,
        mapId,
        status,
        progress,
        error,
        cloudSyncing,
        cloudSaveStatus,
        retryCloudSync,
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
