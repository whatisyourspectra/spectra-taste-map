import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const api = (path) => `${API_BASE}${path}`;

import { loadLocalTaste, persistLocalTaste, tasteStorageKey } from '../taste/tasteStorage';
const CHUNK_SIZE = 40;
const PREVIEW_TRACK_COUNT = 32;
const BACKGROUND_REQUEST_CONCURRENCY = 1;
const BACKGROUND_PUBLISH_EVERY = 5;
const REQUEST_RETRY_COUNT = 2;
const MIN_RECOVERY_CHUNK_SIZE = 10;

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
    const activeSourceListRef = useRef(
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

    const importTracks = useCallback(async (parsedList, options = {}) => {
        const list = Array.isArray(parsedList) ? parsedList : [];
        if (list.length === 0) {
            setError('불러온 곡이 없습니다. 목록을 확인해 주세요.');
            setStatus('error');
            return { ok: false };
        }
        const seededTracks = Array.isArray(options.seedTracks) ? options.seedTracks : [];
        setStatus(seededTracks.length > 0 ? 'enriching' : 'importing');
        setError(null);
        setProgress({ done: 0, total: list.length });

        const runId = importRunRef.current + 1;
        importRunRef.current = runId;
        activeSourceListRef.current = list;
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
            activeSourceListRef.current = pendingSourceList;
            persistLocalTaste(sessionStorage, ownerId, {
                tracks: nextTracks,
                featuresSource: source,
                stats: nextStats,
                mapId: id,
                pendingSourceList,
            });
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
                throw new Error('초기 곡 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            }
            processedCount = preview.length;
            setProgress({ done: processedCount, total: list.length });

            // Stop blocking the whole screen as soon as a representative map
            // can be drawn. The remaining catalog matching continues below.
            publish(remaining.length > 0 ? 'enriching' : 'ready');

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
                                publish(completedChunks === chunks.length ? 'ready' : 'enriching');
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
        publish('ready');
        return { ok: true, count: collectedById.size, failedCount };
    }, [ownerId]);

    useEffect(() => {
        const pendingSourceList = resumeImportRef.current;
        if (!pendingSourceList?.length) return;
        resumeImportRef.current = null;
        importTracks(pendingSourceList, {
            seedTracks: initial?.tracks || [],
            mapId: initial?.mapId || null,
            featuresSource: initial?.featuresSource || 'none',
        });
    }, [importTracks, initial?.featuresSource, initial?.mapId, initial?.tracks]);

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
        activeSourceListRef.current = null;
        try {
            sessionStorage.removeItem(tasteStorageKey(ownerId));
            sessionStorage.removeItem('spectra:taste:v3');
            sessionStorage.removeItem('spectra:taste:v4');
        } catch { /* ignore */ }
    }, [ownerId]);

    // Keep sessionStorage in sync if tracks change after mount (e.g. re-import).
    useEffect(() => {
        if ((status === 'ready' || status === 'enriching') && tracks.length > 0) {
            persistLocalTaste(sessionStorage, ownerId, {
                tracks,
                featuresSource,
                stats,
                mapId,
                pendingSourceList: status === 'enriching'
                    ? activeSourceListRef.current
                    : null,
            });
        }
    }, [status, tracks, featuresSource, stats, mapId, ownerId]);

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
