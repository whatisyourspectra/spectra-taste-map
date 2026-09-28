import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const VIDEO_CACHE_PREFIX = 'spectra.youtube-video.v1.';
const VIDEO_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let youtubeIframeApiPromise = null;

function loadYouTubeIframeApi() {
    if (typeof window === 'undefined') return Promise.reject(new Error('YouTube player requires a browser.'));
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

    youtubeIframeApiPromise = new Promise((resolve, reject) => {
        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previousReady?.();
            if (window.YT?.Player) resolve(window.YT);
            else reject(new Error('YouTube IFrame API did not initialize.'));
        };

        let script = document.querySelector('script[data-spectra-youtube-api]');
        if (!script) {
            script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            script.dataset.spectraYoutubeApi = 'true';
            script.addEventListener('error', () => reject(new Error('YouTube IFrame API could not be loaded.')), { once: true });
            document.head.appendChild(script);
        }
    });
    return youtubeIframeApiPromise;
}

function normalizeCachePart(value) {
    return String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 90);
}

function getVideoCacheKey(track) {
    return `${VIDEO_CACHE_PREFIX}${normalizeCachePart(track?.artists)}|${normalizeCachePart(track?.name)}`;
}

function readCachedVideo(track) {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(getVideoCacheKey(track));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.video?.videoId || Date.now() >= Number(parsed.expiresAt || 0)) {
            window.localStorage.removeItem(getVideoCacheKey(track));
            return null;
        }
        return parsed.video;
    } catch {
        return null;
    }
}

function writeCachedVideo(track, video) {
    if (typeof window === 'undefined' || !video?.videoId) return;
    try {
        window.localStorage.setItem(getVideoCacheKey(track), JSON.stringify({
            video,
            expiresAt: Date.now() + VIDEO_CACHE_TTL_MS,
        }));
    } catch {
        // Playback still works when storage is unavailable or full.
    }
}

function formatPlaybackTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const PLAYER_COPY = {
    ko: {
        label: '열차 음악 플레이어',
        resolving: '현재 곡의 YouTube 영상을 찾는 중…',
        loadingPlayer: 'YouTube 플레이어를 준비하는 중…',
        startHint: '자동 재생이 막히면 플레이어의 재생 버튼을 한 번 더 눌러주세요.',
        playing: '재생 중',
        paused: '일시 정지',
        buffering: '불러오는 중',
        next: '다음 곡',
        close: 'YouTube 플레이어 닫기',
        drag: '상단을 드래그해 플레이어 이동',
        resize: '플레이어 크기 조절',
        unavailable: '재생 가능한 YouTube 영상을 찾지 못했습니다.',
        config: '서버에 YOUTUBE_API_KEY를 설정해주세요.',
        retry: '다시 시도',
        previous: '이전 곡',
        nextTrack: '다음 곡',
        play: '재생',
        pause: '일시 정지',
        seek: '재생 위치 이동',
        playlist: '재생 목록',
    },
    en: {
        label: 'Train music player',
        resolving: 'Finding a YouTube video for this track…',
        loadingPlayer: 'Preparing the YouTube player…',
        startHint: 'If autoplay is blocked, press the player button once more.',
        playing: 'Playing',
        paused: 'Paused',
        buffering: 'Loading',
        next: 'Up next',
        close: 'Close YouTube player',
        drag: 'Drag the header to move the player',
        resize: 'Resize player',
        unavailable: 'No playable YouTube video was found.',
        config: 'Set YOUTUBE_API_KEY on the server.',
        retry: 'Retry',
        previous: 'Previous track',
        nextTrack: 'Next track',
        play: 'Play',
        pause: 'Pause',
        seek: 'Seek playback',
        playlist: 'Playlist',
    },
};

const MetroYouTubePlayer = forwardRef(function MetroYouTubePlayer({
    track,
    nextTrack,
    trainName,
    color,
    lang = 'ko',
    panelShifted = false,
    embedded = false,
    autoplayRequested = false,
    playbackIntent = null,
    queuePosition = 0,
    queueLength = 0,
    onPlaybackState,
    onProgress,
    onEnded,
    onPrevious,
    onNext,
    onUnavailable,
    onClose,
}, ref) {
    const copy = PLAYER_COPY[lang] || PLAYER_COPY.ko;
    const playerMountRef = useRef(null);
    const playerWindowRef = useRef(null);
    const playerRef = useRef(null);
    const playerStateRef = useRef('idle');
    const callbacksRef = useRef({});
    const startedRef = useRef(false);
    const unavailableReportedRef = useRef(false);
    const lookupGenerationRef = useRef(0);
    const loadedVideoKeyRef = useRef(null);
    const windowDragRef = useRef(null);
    const windowResizeRef = useRef(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [video, setVideo] = useState(null);
    const [lookupState, setLookupState] = useState('idle');
    const [lookupError, setLookupError] = useState(null);
    const [playbackState, setPlaybackState] = useState('idle');
    const [hasStarted, setHasStarted] = useState(false);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);
    const [retryNonce, setRetryNonce] = useState(0);
    const [positionMs, setPositionMs] = useState(0);
    const [durationMs, setDurationMs] = useState(0);
    const [windowPosition, setWindowPosition] = useState(null);
    const [windowDragging, setWindowDragging] = useState(false);
    const [windowResizing, setWindowResizing] = useState(false);
    const [windowWidth, setWindowWidth] = useState(null);

    callbacksRef.current = {
        onPlaybackState,
        onProgress,
        onEnded,
        onUnavailable,
        playbackIntent,
    };

    const publishPlaybackState = (state) => {
        playerStateRef.current = state;
        setPlaybackState(state);
        callbacksRef.current.onPlaybackState?.(state);
    };

    useImperativeHandle(ref, () => ({
        play() {
            if (!playerReady || !playerRef.current || !video?.videoId) return false;
            setAutoplayBlocked(false);
            playerRef.current.playVideo?.();
            return true;
        },
        pause() {
            if (!playerRef.current) return false;
            playerRef.current.pauseVideo?.();
            return true;
        },
        toggle() {
            if (!playerReady || !playerRef.current || !video?.videoId) return false;
            if (playerStateRef.current === 'playing') playerRef.current.pauseVideo?.();
            else {
                setAutoplayBlocked(false);
                playerRef.current.playVideo?.();
            }
            return true;
        },
        seekTo(nextPositionMs) {
            const nextDurationMs = Math.max(
                0,
                Number(playerRef.current?.getDuration?.()) || 0,
            ) * 1000;
            if (!playerRef.current || nextDurationMs <= 0) return false;
            const boundedPositionMs = Math.min(
                Math.max(0, Number(nextPositionMs) || 0),
                nextDurationMs,
            );
            playerRef.current.seekTo?.(boundedPositionMs / 1000, true);
            setPositionMs(boundedPositionMs);
            setDurationMs(nextDurationMs);
            callbacksRef.current.onProgress?.({
                positionMs: boundedPositionMs,
                durationMs: nextDurationMs,
            });
            return true;
        },
        getState() {
            return playerStateRef.current;
        },
    }), [playerReady, video?.videoId]);

    useEffect(() => {
        let cancelled = false;
        let createdPlayer = null;
        loadYouTubeIframeApi()
            .then((YT) => {
                if (cancelled || !playerMountRef.current) return;
                createdPlayer = new YT.Player(playerMountRef.current, {
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        autoplay: 1,
                        controls: 1,
                        playsinline: 1,
                        rel: 0,
                        origin: window.location.origin,
                    },
                    events: {
                        onReady: () => {
                            if (cancelled) return;
                            setPlayerReady(true);
                        },
                        onStateChange: (event) => {
                            if (cancelled) return;
                            if (event.data === YT.PlayerState.PLAYING) {
                                if (callbacksRef.current.playbackIntent === false) {
                                    createdPlayer?.pauseVideo?.();
                                    return;
                                }
                                startedRef.current = true;
                                setHasStarted(true);
                                setAutoplayBlocked(false);
                                publishPlaybackState('playing');
                            } else if (event.data === YT.PlayerState.PAUSED) {
                                publishPlaybackState('paused');
                            } else if (event.data === YT.PlayerState.BUFFERING) {
                                publishPlaybackState('buffering');
                            } else if (event.data === YT.PlayerState.CUED) {
                                publishPlaybackState('cued');
                            } else if (event.data === YT.PlayerState.ENDED) {
                                publishPlaybackState('ended');
                                callbacksRef.current.onEnded?.();
                            }
                        },
                        onError: (event) => {
                            if (cancelled || unavailableReportedRef.current) return;
                            unavailableReportedRef.current = true;
                            publishPlaybackState('error');
                            callbacksRef.current.onUnavailable?.({
                                code: `YOUTUBE_PLAYER_${event.data}`,
                                message: copy.unavailable,
                            });
                        },
                        onAutoplayBlocked: () => {
                            if (cancelled) return;
                            setAutoplayBlocked(true);
                            publishPlaybackState('paused');
                        },
                    },
                });
                playerRef.current = createdPlayer;
            })
            .catch((error) => {
                if (cancelled) return;
                setLookupError({ code: 'YOUTUBE_PLAYER_LOAD', message: error.message });
                setLookupState('error');
            });

        return () => {
            cancelled = true;
            try { createdPlayer?.destroy?.(); } catch { /* the iframe may already be detached */ }
            playerRef.current = null;
        };
    }, [copy.unavailable]);

    useEffect(() => {
        const resetWindowPosition = () => {
            windowDragRef.current = null;
            windowResizeRef.current = null;
            setWindowDragging(false);
            setWindowResizing(false);
            setWindowPosition(null);
            setWindowWidth(null);
        };
        window.addEventListener('resize', resetWindowPosition);
        return () => window.removeEventListener('resize', resetWindowPosition);
    }, []);

    useEffect(() => {
        const artist = String(track?.artists || '').trim();
        const title = String(track?.name || '').trim();
        if (!artist || !title) return undefined;
        const generation = lookupGenerationRef.current + 1;
        lookupGenerationRef.current = generation;
        unavailableReportedRef.current = false;
        setLookupError(null);

        const cached = readCachedVideo(track);
        if (cached) {
            setVideo(cached);
            setLookupState('ready');
            return undefined;
        }

        const controller = new AbortController();
        setVideo(null);
        setLookupState('loading');
        const params = new URLSearchParams({ artist, title });
        fetch(`${API_BASE}/api/youtube/search?${params.toString()}`, { signal: controller.signal })
            .then(async (response) => {
                const data = await response.json().catch(() => null);
                if (!response.ok) {
                    const error = new Error(data?.error || `YouTube search failed (${response.status})`);
                    error.code = data?.code || 'YOUTUBE_SEARCH_FAILED';
                    throw error;
                }
                return data?.video || null;
            })
            .then((resolvedVideo) => {
                if (controller.signal.aborted || lookupGenerationRef.current !== generation) return;
                if (!resolvedVideo?.videoId) {
                    const error = { code: 'YOUTUBE_VIDEO_NOT_FOUND', message: copy.unavailable };
                    setLookupError(error);
                    setLookupState('error');
                    if (!unavailableReportedRef.current) {
                        unavailableReportedRef.current = true;
                        callbacksRef.current.onUnavailable?.(error);
                    }
                    return;
                }
                writeCachedVideo(track, resolvedVideo);
                setVideo(resolvedVideo);
                setLookupState('ready');
            })
            .catch((error) => {
                if (controller.signal.aborted || lookupGenerationRef.current !== generation) return;
                setLookupError({
                    code: error.code || 'YOUTUBE_SEARCH_FAILED',
                    message: error.code === 'YOUTUBE_NOT_CONFIGURED' ? copy.config : error.message,
                });
                setLookupState('error');
            });
        return () => controller.abort();
    }, [copy.config, copy.unavailable, retryNonce, track]);

    useEffect(() => {
        if (!video?.videoId) {
            loadedVideoKeyRef.current = null;
            return;
        }
        if (!playerReady || !playerRef.current) return;
        const videoKey = `${track?.id || ''}:${video.videoId}`;
        if (loadedVideoKeyRef.current === videoKey) return;
        loadedVideoKeyRef.current = videoKey;
        unavailableReportedRef.current = false;
        setPositionMs(0);
        setDurationMs(0);
        if (playbackIntent === true || (playbackIntent === null && (autoplayRequested || startedRef.current))) {
            publishPlaybackState('buffering');
            playerRef.current.loadVideoById?.(video.videoId);
        } else {
            publishPlaybackState('cued');
            playerRef.current.cueVideoById?.(video.videoId);
        }
    }, [autoplayRequested, playbackIntent, playerReady, track?.id, video?.videoId]);

    useEffect(() => {
        if (playbackIntent === null || !playerReady || !video?.videoId || !playerRef.current) return;
        if (playbackIntent && ['paused', 'cued', 'ended'].includes(playerStateRef.current)) {
            playerRef.current.playVideo?.();
        } else if (!playbackIntent && ['playing', 'buffering'].includes(playerStateRef.current)) {
            playerRef.current.pauseVideo?.();
        }
    }, [playbackIntent, playerReady, video?.videoId]);

    useEffect(() => {
        if (!playerReady || !video?.videoId || !playerRef.current) return undefined;
        const publishProgress = () => {
            const player = playerRef.current;
            if (!player) return;
            const nextPositionMs = Math.max(0, Number(player.getCurrentTime?.()) || 0) * 1000;
            const nextDurationMs = Math.max(0, Number(player.getDuration?.()) || 0) * 1000;
            setPositionMs(nextPositionMs);
            setDurationMs(nextDurationMs);
            if (playerStateRef.current === 'playing') {
                callbacksRef.current.onProgress?.({
                    positionMs: nextPositionMs,
                    durationMs: nextDurationMs,
                });
            }
        };
        publishProgress();
        const interval = window.setInterval(
            publishProgress,
            playbackState === 'playing' ? 250 : 800,
        );
        return () => window.clearInterval(interval);
    }, [playbackState, playerReady, video?.videoId]);

    const seekTo = (nextPositionMs) => {
        const boundedPositionMs = Math.min(
            Math.max(0, Number(nextPositionMs) || 0),
            Math.max(0, durationMs),
        );
        playerRef.current?.seekTo?.(boundedPositionMs / 1000, true);
        setPositionMs(boundedPositionMs);
        callbacksRef.current.onProgress?.({
            positionMs: boundedPositionMs,
            durationMs,
        });
    };

    const togglePlayback = () => {
        if (!playerRef.current || !video?.videoId) return;
        if (playerStateRef.current === 'playing') playerRef.current.pauseVideo?.();
        else {
            setAutoplayBlocked(false);
            playerRef.current.playVideo?.();
        }
    };

    const playPrevious = () => {
        if (positionMs > 3000) {
            seekTo(0);
            return;
        }
        onPrevious?.();
    };

    const startWindowDrag = (event) => {
        if (embedded || event.button !== 0 || event.target.closest('button')) return;
        const node = playerWindowRef.current;
        const container = node?.offsetParent;
        if (!node || !container) return;
        const nodeRect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        windowDragRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - nodeRect.left,
            offsetY: event.clientY - nodeRect.top,
        };
        setWindowPosition({
            left: nodeRect.left - containerRect.left,
            top: nodeRect.top - containerRect.top,
        });
        setWindowDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.preventDefault();
    };

    const moveWindow = (event) => {
        const drag = windowDragRef.current;
        const node = playerWindowRef.current;
        const container = node?.offsetParent;
        if (!drag || drag.pointerId !== event.pointerId || !node || !container) return;
        const nodeRect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const gutter = 8;
        const maxLeft = Math.max(gutter, containerRect.width - nodeRect.width - gutter);
        const maxTop = Math.max(gutter, containerRect.height - nodeRect.height - gutter);
        setWindowPosition({
            left: Math.min(maxLeft, Math.max(gutter, event.clientX - containerRect.left - drag.offsetX)),
            top: Math.min(maxTop, Math.max(gutter, event.clientY - containerRect.top - drag.offsetY)),
        });
    };

    const endWindowDrag = (event) => {
        if (windowDragRef.current?.pointerId !== event.pointerId) return;
        windowDragRef.current = null;
        setWindowDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    };

    const startWindowResize = (event) => {
        if (event.button !== 0) return;
        const node = playerWindowRef.current;
        if (!node) return;
        windowResizeRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startWidth: node.getBoundingClientRect().width,
        };
        setWindowResizing(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
    };

    const resizeWindow = (event) => {
        const resize = windowResizeRef.current;
        const node = playerWindowRef.current;
        const container = node?.offsetParent;
        if (!resize || resize.pointerId !== event.pointerId || !node || !container) return;
        const containerRect = container.getBoundingClientRect();
        const minWidth = Math.min(320, containerRect.width - 16);
        const maxWidth = Math.max(minWidth, Math.min(520, containerRect.width - 16));
        const deltaX = event.clientX - resize.startClientX;
        const deltaY = event.clientY - resize.startClientY;
        const resizeDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY * 0.9;
        const nextWidth = Math.min(
            maxWidth,
            Math.max(minWidth, resize.startWidth + resizeDelta),
        );
        setWindowWidth(nextWidth);
        setWindowPosition((current) => current ? {
            ...current,
            left: Math.min(current.left, Math.max(8, containerRect.width - nextWidth - 8)),
        } : current);
    };

    const endWindowResize = (event) => {
        if (windowResizeRef.current?.pointerId !== event.pointerId) return;
        windowResizeRef.current = null;
        setWindowResizing(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    };

    const stateLabel = playbackState === 'playing'
        ? copy.playing
        : (playbackState === 'buffering' ? copy.buffering : copy.paused);
    const showStartAction = autoplayRequested
        && video?.videoId
        && playerReady
        && (!hasStarted || autoplayBlocked);

    return (
        <aside
            ref={playerWindowRef}
            className={`tm2-youtube-player${panelShifted ? ' panel-shifted' : ''}${windowDragging ? ' dragging' : ''}${windowResizing ? ' resizing' : ''}`}
            aria-label={copy.label}
            style={{
                '--tm2-youtube-accent': color || '#ff4e45',
                ...(windowPosition ? {
                    left: `${windowPosition.left}px`,
                    right: 'auto',
                    top: `${windowPosition.top}px`,
                } : {}),
                ...(windowWidth ? { width: `${windowWidth}px` } : {}),
            }}
        >
            <header
                title={embedded ? undefined : copy.drag}
                onPointerDown={startWindowDrag}
                onPointerMove={moveWindow}
                onPointerUp={endWindowDrag}
                onPointerCancel={endWindowDrag}
            >
                <div>
                    <span><i /> YouTube</span>
                    <strong>{trainName}</strong>
                </div>
                <button type="button" onClick={onClose} aria-label={copy.close}>×</button>
            </header>

            <div className="tm2-youtube-frame">
                <div ref={playerMountRef} />
                {!playerReady && !lookupError ? <div className="tm2-youtube-overlay">{copy.loadingPlayer}</div> : null}
                {lookupState === 'loading' ? <div className="tm2-youtube-overlay">{copy.resolving}</div> : null}
                {lookupError ? (
                    <div className="tm2-youtube-overlay error">
                        <span>!</span>
                        <strong>{lookupError.message || copy.unavailable}</strong>
                        <button type="button" onClick={() => setRetryNonce((current) => current + 1)}>{copy.retry}</button>
                    </div>
                ) : null}
            </div>

            <div className="tm2-youtube-now">
                <div>
                    <span>{stateLabel}</span>
                    <strong>{track?.name || '-'}</strong>
                    <small>{track?.artists || video?.channelTitle || '-'}</small>
                </div>
                <span className={`tm2-youtube-state state-${playbackState}`} aria-hidden><i /><i /><i /></span>
            </div>
            <div className="tm2-youtube-transport">
                <div className="tm2-youtube-controls">
                    <button type="button" onClick={playPrevious} aria-label={copy.previous}>◀◀</button>
                    <button
                        type="button"
                        className="primary"
                        onClick={togglePlayback}
                        disabled={!video?.videoId}
                        aria-label={playbackState === 'playing' ? copy.pause : copy.play}
                    >
                        {playbackState === 'playing' ? 'Ⅱ' : '▶'}
                    </button>
                    <button type="button" onClick={onNext} disabled={!onNext} aria-label={copy.nextTrack}>▶▶</button>
                    <span aria-label={copy.playlist}>
                        {Math.max(0, queuePosition)} / {Math.max(0, queueLength)}
                    </span>
                </div>
                <label className="tm2-youtube-progress">
                    <input
                        type="range"
                        min="0"
                        max={Math.max(1, durationMs)}
                        step="250"
                        value={Math.min(positionMs, Math.max(1, durationMs))}
                        disabled={durationMs <= 0}
                        onChange={(event) => seekTo(event.target.value)}
                        aria-label={copy.seek}
                        style={{
                            '--tm2-youtube-progress': `${durationMs > 0 ? (positionMs / durationMs) * 100 : 0}%`,
                        }}
                    />
                    <span>
                        <time>{formatPlaybackTime(positionMs)}</time>
                        <time>{formatPlaybackTime(durationMs)}</time>
                    </span>
                </label>
            </div>
            {showStartAction ? <p className="tm2-youtube-start-hint">{copy.startHint}</p> : null}
            {nextTrack ? <footer>
                <span>{copy.next}</span>
                <strong>{nextTrack?.name || track?.name || '-'}</strong>
            </footer> : null}
            {!embedded ? <button
                type="button"
                className="tm2-youtube-resize-handle"
                aria-label={copy.resize}
                title={copy.resize}
                onPointerDown={startWindowResize}
                onPointerMove={resizeWindow}
                onPointerUp={endWindowResize}
                onPointerCancel={endWindowResize}
            /> : null}
        </aside>
    );
});

export default MetroYouTubePlayer;
