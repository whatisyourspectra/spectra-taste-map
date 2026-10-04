import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TrackCover } from './ConstellationExplorer';

export default function ConstellationCanvas({ nodes = [], edges = [], tracks, selectedTrack, playingTrackId, onSelect, focusRequest, addedTrackId, lang }) {
    const viewport = useRef(null);
    const starRefs = useRef(new Map());
    const [zoomOverride, setZoomOverride] = useState(null);
    const [size, setSize] = useState({ width: 800, height: 500 });
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
        observer.observe(viewport.current);
        return () => observer.disconnect();
    }, []);
    const geometry = useMemo(() => {
        const minX = Math.min(0, ...nodes.map((node) => node.x)) - 90;
        const minY = Math.min(0, ...nodes.map((node) => node.y)) - 90;
        const width = Math.max(400, Math.max(0, ...nodes.map((node) => node.x)) - minX + 90);
        const height = Math.max(320, Math.max(0, ...nodes.map((node) => node.y)) - minY + 110);
        const points = new Map(nodes.map((node) => [node.id, { x: node.x - minX, y: node.y - minY }]));
        return { width, height, points };
    }, [nodes]);
    const fittedZoom = Math.min((size.width - 24) / geometry.width, (size.height - 24) / geometry.height, 1);
    const zoom = zoomOverride?.count === nodes.length ? zoomOverride.value : Math.max(0.2, fittedZoom);
    const changeZoom = (value) => setZoomOverride({ count: nodes.length, value: Math.max(0.15, Math.min(1.6, value)) });
    useLayoutEffect(() => {
        if (!focusRequest?.id) return;
        setZoomOverride({ count: nodes.length, value: 0.85 });
        const frame = requestAnimationFrame(() => starRefs.current.get(focusRequest.id)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
        return () => cancelAnimationFrame(frame);
    }, [focusRequest, nodes.length]);
    const en = lang === 'en';
    return <section className="cv-map" aria-label={en ? 'Constellation map' : '별자리 지도'}>
        <div className="cv-map-toolbar"><span>{en ? 'Tap a star to choose a song' : '별을 눌러 곡을 선택하세요'}</span><div>
            <button type="button" onClick={() => changeZoom(zoom - 0.15)} aria-label={en ? 'Zoom out' : '축소'}>−</button>
            <button type="button" onClick={() => changeZoom(zoom + 0.15)} aria-label={en ? 'Zoom in' : '확대'}>＋</button>
            <button type="button" onClick={() => { const box = viewport.current; if (box) { changeZoom(fittedZoom); box.scrollTo(0, 0); } }}>{en ? 'Fit all' : '전체 보기'}</button>
        </div></div>
        <div className="cv-map-scroll" ref={viewport}>
            <div className="cv-map-sizer" style={{ width: geometry.width * zoom, height: geometry.height * zoom }}>
                <div className="cv-star-field" style={{ width: geometry.width, height: geometry.height, '--cv-zoom': zoom, transform: `scale(${zoom})` }}>
                    <svg width={geometry.width} height={geometry.height} aria-hidden="true">{edges.map((edge) => {
                        const from = geometry.points.get(edge.from); const to = geometry.points.get(edge.to);
                        if (!from || !to) return null;
                        return <line key={`${edge.from}:${edge.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`${edge.from === selectedTrack?.id || edge.to === selectedTrack?.id ? 'selected' : ''}${edge.to === addedTrackId ? ' just-added' : ''}`} />;
                    })}</svg>
                    {tracks.map((track) => {
                        const point = geometry.points.get(track.id);
                        if (!point) return null;
                        return <button type="button" key={track.id} ref={(element) => { if (element) starRefs.current.set(track.id, element); else starRefs.current.delete(track.id); }} data-track-id={track.id} className={`cv-star${selectedTrack?.id === track.id ? ' selected' : ''}${track.id === addedTrackId ? ' just-added' : ''}${track.id === playingTrackId ? ' is-playing' : ''}`} style={{ left: point.x, top: point.y }} onClick={() => onSelect(track)} aria-pressed={selectedTrack?.id === track.id} title={`${track.name} — ${track.artists}`}>
                            <TrackCover track={track} /><strong>{track.name}</strong>{track.id === addedTrackId && <small className="cv-new-star">{en ? 'NEW' : '새 별'}</small>}
                        </button>;
                    })}
                </div>
            </div>
        </div>
    </section>;
}
