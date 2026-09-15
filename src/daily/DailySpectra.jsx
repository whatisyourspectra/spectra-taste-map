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
    const accepted = result.tracks.length > 0 && result.tracks.every(track => decisions.some(choice => choice.track.id === track.id && choice.action === 'absorb'));
    const minutes = Math.round(result.tracks.reduce((sum, track) => sum + (Number(track.durationMs) || 0), 0) / 60000);
    return <section className="daily-spectra" aria-labelledby="daily-title" style={{ '--daily-color': theme.color }}>
        <header><span>DAILY SPECTRA</span><time dateTime={day}>{day.replaceAll('-', ' . ')}</time></header>
        <div className="daily-orbit" aria-hidden="true"><svg viewBox="0 0 300 135"><ellipse cx="150" cy="67" rx="102" ry="32" transform="rotate(-18 150 67)"/><ellipse cx="150" cy="67" rx="65" ry="50" transform="rotate(28 150 67)"/><path d="M63 85 112 43 173 62 221 28 243 93"/>{[[63,85],[112,43],[173,62],[221,28],[243,93]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="8" opacity=".12"/><circle cx={x} cy={y} r={i===2?4:2.5}/></g>)}</svg></div>
        <p className="daily-kicker">{en ? 'Your daily music reading' : '오늘의 스펙트라'}</p>
        <h2 id="daily-title">{theme.name[en ? 1 : 0]}</h2>
        <p className="daily-message">{theme.message[en ? 1 : 0]}</p>
        <div className="daily-meta"><span>{en ? 'A bundle tuned to your taste' : '내 취향을 바탕으로 고른 오늘의 곡 묶음'}</span><span>{result.tracks.length} TRACKS{minutes > 0 && result.tracks.every(t => t.durationMs > 0) ? ` · ${minutes} MIN` : ''}</span></div>
        {!opened ? <button className="daily-primary" type="button" onClick={() => { setSeedLibrary(uniqueTracks(library)); setResult(initial || { tracks: buildDailyBundle(library, [], day, identity, theme), fallback: false }); setOpened(true); }}>{en ? 'Unfold today’s music' : '오늘의 음악 펼쳐보기'} <span>↗</span></button> : <div className="daily-reveal">
            <p className="daily-status" role="status">{state !== 'ready' ? (en ? 'Finding a few new lights…' : '오늘 어울리는 새로운 음악을 찾고 있어요…') : result.fallback ? (en ? 'Today, rediscover lights in your library.' : '오늘은 내 라이브러리 속 음악을 새롭게 엮었어요.') : (en ? 'Familiar sounds, with a few new discoveries.' : '익숙한 취향에 새로운 발견을 더했어요.')}</p>
            <ol>{result.tracks.map((track, index) => <li key={track.id}>
                <button type="button" className="daily-track" onClick={() => onListen(track)} aria-label={en ? `Listen to ${track.name} on an external service` : `${track.name} 외부 서비스에서 듣기`}>
                    <span className="daily-number">{String(index+1).padStart(2,'0')}</span>
                    <span className="daily-cover">{(track.coverUrl || track.imageUrl) ? <img src={track.coverUrl || track.imageUrl} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility='hidden'; }} /> : '✧'}</span>
                    <span className="daily-track-copy"><strong>{track.name}</strong><small>{track.artists}</small><em>{track.dailyOrigin === 'discovery' ? (en ? 'NEW FIND' : '새로운 발견') : (en ? 'YOUR LIBRARY' : '내 라이브러리')}{track.dailyGenre ? ` · ${titleizeGenre(track.dailyGenre)}` : ''}</em></span><span aria-hidden="true">↗</span>
                </button>
            </li>)}</ol>
            <button className="daily-primary" type="button" disabled={busy || accepted || state !== 'ready' || !result.tracks.length} onClick={() => onAbsorb(result.tracks)}>{accepted ? (saved ? (en ? 'Part of my Spectra ✓' : '나의 스펙트라에 담았어요 ✓') : (en ? 'Not saved yet' : '아직 저장되지 않았어요')) : (en ? 'Keep this bundle in my Spectra' : '이 묶음을 나의 스펙트라에 담기')}</button>
            {saved === false && <div className="daily-save-error" role="alert"><p>{en ? 'Could not save your choices.' : '선택한 음악을 저장하지 못했어요.'}</p><button type="button" className="daily-retry" onClick={onRetrySave}>{en ? 'Retry saving bundle' : '묶음 저장 다시 시도'}</button></div>}
            {result.fallback && state === 'ready' && <button className="daily-retry" type="button" onClick={() => { setState('loading'); setRetry(value => value + 1); }}>{en ? 'Look for new discoveries again' : '새로운 곡도 다시 찾아보기'}</button>}
            <button className="daily-primary daily-share" type="button" disabled={exporting || state !== 'ready' || !result.tracks.length} onClick={() => onCreateStory({ theme, day, tracks: result.tracks })}>{exporting ? (en ? 'Creating card…' : '카드 만드는 중…') : (en ? 'Create Daily Spectra story card' : '오늘의 스펙트라 공유 카드 만들기')}</button>
            <p className="daily-footnote">{en ? 'Tap a track to listen externally. A new reading awaits tomorrow.' : '곡을 누르면 외부 서비스에서 들을 수 있어요. 내일은 또 다른 흐름이 기다려요.'}</p>
        </div>}
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
