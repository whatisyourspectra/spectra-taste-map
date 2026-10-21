import { translate } from '../i18n/translate.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildMapEdges, focusCameraOn, getMapMarkerRadius, getMapPoints, getVisibleMapIndices, zoomCameraAt } from './sharedMapGeometry';

const colors = ['#78d5ff', '#c0a3ff', '#f39acb', '#ffd28f'];
const initialCamera = { x: 0, y: 0, zoom: 1 };
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default function SharedMapCanvas({ tracks, selected, focusRequest, view, onViewChange, onSelect, onSearch, scope = 'shared', showGroups = false }) {
    const canvasRef = useRef(null);
    const cameraRef = useRef(initialCamera);
    const gesture = useRef({ pointers: new Map(), start: null, moved: false });
    const [size, setSize] = useState({ width: 800, height: 640 });
    const [camera, setCamera] = useState(initialCamera);
    const [gesturing, setGesturing] = useState(false);
    const points = useMemo(() => getMapPoints(tracks, size), [tracks, size]);
    const groups = useMemo(() => {
        if (!showGroups) return [];
        const collected = new Map();
        tracks.forEach((track, index) => {
            if (!track.mapGroup) return;
            const group = collected.get(track.mapGroup) || { label: track.mapGroup, color: track.mapColor, x: 0, y: 0, count: 0 };
            group.x += points[index].x; group.y += points[index].y; group.count++;
            collected.set(track.mapGroup, group);
        });
        return [...collected.values()].map(group => ({ ...group, x: group.x / group.count, y: group.y / group.count }));
    }, [tracks, points, showGroups]);
    const selectedIndex = tracks.findIndex(track => track.id === selected?.id);
    const visible = useMemo(() => getVisibleMapIndices(points, size, camera, { view, selectedIndex }), [points, size, camera, view, selectedIndex]);
    const edges = useMemo(() => buildMapEdges(visible.map(index => points[index]), Math.min(125, size.width * .29)).map(([a, b]) => [visible[a], visible[b]]), [points, visible, size.width]);
    const commitCamera = next => { cameraRef.current = next; setCamera(next); };

    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            if (width && height) {
                setSize({ width, height });
                cameraRef.current = initialCamera;
                setCamera(initialCamera);
            }
        });
        observer.observe(canvasRef.current);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (selectedIndex < 0) return;
        const frame = requestAnimationFrame(() => {
            const next = focusCameraOn(points[selectedIndex], cameraRef.current, size);
            cameraRef.current = next;
            setCamera(next);
        });
        return () => cancelAnimationFrame(frame);
    }, [selectedIndex, focusRequest, points, size]);
    useEffect(() => {
        const element = canvasRef.current;
        const wheel = event => {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            const rect = element.getBoundingClientRect();
            const next = zoomCameraAt(cameraRef.current, { x: event.clientX - rect.left, y: event.clientY - rect.top }, Math.exp(-event.deltaY * .008), size);
            cameraRef.current = next;
            setCamera(next);
        };
        element.addEventListener('wheel', wheel, { passive: false });
        return () => element.removeEventListener('wheel', wheel);
    }, [size]);

    const localPoint = event => {
        const rect = event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const beginGesture = () => {
        const active = [...gesture.current.pointers.values()];
        gesture.current.start = { camera: cameraRef.current, point: active[0], midpoint: active.length > 1 ? midpoint(...active) : null, distance: active.length > 1 ? distance(...active) : 0 };
    };
    const pointerDown = event => {
        if (event.button !== 0) return;
        if (!gesture.current.pointers.size) gesture.current.moved = false;
        gesture.current.pointers.set(event.pointerId, localPoint(event));
        event.currentTarget.setPointerCapture(event.pointerId);
        if (gesture.current.pointers.size > 1) {
            gesture.current.moved = true;
            setGesturing(true);
            for (const id of gesture.current.pointers.keys()) event.currentTarget.setPointerCapture(id);
        }
        beginGesture();
    };
    const pointerMove = event => {
        const state = gesture.current;
        if (!state.pointers.has(event.pointerId)) return;
        state.pointers.set(event.pointerId, localPoint(event));
        const active = [...state.pointers.values()], start = state.start;
        if (active.length > 1 && start.midpoint) {
            const center = midpoint(...active);
            const next = zoomCameraAt(start.camera, start.midpoint, distance(...active) / Math.max(1, start.distance), size);
            commitCamera({ ...next, x: next.x + center.x - start.midpoint.x, y: next.y + center.y - start.midpoint.y });
        } else {
            const dx = active[0].x - start.point.x, dy = active[0].y - start.point.y;
            if (state.moved || Math.hypot(dx, dy) > 6) {
                state.moved = true;
                setGesturing(true);
                event.currentTarget.setPointerCapture(event.pointerId);
                commitCamera({ ...start.camera, x: start.camera.x + dx, y: start.camera.y + dy });
            }
        }
    };
    const pointerEnd = event => {
        const state = gesture.current;
        if (!state.pointers.has(event.pointerId)) return;
        if (!state.moved && event.type !== 'pointercancel') {
            const tap = localPoint(event), current = cameraRef.current;
            let closest = null, best = Infinity;
            for (const index of visible) {
                const p = points[index];
                const screen = { x: size.width / 2 + (p.x - size.width / 2) * current.zoom + current.x, y: size.height / 2 + (p.y - size.height / 2) * current.zoom + current.y };
                const d = distance(tap, screen), hit = Math.max(22, getMapMarkerRadius(view, size, current, index === selectedIndex));
                if (d <= hit && d < best) { best = d; closest = index; }
            }
            if (closest !== null) onSelect(tracks[closest]);
        }
        state.pointers.delete(event.pointerId);
        if (state.pointers.size) beginGesture(); else { state.start = null; setGesturing(false); }
    };
    const zoom = factor => commitCamera(zoomCameraAt(cameraRef.current, { x: size.width / 2, y: size.height / 2 }, factor, size));
    const keyboardSelect = (event, index) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(tracks[index]); }
        if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            const next = (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + tracks.length) % tracks.length;
            onSelect(tracks[next]);
            requestAnimationFrame(() => canvasRef.current?.querySelector(`[data-track-index="${next}"]`)?.focus());
        }
    };
    return <div className={`public-map-stage${view === 'bubbles' ? ' is-album-view' : ''}${gesturing ? ' is-gesturing' : ''}`}>
        <div className="public-map-stage-top">
            <div className="public-map-view-tabs" role="group" aria-label={translate("지도 스타일")}>
                <button type="button" aria-pressed={view === 'constellation'} onClick={() => onViewChange('constellation')}><span aria-hidden="true">✦</span> {translate("별자리")}</button>
                <button type="button" aria-pressed={view === 'bubbles'} onClick={() => onViewChange('bubbles')}><span aria-hidden="true">◉</span> {translate("앨범 버블")}</button>
            </div>
            <button type="button" className="public-map-find" onClick={onSearch} aria-label={scope === 'personal' ? translate("내 음악에서 곡 찾기") : translate("공유 지도에서 곡 찾기")}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg></button>
        </div>
        <svg ref={canvasRef} className="public-map-canvas" viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={scope === 'personal' ? translate("내 음악 지도. 드래그로 이동하고 두 손가락으로 확대할 수 있어요.") : translate("친구가 공유한 음악 지도. 드래그로 이동하고 두 손가락으로 확대할 수 있어요.")} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
            <defs><filter id="share-star-glow"><feGaussianBlur stdDeviation="4" /></filter><radialGradient id="share-nebula"><stop stopColor="#a399ed" stopOpacity=".18" /><stop offset="1" stopColor="#a399ed" stopOpacity="0" /></radialGradient></defs>
            <ellipse cx={size.width * .5} cy={size.height * .5} rx={size.width * .58} ry={size.height * .52} fill="url(#share-nebula)" />
            {Array.from({ length: 40 }, (_, i) => <circle key={`dust-${i}`} cx={(i * 173) % size.width} cy={(i * 97) % size.height} r={i % 3 === 0 ? 1.2 : .6} fill="#a6bde5" opacity=".25" />)}
            <g className="public-map-world" transform={`translate(${camera.x} ${camera.y}) translate(${size.width / 2} ${size.height / 2}) scale(${camera.zoom}) translate(${-size.width / 2} ${-size.height / 2})`}>
                {view === 'constellation' && edges.map(([a, b]) => <line key={`${a}-${b}`} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} stroke={selectedIndex === a || selectedIndex === b ? '#bcecff' : (tracks[a].mapColor || colors[a % 4])} opacity={selectedIndex === a || selectedIndex === b ? .8 : .26} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
                {visible.map(index => {
                    const track = tracks[index], point = points[index], picked = selectedIndex === index;
                    const radius = getMapMarkerRadius(view, size, camera, picked) / camera.zoom;
                    return <g key={track.id} data-track-index={index} className={`public-map-star${picked ? ' is-selected' : ''}`} role="button" tabIndex={picked || (selectedIndex < 0 && index === visible[0]) ? 0 : -1} aria-label={`${track.name} — ${track.artists}`} aria-pressed={picked} onClick={event => { if (event.detail === 0) onSelect(track); }} onKeyDown={event => keyboardSelect(event, index)}>
                        {(view !== 'bubbles' || picked) && (tracks.length <= 160 || picked) && <circle cx={point.x} cy={point.y} r={radius + 8 / camera.zoom} fill={track.mapColor || colors[index % 4]} opacity={picked ? .35 : .13} filter="url(#share-star-glow)" />}
                        {picked && <circle cx={point.x} cy={point.y} r={radius + 6 / camera.zoom} fill="none" stroke="#bdeaff" opacity=".8" vectorEffect="non-scaling-stroke" />}
                        <circle className="public-map-marker" cx={point.x} cy={point.y} r={radius} fill={view === 'bubbles' ? '#172233' : track.mapColor || colors[index % 4]} stroke={picked ? '#fff' : track.mapRecommended ? '#d9eaff' : track.mapColor || '#c5d6f54d'} strokeDasharray={track.mapRecommended ? '3 3' : undefined} strokeWidth={picked ? 2 : 1} vectorEffect="non-scaling-stroke" />
                        {view === 'bubbles' && <text x={point.x} y={point.y} dy=".35em" textAnchor="middle" fontSize={18 / camera.zoom} fill="#a6b8d3" pointerEvents="none" aria-hidden="true">♪</text>}
                        {view === 'bubbles' && track.coverUrl && <image href={track.coverUrl} x={point.x - radius + 1 / camera.zoom} y={point.y - radius + 1 / camera.zoom} width={(radius - 1 / camera.zoom) * 2} height={(radius - 1 / camera.zoom) * 2} preserveAspectRatio="xMidYMid slice" style={{ clipPath: 'circle(50%)' }} onError={event => { event.currentTarget.style.display = 'none'; }} />}
                        {view === 'constellation' && <circle cx={point.x} cy={point.y} r="1.3" fill="#fff" />}
                        <circle cx={point.x} cy={point.y} r={Math.max(22 / camera.zoom, radius)} fill="transparent" />
                    </g>;
                })}
                {view === 'constellation' && camera.zoom < 1.8 && (scope !== 'personal' || (size.width > 360 && size.height > 330)) && groups.map(group => <text key={group.label} x={group.x} y={group.y - 35 / camera.zoom} textAnchor="middle" fontSize={12 / camera.zoom} fill={group.color} stroke="#0a101c" strokeWidth={4 / camera.zoom} paintOrder="stroke" pointerEvents="none" aria-hidden="true">{translate(group.label)}</text>)}
            </g>
        </svg>
        <div className="public-map-stage-bottom"><span className="public-map-density-hint">{visible.length < tracks.length ? <><strong>{translate(view === 'bubbles' ? '앨범 {0}개 표시' : '별 {0}개 표시', [visible.length])}</strong><span>{translate("확대해 더 둘러보세요")}</span></> : translate("곡을 눌러 만나보세요")}</span><div className="public-map-zoom"><button type="button" aria-label={translate("축소")} disabled={camera.zoom <= .65} onClick={() => zoom(1 / 1.3)}>−</button><button type="button" onClick={() => commitCamera(initialCamera)} aria-label={translate("지도 전체 보기")}>{translate("전체")}</button><button type="button" aria-label={translate("확대")} disabled={camera.zoom >= 4} onClick={() => zoom(1.3)}>+</button></div></div>
    </div>;
}
