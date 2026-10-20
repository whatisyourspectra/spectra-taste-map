import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SpectraLogo from '../components/SpectraLogo';
import AccountButton from '../auth/AccountButton';
import FeedbackTab from '../feedback/FeedbackTab';
import MobileTodayPanel from './MobileTodayPanel';
import MobileDiscoveryPanel from './MobileDiscoveryPanel';
import TasteMapMobilePage from './TasteMapMobilePage';
import { useAuth } from '../auth/AuthContext';
import { useTasteData } from '../context/TasteDataContext';
import SharedMapCanvas from '../share/SharedMapCanvas';
import SpectraShareDialog from '../share/SpectraShareDialog';
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
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const tab = ['discover', 'today'].includes(params.get('tab')) ? params.get('tab') : 'map';
    const mode = tab === 'discover' ? 'discover' : 'library';
    const overviewOpen = tab === 'map' && params.get('view') === 'immersive';
    const menuRef = useRef(null);
    const [lang, setLang] = useState(() => { try { return localStorage.getItem('spectra-tastemap-lang-v1') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } });
    const en = lang === 'en';
    const t = (ko, english) => en ? english : ko;
    const changeLanguage = () => {
        const next = en ? 'ko' : 'en';
        setLang(next);
        try { localStorage.setItem('spectra-tastemap-lang-v1', next); } catch { /* This session still changes language. */ }
        menuRef.current.open = false;
    };
    const { tracks, stats, status, progress, mapId, featuresSource, recordDecision, cloudSaveStatus, retryCloudSync, retryImportAnalysis } = useTasteData();
    const { user } = useAuth();
    const [view, setView] = useState('bubbles');
    const [genre, setGenre] = useState('all');
    const [selectedId, setSelectedId] = useState(requestedStar);
    const [focusRequest, setFocusRequest] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(50);
    const [seed, setSeed] = useState(null);
    const [retry, setRetry] = useState(0);
    const [discovery, setDiscovery] = useState({ key: '', tracks: [], status: 'idle' });
    const [feedback, setFeedback] = useState(null);
    const [shareChannel, setShareChannel] = useState(null);
    const storageKey = reflectionKey(user?.id, mapId);
    const [decisions, setDecisions] = useState(() => { try { return loadReflection(localStorage, storageKey).decisions; } catch { return []; } });
    const pageRef = useRef(null), searchRef = useRef(null), handleRef = useRef(null);
    const swipe = useRef(null), swiped = useRef(false), cache = useRef(new Map());
    const demo = isDemoTaste({ tracks, stats });
    const discoveryQuery = useMemo(() => mobileDiscoveryQuery(seed || tracks[0], featuresSource), [seed, tracks, featuresSource]);
    const requestKey = `${discoveryQuery}:${retry}`;
    const model = useMemo(() => buildMobileMapModel(tracks, discovery.key === requestKey ? discovery.tracks : []), [tracks, discovery, requestKey]);
    const ownTracks = useMemo(() => genre === 'all' ? model.library : model.library.filter(track => getTasteGenres(track).includes(genre)).map(track => ({ ...track, mapGroup: model.genres.find(item => item.key === genre)?.label, mapColor: model.genres.find(item => item.key === genre)?.color })), [model, genre]);
    const selected = model.library.find(track => track.id === selectedId);
    const currentChoice = decisions.find(item => item.track.id === selectedId)?.action;
    const collection = ownTracks;
    const matches = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return query ? collection.filter(track => `${track.name} ${track.artists}`.toLocaleLowerCase().includes(query)) : collection;
    }, [collection, search]);
    const selectedIndex = collection.findIndex(track => track.id === selectedId);
    const pending = Number(stats?.metadataPendingCount) || 0;
    const saveLabel = demo ? t('데모 지도', 'Demo map') : !user ? t('로그인해 저장', 'Sign in to save') : cloudSaveStatus === 'saved' ? t('계정에 저장됨', 'Saved to account') : cloudSaveStatus === 'saving' ? t('계정에 저장 중', 'Saving') : cloudSaveStatus === 'error' ? t('저장 확인 필요', 'Check saving') : t('저장 확인', 'Check saving');

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
            if (event.key !== 'Escape' || tab !== 'map' || document.querySelector('dialog[open]')) return;
            if (expanded) { setExpanded(false); searchRef.current?.blur(); }
            else setSelectedId(null);
            pageRef.current?.querySelector('.public-map-find')?.focus({ preventScroll: true });
        };
        window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [expanded, tab]);
    const choose = track => {
        const fromList = document.activeElement?.closest('.public-map-song-list, .public-map-peek-tracks');
        setSelectedId(track.id); setExpanded(false); setFocusRequest(value => value + 1); setSearch(''); setFeedback(null);
        searchRef.current?.blur();
        if (fromList) requestAnimationFrame(() => pageRef.current?.querySelector('.public-map-listen')?.focus({ preventScroll: true }));
    };
    const openSearch = () => {
        flushSync(() => { navigate('/taste-map'); setExpanded(true); setSearch(''); });
        searchRef.current?.focus();
    };
    const closeList = () => { setExpanded(false); searchRef.current?.blur(); pageRef.current?.querySelector('.public-map-find')?.focus({ preventScroll: true }); };
    const changeGenre = key => { setGenre(key); navigate('/taste-map'); setSelectedId(null); setSearch(''); setLimit(50); setFeedback(null); };
    const discover = (track = selected || ownTracks[0] || model.library[0]) => {
        if (!track) return;
        setSeed(track); navigate('/taste-map?tab=discover'); setSearch(''); setFeedback(null); setLimit(50);
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
            if (action === 'absorb') { navigate('/taste-map'); setGenre('all'); }
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
    const discoveryDecision = (action, track) => {
        try {
            const clean = { ...track };
            for (const key of ['x', 'y', 'mapColor', 'mapGroup', 'mapRecommended']) delete clean[key];
            recordDecision(action, clean, 'mobile-discovery');
            const stored = loadReflection(localStorage, storageKey).decisions;
            setDecisions(stored);
            return stored.some(item => item.track.id === track.id && item.action === action);
        } catch { return false; }
    };
    const switchTab = next => {
        menuRef.current.open = false;
        setFeedback(null);
        navigate(next === 'map' ? '/taste-map' : `/taste-map?tab=${next}`);
    };
    const closeOverview = () => navigate('/taste-map', { replace: true });
    useEffect(() => {
        const closeMenu = event => { if (!menuRef.current?.contains(event.target)) menuRef.current.open = false; };
        document.addEventListener('pointerdown', closeMenu);
        return () => document.removeEventListener('pointerdown', closeMenu);
    }, []);
    const query = selected ? encodeURIComponent(`${selected.artists} ${selected.name}`) : '';
    const discoveryState = discovery.key === requestKey ? discovery.status : 'loading';
    return <main ref={pageRef} className={`public-map-page mobile-taste-map mtm-tab-${tab}${tab === 'map' && expanded ? ' is-library-open' : ''}${tab === 'map' && selected ? ' has-selection' : ''}`}>
        <header className="public-map-header"><Link className="public-map-home" to="/" aria-label="SPECTRA 홈"><SpectraLogo decorative /></Link><Link className={`mtm-save-state ${cloudSaveStatus}`} to={`/auth/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}><i />{saveLabel}</Link><details ref={menuRef} className="mtm-more-menu" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); menuRef.current.open = false; menuRef.current.querySelector('summary').focus(); } }}><summary aria-label={en ? 'More options' : '더 보기'}>···</summary><div className="mtm-more-panel"><AccountButton lang={lang} /><Link to="/" onClick={() => { menuRef.current.open = false; }}>{en ? 'Import music' : '음악 가져오기'}</Link><button type="button" onClick={changeLanguage}>{en ? '한국어' : 'English'}</button><FeedbackTab inMenu onOpened={() => { menuRef.current.open = false; }} /></div></details></header>
        <div className="mtm-map-content" hidden={tab !== 'map'}>
        <section className="mtm-intro"><div className="mtm-intro-heading"><div><span className="public-map-eyebrow">YOUR MUSIC, YOUR MAP</span><h1>{en ? 'My map' : '내 지도'} <span>{model.library.length.toLocaleString()}{en ? ' tracks' : '곡'}</span></h1></div><button className="mtm-share-entry" type="button" aria-label={t('내 취향 지도 공유하기', 'Share my taste map')} aria-haspopup="dialog" onClick={() => setShareChannel('card')} disabled={!model.library.length}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M5 13v7h14v-7" /></svg><span>{t('공유', 'Share')}</span></button></div><p>{status === 'enriching' ? `곡 정보를 연결하고 있어요 · ${progress.done} / ${progress.total}` : t('좋아하는 음악에서, 다음 취향으로.', 'Your favorite music, your next discovery.')}</p></section>
        <div className="mtm-map-shortcuts"><button className="mtm-overview-entry" type="button" aria-haspopup="dialog" onClick={() => navigate('/taste-map?view=immersive')}><span aria-hidden="true">⌁</span>{en ? 'Explore my taste' : '내 취향 둘러보기'}</button><button className="mtm-kakao-entry" type="button" aria-haspopup="dialog" onClick={() => setShareChannel('kakao')} disabled={!model.library.length}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1.2 4.2 5.3-3.1 1.2.1c5.5 0 10-3.5 10-7.8S17.5 3 12 3Z" fill="currentColor" /></svg>{en ? 'Share on KakaoTalk' : '카카오톡으로 공유하기'}</button></div>
        <div className="mtm-genres" role="group" aria-label={t('장르 필터', 'Genre filters')}><button type="button" aria-pressed={genre === 'all'} onClick={() => changeGenre('all')}>{t('전체', 'All')}</button>{model.genres.map(item => <button type="button" key={item.key} style={{ '--genre-color': item.color }} aria-pressed={genre === item.key} onClick={() => changeGenre(item.key)}><i />{item.label}<small>{item.count}</small></button>)}</div>
        {((pending > 0 && !stats?.backgroundEnriching) || (cloudSaveStatus === 'error' && !demo)) && <div className="mtm-recovery-bar">
            {pending > 0 && !stats?.backgroundEnriching && <button type="button" onClick={retryImportAnalysis}>{pending}곡 정보 분석 다시 시도 ↻</button>}
            {cloudSaveStatus === 'error' && !demo && <button type="button" onClick={retryCloudSync}>계정 저장 다시 시도 ↻</button>}
        </div>}
        <section className="public-map-workspace" aria-label="내 음악 탐색">
            <SharedMapCanvas key={genre} tracks={ownTracks} selected={selected} focusRequest={focusRequest} view={view} onViewChange={setView} onSelect={choose} onSearch={openSearch} scope="personal" showGroups />
            <div className="mtm-map-caption">{en ? 'Your music, grouped by genre' : '장르별로 모아 놓은 내 음악'}</div>
            <aside className="public-map-inspector" aria-label="내 음악 곡 패널">
                <button ref={handleRef} type="button" className="public-map-sheet-handle" aria-label={expanded ? '내 곡 목록 접기' : '내 곡 목록 펼치기'} aria-expanded={expanded} aria-controls="mobile-music-library" onClick={() => { if (!swiped.current) setExpanded(value => !value); swiped.current = false; }} onPointerDown={event => { swipe.current = event.clientY; swiped.current = false; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={endSwipe} onPointerCancel={endSwipe}><span /></button>
                {selected ? <section className="public-map-track" aria-label="선택한 내 음악">
                    <div className="public-map-track-heading"><Cover track={selected} /><div className="public-map-track-copy"><span className="public-map-eyebrow">{selected.metadataPending ? (en ? 'ANALYZING TRACK' : '곡 정보 분석 중') : (en ? 'MY MUSIC' : '내 음악')}</span><h2>{selected.name}</h2><p>{selected.artists}</p></div><button className="public-map-close" type="button" aria-label={t('내 곡 정보 닫기', 'Close song')} onClick={() => { setSelectedId(null); setFeedback(null); requestAnimationFrame(() => pageRef.current?.querySelector('.public-map-find')?.focus({ preventScroll: true })); }}>×</button></div>
                    <div className="public-map-track-actions"><a className="public-map-listen" href={`https://www.youtube.com/results?search_query=${query}`} target="_blank" rel="noopener noreferrer">{t('▶ YouTube로 듣기 ↗', '▶ Listen on YouTube ↗')}</a><a href={`https://open.spotify.com/search/${query}`} target="_blank" rel="noopener noreferrer">Spotify ↗</a></div>
                    <div className="mtm-track-tools"><button type="button" onClick={() => discover(selected)}>{t('✦ 비슷한 곡 찾기', '✦ Find similar songs')}</button><button type="button" aria-pressed={currentChoice === 'dig'} onClick={() => decide('dig')}>{currentChoice === 'dig' ? t('♥ 관심 표시됨', '♥ Interested') : t('♡ 관심 표시', '♡ Interested')}</button></div>
                    <div className="public-map-track-navigation"><button type="button" disabled={collection.length < 2} aria-label={t('이전 내 곡', 'Previous song')} onClick={() => move(-1)}>←</button><button type="button" onClick={() => setExpanded(true)}>{selectedIndex >= 0 ? `${selectedIndex + 1} / ${collection.length}곡` : t('곡 목록', 'Songs')} <span>{t('목록 보기', 'See all')}</span></button><button type="button" disabled={collection.length < 2} aria-label={t('다음 내 곡', 'Next song')} onClick={() => move(1)}>→</button></div>
                </section> : <div className="public-map-welcome"><div className="public-map-welcome-heading"><div><span className="public-map-eyebrow">MY MUSIC</span><h2>{en ? 'Which song shall we start with?' : '어떤 곡부터 들어볼까요?'}</h2></div><button className="public-map-browse" type="button" onClick={() => setExpanded(true)} aria-controls="mobile-music-library" aria-expanded={expanded}>{t('곡 목록 ↗', 'Songs ↗')}</button></div><div className="public-map-peek-tracks">{collection.slice(0, 4).map(track => <button type="button" key={track.id} onClick={() => choose(track)}><Cover track={track} /><span><strong>{track.name}</strong><small>{track.artists}</small></span></button>)}</div></div>}
                <section id="mobile-music-library" className="public-map-library" aria-label={en ? 'My music library' : '내 음악 곡 목록'}>
                    <div className="public-map-library-heading"><h2>{genre === 'all' ? (en ? 'My music' : '내 음악') : model.genres.find(item => item.key === genre)?.label}<span>{collection.length.toLocaleString()}</span></h2><button className="public-map-library-close" type="button" aria-label={t('내 곡 목록 닫기', 'Close song list')} onClick={closeList}>×</button></div>
                    <div className="public-map-search"><span aria-hidden="true">⌕</span><input ref={searchRef} type="search" aria-label={t('내 곡 또는 아티스트 검색', 'Search my songs or artists')} placeholder={en ? 'Find a song or artist' : '곡 또는 아티스트 찾기'} enterKeyHint="search" value={search} onChange={event => { setSearch(event.target.value); setLimit(50); }} />{search && <button type="button" aria-label={t('내 음악 검색어 지우기', 'Clear search')} onClick={() => { setSearch(''); searchRef.current?.focus(); }}>×</button>}</div>
                    <div className="public-map-library-scroll" tabIndex={0} aria-label={t('내 음악 목록 스크롤', 'Scroll my music')}>
                            {search && <p className="public-map-results-count" role="status">검색 결과 {matches.length.toLocaleString()}곡</p>}
                            {matches.length ? <><div className="public-map-song-list">{matches.slice(0, limit).map(track => <button type="button" key={track.id} aria-pressed={track.id === selectedId} className={track.id === selectedId ? 'is-selected' : ''} onClick={() => choose(track)}><Cover track={track} /><span><strong>{track.name}</strong><small>{track.artists}{track.metadataPending ? ' · 분석 중' : ''}</small></span><span className="public-map-song-arrow" aria-hidden="true">{track.id === selectedId ? '✦' : '↗'}</span></button>)}</div>{matches.length > limit && <button type="button" className="public-map-load-more" onClick={() => setLimit(value => value + 50)}>{t('곡 더 보기', 'See more songs')} <span>{limit} / {matches.length.toLocaleString()}</span></button>}</> : <div className="public-map-no-results"><span aria-hidden="true">✦</span><h3>{search ? (en ? 'No songs found' : '찾는 곡이 없어요') : (en ? 'No songs in this genre' : '이 장르에 곡이 없어요')}</h3><p>{search ? '다른 곡명이나 아티스트로 검색해 보세요.' : '다른 곡이나 장르에서 다시 시작해 보세요.'}</p><button type="button" onClick={() => { setSearch(''); changeGenre('all'); }}>{t('내 음악 전체 보기', 'See all my music')}</button></div>}
                    </div>
                </section>
            </aside>
        </section>
        </div>
        {tab === 'discover' && <MobileDiscoveryPanel library={model.library} recommendations={model.recommendations} seed={seed || tracks[0]} status={discoveryState} decisions={decisions} lang={lang} onSeedChange={track => { setSeed(track); }} onRetry={() => { cache.current.delete(discoveryQuery); setRetry(value => value + 1); }} onDecision={discoveryDecision} onMap={() => switchTab('map')} />}
        <MobileTodayPanel library={model.library} identity={storageKey} hidden={tab !== 'today'} lang={lang} onListen={track => { window.open(`https://open.spotify.com/search/${encodeURIComponent(`${track.artists || ''} ${track.name || ''}`)}`, '_blank', 'noopener,noreferrer'); }} />
        {tab === 'map' && feedback && <div className={`mtm-feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}><span>{feedback.text}</span><button type="button" aria-label={t('취향 반응 안내 닫기', 'Dismiss feedback')} onClick={() => setFeedback(null)}>×</button></div>}
        <nav className="mtm-bottom-nav" aria-label={en ? 'Mobile music menu' : '모바일 음악 메뉴'}>{[
            { id: 'map', label: en ? 'My map' : '내 지도', icon: 'map' },
            { id: 'discover', label: en ? 'Discover' : '발견', icon: 'discover' },
            { id: 'today', label: en ? 'Today' : '오늘', icon: 'today' },
        ].map(item => <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} onClick={() => switchTab(item.id)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{item.icon === 'map' ? <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="m17 5 2-2" /></> : item.icon === 'discover' ? <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" /></> : <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 10h16m-11 5 2 2 4-4" /></>}</svg>{item.label}</button>)}</nav>
        <span className="public-map-sr-only" role="status" aria-live="polite">{selected ? `${selected.name}, ${selected.artists} 선택됨` : ''}</span>
        {shareChannel && <SpectraShareDialog tracks={model.library} lang={lang} initialChannel={shareChannel} onClose={() => setShareChannel(null)} />}
        {overviewOpen && <TasteMapMobilePage lang={lang} onClose={closeOverview} onSelectTrack={id => { setSelectedId(id); setFocusRequest(value => value + 1); setExpanded(false); closeOverview(); }} />}
    </main>;
}

export default function MobileMusicMap() {
    const { mapId } = useTasteData();
    const { user } = useAuth();
    const location = useLocation();
    return <MobileMapExplorer key={`${user?.id || 'guest'}:${mapId}`} requestedStar={new URLSearchParams(location.search).get('star')} />;
}
