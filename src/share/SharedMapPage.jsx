import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SpectraLogo from '../components/SpectraLogo';
import { fetchSharedMap } from './sharedMapStorage';
import './share.css';
const colors = ['#78d5ff', '#c0a3ff', '#f39acb', '#ffd28f'];
function position(track, index) {
    return { x: 80 + track.x * 640 + Math.sin(index * 2.4) * 24, y: 70 + (1 - track.y) * 500 + Math.cos(index * 3.1) * 24 };
}
export default function SharedMapPage() {
    const { id } = useParams();
    const [map, setMap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selected, setSelected] = useState(null);
    const [view, setView] = useState('constellation');
    const [search, setSearch] = useState('');
    const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
    const drag = useRef(null);
    const moved = useRef(false);
    useEffect(() => {
        let disposed = false;
        fetchSharedMap(id).then(data => { if (!disposed) { setMap(data); setView(data?.style || 'constellation'); } }).catch(() => { if (!disposed) setError(true); }).finally(() => { if (!disposed) setLoading(false); });
        return () => { disposed = true; };
    }, [id]);
    const tracks = useMemo(() => Array.isArray(map?.tracks) ? map.tracks : [], [map]);
    const points = useMemo(() => tracks.map(position), [tracks]);
    const edges = useMemo(() => {
        const result = [], seen = new Set();
        // Short spatial links keep the constellation readable at overview scale.
        points.forEach((point, index) => {
            const nearest = points.map((other, j) => ({j, distance: Math.hypot(point.x-other.x,point.y-other.y)}))
                .filter(item => item.j !== index && item.distance < 125).sort((a,b)=>a.distance-b.distance).slice(0,2);
            nearest.forEach(({j}) => {const key=[index,j].sort((a,b)=>a-b).join('-');if (!seen.has(key)) {seen.add(key);result.push([index,j]);}});
        });
        return result;
    }, [points]);
    const matches = search.trim() ? tracks.filter(track => `${track.name} ${track.artists}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0,8) : [];
    const query = selected ? encodeURIComponent(`${selected.artists} ${selected.name}`) : '';
    const selectTrack = track => { setSelected(track); setSearch(''); };
    const reset = () => setCamera({x:0,y:0,zoom:1});
    return <main className="public-map-page">
        <header className="public-map-header"><Link to="/" aria-label="SPECTRA home"><SpectraLogo decorative /></Link><span className="public-map-shared-badge"><i /> SHARED TASTE</span><Link className="public-map-header-cta" to="/">나의 취향 만들기 ↗</Link></header>
        {loading ? <div className="public-map-empty" role="status"><div className="public-map-loading-orbit" /><p>친구의 음악 세계를 펼치고 있어요.</p></div> : !map || error ? <div className="public-map-empty"><span>LINK UNAVAILABLE</span><h1>공유 지도를 열 수 없어요</h1><p>공유가 해제되었거나 연결에 문제가 있습니다.</p><Link className="shared-card-cta" to="/">SPECTRA 시작하기</Link></div> : <>
            <section className="public-map-intro">
                <div><span className="public-map-eyebrow">A LITTLE UNIVERSE, SHARED WITH YOU</span><h1>{map.title}</h1><p>친구가 좋아하는 음악, 그 안의 연결을 만나보세요.</p></div>
                <div className="public-map-summary"><strong>{tracks.length.toLocaleString()}<span>TRACKS</span></strong><div>{(map.genres || []).map(genre=><span key={genre}>{genre}</span>)}</div></div>
            </section>
            <section className="public-map-workspace" aria-label="공유 음악 탐색">
                <div className="public-map-stage">
                    <div className="public-map-stage-top">
                        <div className="public-map-view-tabs" role="group" aria-label="지도 스타일"><button type="button" aria-pressed={view==='constellation'} onClick={()=>setView('constellation')}><span aria-hidden>✦</span> 별자리</button><button type="button" aria-pressed={view==='bubbles'} onClick={()=>setView('bubbles')}><span aria-hidden>◉</span> 앨범 버블</button></div>
                        <span className="public-map-stage-label">EXPLORE THE CONNECTIONS</span>
                    </div>
                    <svg className="public-map-canvas" viewBox="0 0 800 640" aria-label="친구가 공유한 음악 지도" onPointerDown={event=>{moved.current=false;drag.current={x:event.clientX,y:event.clientY,camera};}} onPointerMove={event=>{
                        if(!drag.current)return;const dx=event.clientX-drag.current.x,dy=event.clientY-drag.current.y;
                        if(Math.hypot(dx,dy)>8){moved.current=true;event.currentTarget.setPointerCapture(event.pointerId);const ratio=800/event.currentTarget.getBoundingClientRect().width;setCamera({...drag.current.camera,x:drag.current.camera.x+dx*ratio,y:drag.current.camera.y+dy*ratio});}
                    }} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
                        <defs><filter id="share-star-glow"><feGaussianBlur stdDeviation="4" /></filter><radialGradient id="share-nebula"><stop stopColor="#a399ed" stopOpacity=".15" /><stop offset="1" stopColor="#a399ed" stopOpacity="0" /></radialGradient></defs>
                        <ellipse cx="400" cy="320" rx="350" ry="280" fill="url(#share-nebula)" />
                        {Array.from({length:48},(_,i)=><circle key={`dust-${i}`} cx={(i*173)%800} cy={(i*97)%640} r={i%3===0?1.3:.7} fill="#a6bde5" opacity=".25" />)}
                        <g transform={`translate(${camera.x} ${camera.y}) translate(400 320) scale(${camera.zoom}) translate(-400 -320)`}>
                            {view==='constellation' && edges.map(([a,b])=><line key={`${a}-${b}`} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} stroke={selected?.id===tracks[a].id||selected?.id===tracks[b].id?'#bcecff':colors[a%4]} opacity={selected?.id===tracks[a].id||selected?.id===tracks[b].id ? .8 : .28} strokeWidth="1" />)}
                            {tracks.map((track,index)=>{const point=points[index],picked=selected?.id===track.id;const radius=view==='bubbles'?23+(index%4)*3:4+(index%3);return <g key={track.id} className={`public-map-star${picked?' is-selected':''}`} role="button" tabIndex={0} aria-label={`${track.name} — ${track.artists}`} onClick={()=>{if(!moved.current)selectTrack(track);}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectTrack(track);}}}>
                                <circle cx={point.x} cy={point.y} r={radius+9} fill={colors[index%4]} opacity={picked ? .6 : .22} filter="url(#share-star-glow)" />
                                {picked && <circle cx={point.x} cy={point.y} r={radius+13} fill="none" stroke="#bdeaff" opacity=".6" />}
                                <circle cx={point.x} cy={point.y} r={radius} fill={colors[index%4]} stroke={picked?'#fff':'#ffffff88'} strokeWidth="1.5" />
                                {view==='bubbles'&&track.coverUrl&&<image href={track.coverUrl} x={point.x-radius+2} y={point.y-radius+2} width={(radius-2)*2} height={(radius-2)*2} style={{clipPath:'circle(50%)'}} onError={event=>{event.currentTarget.style.display='none';}} />}
                                {view==='constellation'&&<circle cx={point.x} cy={point.y} r="1.8" fill="#fff" />}
                                <circle cx={point.x} cy={point.y} r={Math.max(14,radius)} fill="transparent" />
                                <title>{track.name} — {track.artists}</title>
                            </g>;})}
                        </g>
                    </svg>
                    <div className="public-map-stage-bottom"><span>곡을 눌러 친구의 취향을 들어보세요</span><div className="public-map-zoom"><button type="button" aria-label="축소" onClick={()=>setCamera(v=>({...v,zoom:Math.max(.6,v.zoom/1.25)}))}>−</button><button type="button" onClick={reset} aria-label="전체 보기">{Math.round(camera.zoom*100)}%</button><button type="button" aria-label="확대" onClick={()=>setCamera(v=>({...v,zoom:Math.min(4,v.zoom*1.25)}))}>+</button></div></div>
                </div>
                <aside className="public-map-inspector">
                    <div className="public-map-search"><span aria-hidden>⌕</span><input aria-label="공유 지도에서 곡 찾기" placeholder="곡 또는 아티스트 찾기" value={search} onChange={event=>setSearch(event.target.value)} /></div>
                    {search && <div className="public-map-search-list">{matches.length?matches.map(track=><button type="button" key={track.id} onClick={()=>selectTrack(track)}><strong>{track.name}</strong><span>{track.artists}</span></button>):<p>일치하는 곡이 없어요.</p>}</div>}
                    {selected ? <section className="public-map-track" aria-label="선택한 곡 정보"><button className="public-map-close" type="button" aria-label="곡 정보 닫기" onClick={()=>setSelected(null)}>×</button><span className="public-map-eyebrow">SELECTED TRACK</span><div className="public-map-album">{selected.coverUrl?<img src={selected.coverUrl} alt="" onError={event=>{event.currentTarget.style.display='none';}} />:<span aria-hidden>♪</span>}</div><h2>{selected.name}</h2><p>{selected.artists}</p><div><a className="public-map-listen" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/results?search_query=${query}`}>▶ YouTube로 듣기 ↗</a><a target="_blank" rel="noopener noreferrer" href={`https://open.spotify.com/search/${query}`}>Spotify에서 열기 ↗</a></div></section> : <div className="public-map-welcome"><div className="public-map-welcome-mark" aria-hidden>✦</div><span className="public-map-eyebrow">EVERY SONG HAS A PLACE</span><h2>어떤 곡이<br />마음에 닿나요?</h2><p>반짝이는 별이나 앨범을 눌러<br />친구가 좋아하는 곡을 만나보세요.</p><div className="public-map-suggestions">{tracks.slice(0,3).map((track,index)=><button type="button" key={track.id} onClick={()=>selectTrack(track)}><span style={{color:colors[index%4]}}>0{index+1}</span><div><strong>{track.name}</strong><small>{track.artists}</small></div><span aria-hidden>↗</span></button>)}</div></div>}
                    <div className="public-map-invite"><span>YOUR TURN</span><p>당신의 음악은<br />어떤 모습을 하고 있나요?</p><Link to="/">나도 내 취향 만들기 <span aria-hidden>↗</span></Link></div>
                </aside>
            </section>
            <footer className="public-map-footer"><span>친구가 공유한 곡 목록으로 만든 취향 지도</span><span>이동 · 확대 · 곡 선택</span></footer>
        </>}
    </main>;
}
