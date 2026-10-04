import React, { useEffect, useMemo, useRef, useState } from 'react';
import { voyageTrackKey } from '../taste/voyageExpansion';

export function TrackCover({ track, className = '' }) {
    const url = track?.coverUrl || track?.albumArt || track?.imageUrl || track?.album?.images?.[0]?.url;
    const [failedUrl, setFailedUrl] = useState(null);
    return <span className={`cv-cover ${className}`}>
        {url && failedUrl !== url
            ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(url)} />
            : <span aria-hidden="true">✦</span>}
    </span>;
}

export default function ConstellationExplorer({ seed, tracks, context, onAdd, onClose, cache, lang }) {
    const en = lang === 'en';
    const [result, setResult] = useState({ key: '', tracks: [], status: 'loading' });
    const [retry, setRetry] = useState(0);
    const sheetRef = useRef(null);
    useEffect(() => { sheetRef.current?.querySelector('.cv-sheet-close')?.focus({ preventScroll: true }); }, []);
    const { xAxis, yAxis, source, seedGenres } = context;
    const targetX = Number.isFinite(seed?.[xAxis]) ? seed[xAxis] : 0.5;
    const targetY = Number.isFinite(seed?.[yAxis]) ? seed[yAxis] : 0.5;
    const key = `${seed?.id}:${xAxis}:${yAxis}:${source}:${seedGenres}`;
    useEffect(() => {
        if (!seed?.id) return;
        if (cache.current.has(key)) {
            setResult({ key, tracks: cache.current.get(key), status: 'ready' });
            return;
        }
        const controller = new AbortController();
        setResult({ key, tracks: [], status: 'loading' });
        const params = new URLSearchParams({
            xAxis, yAxis, source, seedGenres, limit: '12', targetX: String(targetX), targetY: String(targetY),
            seedTracks: `${String(seed.artists || '').split(',')[0].trim()}|${seed.name}`,
        });
        const timer = setTimeout(() => controller.abort(), 20000);
        let disposed = false;
        fetch(`${import.meta.env.VITE_API_BASE || ''}/api/discover?${params}`, { signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                return Array.isArray(data.tracks) ? data.tracks : [];
            })
            .then((items) => {
                if (disposed) return;
                const unique = [...new Map(items.filter((track) => track?.id && track?.name).map((track) => [voyageTrackKey(track), track])).values()];
                cache.current.set(key, unique);
                setResult({ key, tracks: unique, status: 'ready' });
            })
            .catch(() => {
                if (!disposed) setResult({ key, tracks: [], status: 'error' });
            })
            .finally(() => clearTimeout(timer));
        return () => { disposed = true; clearTimeout(timer); controller.abort(); };
    }, [key, seed?.id, seed?.artists, seed?.name, xAxis, yAxis, source, seedGenres, targetX, targetY, retry, cache]);
    const existing = useMemo(() => new Set(tracks.flatMap((track) => [track.id, voyageTrackKey(track)])), [tracks]);
    const ready = result.key === key && result.status === 'ready';
    return <aside ref={sheetRef} className="cv-explorer" id="cv-exploration" aria-label={en ? 'Explore constellation' : '별자리 탐색'}>
        <div className="cv-sheet-handle" aria-hidden="true" /><header><div><small>{en ? 'EXPLORE' : '음악 탐색'}</small><h2>{en ? 'Find your next star' : '다음 별을 찾아보세요'}</h2></div><button type="button" className="cv-sheet-close" onClick={onClose} aria-label={en ? 'Close exploration' : '탐색 닫기'}>×</button></header>
        <div className="cv-explorer-seed"><TrackCover track={seed} /><div><small>{en ? 'Connected to' : '이 곡에서 이어지는 음악'}</small><strong>{seed?.name}</strong><span>{seed?.artists}</span></div></div>
        <p className="cv-explorer-hint">{en ? 'Pick a song to grow this constellation.' : '마음에 드는 곡을 골라 별자리를 넓혀보세요.'}</p>
        <div className="cv-explorer-results" aria-busy={result.key !== key || result.status === 'loading'}>
            {(result.key !== key || result.status === 'loading') && <p role="status">{en ? 'Finding connected songs…' : '이어지는 곡을 찾고 있어요…'}</p>}
            {result.key === key && result.status === 'error' && <div role="alert"><p>{en ? 'Could not load songs.' : '곡을 불러오지 못했어요.'}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>{en ? 'Try again' : '다시 시도'}</button></div>}
            {ready && !result.tracks.length && <p>{en ? 'No songs found. Try another star.' : '추천곡이 없어요. 다른 별에서 탐색해 보세요.'}</p>}
            {ready && result.tracks.map((track) => {
                const added = existing.has(track.id) || existing.has(voyageTrackKey(track));
                return <article className="cv-recommendation" key={track.id}>
                    <TrackCover track={track} /><div><strong title={track.name}>{track.name}</strong><span title={track.artists}>{track.artists}</span><button type="button" disabled={added} onClick={() => onAdd(track, seed.id)}>{added ? (en ? '✓ Added' : '✓ 추가됨') : (en ? '+ Add star' : '+ 별자리에 추가')}</button></div>
                </article>;
            })}
        </div>
        <p className="cv-expansion-status" role="status">{en ? 'New stars stay until you leave this constellation.' : '추가한 별은 이 별자리를 나갈 때까지 유지돼요.'}</p>
    </aside>;
}
