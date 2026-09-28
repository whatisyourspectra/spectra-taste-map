import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import MetroYouTubePlayer from './MetroYouTubePlayer';
import './ConstellationVoyager.css';

function VoyageIcon({ name, className = '' }) {
    return (
        <svg className={`cv-icon ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {name === 'constellation' && <>
                <path d="M4 17 10 6l9 11M4 17l15 0" />
                <circle cx="4" cy="17" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="10" cy="6" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="19" cy="17" r="1.5" fill="currentColor" stroke="none" />
            </>}
            {name === 'play' && <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />}
            {name === 'pause' && <><path d="M8 5v14M16 5v14" strokeWidth="2.5" /></>}
            {name === 'previous' && <><path d="M5 5v14" /><path d="m18 5-10 7 10 7V5Z" fill="currentColor" stroke="none" /></>}
            {name === 'next' && <><path d="M19 5v14" /><path d="m6 5 10 7-10 7V5Z" fill="currentColor" stroke="none" /></>}
            {name === 'video' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></>}
            {name === 'external' && <><path d="M13 5h6v6M19 5l-9 9" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>}
        </svg>
    );
}

/**
 * Spaceship and active star pulse waves rendered inside the SVG coordinate space.
 */
/**
 * Spaceship and active star pulse waves rendered inside the SVG coordinate space.
 */
export function ConstellationSpaceshipSVG({
    currentTrackId,
    targetTrackId,
    items,
    isCruising,
    onFlightComplete,
}) {
    const itemMap = useMemo(() => {
        const map = new Map();
        items.forEach((item) => {
            if (item?.node?.track?.id) {
                map.set(item.node.track.id, item);
            }
        });
        return map;
    }, [items]);

    const itemMapRef = useRef(itemMap);
    itemMapRef.current = itemMap;

    const [flightState, setFlightState] = useState(null);
    const flightRef = useRef(null);
    const animRef = useRef(null);
    const prevTrackIdRef = useRef(currentTrackId);
    const lastAngleRef = useRef(0);

    // Trigger flight animation when currentTrackId changes
    useEffect(() => {
        const prevId = prevTrackIdRef.current;
        prevTrackIdRef.current = currentTrackId;

        if (!prevId || prevId === currentTrackId) {
            return;
        }

        const startItem = itemMapRef.current.get(prevId);
        const targetItem = itemMapRef.current.get(currentTrackId);

        if (!startItem || !targetItem) {
            return;
        }

        const dx = targetItem.xPx - startItem.xPx;
        const dy = targetItem.yPx - startItem.yPx;
        const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        lastAngleRef.current = targetAngle;

        const startTime = performance.now();
        const duration = 750;

        if (animRef.current) cancelAnimationFrame(animRef.current);

        flightRef.current = {
            fromId: prevId,
            toId: currentTrackId,
            startTime,
            duration,
            angle: targetAngle,
        };

        const animate = (time) => {
            if (!flightRef.current) return;
            const flight = flightRef.current;
            const elapsed = time - flight.startTime;
            const progress = Math.min(1, elapsed / flight.duration);

            // Ease-in-out cubic
            const ease = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const from = itemMapRef.current.get(flight.fromId);
            const to = itemMapRef.current.get(flight.toId);

            if (!from || !to) {
                flightRef.current = null;
                setFlightState(null);
                return;
            }

            const curX = from.xPx + (to.xPx - from.xPx) * ease;
            const curY = from.yPx + (to.yPx - from.yPx) * ease;

            setFlightState({
                x: curX,
                y: curY,
                angle: flight.angle,
                inFlight: true,
            });

            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            } else {
                flightRef.current = null;
                setFlightState(null);
                onFlightComplete?.();
            }
        };

        animRef.current = requestAnimationFrame(animate);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [currentTrackId, onFlightComplete]);

    const activeItem = itemMap.get(currentTrackId);
    if (!activeItem) return null;

    const posX = flightState ? flightState.x : activeItem.xPx;
    const posY = flightState ? flightState.y : activeItem.yPx;
    const posAngle = flightState ? flightState.angle : lastAngleRef.current;
    const showFlame = flightState?.inFlight || isCruising;

    return (
        <g className="cv-spaceship-layer">
            <defs>
                <linearGradient id="cv-thruster-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#0284c7" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Active Star Radar Pulses */}
            {activeItem && (
                <g transform={`translate(${activeItem.xPx}, ${activeItem.yPx})`}>
                    <circle
                        cx="0"
                        cy="0"
                        r="24"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        className="cv-star-pulse-ring"
                    />
                    <circle
                        cx="0"
                        cy="0"
                        r="36"
                        fill="none"
                        stroke="#7dd3fc"
                        strokeWidth="1"
                        className="cv-star-pulse-ring-outer"
                    />
                </g>
            )}

            {/* Spaceship */}
            <g
                className="cv-spaceship"
                transform={`translate(${posX}, ${posY}) rotate(${posAngle})`}
            >
                {/* Engine Flame */}
                {showFlame && (
                    <path
                        d="M -4 12 Q 0 30 0 34 Q 0 30 4 12 Z"
                        fill="url(#cv-thruster-gradient)"
                        className="cv-thruster-flame"
                    />
                )}

                {/* Starlight Ambient Glow */}
                <circle r="18" fill="rgba(56, 189, 248, 0.25)" filter="blur(5px)" />

                {/* Main Spaceship Hull */}
                <path
                    d="M 0 -17 L 11 11 L 0 7 L -11 11 Z"
                    fill="#f8fafc"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                />

                {/* Cockpit Gem */}
                <ellipse cx="0" cy="-3" rx="2.5" ry="4.5" fill="#0284c7" />

                {/* Wingtip Navigation Beacons */}
                <circle cx="-10.5" cy="10" r="1.5" fill="#f43f5e" />
                <circle cx="10.5" cy="10" r="1.5" fill="#10b981" />
            </g>
        </g>
    );
}

/**
 * Fullscreen HUD Overlay for Constellation Voyage
 */
export default function ConstellationVoyagerHUD({
    cluster,
    tracks,
    currentTrack,
    sequence,
    isPlaying,
    onTogglePlay,
    onNextStar,
    onPrevStar,
    onFinish,
    onPlaybackChange,
    onClose,
    lang = 'ko',
}) {
    const [showVideoPip, setShowVideoPip] = useState(false);

    const currentIndex = useMemo(() => {
        if (!currentTrack || !sequence.length) return 0;
        const idx = sequence.indexOf(currentTrack.id);
        return idx >= 0 ? idx : 0;
    }, [currentTrack, sequence]);

    const totalStars = sequence.length || tracks.length;
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < sequence.length - 1;
    const coverUrl = currentTrack?.coverUrl || currentTrack?.albumArt
        || currentTrack?.imageUrl || currentTrack?.album?.images?.[0]?.url;

    const constellationName = useMemo(() => {
        if (cluster?.label?.name) {
            const name = cluster.label.name.replaceAll('성좌', '별자리');
            return lang === 'en'
                ? `${cluster.label.name} Constellation`
                : (name.endsWith('별자리') ? name : `${name} 별자리`);
        }
        return lang === 'en' ? 'Starlight Constellation' : '나의 별자리';
    }, [cluster, lang]);

    // Keyboard navigation (ESC: exit, Space: play/pause, Left/Right: prev/next star)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            } else if (e.code === 'Space') {
                e.preventDefault();
                onTogglePlay?.();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                onNextStar?.();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onPrevStar?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onTogglePlay, onNextStar, onPrevStar]);

    const nextTrack = useMemo(() => {
        if (!hasNext) return null;
        const nextId = sequence[currentIndex + 1];
        return tracks.find((t) => t.id === nextId) || null;
    }, [sequence, currentIndex, tracks, hasNext]);

    return (
        <div className="cv-hud-root">
            {/* Top Constellation Banner */}
            <div className="cv-header-banner">
                <span className="cv-badge-icon"><VoyageIcon name="constellation" /></span>
                <div className="cv-header-titles">
                    <span className="cv-constellation-title">{constellationName}</span>
                    <span className="cv-constellation-subtitle">
                        {lang === 'en' ? 'Cruising constellation' : '별자리 탐색 중'}
                        <span className="cv-star-counter">
                            STAR {currentIndex + 1} / {totalStars}
                        </span>
                    </span>
                </div>
            </div>

            {/* Top-Right Exit Button */}
            <button
                type="button"
                className="cv-exit-btn"
                onClick={onClose}
                title={lang === 'en' ? 'Return to TasteMap (ESC)' : 'TasteMap으로 돌아가기 (ESC)'}
            >
                <span>{lang === 'en' ? 'Return to TasteMap' : 'TasteMap으로 돌아가기'}</span>
                <span className="cv-exit-key">ESC</span>
            </button>

            {/* Bottom Voyager HUD Dock */}
            <div className="cv-dock">
                {/* Track Information */}
                <div className="cv-track-info">
                    <div className="cv-track-cover">
                        {coverUrl ? (
                            <img src={coverUrl} alt="" />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: cluster?.color || '#38bdf8' }} />
                        )}
                    </div>
                    <div className="cv-track-texts">
                        <span className="cv-track-title">{currentTrack?.name || 'Unknown Track'}</span>
                        <span className="cv-track-artist">{currentTrack?.artists || 'Unknown Artist'}</span>
                    </div>
                </div>

                {/* Voyage Controls */}
                <div className="cv-controls">
                    <button
                        type="button"
                        className="cv-ctrl-btn"
                        onClick={onPrevStar}
                        disabled={!hasPrevious}
                        title={lang === 'en' ? 'Previous Star (Left Arrow)' : '이전 별 (←)'}
                    >
                        <VoyageIcon name="previous" />
                    </button>

                    <button
                        type="button"
                        className={`cv-cruise-toggle-btn${isPlaying ? ' is-cruising' : ''}`}
                        onClick={onTogglePlay}
                        title={lang === 'en' ? 'Pause or resume voyage (Space)' : '별자리 항해 일시정지/재개 (Space)'}
                    >
                        <VoyageIcon name={isPlaying ? 'pause' : 'play'} />
                        <span>
                            {isPlaying
                                ? (lang === 'en' ? 'Cruising' : '항해 중')
                                : (lang === 'en' ? 'Start Cruise' : '항해 시작')}
                        </span>
                    </button>

                    <button
                        type="button"
                        className="cv-ctrl-btn"
                        onClick={onNextStar}
                        disabled={!hasNext}
                        title={lang === 'en' ? 'Next Star (Right Arrow)' : '다음 별 (→)'}
                    >
                        <VoyageIcon name="next" />
                    </button>
                </div>

                {/* Right Action Icons */}
                <div className="cv-actions">
                    <button
                        type="button"
                        className={`cv-action-icon-btn${showVideoPip ? ' active' : ''}`}
                        onClick={() => setShowVideoPip((prev) => !prev)}
                        title={lang === 'en' ? 'Toggle YouTube video window' : 'YouTube 영상 창 열기/닫기'}
                    >
                        <VoyageIcon name="video" />
                    </button>

                    {currentTrack && (
                        <button
                            type="button"
                            className="cv-action-icon-btn"
                            onClick={() => {
                                const q = `${currentTrack.artists} ${currentTrack.name}`.trim();
                                window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
                            }}
                            title={lang === 'en' ? 'Open in YouTube' : 'YouTube에서 보기'}
                        >
                            <VoyageIcon name="external" />
                        </button>
                    )}
                </div>
            </div>

            {/* Embedded YouTube Playback Engine */}
            {currentTrack && (
                <div
                    style={{
                        position: 'fixed',
                        right: showVideoPip ? '24px' : '-9999px',
                        bottom: showVideoPip ? '96px' : '-9999px',
                        zIndex: 85,
                        width: '320px',
                        height: '180px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(160, 190, 245, 0.25)',
                    }}
                >
                    <MetroYouTubePlayer
                        key={currentTrack.id}
                        track={currentTrack}
                        nextTrack={nextTrack}
                        trainName={constellationName}
                        color={cluster?.color || '#38bdf8'}
                        lang={lang}
                        embedded
                        autoplayRequested={isPlaying}
                        playbackIntent={isPlaying}
                        queuePosition={currentIndex + 1}
                        queueLength={totalStars}
                        onPlaybackState={onPlaybackChange}
                        onEnded={() => (hasNext ? onNextStar?.() : onFinish?.())}
                        onNext={hasNext ? onNextStar : undefined}
                        onPrevious={hasPrevious ? onPrevStar : undefined}
                        onClose={() => {
                            setShowVideoPip(false);
                            if (isPlaying) onTogglePlay?.();
                        }}
                    />
                </div>
            )}
        </div>
    );
}
