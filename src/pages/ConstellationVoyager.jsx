import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MetroYouTubePlayer from './MetroYouTubePlayer';
import ConstellationCanvas from './ConstellationCanvas';
import ConstellationExplorer, { TrackCover } from './ConstellationExplorer';
import { voyageTrackKey } from '../taste/voyageExpansion';
import './ConstellationVoyager.css';

function VoyageIcon({ name }) {
    return <svg className="cv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {name === 'play' && <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />}
        {name === 'pause' && <path d="M8 5v14M16 5v14" strokeWidth="2.5" />}
        {name === 'previous' && <><path d="M5 5v14" /><path d="m18 5-10 7 10 7V5Z" fill="currentColor" stroke="none" /></>}
        {name === 'next' && <><path d="M19 5v14" /><path d="m6 5 10 7-10 7V5Z" fill="currentColor" stroke="none" /></>}
    </svg>;
}

export default function ConstellationVoyagerHUD({
    cluster, nodes, edges, onPlayTrack, onAddTrack, onUndoAdd, discoveryContext,
    tracks, currentTrack, sequence, isPlaying, onTogglePlay, onNextStar, onPrevStar,
    onFinish, onPlaybackChange, onClose, lang = 'ko',
}) {
    const en = lang === 'en';
    const dialogRef = useRef(null);
    const mapRef = useRef(null);
    const discoveryCache = useRef(new Map());
    const exploreButtonRef = useRef(null);
    const [selectedId, setSelectedId] = useState(currentTrack?.id);
    const [explorationSeedId, setExplorationSeedId] = useState(null);
    const [exploring, setExploring] = useState(false);
    const [queueOpen, setQueueOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [playbackIssue, setPlaybackIssue] = useState(null);
    const [showVideoPip, setShowVideoPip] = useState(false);
    const [addition, setAddition] = useState(null);
    const [focusRequest, setFocusRequest] = useState(null);
    const selectedTrack = tracks.find((track) => track.id === selectedId) || tracks[0];
    const explorationSeed = tracks.find((track) => track.id === explorationSeedId) || selectedTrack;
    const currentIndex = Math.max(0, sequence.indexOf(currentTrack?.id));
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < sequence.length - 1;
    const nextTrack = tracks.find((track) => track.id === sequence[currentIndex + 1]) || null;
    const constellationName = useMemo(() => {
        const name = cluster?.label?.name?.replaceAll('성좌', '별자리');
        return name ? (en || name.endsWith('별자리') ? name : `${name} 별자리`) : (en ? 'My constellation' : '나의 별자리');
    }, [cluster, en]);

    const closeExploration = useCallback(() => {
        setExploring(false);
        requestAnimationFrame(() => exploreButtonRef.current?.focus({ preventScroll: true }));
    }, []);
    const exploreFrom = (track) => {
        if (!track) return;
        setExplorationSeedId(track.id);
        setExploring(true);
        setQueueOpen(false);
        setMenuOpen(false);
        setShowVideoPip(false);
    };
    const selectStar = (track) => { setSelectedId(track.id); setAddition(null); };
    const addStar = (track, anchorId) => {
        if (tracks.some((item) => item.id === track.id || voyageTrackKey(item) === voyageTrackKey(track))) return;
        onAddTrack(track, anchorId);
        setAddition({ track, anchorId, previousId: selectedTrack?.id });
        setSelectedId(track.id);
        setFocusRequest({ id: track.id, version: Date.now() });
        closeExploration();
    };
    const undoAddition = () => {
        if (!addition) return;
        onUndoAdd(addition.track.id);
        setSelectedId(addition.previousId || addition.anchorId);
        setFocusRequest({ id: addition.anchorId, version: Date.now() });
        setAddition(null);
    };

    useEffect(() => {
        const dialog = dialogRef.current;
        const siblings = [...dialog.parentElement.children].filter((element) => element !== dialog);
        const previous = siblings.map((element) => element.inert);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        siblings.forEach((element) => { element.inert = true; });
        dialog.querySelector('.cv-exit-btn')?.focus({ preventScroll: true });
        const trapFocus = (event) => {
            if (event.key !== 'Tab') return;
            const targets = [...dialog.querySelectorAll('button:not(:disabled), a[href], iframe')].filter((element) => element.getClientRects().length && !element.closest('[inert], .is-hidden'));
            const first = targets[0]; const last = targets.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        dialog.addEventListener('keydown', trapFocus);
        return () => {
            siblings.forEach((element, index) => { element.inert = previous[index]; });
            document.body.style.overflow = overflow;
            dialog.removeEventListener('keydown', trapFocus);
        };
    }, []);
    useEffect(() => {
        if (mapRef.current) mapRef.current.inert = exploring || queueOpen;
    }, [exploring, queueOpen]);
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.defaultPrevented || event.target.isContentEditable || event.target.closest('input, textarea, select')) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                if (showVideoPip) setShowVideoPip(false);
                else if (menuOpen) setMenuOpen(false);
                else if (exploring) closeExploration();
                else if (queueOpen) setQueueOpen(false);
                else onClose?.();
            } else if (event.code === 'Space' && !event.target.closest('button, a')) {
                event.preventDefault(); onTogglePlay?.();
            } else if (!exploring && event.key === 'ArrowRight') {
                event.preventDefault(); onNextStar?.();
            } else if (!exploring && event.key === 'ArrowLeft') {
                event.preventDefault(); onPrevStar?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [exploring, queueOpen, menuOpen, showVideoPip, closeExploration, onClose, onTogglePlay, onNextStar, onPrevStar]);

    return <div ref={dialogRef} className={`cv-hud-root${exploring ? ' is-exploring' : ''}`} role="dialog" aria-modal="true" aria-label={en ? 'Constellation' : '별자리 탐색'}>
        <header className="cv-topbar">
            <button type="button" className="cv-exit-btn" onClick={onClose} aria-label={en ? 'Return to map' : '지도로 돌아가기'}>← <span>{en ? 'Map' : '지도'}</span></button>
            <div className="cv-header-titles"><strong className="cv-constellation-title">{constellationName}</strong><span className="cv-star-counter">{en ? `${tracks.length} connected stars` : `${tracks.length}개의 별이 연결되어 있어요`}</span></div>
            <button type="button" className="cv-more-btn" aria-label={en ? 'More options' : '더 보기'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>···</button>
            {menuOpen && <div className="cv-more-menu">
                <button type="button" onClick={() => { setShowVideoPip(true); setMenuOpen(false); }}>{en ? 'Open video player' : '영상 플레이어 열기'}</button>
                <button type="button" onClick={() => { window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${currentTrack?.artists || ''} ${currentTrack?.name || ''}`)}`, '_blank', 'noopener,noreferrer'); setMenuOpen(false); }}>{en ? 'Find on YouTube ↗' : 'YouTube에서 찾기 ↗'}</button>
                <button type="button" onClick={() => setMenuOpen(false)}>{en ? 'Close' : '닫기'}</button>
            </div>}
        </header>

        <div ref={mapRef} className="cv-map-area">
            <ConstellationCanvas nodes={nodes} edges={edges} tracks={tracks} selectedTrack={selectedTrack} playingTrackId={isPlaying ? currentTrack?.id : null} onSelect={selectStar} focusRequest={focusRequest} addedTrackId={addition?.track.id} lang={lang} />
        </div>

        {addition && !exploring && <div className="cv-addition-toast">
            <div role="status"><span aria-hidden="true">✦</span> {en ? 'A new star is connected' : '새로운 별이 연결됐어요'}</div>
            <div><button type="button" onClick={undoAddition}>{en ? 'Undo' : '추가 취소'}</button><button type="button" onClick={() => exploreFrom(tracks.find((track) => track.id === addition.anchorId))}>{en ? 'Keep exploring' : '탐색 계속'}</button></div>
        </div>}

        <section className="cv-selection" hidden={exploring || queueOpen} aria-label={en ? 'Selected star' : '선택한 별'}>
            <TrackCover track={selectedTrack} />
            <div className="cv-selection-copy"><small>{en ? 'SELECTED STAR' : '선택한 별'}</small><strong>{selectedTrack?.name}</strong><span>{selectedTrack?.artists}</span></div>
            <button type="button" className="cv-selected-play" aria-label={en ? 'Play selected star' : '선택한 별 재생'} onClick={() => { if (selectedTrack?.id === currentTrack?.id) onTogglePlay?.(); else if (selectedTrack) onPlayTrack(selectedTrack); }}><VoyageIcon name={selectedTrack?.id === currentTrack?.id && isPlaying ? 'pause' : 'play'} /></button>
            <button ref={exploreButtonRef} type="button" className="cv-explore-toggle" onClick={() => exploreFrom(selectedTrack)} aria-expanded={exploring}>✦ {en ? 'Explore from this star' : '이 별에서 탐색'}</button>
        </section>

        {exploring && <>
            <button type="button" className="cv-sheet-backdrop" onClick={closeExploration} aria-label={en ? 'Close exploration' : '탐색 닫기'} tabIndex={-1} />
            <ConstellationExplorer cache={discoveryCache} seed={explorationSeed} tracks={tracks} context={discoveryContext} onAdd={addStar} onClose={closeExploration} lang={lang} />
        </>}

        {queueOpen && <>
            <button type="button" className="cv-sheet-backdrop" onClick={() => setQueueOpen(false)} aria-label={en ? 'Close play queue' : '재생 목록 닫기'} tabIndex={-1} />
            <aside className="cv-play-queue" aria-label={en ? 'Play queue' : '별자리 재생 목록'}>
                <header><div><small>{en ? 'PLAY ORDER' : '재생 순서'}</small><h2>{en ? 'Constellation songs' : '별자리의 음악'}</h2></div><button type="button" className="cv-sheet-close" onClick={() => setQueueOpen(false)} aria-label={en ? 'Close queue' : '목록 닫기'}>×</button></header>
                <p>{en ? 'Songs play in this order. Select any song to listen.' : '이 순서대로 재생해요. 원하는 곡을 눌러 바로 들을 수 있어요.'}</p>
                <ol>{sequence.map((id, index) => {
                    const track = tracks.find(item => item.id === id);
                    if (!track) return null;
                    return <li key={id}><button type="button" aria-current={currentTrack?.id === id ? 'true' : undefined} onClick={() => { setSelectedId(id); onPlayTrack(track); }} aria-label={`${en ? 'Play' : '재생'}: ${track.name}`}><span>{currentTrack?.id === id && isPlaying ? '▶' : index + 1}</span><TrackCover track={track} /><span><strong>{track.name}</strong><small>{track.artists}</small></span></button></li>;
                })}</ol>
            </aside>
        </>}

        <footer className="cv-dock" aria-label={en ? 'Now playing' : '음악 재생'}>
            <TrackCover track={currentTrack} />
            <div className="cv-track-texts"><span className="cv-track-title">{currentTrack?.name || (en ? 'Choose a song' : '곡을 선택하세요')}</span><span className="cv-track-artist">{isPlaying ? (en ? 'Playing' : '재생 중') : (en ? 'Paused' : '일시정지')} · {currentIndex + 1}/{sequence.length}</span></div>
            <div className="cv-controls">
                <button type="button" className="cv-ctrl-btn cv-prev" onClick={onPrevStar} disabled={!hasPrevious} aria-label={en ? 'Previous song' : '이전 곡'}><VoyageIcon name="previous" /></button>
                <button type="button" className="cv-cruise-toggle-btn" onClick={onTogglePlay} aria-label={isPlaying ? (en ? 'Pause' : '일시정지') : (en ? 'Play' : '재생')}><VoyageIcon name={isPlaying ? 'pause' : 'play'} /></button>
                <button type="button" className="cv-ctrl-btn cv-next" onClick={onNextStar} disabled={!hasNext} aria-label={en ? 'Next song' : '다음 곡'}><VoyageIcon name="next" /></button>
            </div>
            <button type="button" className="cv-queue-toggle" aria-expanded={queueOpen} onClick={() => { setExploring(false); setQueueOpen(value => !value); }} aria-label={en ? 'Open play queue' : '재생 목록 열기'}><span aria-hidden="true">☷</span><span>{en ? 'Queue' : '목록'}</span></button>
            {playbackIssue === currentTrack?.id && <button type="button" className="cv-playback-issue" onClick={() => setShowVideoPip(true)} aria-label={en ? 'Playback needs attention. Open player' : '재생 상태 확인, 플레이어 열기'}>!</button>}
        </footer>

        {currentTrack && <div className={`cv-youtube-pip${showVideoPip ? ' is-visible' : ' is-hidden'}`} aria-hidden={!showVideoPip} inert={!showVideoPip}>
            <MetroYouTubePlayer key={currentTrack.id} track={currentTrack} nextTrack={nextTrack} trainName={`${currentTrack.artists} - ${currentTrack.name}`} color={cluster?.color || '#7dd3fc'} lang={lang} embedded autoplayRequested={isPlaying} playbackIntent={isPlaying} queuePosition={currentIndex + 1} queueLength={sequence.length}
                onPlaybackState={(state) => { if (state === 'error') setPlaybackIssue(currentTrack.id); else if (state === 'playing') setPlaybackIssue(null); onPlaybackChange?.(state); }}
                onUnavailable={() => { setPlaybackIssue(currentTrack.id); onFinish?.(); }}
                onEnded={() => (hasNext ? onNextStar?.() : onFinish?.())} onNext={hasNext ? onNextStar : undefined} onPrevious={hasPrevious ? onPrevStar : undefined} onClose={() => setShowVideoPip(false)} />
        </div>}
    </div>;
}
