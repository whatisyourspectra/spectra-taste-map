import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getTasteGenres, uniqueTracks } from '../taste/buildTasteState';
import { getGenreIdentity, titleizeGenre } from '../taste/genreIdentity';
import './SpectraOrbitTour.css';

const AUTO_TOUR_INTERVAL = 4800; // 4.8 seconds per chapter

export default function SpectraOrbitTour({
    library = [],
    taste,
    avatar,
    lang = 'ko',
    onListen,
    onSelectTrack,
    onCameraChange,
}) {
    const en = lang === 'en';
    const [activeChapter, setActiveChapter] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef(null);
    const progressTimerRef = useRef(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    // Build rich, meaningful chapters derived from the user's real library and taste clusters
    const chapters = useMemo(() => {
        if (!library.length) return [];

        const core = taste?.coreGenres || [];
        const result = [];

        // Chapter 1: Core Primary Galaxy
        if (core.length > 0) {
            const g1 = core[0].genre;
            const ident = getGenreIdentity(g1);
            const tracks1 = library
                .filter((t) => getTasteGenres(t).includes(g1))
                .slice(0, 3);
            const pct = Math.round((core[0].strength || 0.4) * 100);

            result.push({
                id: 'ch-core',
                badge: en ? 'CHAPTER 01 · CORE GALAXY' : 'CHAPTER 01 · 취향의 중심축',
                title: titleizeGenre(g1),
                subtitle: en
                    ? `Forms ${pct}% of your Spectra, anchoring your music universe.`
                    : `내 스펙트라의 약 ${pct}%를 차지하며 중심을 잡고 있는 가장 단단한 취향의 뿌리입니다.`,
                color: `rgb(${ident.tone.rgb})`,
                camera: { yaw: 0.08, pitch: -0.06, zoom: 1.32, targetGenre: g1 },
                tracks: tracks1.length ? tracks1 : library.slice(0, 3),
            });
        }

        // Chapter 2: Secondary Resonance
        if (core.length > 1) {
            const g2 = core[1].genre;
            const ident = getGenreIdentity(g2);
            const tracks2 = library
                .filter((t) => getTasteGenres(t).includes(g2))
                .slice(0, 3);
            const pct = Math.round((core[1].strength || 0.25) * 100);

            result.push({
                id: 'ch-second',
                badge: en ? 'CHAPTER 02 · HARMONIC ORBIT' : 'CHAPTER 02 · 감성의 두 번째 궤도',
                title: titleizeGenre(g2),
                subtitle: en
                    ? `Adds rich tonal depth and varied colors to your listening habits.`
                    : `중심 취향 곁에서 다채로운 분위기와 감정선을 채워주는 보조 성운 구역입니다.`,
                color: `rgb(${ident.tone.rgb})`,
                camera: { yaw: 0.68, pitch: 0.14, zoom: 1.34, targetGenre: g2 },
                tracks: tracks2.length ? tracks2 : library.slice(3, 6),
            });
        }

        // Chapter 3: Frontier / Emerging Exploration
        const g3 = core[2]?.genre || core[0]?.genre;
        if (g3) {
            const ident = getGenreIdentity(g3);
            const tracks3 = library
                .filter((t) => getTasteGenres(t).includes(g3))
                .slice(0, 3);

            result.push({
                id: 'ch-frontier',
                badge: en ? 'CHAPTER 03 · FRONTIER CLUSTER' : 'CHAPTER 03 · 경계 너머의 별빛',
                title: titleizeGenre(g3),
                subtitle: en
                    ? `A distinctive branch expanding toward unfamiliar musical horizons.`
                    : `익숙한 반경을 넘어 또 다른 장르적 호기심으로 뻗어나간 독특한 외곽 가지입니다.`,
                color: `rgb(${ident.tone.rgb})`,
                camera: { yaw: -0.72, pitch: -0.14, zoom: 1.30, targetGenre: g3 },
                tracks: tracks3.length ? tracks3 : library.slice(1, 4),
            });
        }

        // Chapter 4: Full Panorama
        result.push({
            id: 'ch-panorama',
            badge: en ? 'CHAPTER 04 · DEEP PANORAMA' : 'CHAPTER 04 · 스펙트라 전경',
            title: en ? 'The Whole Cosmos' : `${library.length.toLocaleString()}곡이 엮어낸 전경`,
            subtitle: en
                ? `Zooming out to view all connected orbits and celestial paths.`
                : `수많은 감상 이력이 서로 유기적으로 연결되어 완성된 당신만의 광활한 밤하늘입니다.`,
            color: '#93c5fd',
            camera: { yaw: 0, pitch: 0, zoom: 0.94, targetGenre: null },
            tracks: library.slice(0, 3),
        });

        return result;
    }, [library, taste, en]);

    // Notify parent to rotate 3D camera whenever chapter changes
    const selectChapter = useCallback((index) => {
        if (!chapters.length) return;
        const bounded = (index + chapters.length) % chapters.length;
        setActiveChapter(bounded);
        setProgress(0);
        if (chapters[bounded]?.camera && onCameraChange) {
            onCameraChange(chapters[bounded].camera);
        }
    }, [chapters, onCameraChange]);

    // Handle Auto-Tour timer and smooth progress fill
    useEffect(() => {
        if (!isPlaying || !chapters.length) {
            clearInterval(timerRef.current);
            clearInterval(progressTimerRef.current);
            setProgress(0);
            return undefined;
        }

        const stepMs = 50;
        progressTimerRef.current = setInterval(() => {
            setProgress((prev) => {
                const next = prev + (stepMs / AUTO_TOUR_INTERVAL) * 100;
                return next >= 100 ? 100 : next;
            });
        }, stepMs);

        timerRef.current = setInterval(() => {
            selectChapter(activeChapter + 1);
        }, AUTO_TOUR_INTERVAL);

        return () => {
            clearInterval(timerRef.current);
            clearInterval(progressTimerRef.current);
        };
    }, [isPlaying, activeChapter, chapters.length, selectChapter]);

    // Touch Swipe handling on mobile
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current;
        if (Math.abs(diff) > 40) {
            setIsPlaying(false); // pause auto-tour on intentional user swipe
            if (diff > 0) {
                selectChapter(activeChapter + 1); // Swipe Left -> Next
            } else {
                selectChapter(activeChapter - 1); // Swipe Right -> Prev
            }
        }
    };

    if (!chapters.length) return null;

    const current = chapters[activeChapter];

    return (
        <section className="sot-root" aria-label={en ? 'Spectra Orbit Tour' : '스펙트라 오르빗 투어'}>
            <header className="sot-header">
                <div className="sot-header__left">
                    <span className="sot-brand-pill">ORBIT TOUR</span>
                    <h2 className="sot-title">{en ? 'Spectra Orbit Tour' : '스펙트라 오르빗 투어'}</h2>
                </div>
                <button
                    type="button"
                    className={`sot-play-btn${isPlaying ? ' is-playing' : ''}`}
                    onClick={() => {
                        const next = !isPlaying;
                        setIsPlaying(next);
                        if (next && chapters[activeChapter]?.camera && onCameraChange) {
                            onCameraChange(chapters[activeChapter].camera);
                        }
                    }}
                    aria-label={isPlaying ? (en ? 'Pause Tour' : '자동 투어 일시정지') : (en ? 'Auto Tour' : '자동 투어 시작')}
                >
                    <span className="sot-play-icon" aria-hidden="true">
                        {isPlaying ? '❚❚' : '▶'}
                    </span>
                    <span className="sot-play-label">
                        {isPlaying ? (en ? 'Pause' : '일시정지') : (en ? 'Auto Tour' : '자동 투어')}
                    </span>
                </button>
            </header>

            {/* Story Card Container */}
            <div
                className="sot-card"
                style={{ '--sot-accent': current.color }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Auto-tour progress line */}
                {isPlaying && (
                    <div className="sot-progress-bar" aria-hidden="true">
                        <div className="sot-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                )}

                <div className="sot-card__top">
                    <span className="sot-badge">{current.badge}</span>
                    <div className="sot-indicators">
                        {chapters.map((ch, idx) => (
                            <button
                                key={ch.id}
                                type="button"
                                className={`sot-dot${idx === activeChapter ? ' is-active' : ''}`}
                                onClick={() => {
                                    setIsPlaying(false);
                                    selectChapter(idx);
                                }}
                                aria-label={`${idx + 1} / ${chapters.length}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="sot-card__content">
                    <h3 className="sot-card__heading">{current.title}</h3>
                    <p className="sot-card__desc">{current.subtitle}</p>
                </div>

                {/* Chapter Showcase Tracks */}
                <div className="sot-tracks">
                    <span className="sot-tracks__title">
                        {en ? 'Key Stars in this Region' : '이 구역을 밝히는 대표 음악'}
                    </span>
                    <div className="sot-track-list">
                        {current.tracks.map((track) => {
                            const cover = track.coverUrl || track.imageUrl;
                            return (
                                <div
                                    key={track.id}
                                    className="sot-track-item"
                                    onClick={() => onSelectTrack?.(track.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && onSelectTrack?.(track.id)}
                                >
                                    <div className="sot-track-cover">
                                        {cover ? (
                                            <img
                                                src={cover}
                                                alt=""
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                            />
                                        ) : (
                                            <span className="sot-track-cover__placeholder">✦</span>
                                        )}
                                    </div>
                                    <div className="sot-track-meta">
                                        <strong className="sot-track-name">{track.name}</strong>
                                        <span className="sot-track-artist">{track.artists || 'Unknown Artist'}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="sot-track-listen"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onListen?.(track);
                                        }}
                                        aria-label={en ? `Listen to ${track.name}` : `${track.name} 외부 서비스에서 듣기`}
                                    >
                                        ↗
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Swipe Guidance */}
                <div className="sot-footer">
                    <button
                        type="button"
                        className="sot-nav-btn prev"
                        onClick={() => {
                            setIsPlaying(false);
                            selectChapter(activeChapter - 1);
                        }}
                        aria-label={en ? 'Previous Chapter' : '이전 챕터'}
                    >
                        ‹
                    </button>
                    <span className="sot-guide-text">
                        {en ? 'Swipe or tap arrows to rotate constellation' : '좌우로 넘겨 별자리의 다른 구역 둘러보기'}
                    </span>
                    <button
                        type="button"
                        className="sot-nav-btn next"
                        onClick={() => {
                            setIsPlaying(false);
                            selectChapter(activeChapter + 1);
                        }}
                        aria-label={en ? 'Next Chapter' : '다음 챕터'}
                    >
                        ›
                    </button>
                </div>
            </div>
        </section>
    );
}
