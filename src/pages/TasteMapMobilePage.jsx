import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasteData } from '../context/TasteDataContext';
import { buildTasteState, getTasteGenres, uniqueTracks } from '../taste/buildTasteState';
import { hash01 } from '../taste/constellationTopology';
import { getGenreIdentity, titleizeGenre } from '../taste/genreIdentity';
import { buildAvatarState, buildAvatarReaction } from '../avatar/buildAvatarState';
import LivingConstellationAvatar from '../avatar/LivingConstellationAvatar';
import ImmersiveSpectra from '../reflection/ImmersiveSpectra';
import { loadReflection, saveReflection, reflectionKey, reflectionChanges } from '../reflection/reflectionStorage';
import { useAuth } from '../auth/AuthContext';
import './TasteMapMobilePage.css';
import DailySpectra from '../daily/DailySpectra';
import { createConstellationImage, createDailyStoryImage } from '../avatar/exportConstellation';
import AccountButton from '../auth/AccountButton';
import SpectraOrbitTour from '../tour/SpectraOrbitTour';
import ConstellationOracle from '../oracle/ConstellationOracle';
import MonthlyConstellationCalendar from '../oracle/MonthlyConstellationCalendar';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const EMPTY_TRACKS = [];

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

function MobileConstellation({ tracks, status, progress, storageKey }) {
    const navigate = useNavigate();
    const [lang, setLang] = useState(() => {
        try { return localStorage.getItem('spectra-tastemap-lang-v1') === 'en' ? 'en' : 'ko'; }
        catch { return 'ko'; }
    });
    const [exploring, setExploring] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const exportLock = useRef(false);
    const [exportImage, setExportImage] = useState(null);
    const [exportError, setExportError] = useState('');
    const stageRef = useRef(null);
    const dialogRef = useRef(null);
    const [now] = useState(() => Date.now());
    const [stored] = useState(() => { try { return loadReflection(localStorage, storageKey); } catch { return { decisions: [], snapshot: null }; } });
    const [session, setSession] = useState(() => ({ decisions: stored.decisions, active: null, count: 0 }));
    const [saved, setSaved] = useState(true);
    const visitBaseline = useRef(null);
    const [saveRetry, setSaveRetry] = useState(0);
    const [comparison, setComparison] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    const [discovery, setDiscovery] = useState({ key: '', tracks: [], status: 'loading' });
    const [retry, setRetry] = useState(0);
    const [tourCameraTarget, setTourCameraTarget] = useState(null);
    const [calendarRefresh, setCalendarRefresh] = useState(0);
    const en = lang === 'en';
    const library = useMemo(() => uniqueTracks(tracks), [tracks]);
    const baseTaste = useMemo(() => buildTasteState(library, { now }), [library, now]);
    const taste = useMemo(() => buildTasteState(library, { decisions: session.decisions, now }), [library, session.decisions, now]);
    const avatar = useMemo(() => buildAvatarState(taste, library, session.decisions), [taste, library, session.decisions]);
    const previous = stored.snapshot;
    const selectedTrack = uniqueTracks([...library, ...session.decisions.map((choice) => choice.track)]).find((item) => item.id === selectedId);
    useEffect(() => {
        if (!library.length) return undefined;
        const timer = setTimeout(() => {
            // Keep the arrival state, so next visit can reflect on choices made during this visit.
            if (!visitBaseline.current && status === 'ready') visitBaseline.current = { at: Date.now(), ids: library.map((item) => item.id), decisions: session.decisions, avatar };
            const snapshot = visitBaseline.current || stored.snapshot;
            try { setSaved(saveReflection(localStorage, storageKey, session.decisions, snapshot)); }
            catch { setSaved(false); }
        }, 0);
        return () => clearTimeout(timer);
    }, [avatar, library, session.decisions, status, storageKey, stored.snapshot, saveRetry]);
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
        if (!exploring || !discoveryQuery) return undefined;
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
    }, [discoveryKey, discoveryQuery, exploring]);
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
    useEffect(() => {
        if (!exportImage) return undefined;
        dialogRef.current?.showModal();
        return () => URL.revokeObjectURL(exportImage.url);
    }, [exportImage]);
    const exportConstellation = async (daily = null) => {
        if (exportLock.current) return;
        exportLock.current = true;
        setExporting(true);
        setExportError('');
        try {
            const blob = daily ? await createDailyStoryImage({ ...daily, lang }) : await createConstellationImage(stageRef.current.querySelector('.tmm-space-present svg'), {
                title: en ? 'My Spectra' : '나의 스펙트라',
                genres: taste.coreGenres.slice(0, 3).map((item) => titleizeGenre(item.genre)),
                count: uniqueTracks([...library, ...session.decisions.filter(item => item.action === 'absorb').map(item => item.track)]).length,
            });
            const file = new File([blob], daily ? `daily-spectra-${daily.day}.png` : 'my-spectra-story.png', { type: 'image/png' });
            setExportImage({ url: URL.createObjectURL(blob), file, daily: Boolean(daily) });
        } catch {
            setExportError(en ? 'Could not create the image. Please try again.' : '이미지를 만들지 못했어요. 다시 시도해 주세요.');
        } finally { setExporting(false); exportLock.current = false; }
    };
    const shareImage = async () => {
        if (sharing) return;
        setSharing(true); setExportError('');
        try { await navigator.share({ files: [exportImage.file] }); }
        catch (error) {
            if (error.name !== 'AbortError') setExportError(en ? 'Sharing failed. You can still save the image.' : '공유하지 못했어요. 이미지 저장을 이용해 주세요.');
        } finally { setSharing(false); }
    };
    let canShareImage = false;
    try { canShareImage = Boolean(exportImage && navigator.share && navigator.canShare?.({ files: [exportImage.file] })); } catch { /* Save remains available. */ }
    const decide = (action) => {
        if (!track || session.active) return;
        setComparison(0);
        setSession((current) => current.active ? current : ({
            decisions: [...current.decisions.filter((item) => item.track.id !== track.id), { action, track, source: 'mobile', at: Date.now() }],
            active: { action, track }, count: current.count + 1,
        }));
    };
    const feedback = session.active ? {
        absorb: en ? `${track.name} is joining your Spectra.` : `${track.name}, 스펙트라에 스며드는 중.`,
        dig: en ? `${track.name} is entering your orbit.` : `${track.name}, 새로운 궤도로.`,
        pop: en ? `${track.name} is drifting away.` : `${track.name}, 가볍게 흘려보내요.`,
    }[session.active.action] : '';
    return (
        <main className="tmm-root">
            <div className="tmm-shell">
                <header className="tmm-appbar">
                    <a href="/taste-map/mobile" className="tmm-brand" aria-label="SPECTRA home"><span className="tmm-brand-mark" aria-hidden="true" />SPECTRA</a>
                    <details className="tmm-menu">
                        <summary aria-label={en ? 'More options' : '더 보기'}>···</summary>
                        <div className="tmm-menu-panel">
                            <AccountButton lang={lang} />
                            <button type="button" onClick={() => setLang(en ? 'ko' : 'en')}>{en ? '한국어' : 'English'}</button>
                            <button type="button" onClick={() => navigate('/taste-map?view=constellation')}>{en ? 'Detailed map' : '상세 지도'}</button>
                        </div>
                    </details>
                </header>
                <section className="tmm-living" aria-labelledby="tmm-living-title">
                    <div className="tmm-living-heading">
                        <span className="tmm-eyebrow">MY SPECTRA</span>
                        <h1 id="tmm-living-title">{en ? 'My Spectra' : '나의 스펙트라'}</h1>

                    </div>
                    <div className="tmm-avatar-stage">
                        <ImmersiveSpectra
                            avatar={avatar}
                            previous={previous?.avatar}
                            comparison={comparison}
                            reaction={reaction}
                            lang={lang}
                            stageRef={stageRef}
                            onSelect={setSelectedId}
                            tourCameraTarget={tourCameraTarget}
                        />
                    </div>
                    <div className="tmm-region-signals" aria-label={en ? 'Core taste regions' : '중심 취향 영역'}>
                        {taste.coreGenres.slice(0, 3).map((signal) => <span key={signal.genre}
                            style={{ '--tmm-region': `rgb(${getGenreIdentity(signal.genre).tone.rgb})` }}>
                            <i aria-hidden="true" />{titleizeGenre(signal.genre)}
                        </span>)}
                    </div>
                </section>
                <p className="tmm-library-count">{en ? `${library.length.toLocaleString()} tracks, one Spectra` : `${library.length.toLocaleString()}곡이 만든 하나의 스펙트라`}</p>
                {status === 'enriching' && <p className="tmm-progress" role="status">{en ? 'Adding stars' : '별을 더 불러오는 중'} · {progress.done}/{progress.total}</p>}
                {selectedTrack && <aside className="tmm-selected" aria-live="polite">
                    <div><span className="tmm-eyebrow">IN YOUR SPECTRA</span><h2>{selectedTrack.name}</h2><p>{selectedTrack.artists}</p></div>
                    <button type="button" onClick={() => openExternal(selectedTrack)}>{en ? 'Listen ↗' : '듣기 ↗'}</button>
                    <button type="button" aria-label={en ? 'Close track' : '곡 정보 닫기'} onClick={() => setSelectedId(null)}>×</button>
                </aside>}
                {/* 360° Spectra Orbit Tour Showcase */}
                <SpectraOrbitTour
                    library={library}
                    taste={taste}
                    avatar={avatar}
                    lang={lang}
                    onListen={openExternal}
                    onSelectTrack={(trackId) => {
                        setSelectedId(trackId);
                        stageRef.current?.scrollIntoView({
                            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                            block: 'center',
                        });
                    }}
                    onCameraChange={setTourCameraTarget}
                />

                {/* Constellation Oracle & Daily Tear-off Page */}
                <ConstellationOracle
                    library={library}
                    identity={storageKey}
                    lang={lang}
                    onListen={openExternal}
                    onCameraChange={setTourCameraTarget}
                    onSavedToCalendar={() => setCalendarRefresh((v) => v + 1)}
                />

                {/* Monthly Constellation Calendar Archive */}
                <MonthlyConstellationCalendar
                    identity={storageKey}
                    lang={lang}
                    onListen={openExternal}
                    refreshTrigger={calendarRefresh}
                />
                {!saved && <div className="tmm-save-error" role="alert"><p>{en ? 'Your choices are visible, but could not be saved. Retry before leaving.' : '선택한 음악을 저장하지 못했어요. 화면을 나가기 전에 다시 저장해 주세요.'}</p><button type="button" onClick={() => setSaveRetry(value => value + 1)}>{en ? 'Retry saving' : '저장 다시 시도'}</button></div>}
                <div className="tmm-primary-actions">
                    <button className="tmm-export" type="button" disabled={exporting || Boolean(session.active)} onClick={() => exportConstellation()}>
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" /></svg>
                        {exporting ? (en ? 'Creating image…' : '이미지 만드는 중…') : (en ? 'Create My Spectra story card' : '나의 스펙트라 공유 카드 만들기')}
                    </button>
                    <button className="tmm-explore-toggle" type="button" aria-expanded={exploring} aria-controls="tmm-exploration" onClick={() => setExploring(!exploring)}>{exploring ? (en ? 'Close exploration' : '탐색 접기') : (en ? 'Explore more music' : '음악 더 탐색하기')} <span aria-hidden="true">{exploring ? '−' : '+'}</span></button>
                </div>
                {!exportImage && exportError && <p className="tmm-export-error" role="alert">{exportError}</p>}
                <div id="tmm-exploration" hidden={!exploring}>
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
                        <button type="button" onClick={() => { setRetry((value) => value + 1); }}>
                            {en ? 'Start a new session' : '새로운 세션 시작'}</button></div>}
                    <div className="tmm-drop-status" role="status">{feedback || (discovery.key === discoveryKey && discovery.status === 'unavailable'
                        ? (en ? 'Discovery is resting. Explore your library for now.' : '추천 연결을 쉬는 동안, 내 라이브러리를 탐색해요.')
                        : status === 'enriching' ? (en ? `More stars arriving · ${progress.done}/${progress.total}` : `별을 더 불러오는 중 · ${progress.done}/${progress.total}`)
                            : (en ? 'A small choice. A changing Spectra.' : '작은 선택 하나, 조금 달라지는 스펙트라.'))}</div>
                </section>
                <p className="tmm-session-note">{en ? 'Your choices leave a trace in your Spectra.' : '작은 선택이 나의 스펙트라에 남아요.'}</p>
                </div>
                {exportImage && <dialog className="tmm-export-dialog" ref={dialogRef} onClose={() => setExportImage(null)} aria-labelledby="tmm-export-title">
                    <header><h2 id="tmm-export-title">{exportImage.daily ? 'Daily Spectra' : 'My Spectra'} · {en ? 'Story card' : '스토리 카드'}</h2><button type="button" autoFocus onClick={() => dialogRef.current.close()} aria-label={en ? 'Close' : '닫기'}>×</button></header>
                    <img src={exportImage.url} alt={en ? 'Your Spectra export preview' : '내 스펙트라 이미지 미리보기'} />
                    <div className="tmm-export-options">
                        <a href={exportImage.url} download={exportImage.file.name}>{en ? 'Save image' : '이미지 저장'}</a>
                        {canShareImage && <button type="button" disabled={sharing} onClick={shareImage}>{sharing ? (en ? 'Opening…' : '여는 중…') : (en ? 'Share' : '공유하기')}</button>}
                    </div>
                    <p>{canShareImage ? (en ? 'Choose Instagram if available in the share menu. Otherwise save the image and add it to your story.' : '공유 메뉴에 Instagram이 있으면 선택하세요. 없으면 이미지를 저장해 스토리에 추가할 수 있어요.') : (en ? 'Save the image, then select it in Instagram Stories. You can also touch and hold to save.' : '이미지를 저장한 뒤 Instagram 스토리에서 선택하세요. 이미지를 길게 눌러 저장할 수도 있어요.')}</p>
                    {exportError && <p role="alert">{exportError}</p>}
                </dialog>}
            </div>
        </main>
    );
}

export default function TasteMapMobilePage() {
    const { tracks, mapId, status, progress } = useTasteData();
    const { user } = useAuth();
    const key = reflectionKey(user?.id, mapId);
    return <MobileConstellation key={key} storageKey={key} tracks={tracks} status={status} progress={progress} />;
}
