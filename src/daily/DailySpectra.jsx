import { useEffect, useMemo, useState } from 'react';
import { buildDailyBundle, dailyTheme, localDay } from './buildDailyBundle';
import { getTasteGenres, uniqueTracks } from '../taste/buildTasteState';
import { titleizeGenre } from '../taste/genreIdentity';
import './DailySpectra.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';
function DailyCard({ library, identity, day, lang, onListen, onAbsorb, decisions, busy, onCreateStory, exporting, saved, onRetrySave }) {
    const en = lang === 'en';
    const theme = useMemo(() => dailyTheme(day, identity), [day, identity]);
    const cacheKey = `${identity}:daily`;
    const [initial] = useState(() => {
        try {
            const record = JSON.parse(localStorage.getItem(cacheKey));
            if (record?.day === day && Array.isArray(record.tracks) && uniqueTracks(record.tracks).length) return record;
        } catch { /* Start from the real library if storage is unavailable. */ }
        return null;
    });
    const [seedLibrary, setSeedLibrary] = useState(null);
    const currentLibrary = seedLibrary || uniqueTracks(library);
    const [opened, setOpened] = useState(false);
    const [result, setResult] = useState(initial || { tracks: buildDailyBundle(currentLibrary, [], day, identity, theme), fallback: false });
    const [state, setState] = useState(initial ? 'ready' : 'idle');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (!opened || !seedLibrary || (initial && retry === 0)) return undefined;
        const controller = new AbortController();
        let disposed = false;
        const timeout = setTimeout(() => controller.abort(), 12000);
        const start = setTimeout(async () => {
            setState('loading');
            let discovery = [], fallback = false;
            try {
                const seed = buildDailyBundle(seedLibrary, [], day, identity, theme)[0];
                const query = new URLSearchParams({ seedGenres: getTasteGenres(seed).slice(0, 2).join(','), energy: String(theme.energy), valence: String(seed?.valence ?? .5), limit: '12' });
                if (seed?.artists && seed.name) query.set('seedTracks', `${String(seed.artists).split(',')[0].trim()}|${seed.name}`);
                const response = await fetch(`${API_BASE}/api/discover?${query}`, { signal: controller.signal });
                if (!response.ok) throw new Error('unavailable');
                const data = await response.json();
                discovery = uniqueTracks(Array.isArray(data.tracks) ? data.tracks : []);
                fallback = !discovery.some(track => !seedLibrary.some(item => item.id === track.id));
            } catch { fallback = true; }
            finally { clearTimeout(timeout); }
            if (disposed) return;
            const next = { day, tracks: buildDailyBundle(seedLibrary, discovery, day, identity, theme), fallback };
            setResult(next); setState('ready');
            try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch { /* Listening remains available. */ }
        }, 0);
        return () => { disposed = true; controller.abort(); clearTimeout(timeout); clearTimeout(start); };
    }, [opened, initial, retry, seedLibrary, day, identity, theme, cacheKey]);
    const [focusedTrackIndex, setFocusedTrackIndex] = useState(null);
    const accepted = result.tracks.length > 0 && result.tracks.every(track => decisions.some(choice => choice.track.id === track.id && choice.action === 'absorb'));
    const minutes = Math.round(result.tracks.reduce((sum, track) => sum + (Number(track.durationMs) || 0), 0) / 60000);

    // Compute celestial coordinates for each track in the bundle
    const starNodes = useMemo(() => {
        const baseAnchors = [
            { x: 55, y: 92 },
            { x: 110, y: 46 },
            { x: 168, y: 72 },
            { x: 226, y: 36 },
            { x: 278, y: 96 },
        ];
        const tracks = (result.tracks || []).slice(0, 5);
        return tracks.map((track, i) => {
            const anchor = baseAnchors[i] || { x: 50 + i * 50, y: 70 };
            const v = Number.isFinite(track?.valence) ? track.valence : 0.5;
            const e = Number.isFinite(track?.energy) ? track.energy : 0.5;
            return {
                track,
                index: i,
                x: Math.round(anchor.x + (v - 0.5) * 16),
                y: Math.round(anchor.y - (e - 0.5) * 20),
                isDiscovery: track.dailyOrigin === 'discovery',
            };
        });
    }, [result.tracks]);

    const constellationPath = useMemo(() => {
        if (starNodes.length === 0) return 'M63 85 112 43 173 62 221 28 243 93';
        return starNodes.map((s, i) => `${i === 0 ? 'M' : 'L'}${s.x} ${s.y}`).join(' ');
    }, [starNodes]);

    const activeStar = focusedTrackIndex !== null ? starNodes[focusedTrackIndex] : null;

    return <section className="daily-spectra" aria-labelledby="daily-title" style={{ '--daily-color': theme.color }}>
        <header>
            <span className="daily-badge">DAILY SPECTRA</span>
            <time dateTime={day}>{day.replaceAll('-', ' . ')}</time>
        </header>

        {/* Interactive Constellation Orbit */}
        <div className="daily-orbit" aria-hidden="false">
            <svg viewBox="0 0 330 145" className="daily-constellation-svg">
                <ellipse cx="165" cy="72" rx="116" ry="36" transform="rotate(-16 165 72)" className="daily-orbit-ring ring-outer" />
                <ellipse cx="165" cy="72" rx="74" ry="52" transform="rotate(26 165 72)" className="daily-orbit-ring ring-inner" />
                <path d={constellationPath} className="daily-constellation-line" />
                {starNodes.map((star) => {
                    const isFocused = focusedTrackIndex === star.index;
                    return (
                        <g
                            key={star.track.id || star.index}
                            className={`daily-star-node${star.isDiscovery ? ' is-discovery' : ''}${isFocused ? ' is-focused' : ''}`}
                            transform={`translate(${star.x}, ${star.y})`}
                            onClick={() => setFocusedTrackIndex(star.index === focusedTrackIndex ? null : star.index)}
                            onMouseEnter={() => setFocusedTrackIndex(star.index)}
                            onMouseLeave={() => setFocusedTrackIndex(null)}
                            role="button"
                            tabIndex={0}
                            aria-label={`${star.track.name} - ${star.track.artists}`}
                        >
                            <circle cx="0" cy="0" r={isFocused ? 20 : 10} className="daily-star-halo" />
                            {isFocused && <circle cx="0" cy="0" r="24" className="daily-star-ripple" />}
                            {star.isDiscovery ? (
                                <g className="daily-star-diamond">
                                    <polygon points="0,-7 5.5,0 0,7 -5.5,0" />
                                    <circle cx="0" cy="0" r="2.2" fill="#ffffff" />
                                </g>
                            ) : (
                                <g className="daily-star-circle">
                                    <circle cx="0" cy="0" r={isFocused ? 5 : 3.2} fill="#ffffff" />
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Interactive Star Tooltip */}
            {activeStar && (
                <div
                    className="daily-star-tooltip"
                    style={{
                        left: `${Math.max(16, Math.min(84, (activeStar.x / 330) * 100))}%`,
                        top: `${Math.max(10, activeStar.y - 12)}px`,
                    }}
                >
                    <span className="daily-star-tooltip__title">{activeStar.track.name}</span>
                    <span className="daily-star-tooltip__artist">{activeStar.track.artists}</span>
                    {activeStar.isDiscovery && <span className="daily-star-tooltip__tag">✦ {en ? 'New find' : '새로운 발견'}</span>}
                </div>
            )}
        </div>

        <p className="daily-kicker">{en ? 'Your daily music reading' : '오늘의 스펙트라'}</p>
        <h2 id="daily-title">{theme.name[en ? 1 : 0]}</h2>
        <p className="daily-message">{theme.message[en ? 1 : 0]}</p>

        {/* Mood Tags */}
        {theme.tags?.[en ? 1 : 0] && (
            <div className="daily-mood-tags">
                {theme.tags[en ? 1 : 0].map((tag) => (
                    <span key={tag} className="daily-mood-tag">{tag}</span>
                ))}
            </div>
        )}

        <div className="daily-meta">
            <span>{en ? 'A bundle tuned to your taste' : '내 취향을 바탕으로 고른 오늘의 곡 묶음'}</span>
            <span>{result.tracks.length} TRACKS{minutes > 0 && result.tracks.every(t => t.durationMs > 0) ? ` · ${minutes} MIN` : ''}</span>
        </div>

        {!opened ? (
            <button className="daily-primary" type="button" onClick={() => { setSeedLibrary(uniqueTracks(library)); setResult(initial || { tracks: buildDailyBundle(library, [], day, identity, theme), fallback: false }); setOpened(true); }}>
                {en ? 'Unfold today’s music' : '오늘의 음악 펼쳐보기'} <span>↗</span>
            </button>
        ) : (
            <div className="daily-reveal">
                <p className="daily-status" role="status">
                    {state !== 'ready'
                        ? (en ? 'Finding a few new lights…' : '오늘 어울리는 새로운 음악을 찾고 있어요…')
                        : result.fallback
                            ? (en ? 'Today, rediscover lights in your library.' : '오늘은 내 라이브러리 속 음악을 새롭게 엮었어요.')
                            : (en ? 'Familiar sounds, with a few new discoveries.' : '익숙한 취향에 새로운 발견을 더했어요.')}
                </p>

                <ol>
                    {result.tracks.map((track, index) => {
                        const isFocused = focusedTrackIndex === index;
                        return (
                            <li key={track.id}>
                                <button
                                    type="button"
                                    className={`daily-track${isFocused ? ' is-focused' : ''}`}
                                    onClick={() => onListen(track)}
                                    onMouseEnter={() => setFocusedTrackIndex(index)}
                                    onMouseLeave={() => setFocusedTrackIndex(null)}
                                    aria-label={en ? `Listen to ${track.name} on an external service` : `${track.name} 외부 서비스에서 듣기`}
                                >
                                    <span className="daily-number">{String(index + 1).padStart(2, '0')}</span>
                                    <span className="daily-cover">
                                        {(track.coverUrl || track.imageUrl) ? (
                                            <img
                                                src={track.coverUrl || track.imageUrl}
                                                alt=""
                                                loading="lazy"
                                                onError={event => { event.currentTarget.style.visibility = 'hidden'; }}
                                            />
                                        ) : '✧'}
                                    </span>
                                    <span className="daily-track-copy">
                                        <strong>{track.name}</strong>
                                        <small>{track.artists}</small>
                                        <em>
                                            {track.dailyOrigin === 'discovery'
                                                ? (en ? '✦ NEW FIND' : '✦ 새로운 발견')
                                                : (en ? 'MY LIBRARY' : '내 라이브러리')}
                                            {track.dailyGenre ? ` · ${titleizeGenre(track.dailyGenre)}` : ''}
                                        </em>
                                    </span>
                                    <span className="daily-track-ext" aria-hidden="true">↗</span>
                                </button>
                            </li>
                        );
                    })}
                </ol>

                <button
                    className="daily-primary"
                    type="button"
                    disabled={busy || accepted || state !== 'ready' || !result.tracks.length}
                    onClick={() => onAbsorb(result.tracks)}
                >
                    {accepted
                        ? (saved
                            ? (en ? 'Part of my Spectra ✓' : '나의 스펙트라에 담았어요 ✓')
                            : (en ? 'Not saved yet' : '아직 저장되지 않았어요'))
                        : (en ? 'Keep this bundle in my Spectra' : '이 묶음을 나의 스펙트라에 담기')}
                </button>

                {saved === false && (
                    <div className="daily-save-error" role="alert">
                        <p>{en ? 'Could not save your choices.' : '선택한 음악을 저장하지 못했어요.'}</p>
                        <button type="button" className="daily-retry" onClick={onRetrySave}>
                            {en ? 'Retry saving bundle' : '묶음 저장 다시 시도'}
                        </button>
                    </div>
                )}

                {result.fallback && state === 'ready' && (
                    <button className="daily-retry" type="button" onClick={() => { setState('loading'); setRetry(value => value + 1); }}>
                        {en ? 'Look for new discoveries again' : '새로운 곡도 다시 찾아보기'}
                    </button>
                )}

                <button
                    className="daily-primary daily-share"
                    type="button"
                    disabled={exporting || state !== 'ready' || !result.tracks.length}
                    onClick={() => onCreateStory({ theme, day, tracks: result.tracks })}
                >
                    {exporting
                        ? (en ? 'Creating card…' : '카드 만드는 중…')
                        : (en ? 'Create Daily Spectra story card' : '오늘의 스펙트라 공유 카드 만들기')}
                </button>

                <p className="daily-footnote">
                    {en
                        ? 'Tap a track to listen externally. A new reading awaits tomorrow.'
                        : '곡을 누르면 외부 서비스에서 들을 수 있어요. 내일은 또 다른 흐름이 기다려요.'}
                </p>
            </div>
        )}
    </section>;
}
export default function DailySpectra(props) {
    const [day, setDay] = useState(localDay);
    useEffect(() => {
        const update = () => setDay(localDay());
        const timer = setInterval(update, 60000);
        document.addEventListener('visibilitychange', update);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
    }, []);
    return <DailyCard key={`${props.identity}:${day}`} {...props} day={day} />;
}
