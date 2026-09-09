import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasteData } from '../context/TasteDataContext';
import { buildTasteState, describeTasteState, getTasteGenres, uniqueTracks } from '../taste/buildTasteState';
import { hash01 } from '../taste/constellationTopology';
import { getGenreIdentity, titleizeGenre } from '../taste/genreIdentity';
import { buildAvatarState, buildAvatarReaction } from '../avatar/buildAvatarState';
import LivingConstellationAvatar from '../avatar/LivingConstellationAvatar';
import './TasteMapMobilePage.css';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const EMPTY_TRACKS = [];

function ArrowIcon() {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>;
}

function ActionIcon({ action }) {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {action === 'absorb' ? <><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3M16 8l3-3" /></>
            : action === 'dig' ? <><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="6" r="2" fill="currentColor" /></>
                : <><path d="m8 8 8 8m0-8-8 8M12 2v2m0 16v2M2 12h2m16 0h2" /></>}
    </svg>;
}

function openExternal(track) {
    const query = `${track?.artists || ''} ${track?.name || ''}`.trim();
    const candidate = track?.externalUrl || `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    try {
        const url = new URL(candidate);
        if (url.protocol === 'https:' || url.protocol === 'http:') window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch { /* Incomplete metadata should not interrupt Taste Drop. */ }
}

function MobileConstellation({ tracks, status, progress }) {
    const navigate = useNavigate();
    const [lang, setLang] = useState(() => {
        try { return localStorage.getItem('spectra-tastemap-lang-v1') === 'en' ? 'en' : 'ko'; }
        catch { return 'ko'; }
    });
    const [now] = useState(() => Date.now());
    const [session, setSession] = useState({ decisions: [], active: null, count: 0 });
    const [discovery, setDiscovery] = useState({ key: '', tracks: [], status: 'loading' });
    const [retry, setRetry] = useState(0);
    const en = lang === 'en';
    const library = useMemo(() => uniqueTracks(tracks), [tracks]);
    const baseTaste = useMemo(() => buildTasteState(library, { now }), [library, now]);
    const taste = useMemo(() => buildTasteState(library, { decisions: session.decisions, now }), [library, session.decisions, now]);
    const avatar = useMemo(() => buildAvatarState(taste, library, session.decisions), [taste, library, session.decisions]);
    const reaction = session.active ? {
        ...buildAvatarReaction(session.active.action, session.active.track, avatar), id: session.count,
    } : null;
    const anchor = useMemo(() => [...library].sort((a, b) => hash01(a.id) - hash01(b.id))[0], [library]);
    const discoveryQuery = useMemo(() => {
        if (!anchor) return '';
        const params = new URLSearchParams({
            seedGenres: getTasteGenres(anchor).slice(0, 2).join(','),
            valence: String(typeof anchor.valence === 'number' ? anchor.valence : 0.5),
            energy: String(typeof anchor.energy === 'number' ? anchor.energy : 0.5),
            limit: '12',
        });
        if (anchor.artists && anchor.name) params.set('seedTracks', `${String(anchor.artists).split(',')[0].trim()}|${anchor.name}`);
        return params.toString();
    }, [anchor]);
    const discoveryKey = `${discoveryQuery}:${retry}`;
    useEffect(() => {
        if (!discoveryQuery) return undefined;
        const controller = new AbortController();
        let disposed = false;
        const timeout = window.setTimeout(() => controller.abort(), 12000);
        // Let React's development effect cleanup cancel before sending a request.
        const start = window.setTimeout(() => {
            fetch(`${API_BASE}/api/discover?${discoveryQuery}`, { signal: controller.signal })
                .then(async (response) => {
                    if (!response.ok) throw new Error('discovery unavailable');
                    const data = await response.json();
                    if (!disposed) setDiscovery({ key: discoveryKey, tracks: uniqueTracks(Array.isArray(data?.tracks) ? data.tracks : []), status: 'ready' });
                })
                .catch(() => {
                    if (!disposed) setDiscovery({ key: discoveryKey, tracks: [], status: 'unavailable' });
                })
                .finally(() => window.clearTimeout(timeout));
        }, 0);
        return () => { disposed = true; controller.abort(); window.clearTimeout(start); window.clearTimeout(timeout); };
    }, [discoveryKey, discoveryQuery]);
    useEffect(() => {
        if (!session.active) return undefined;
        const timer = window.setTimeout(() => setSession((current) => ({ ...current, active: null })), 1150);
        return () => window.clearTimeout(timer);
    }, [session.active]);
    const recommended = discovery.key === discoveryKey ? discovery.tracks : EMPTY_TRACKS;
    const candidates = useMemo(() => {
        const strength = new Map(baseTaste.coreGenres.map((item) => [item.genre, item.strength]));
        const weight = (track) => Math.max(0, ...getTasteGenres(track).map((genre) => strength.get(genre) || 0));
        const fallback = [...library].sort((a, b) => weight(a) - weight(b) || hash01(a.id) - hash01(b.id));
        return uniqueTracks([...recommended, ...fallback]);
    }, [recommended, library, baseTaste]);
    const decided = new Set(session.decisions.map((decision) => decision.track.id));
    const track = session.active?.track || candidates.find((candidate) => !decided.has(candidate.id)) || null;
    const fromLibrary = track && library.some((item) => item.id === track.id);
    const genre = getTasteGenres(track)[0];
    const cover = track?.coverUrl || track?.imageUrl || track?.album?.images?.[0]?.url;
    const explanation = describeTasteState(taste, lang);
    const decide = (action) => {
        if (!track || session.active) return;
        setSession((current) => current.active ? current : ({
            decisions: [...current.decisions.filter((item) => item.track.id !== track.id), { action, track }],
            active: { action, track }, count: current.count + 1,
        }));
    };
    const feedback = session.active ? {
        absorb: en ? `${track.name} is joining your constellation.` : `${track.name}, 별자리에 스며드는 중.`,
        dig: en ? `${track.name} is entering your orbit.` : `${track.name}, 새로운 궤도로.`,
        pop: en ? `${track.name} is drifting away.` : `${track.name}, 가볍게 흘려보내요.`,
    }[session.active.action] : '';
    return (
        <main className="tmm-root">
            <div className="tmm-shell">
                <header className="tmm-appbar">
                    <a href="/taste-map/mobile" className="tmm-brand" aria-label="SPECTRA home"><span className="tmm-brand-mark" aria-hidden="true" />SPECTRA</a>
                    <button type="button" className="tmm-language" onClick={() => setLang(en ? 'ko' : 'en')}
                        aria-label={en ? '한국어로 전환' : 'Switch to English'}>{en ? 'KO' : 'EN'}</button>
                </header>
                <section className="tmm-living" aria-labelledby="tmm-living-title">
                    <div className="tmm-living-heading">
                        <span className="tmm-eyebrow">YOUR LIVING CONSTELLATION</span>
                        <h1 id="tmm-living-title">{en ? 'A shape only you make.' : '당신만의 형태로.'}</h1>
                        <p>{en ? 'Every sound leaves a little of you.' : '당신이 머문 음악이 하나의 별자리로.'}</p>
                    </div>
                    <div className="tmm-avatar-stage"><LivingConstellationAvatar avatar={avatar} reaction={reaction} lang={lang} /></div>
                    <div className="tmm-region-signals" aria-label={en ? 'Core taste regions' : '중심 취향 영역'}>
                        {taste.coreGenres.slice(0, 3).map((signal) => <span key={signal.genre}
                            style={{ '--tmm-region': `rgb(${getGenreIdentity(signal.genre).tone.rgb})` }}>
                            <i aria-hidden="true" />{titleizeGenre(signal.genre)}
                        </span>)}
                    </div>
                </section>
                <p className="tmm-taste-sentence" aria-live="polite">{explanation}</p>
                <section className="tmm-drop" aria-labelledby="tmm-drop-title" aria-busy={Boolean(session.active)}>
                    <div className="tmm-drop-header">
                        <h2 id="tmm-drop-title">TASTE DROP <span aria-hidden="true">/</span> <small>{String(session.count + 1).padStart(2, '0')}</small></h2>
                        <span>{en ? 'Let your taste take shape' : '지금 끌리는 방향으로'}</span>
                    </div>
                    {track ? <>
                        <article className={`tmm-track-card${session.active ? ' is-deciding' : ''}`}>
                            <button className="tmm-track-cover" type="button" onClick={() => openExternal(track)}
                                aria-label={en ? `Listen to ${track.name} on an external service` : `${track.name} 외부 서비스에서 듣기`}>
                                {cover && <img key={cover} src={cover} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />}
                                <span className="tmm-cover-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 10 6-10 6Z" /></svg></span>
                            </button>
                            <div className="tmm-track-info">
                                <span className="tmm-track-origin">{fromLibrary ? (en ? 'FROM YOUR LIBRARY' : '내 라이브러리에서') : (en ? 'A NEW DIRECTION' : '새로운 방향')}</span>
                                <h3>{track.name}</h3><p>{track.artists || (en ? 'Unknown artist' : '아티스트 정보 없음')}</p>
                                {genre && <span className="tmm-track-genre">{titleizeGenre(genre)}</span>}
                            </div>
                        </article>
                        <div className="tmm-drop-actions">
                            {[
                                { action: 'absorb', label: 'Absorb', meaning: en ? 'Feels like me' : '나를 닮은 음악' },
                                { action: 'dig', label: 'Dig', meaning: en ? 'Explore this' : '더 알고 싶은 방향' },
                                { action: 'pop', label: 'Pop', meaning: en ? 'Let it go' : '가볍게 흘려보내기' },
                            ].map(({ action, label, meaning }) => <button key={action} type="button"
                                className={`tmm-drop-action ${action}`} disabled={Boolean(session.active)} onClick={() => decide(action)}
                                aria-label={`${label} · ${meaning}`}>
                                <ActionIcon action={action} /><strong>{label}</strong><span>{meaning}</span>
                            </button>)}
                        </div>
                    </> : <div className="tmm-drop-empty"><p>{en ? 'Every drop has found its place.' : '오늘의 음악이 모두 자리를 찾았어요.'}</p>
                        <button type="button" onClick={() => { setSession({ decisions: [], active: null, count: 0 }); setRetry((value) => value + 1); }}>
                            {en ? 'Start a new session' : '새로운 세션 시작'}</button></div>}
                    <div className="tmm-drop-status" role="status">{feedback || (discovery.key === discoveryKey && discovery.status === 'unavailable'
                        ? (en ? 'Discovery is resting. Explore your library for now.' : '추천 연결을 쉬는 동안, 내 라이브러리를 탐색해요.')
                        : status === 'enriching' ? (en ? `More stars arriving · ${progress.done}/${progress.total}` : `별을 더 불러오는 중 · ${progress.done}/${progress.total}`)
                            : (en ? 'A small choice. A changing constellation.' : '작은 선택 하나, 조금 달라지는 별자리.'))}</div>
                </section>
                <footer className="tmm-footer">
                    <button type="button" onClick={() => navigate('/taste-map?view=constellation')}>
                        <span>{en ? 'Explore my taste universe' : '나의 취향 우주 펼쳐보기'}</span><ArrowIcon />
                    </button>
                    <span>{en ? 'Taste Drop choices stay in this session.' : 'Taste Drop 선택은 이번 세션에 머물러요.'}</span>
                </footer>
            </div>
        </main>
    );
}

export default function TasteMapMobilePage() {
    const { tracks, mapId, status, progress } = useTasteData();
    return <MobileConstellation key={mapId || 'guest'} tracks={tracks} status={status} progress={progress} />;
}
