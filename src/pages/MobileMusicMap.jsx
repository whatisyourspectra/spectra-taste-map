import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import SpectraLogo from '../components/SpectraLogo';
import AccountButton from '../auth/AccountButton';
import { useAuth } from '../auth/AuthContext';
import { useTasteData } from '../context/TasteDataContext';
import SharedMapCanvas from '../share/SharedMapCanvas';
import { buildMobileMapModel, mobileDiscoveryQuery } from '../taste/mobileMapModel';
import { getTasteGenres } from '../taste/buildTasteState';
import { isDemoTaste } from '../taste/tasteStorage';
import { loadReflection, reflectionKey } from '../reflection/reflectionStorage';
import '../share/SharedMapPage.css';
import './MobileMusicMap.css';

function Cover({ track }) {
    return <span className="public-map-artwork" aria-hidden="true"><span>♪</span>{track?.coverUrl && <img key={track.coverUrl} src={track.coverUrl} loading="lazy" alt="" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}</span>;
}

function MobileMapExplorer({ requestedStar }) {
    const { tracks, stats, status, progress, mapId, featuresSource, recordDecision, cloudSaveStatus, retryCloudSync, retryImportAnalysis } = useTasteData();
    const { user } = useAuth();
    const [view, setView] = useState('bubbles');
    const [genre, setGenre] = useState('all');
    const [selectedId, setSelectedId] = useState(requestedStar);
    const [focusRequest, setFocusRequest] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [mode, setMode] = useState('library');
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(50);
    const [seed, setSeed] = useState(null);
    const [retry, setRetry] = useState(0);
    const [discovery, setDiscovery] = useState({ key: '', tracks: [], status: 'idle' });
    const [feedback, setFeedback] = useState(null);
    const storageKey = reflectionKey(user?.id, mapId);
    const [decisions, setDecisions] = useState(() => { try { return loadReflection(localStorage, storageKey).decisions; } catch { return []; } });
    const pageRef = useRef(null), searchRef = useRef(null), handleRef = useRef(null);
    const swipe = useRef(null), swiped = useRef(false), cache = useRef(new Map());
    const demo = isDemoTaste({ tracks, stats });
    const discoveryQuery = useMemo(() => mobileDiscoveryQuery(seed, featuresSource), [seed, featuresSource]);
    const requestKey = `${discoveryQuery}:${retry}`;
    const model = useMemo(() => buildMobileMapModel(tracks, discovery.key === requestKey ? discovery.tracks : []), [tracks, discovery, requestKey]);
    const ownTracks = useMemo(() => genre === 'all' ? model.library : model.library.filter(track => getTasteGenres(track).includes(genre)).map(track => ({ ...track, mapGroup: model.genres.find(item => item.key === genre)?.label, mapColor: model.genres.find(item => item.key === genre)?.color })), [model, genre]);
    const mapTracks = useMemo(() => mode === 'discover' ? [...ownTracks, ...model.recommendations] : ownTracks, [mode, ownTracks, model.recommendations]);
    const selected = model.library.find(track => track.id === selectedId) || model.recommendations.find(track => track.id === selectedId);
    const inLibrary = selected && model.library.some(track => track.id === selected.id);
    const currentChoice = decisions.find(item => item.track.id === selectedId)?.action;
    const collection = mode === 'discover' ? model.recommendations : ownTracks;
    const matches = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return query ? collection.filter(track => `${track.name} ${track.artists}`.toLocaleLowerCase().includes(query)) : collection;
    }, [collection, search]);
    const selectedIndex = collection.findIndex(track => track.id === selectedId);
    const pending = Number(stats?.metadataPendingCount) || 0;
    const saveLabel = demo ? '데모 지도' : !user ? '로그인해 저장' : cloudSaveStatus === 'saved' ? '계정에 저장됨' : cloudSaveStatus === 'saving' ? '계정에 저장 중' : cloudSaveStatus === 'error' ? '저장 확인 필요' : '저장 확인';

    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        const sync = () => {
            const page = pageRef.current;
            if (!page) return;
            page.style.setProperty('--share-viewport-height', `${viewport.height}px`);
            page.style.setProperty('--share-viewport-top', `${viewport.offsetTop}px`);
            page.dataset.compactViewport = String(viewport.height <= 500);
        };
        sync(); viewport.addEventListener('resize', sync); viewport.addEventListener('scroll', sync);
        return () => { viewport.removeEventListener('resize', sync); viewport.removeEventListener('scroll', sync); };
    }, []);
    useEffect(() => {
        if (mode !== 'discover' || !discoveryQuery) return;
        let disposed = false;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 12000);
        const timer = window.setTimeout(async () => {
            const cached = cache.current.get(discoveryQuery);
            if (cached) { window.clearTimeout(timeout); setDiscovery({ key: requestKey, tracks: cached, status: 'ready' }); return; }
            setDiscovery({ key: requestKey, tracks: [], status: 'loading' });
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/discover?${discoveryQuery}`, { signal: controller.signal });
                if (!response.ok) throw new Error('DISCOVERY_UNAVAILABLE');
                const data = await response.json();
                const candidates = Array.isArray(data.tracks) ? data.tracks : [];
                if (!disposed) { cache.current.set(discoveryQuery, candidates); setDiscovery({ key: requestKey, tracks: candidates, status: 'ready' }); }
            } catch { if (!disposed) setDiscovery({ key: requestKey, tracks: [], status: 'error' }); }
            finally { window.clearTimeout(timeout); }
        }, 0);
        return () => { disposed = true; controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout); };
    }, [mode, discoveryQuery, requestKey]);
    useEffect(() => {
        const escape = event => {
            if (event.key !== 'Escape') return;
            if (expanded) { setExpanded(false); searchRef.current?.blur(); }
            else setSelectedId(null);
            pageRef.current?.querySelector('.public-map-find')?.focus({ preventScroll: true });
        };
        window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [expanded]);
    const choose = track => {
        const fromList = document.activeElement?.closest('.public-map-song-list, .public-map-peek-tracks');
        setSelectedId(track.id); setExpanded(false); setFocusRequest(value => value + 1); setSearch(''); setFeedback(null);
        searchRef.current?.blur();
        if (fromList) requestAnimationFrame(() => pageRef.current?.querySelector('.public-map-listen')?.focus({ preventScroll: true }));
    };
    const openSearch = () => {
        flushSync(() => { setMode('library'); setExpanded(true); setSearch(''); });
        searchRef.current?.focus();
    };
    const closeList = () => { setExpanded(false); searchRef.current?.blur(); pageRef.current?.querySelector('.public-map-find')?.focus({ preventScroll: true }); };
    const changeGenre = key => { setGenre(key); setMode('library'); setSelectedId(null); setSearch(''); setLimit(50); setFeedback(null); };
    const discover = (track = selected || ownTracks[0] || model.library[0]) => {
        if (!track) return;
        setSeed(track); setMode('discover'); setSearch(''); setExpanded(true); setFeedback(null); setLimit(50);
    };
    const decide = action => {
        if (!selected) return;
        try {
            const track = { ...selected };
            for (const key of ['x', 'y', 'mapColor', 'mapGroup', 'mapRecommended']) delete track[key];
            recordDecision(action, track, 'mobile-map');
            const stored = loadReflection(localStorage, storageKey).decisions;
            setDecisions(stored);
            if (!stored.some(item => item.track.id === selected.id && item.action === action)) throw new Error('SAVE_FAILED');
            if (action === 'absorb') { setMode('library'); setGenre('all'); }
            setFeedback({ error: false, text: action === 'absorb' ? '내 음악에 추가했어요.' : '관심 있는 곡으로 표시했어요.' });
        } catch { setFeedback({ error: true, text: '취향 반응을 저장하지 못했어요. 다시 눌러 주세요.' }); }
    };
    const move = direction => { if (collection.length) choose(collection[(selectedIndex + direction + collection.length) % collection.length]); };
    const endSwipe = event => {
        if (swipe.current === null || event.type === 'pointercancel') { swipe.current = null; return; }
        const dy = event.clientY - swipe.current;
        if (Math.abs(dy) > 28) { swiped.current = true; setExpanded(dy < 0); searchRef.current?.blur(); }
        swipe.current = null;
    };
    const query = selected ? encodeURIComponent(`${selected.artists} ${selected.name}`) : '';
    const discoveryState = discovery.key === requestKey ? discovery.status : 'loading';
    return <main ref={pageRef} className={`public-map-page mobile-taste-map${expanded ? ' is-library-open' : ''}${selected ? ' has-selection' : ''}`}>
        <header className="public-map-header"><Link className="public-map-home" to="/" aria-label="SPECTRA 홈"><SpectraLogo decorative /></Link><Link className={`mtm-save-state ${cloudSaveStatus}`} to="/auth/login?returnTo=%2Ftaste-map"><i />{saveLabel}</Link><AccountButton /></header>
        <section className="mtm-intro"><div><span className="public-map-eyebrow">YOUR MUSIC, YOUR MAP</span><h1>나의 취향 지도 <span>{model.library.length.toLocaleString()}곡</span></h1></div><p>{status === 'enriching' ? `곡 정보를 연결하고 있어요 · ${progress.done} / ${progress.total}` : '좋아하는 음악에서, 다음 취향으로.'}</p></section>
        <div className="mtm-genres" role="group" aria-label="장르 필터"><button type="button" aria-pressed={genre === 'all'} onClick={() => changeGenre('all')}>전체</button>{model.genres.map(item => <button type="button" key={item.key} style={{ '--genre-color': item.color }} aria-pressed={genre === item.key} onClick={() => changeGenre(item.key)}><i />{item.label}<small>{item.count}</small></button>)}</div>
        {((pending > 0 && !stats?.backgroundEnriching) || (cloudSaveStatus === 'error' && !demo)) && <div className="mtm-recovery-bar">
            {pending > 0 && !stats?.backgroundEnriching && <button type="button" onClick={retryImportAnalysis}>{pending}곡 정보 분석 다시 시도 ↻</button>}
            {cloudSaveStatus === 'error' && !demo && <button type="button" onClick={retryCloudSync}>계정 저장 다시 시도 ↻</button>}
        </div>}
        <section className="public-map-workspace" aria-label="내 음악 탐색">
            <SharedMapCanvas key={genre} tracks={mapTracks} selected={selected} focusRequest={focusRequest} view={view} onViewChange={setView} onSelect={choose} onSearch={openSearch} scope="personal" showGroups />
            <div className="mtm-map-caption">{mode === 'discover' ? '점선 테두리의 앨범은 새롭게 발견한 곡이에요' : '장르별로 모아 놓은 내 음악'}</div>
            <aside className="public-map-inspector" aria-label="내 음악 곡 패널">
                <button ref={handleRef} type="button" className="public-map-sheet-handle" aria-label={expanded ? '내 곡 목록 접기' : '내 곡 목록 펼치기'} aria-expanded={expanded} aria-controls="mobile-music-library" onClick={() => { if (!swiped.current) setExpanded(value => !value); swiped.current = false; }} onPointerDown={event => { swipe.current = event.clientY; swiped.current = false; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={endSwipe} onPointerCancel={endSwipe}><span /></button>
                {selected ? <section className="public-map-track" aria-label="선택한 내 음악">
                    <div className="public-map-track-heading"><Cover track={selected} /><div className="public-map-track-copy"><span className="public-map-eyebrow">{inLibrary ? selected.metadataPending ? '곡 정보 분석 중' : '내 음악' : '새롭게 발견한 곡'}</span><h2>{selected.name}</h2><p>{selected.artists}</p></div><button className="public-map-close" type="button" aria-label="내 곡 정보 닫기" onClick={() => { setSelectedId(null); setFeedback(null); requestAnimationFrame(() => pageRef.current?.querySelector('.public-map-find')?.focus({ preventScroll: true })); }}>×</button></div>
                    <div className="public-map-track-actions"><a className="public-map-listen" href={`https://www.youtube.com/results?search_query=${query}`} target="_blank" rel="noopener noreferrer">▶ YouTube로 듣기 ↗</a><a href={`https://open.spotify.com/search/${query}`} target="_blank" rel="noopener noreferrer">Spotify ↗</a></div>
                    <div className="mtm-track-tools"><button type="button" onClick={() => discover(selected)}>✦ 비슷한 곡 찾기</button>{inLibrary ? <button type="button" aria-pressed={currentChoice === 'dig'} onClick={() => decide('dig')}>{currentChoice === 'dig' ? '♥ 관심 표시됨' : '♡ 관심 표시'}</button> : <button className="mtm-add-track" type="button" onClick={() => decide('absorb')}>＋ 내 음악에 추가</button>}</div>
                    <div className="public-map-track-navigation"><button type="button" disabled={collection.length < 2} aria-label="이전 내 곡" onClick={() => move(-1)}>←</button><button type="button" onClick={() => setExpanded(true)}>{selectedIndex >= 0 ? `${selectedIndex + 1} / ${collection.length}곡` : '곡 목록'} <span>목록 보기</span></button><button type="button" disabled={collection.length < 2} aria-label="다음 내 곡" onClick={() => move(1)}>→</button></div>
                </section> : <div className="public-map-welcome"><div className="public-map-welcome-heading"><div><span className="public-map-eyebrow">MY MUSIC</span><h2>{mode === 'discover' ? '새로운 음악으로 한 걸음' : '어떤 곡부터 들어볼까요?'}</h2></div><button className="public-map-browse" type="button" onClick={() => setExpanded(true)} aria-controls="mobile-music-library" aria-expanded={expanded}>곡 목록 ↗</button></div><div className="public-map-peek-tracks">{collection.slice(0, 4).map(track => <button type="button" key={track.id} onClick={() => choose(track)}><Cover track={track} /><span><strong>{track.name}</strong><small>{track.artists}</small></span></button>)}</div><button className="mtm-discover-entry" type="button" onClick={() => discover()}>✦ {genre === 'all' ? '내 음악에서 새로운 곡 발견하기' : '이 장르에서 새로운 곡 발견하기'} <span>↗</span></button></div>}
                <section id="mobile-music-library" className="public-map-library" aria-label={mode === 'discover' ? '발견한 음악 목록' : '내 음악 곡 목록'}>
                    <div className="public-map-library-heading"><h2>{mode === 'discover' ? '새로운 음악' : genre === 'all' ? '내 음악' : model.genres.find(item => item.key === genre)?.label}<span>{collection.length.toLocaleString()}</span></h2><button className="public-map-library-close" type="button" aria-label="내 곡 목록 닫기" onClick={closeList}>×</button></div>
                    {mode === 'discover' && <div className="mtm-seed"><Cover track={seed} /><span><small>이 곡에서 이어지는 발견</small><strong>{seed?.name}</strong></span><button type="button" aria-label="추천 새로 찾기" onClick={() => { cache.current.delete(discoveryQuery); setRetry(value => value + 1); }}>↻</button></div>}
                    <div className="public-map-search"><span aria-hidden="true">⌕</span><input ref={searchRef} type="search" aria-label="내 곡 또는 아티스트 검색" placeholder={mode === 'discover' ? '발견한 곡에서 검색' : '곡 또는 아티스트 찾기'} enterKeyHint="search" value={search} onChange={event => { setSearch(event.target.value); setLimit(50); }} />{search && <button type="button" aria-label="내 음악 검색어 지우기" onClick={() => { setSearch(''); searchRef.current?.focus(); }}>×</button>}</div>
                    <div className="public-map-library-scroll" tabIndex={0} aria-label="내 음악 목록 스크롤">
                        {mode === 'discover' && discoveryState === 'loading' ? <div className="mtm-discovery-empty" role="status"><span className="mtm-loading" />선택한 곡과 이어지는 음악을 찾고 있어요.</div> : mode === 'discover' && discoveryState === 'error' ? <div className="mtm-discovery-empty" role="alert"><h3>추천을 잠시 연결하지 못했어요</h3><p>내 음악 지도는 계속 둘러볼 수 있어요.</p><button type="button" onClick={() => { cache.current.delete(discoveryQuery); setRetry(value => value + 1); }}>추천 다시 시도</button><button type="button" onClick={() => { setMode('library'); setSearch(''); }}>내 음악 보기</button></div> : <>
                            {search && <p className="public-map-results-count" role="status">검색 결과 {matches.length.toLocaleString()}곡</p>}
                            {matches.length ? <><div className="public-map-song-list">{matches.slice(0, limit).map(track => <button type="button" key={track.id} aria-pressed={track.id === selectedId} className={track.id === selectedId ? 'is-selected' : ''} onClick={() => choose(track)}><Cover track={track} /><span><strong>{track.name}</strong><small>{track.artists}{track.metadataPending ? ' · 분석 중' : ''}</small></span><span className="public-map-song-arrow" aria-hidden="true">{track.id === selectedId ? '✦' : track.mapRecommended ? '＋' : '↗'}</span></button>)}</div>{matches.length > limit && <button type="button" className="public-map-load-more" onClick={() => setLimit(value => value + 50)}>곡 더 보기 <span>{limit} / {matches.length.toLocaleString()}</span></button>}</> : <div className="public-map-no-results"><span aria-hidden="true">✦</span><h3>{search ? '찾는 곡이 없어요' : mode === 'discover' ? '새로운 곡을 찾지 못했어요' : '이 장르에 곡이 없어요'}</h3><p>{search ? '다른 곡명이나 아티스트로 검색해 보세요.' : '다른 곡이나 장르에서 다시 시작해 보세요.'}</p><button type="button" onClick={() => { setSearch(''); changeGenre('all'); }}>내 음악 전체 보기</button></div>}
                        </>}
                    </div>
                </section>
            </aside>
        </section>
        {feedback && <div className={`mtm-feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}><span>{feedback.text}</span><button type="button" aria-label="취향 반응 안내 닫기" onClick={() => setFeedback(null)}>×</button></div>}
        <nav className="mtm-bottom-nav" aria-label="모바일 음악 메뉴"><button type="button" aria-current={mode === 'library' ? 'page' : undefined} onClick={() => { setMode('library'); setExpanded(false); setSearch(''); }}><span aria-hidden="true">◉</span>음악 지도</button><button type="button" aria-current={mode === 'discover' ? 'page' : undefined} onClick={() => discover()}><span aria-hidden="true">✦</span>새로운 발견</button><Link to="/taste-map/mobile"><span aria-hidden="true">⌁</span>나의 스펙트라</Link></nav>
        <span className="public-map-sr-only" role="status" aria-live="polite">{selected ? `${selected.name}, ${selected.artists} 선택됨` : ''}</span>
    </main>;
}

export default function MobileMusicMap() {
    const { mapId } = useTasteData();
    const { user } = useAuth();
    const location = useLocation();
    return <MobileMapExplorer key={`${user?.id || 'guest'}:${mapId}:${location.key}`} requestedStar={new URLSearchParams(location.search).get('star')} />;
}
