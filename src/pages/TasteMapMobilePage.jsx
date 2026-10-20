import { useEffect, useMemo, useRef, useState } from 'react';
import { useTasteData } from '../context/TasteDataContext';
import { useAuth } from '../auth/AuthContext';
import { buildTasteState, uniqueTracks } from '../taste/buildTasteState';
import { getGenreIdentity, titleizeGenre } from '../taste/genreIdentity';
import { buildAvatarState } from '../avatar/buildAvatarState';
import { loadReflection, reflectionKey, saveReflection } from '../reflection/reflectionStorage';
import ImmersiveSpectra from '../reflection/ImmersiveSpectra';
import SpectraOrbitTour from '../tour/SpectraOrbitTour';
import './TasteMapMobilePage.css';

export default function TasteMapMobilePage({ lang = 'ko', onClose, onSelectTrack }) {
    const { tracks, mapId, status } = useTasteData();
    const { user } = useAuth();
    const key = reflectionKey(user?.id, mapId);
    const dialogRef = useRef(null);
    const stageRef = useRef(null);
    const [stored] = useState(() => { try { return loadReflection(localStorage, key); } catch { return { decisions: [], snapshot: null }; } });
    const [now] = useState(() => Date.now());
    const [camera, setCamera] = useState(null);
    const [saved, setSaved] = useState(true);
    const [retry, setRetry] = useState(0);
    const baseline = useRef(null);
    const library = useMemo(() => uniqueTracks(tracks), [tracks]);
    const taste = useMemo(() => buildTasteState(library, { decisions: stored.decisions, now }), [library, stored.decisions, now]);
    const avatar = useMemo(() => buildAvatarState(taste, library, stored.decisions), [taste, library, stored.decisions]);
    const en = lang === 'en';
    useEffect(() => {
        dialogRef.current.showModal();
    }, []);
    useEffect(() => {
        if (!library.length) return;
        const timer = window.setTimeout(() => {
            if (!baseline.current && status === 'ready') baseline.current = { at: Date.now(), ids: library.map(item => item.id), decisions: stored.decisions, avatar };
            // Read the latest decisions before saving; another view may have added music.
            try {
                const current = loadReflection(localStorage, key);
                setSaved(saveReflection(localStorage, key, current.decisions, baseline.current || stored.snapshot));
            } catch { setSaved(false); }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [library, status, stored, avatar, key, retry]);
    const listen = track => {
        const query = encodeURIComponent(`${track.artists || ''} ${track.name || ''}`);
        window.open(`https://open.spotify.com/search/${query}`, '_blank', 'noopener,noreferrer');
    };
    return <dialog ref={dialogRef} className="mtm-overview-dialog" aria-labelledby="mtm-overview-title" onClose={onClose}
        onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
        <header className="mtm-overview-header"><div><span className="public-map-eyebrow">MY SPECTRA</span><h2 id="mtm-overview-title">{en ? 'Explore my taste' : '내 취향 둘러보기'}</h2></div><button type="button" autoFocus aria-label={en ? 'Close taste overview' : '취향 둘러보기 닫기'} onClick={() => dialogRef.current.close()}>×</button></header>
        <div className="tmm-root"><div className="tmm-shell">
            <section className="tmm-living" aria-label={en ? 'My Spectra' : '나의 스펙트라'}>
                <div className="tmm-living-heading"><span className="tmm-eyebrow">YOUR MUSIC, ONE SPECTRA</span><h1>{en ? 'My Spectra' : '나의 스펙트라'}</h1></div>
                <div className="tmm-avatar-stage"><ImmersiveSpectra avatar={avatar} previous={stored.snapshot?.avatar} comparison={0} lang={lang} stageRef={stageRef} onSelect={onSelectTrack} tourCameraTarget={camera} /></div>
                <div className="tmm-region-signals">{taste.coreGenres.slice(0, 3).map(item => <span key={item.genre} style={{ '--tmm-region': `rgb(${getGenreIdentity(item.genre).tone.rgb})` }}><i aria-hidden="true" />{titleizeGenre(item.genre)}</span>)}</div>
            </section>
            <p className="tmm-library-count">{en ? `${library.length.toLocaleString()} tracks, one Spectra` : `${library.length.toLocaleString()}곡이 만든 하나의 스펙트라`}</p>
            <SpectraOrbitTour library={library} taste={taste} avatar={avatar} lang={lang} onListen={listen} onSelectTrack={onSelectTrack} onCameraChange={setCamera} />
            {!saved && <div className="tmm-save-error" role="alert"><p>{en ? 'Could not save your taste overview.' : '취향 둘러보기의 기록을 저장하지 못했어요.'}</p><button type="button" onClick={() => setRetry(value => value + 1)}>{en ? 'Retry saving' : '저장 다시 시도'}</button></div>}
        </div></div>
    </dialog>;
}
