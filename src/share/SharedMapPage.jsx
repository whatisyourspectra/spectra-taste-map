import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchSharedMap } from './sharedMapStorage';
import './share.css';
const colors = ['#78d5ff', '#c0a3ff', '#f39acb', '#ffd28f'];
function position(track, index) {
    // Stable jitter separates tracks with identical derived features.
    return { x: 60 + track.x * 680 + Math.sin(index * 2.4) * 28, y: 60 + (1 - track.y) * 520 + Math.cos(index * 3.1) * 28 };
}
export default function SharedMapPage() {
    const { id } = useParams();
    const [map, setMap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selected, setSelected] = useState(null);
    const [view, setView] = useState('constellation');
    const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
    const drag = useRef(null);
    const moved = useRef(false);
    useEffect(() => {
        let disposed = false;
        setLoading(true); setError(false); setMap(null);
        fetchSharedMap(id).then(data => { if (!disposed) { setMap(data); setView(data?.style || 'constellation'); } }).catch(() => { if (!disposed) setError(true); }).finally(() => { if (!disposed) setLoading(false); });
        return () => { disposed = true; };
    }, [id]);
    const tracks = Array.isArray(map?.tracks) ? map.tracks : [];
    const points = tracks.map(position);
    const query = selected ? encodeURIComponent(`${selected.artists} ${selected.name}`) : '';
    return <main className="public-map-page">
        <header><Link to="/">SPECTRA</Link><span>친구의 취향 · 읽기 전용</span></header>
        {loading ? <p role="status">공유 지도를 불러오는 중…</p> : !map || error ? <div className="public-map-empty"><h1>공유 지도를 열 수 없어요</h1><p>공유가 해제되었거나 연결에 문제가 있습니다.</p><Link to="/">SPECTRA 시작하기</Link></div> : <>
            <div className="public-map-title"><h1>{map.title}</h1><p>{tracks.length}곡 · {(map.genres || []).join(' · ')}</p></div>
            <div className="public-map-controls">
                <button type="button" aria-pressed={view === 'constellation'} onClick={() => setView('constellation')}>별자리</button>
                <button type="button" aria-pressed={view === 'bubbles'} onClick={() => setView('bubbles')}>앨범 버블</button>
                <button type="button" aria-label="축소" onClick={() => setCamera(value => ({ ...value, zoom: Math.max(.6, value.zoom / 1.25) }))}>−</button>
                <button type="button" onClick={() => setCamera({x:0,y:0,zoom:1})}>전체 보기</button>
                <button type="button" aria-label="확대" onClick={() => setCamera(value => ({ ...value, zoom: Math.min(4, value.zoom * 1.25) }))}>+</button>
            </div>
            <svg className="public-map-canvas" viewBox="0 0 800 640" aria-label="친구가 공유한 음악 지도" onPointerDown={event => {
                moved.current = false; drag.current = { x: event.clientX, y: event.clientY, camera };
            }} onPointerMove={event => {
                if (!drag.current) return;
                const dx = event.clientX - drag.current.x, dy = event.clientY - drag.current.y;
                if (Math.hypot(dx,dy) > 8) {
                    moved.current = true; event.currentTarget.setPointerCapture(event.pointerId);
                    const ratio = 800 / event.currentTarget.getBoundingClientRect().width;
                    setCamera({ ...drag.current.camera, x: drag.current.camera.x + dx * ratio, y: drag.current.camera.y + dy * ratio });
                }
            }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
                <g transform={`translate(${camera.x} ${camera.y}) translate(400 320) scale(${camera.zoom}) translate(-400 -320)`}>
                    {view === 'constellation' && points.map((point,index) => index > 0 && <line key={`edge-${index}`} x1={point.x} y1={point.y} x2={points[index-1].x} y2={points[index-1].y} stroke={colors[index%4]} opacity=".25" strokeWidth="1" />)}
                    {tracks.map((track,index) => <g key={track.id} role="button" tabIndex={0} aria-label={`${track.name} — ${track.artists}`} onClick={() => { if (!moved.current) setSelected(track); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(track); } }}>
                        <circle cx={points[index].x} cy={points[index].y} r={view === 'bubbles' ? 20 : 9} fill={colors[index%4]} opacity=".9" stroke={selected?.id===track.id?'#fff':'#ffffff55'} strokeWidth="2" />
                        {view === 'bubbles' && track.coverUrl && <image href={track.coverUrl} x={points[index].x-17} y={points[index].y-17} width="34" height="34" style={{clipPath:'circle(50%)'}} />}
                        <title>{track.name} — {track.artists}</title>
                    </g>)}
                </g>
            </svg>
            <p className="public-map-note">공유된 곡 목록을 바탕으로 만든 지도예요. 이동·확대하고 곡을 눌러보세요.</p>
            {selected && <section className="public-map-track" aria-label="선택한 곡 정보"><button className="public-map-close" type="button" aria-label="곡 정보 닫기" onClick={() => setSelected(null)}>×</button><h2>{selected.name}</h2><p>{selected.artists}</p><div><a target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/results?search_query=${query}`}>YouTube로 듣기 ↗</a><a target="_blank" rel="noopener noreferrer" href={`https://open.spotify.com/search/${query}`}>Spotify ↗</a></div></section>}
            <Link className="shared-card-cta" to="/">나도 내 취향 만들기 →</Link>
        </>}
    </main>;
}
