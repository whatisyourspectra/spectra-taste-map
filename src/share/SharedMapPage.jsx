import LanguageSwitcher from '../i18n/LanguageSwitcher.jsx';
import { translate } from '../i18n/translate.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import SpectraLogo from '../components/SpectraLogo';
import SharedMapCanvas from './SharedMapCanvas';
import { fetchSharedMap } from './sharedMapStorage';
import './SharedMapPage.css';

function Artwork({ track }) {
    return <span className="public-map-artwork" aria-hidden="true"><span>♪</span>{track.coverUrl && <img src={track.coverUrl} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}</span>;
}

function SharedMapExplorer({ id }) {
    const [map, setMap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selected, setSelected] = useState(null);
    const [focusRequest, setFocusRequest] = useState(0);
    const [view, setView] = useState('constellation');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [listLimit, setListLimit] = useState(50);
    const searchRef = useRef(null);
    const pageRef = useRef(null);
    const sheetHandle = useRef(null);
    const sheetGesture = useRef(null);
    const swiped = useRef(false);
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        const syncViewport = () => {
            pageRef.current?.style.setProperty('--share-viewport-height', `${viewport.height}px`);
            pageRef.current?.style.setProperty('--share-viewport-top', `${viewport.offsetTop}px`);
            if (pageRef.current) pageRef.current.dataset.compactViewport = String(viewport.height <= 500);
        };
        syncViewport();
        viewport.addEventListener('resize', syncViewport);
        viewport.addEventListener('scroll', syncViewport);
        return () => { viewport.removeEventListener('resize', syncViewport); viewport.removeEventListener('scroll', syncViewport); };
    }, []);
    useEffect(() => {
        let disposed = false;
        fetchSharedMap(id).then(data => {
            if (!disposed) { setMap(data); setView(data?.style === 'bubbles' ? 'bubbles' : 'constellation'); }
        }).catch(() => { if (!disposed) setError(true); }).finally(() => { if (!disposed) setLoading(false); });
        return () => { disposed = true; };
    }, [id]);
    useEffect(() => {
        const escape = event => {
            if (event.key !== 'Escape') return;
            const target = sheetHandle.current?.getClientRects().length ? sheetHandle.current : pageRef.current?.querySelector('.public-map-find');
            if (expanded) { setExpanded(false); searchRef.current?.blur(); target?.focus({ preventScroll: true }); }
            else if (selected) { setSelected(null); target?.focus({ preventScroll: true }); }
        };
        window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [expanded, selected]);
    const tracks = useMemo(() => Array.isArray(map?.tracks) ? map.tracks : [], [map]);
    const matches = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return query ? tracks.filter(track => `${track.name} ${track.artists}`.toLocaleLowerCase().includes(query)) : tracks;
    }, [tracks, search]);
    const selectedIndex = selected ? tracks.findIndex(track => track.id === selected.id) : -1;
    const selectTrack = track => {
        const restoreFocus = document.activeElement?.closest('.public-map-library, .public-map-peek-tracks');
        setSelected(track);
        setFocusRequest(value => value + 1);
        setSearch('');
        setExpanded(false);
        searchRef.current?.blur();
        if (restoreFocus && window.matchMedia('(max-width: 900px)').matches) {
            requestAnimationFrame(() => pageRef.current?.querySelector('.public-map-listen')?.focus({ preventScroll: true }));
        }
    };
    const closeLibrary = () => {
        setExpanded(false);
        searchRef.current?.blur();
        const target = sheetHandle.current?.getClientRects().length ? sheetHandle.current : pageRef.current?.querySelector('.public-map-find');
        target?.focus({ preventScroll: true });
    };
    const closeTrack = () => {
        setSelected(null);
        requestAnimationFrame(() => {
            const target = pageRef.current?.querySelector(`[data-track-index="${selectedIndex}"]`) || pageRef.current?.querySelector('.public-map-find');
            target?.focus({ preventScroll: true });
        });
    };
    const openSearch = () => {
        flushSync(() => setExpanded(true));
        searchRef.current?.focus();
        searchRef.current?.scrollIntoView({ block: 'nearest' });
    };
    const query = selected ? encodeURIComponent(`${selected.artists} ${selected.name}`) : '';
    const moveTrack = direction => { if (tracks.length) selectTrack(tracks[(selectedIndex + direction + tracks.length) % tracks.length]); };
    const endSheetGesture = event => {
        if (sheetGesture.current === null || event.type === 'pointercancel') { sheetGesture.current = null; return; }
        const dy = event.clientY - sheetGesture.current;
        if (Math.abs(dy) > 28) { swiped.current = true; setExpanded(dy < 0); searchRef.current?.blur(); }
        sheetGesture.current = null;
    };
    return <main ref={pageRef} className={`public-map-page${expanded ? ' is-library-open' : ''}${selected ? ' has-selection' : ''}`}>
        <header className="public-map-header">
            <Link to="/" className="public-map-home" aria-label={translate("SPECTRA 홈")}><SpectraLogo decorative /></Link>
            <span className="public-map-shared-badge"><i /> {translate("친구가 공유한 취향")}</span>
            <LanguageSwitcher />
            <Link className="public-map-header-cta" to="/">{translate("내 취향 만들기")} <span aria-hidden="true">↗</span></Link>
        </header>
        {loading ? <div className="public-map-empty" role="status"><div className="public-map-loading-orbit" /><p>{translate("친구의 음악 세계를 펼치고 있어요.")}</p></div> : !map || error ? <div className="public-map-empty"><span>LINK UNAVAILABLE</span><h1>{translate("공유 지도를 열 수 없어요")}</h1><p>{translate("공유가 해제되었거나 연결에 문제가 있습니다.")}</p><Link className="public-map-start" to="/">{translate("SPECTRA 시작하기 ↗")}</Link></div> : <>
            <section className="public-map-intro">
                <div className="public-map-heading"><span className="public-map-eyebrow">A TASTE, SHARED WITH YOU</span><h1>{map.title || translate("친구의 스펙트라")}</h1><p>{translate("친구가 좋아하는 음악, 그 안의 연결을 만나보세요.")}</p></div>
                <div className="public-map-summary"><strong>{tracks.length.toLocaleString()}<span>{translate("곡")}</span></strong><div aria-label={translate("친구의 음악 장르")}>{(map.genres || []).slice(0, 5).map(genre => <span key={genre}>{genre}</span>)}</div></div>
            </section>
            <section className="public-map-workspace" aria-label={translate("공유 음악 탐색")}>
                <SharedMapCanvas tracks={tracks} selected={selected} focusRequest={focusRequest} view={view} onViewChange={setView} onSelect={selectTrack} onSearch={openSearch} />
                <aside className="public-map-inspector" aria-label={translate("친구의 곡 둘러보기")}>
                    <button ref={sheetHandle} id="public-map-sheet-toggle" type="button" className="public-map-sheet-handle" aria-label={expanded ? translate("곡 목록 접기") : translate("곡 목록 펼치기")} aria-expanded={expanded} aria-controls="public-map-library" onClick={() => { if (!swiped.current) setExpanded(value => !value); swiped.current = false; }} onPointerDown={event => { sheetGesture.current = event.clientY; swiped.current = false; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={endSheetGesture} onPointerCancel={endSheetGesture}><span /><span className="public-map-sr-only">{translate("위로 밀어 곡 목록을 펼치세요")}</span></button>
                    {selected ? <section className="public-map-track" aria-label={translate("선택한 곡 정보")}>
                        <div className="public-map-track-heading"><Artwork key={selected.id} track={selected} /><div className="public-map-track-copy"><span className="public-map-eyebrow">{translate("선택한 곡")}</span><h2>{selected.name}</h2><p>{selected.artists}</p></div><button className="public-map-close" type="button" aria-label={translate("곡 정보 닫기")} onClick={closeTrack}>×</button></div>
                        <div className="public-map-track-actions"><a className="public-map-listen" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/results?search_query=${query}`}>{translate("▶ YouTube로 듣기")} <span aria-hidden="true">↗</span></a><a target="_blank" rel="noopener noreferrer" href={`https://open.spotify.com/search/${query}`}>Spotify <span aria-hidden="true">↗</span></a></div>
                        <div className="public-map-track-navigation"><button type="button" disabled={tracks.length < 2} onClick={() => moveTrack(-1)} aria-label={translate("이전 곡")}>←</button><button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="public-map-library">{selectedIndex + 1} / {tracks.length.toLocaleString()}{translate("곡")} <span>{translate("목록 보기")}</span></button><button type="button" disabled={tracks.length < 2} onClick={() => moveTrack(1)} aria-label={translate("다음 곡")}>→</button></div>
                    </section> : <div className="public-map-welcome">
                        <div className="public-map-welcome-heading"><div><span className="public-map-eyebrow">FRIEND’S PLAYLIST</span><h2>{translate("어떤 곡이 마음에 닿나요?")}</h2></div><button type="button" className="public-map-browse" aria-expanded={expanded} aria-controls="public-map-library" onClick={() => setExpanded(value => !value)}>{expanded ? translate("접기") : translate("모두 보기")} <span aria-hidden="true">{expanded ? '⌄' : '↗'}</span></button></div>
                        <div className="public-map-peek-tracks">{tracks.slice(0, 4).map(track => <button type="button" key={track.id} onClick={() => selectTrack(track)}><Artwork track={track} /><span><strong>{track.name}</strong><small>{track.artists}</small></span></button>)}</div>
                    </div>}
                    <section id="public-map-library" className="public-map-library" aria-label={translate("공유한 곡 목록")}>
                        <div className="public-map-library-heading"><h2>{translate("친구의 곡")} <span>{tracks.length.toLocaleString()}</span></h2><button type="button" className="public-map-library-close" onClick={closeLibrary} aria-label={translate("곡 목록 닫기")}>×</button></div>
                        <div className="public-map-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg><input ref={searchRef} type="search" enterKeyHint="search" aria-label={translate("공유 지도에서 곡 찾기")} placeholder={translate("곡 또는 아티스트 찾기")} value={search} onChange={event => { setSearch(event.target.value); setListLimit(50); }} />{search && <button type="button" aria-label={translate("검색어 지우기")} onClick={() => { setSearch(''); searchRef.current?.focus(); }}>×</button>}</div>
                        <div className="public-map-library-scroll" tabIndex={0} aria-label={translate("곡 목록 스크롤")}>
                            {search && <p className="public-map-results-count" role="status">{translate("검색 결과")} {matches.length.toLocaleString()}{translate("곡")}</p>}
                            {matches.length ? <><div className="public-map-song-list">{matches.slice(0, listLimit).map(track => <button type="button" key={track.id} className={selected?.id === track.id ? 'is-selected' : ''} aria-pressed={selected?.id === track.id} onClick={() => selectTrack(track)}><Artwork track={track} /><span><strong>{track.name}</strong><small>{track.artists}</small></span><span className="public-map-song-arrow" aria-hidden="true">{selected?.id === track.id ? '✦' : '↗'}</span></button>)}</div>{matches.length > listLimit && <button type="button" className="public-map-load-more" onClick={() => setListLimit(value => value + 50)}>{translate("곡 더 보기")} <span>{listLimit} / {matches.length.toLocaleString()}</span></button>}</> : <div className="public-map-no-results"><span aria-hidden="true">✦</span><h3>{search ? translate("찾는 곡이 없어요") : translate("공유된 곡이 없어요")}</h3><p>{search ? translate("다른 곡명이나 아티스트로 찾아보세요.") : translate("친구에게 새로운 지도를 부탁해 보세요.")}</p>{search && <button type="button" onClick={() => { setSearch(''); setListLimit(50); }}>{translate("전체 곡 보기")}</button>}</div>}
                        </div>
                    </section>
                    <Link className="public-map-invite" to="/"><span>{translate("내 음악은 어떤 모습일까?")}</span><strong>{translate("내 취향 만들기")} <span aria-hidden="true">↗</span></strong></Link>
                </aside>
            </section>
            <footer className="public-map-footer"><span>{translate("친구가 공유한 곡 목록으로 만든 취향 지도")}</span><span>{translate("로그인 없이 자유롭게 둘러보세요")}</span></footer>
            <span className="public-map-sr-only" role="status" aria-live="polite">{selected ? translate("{0}, {1} 선택됨", [selected.name, selected.artists]) : ''}</span>
        </>}
    </main>;
}

export default function SharedMapPage() {
    const { id } = useParams();
    return <SharedMapExplorer key={id} id={id} />;
}
