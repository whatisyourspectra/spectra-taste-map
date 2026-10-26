import { useId, useMemo } from 'react';
import { buildConstellationTopology, hash01 } from './brand/constellationTopology.js';
import { getGenreIdentity } from './brand/genreIdentity.js';

// Stable positions preserve the personal sky when a new mood highlights other songs.
function buildField(library, queue) {
  const baseline = [...library].sort((a, b) => hash01(a.id) - hash01(b.id) || a.id.localeCompare(b.id));
  const selected = [...new Map([...queue, ...baseline].map(track => [track.id, track])).values()].slice(0, 48);
  const nodes = selected.map(track => {
    const tone = getGenreIdentity(track.tags[0]);
    const x = 58 + track.energy * 400 + (hash01(`${track.id}:x`) - 0.5) * 22;
    const y = 270 - track.brightness * 210 + (hash01(`${track.id}:y`) - 0.5) * 30;
    return { ...track, x, y, nX: x / 520, nY: y / 320, color: tone.tone.text, clusterId: 0 };
  });
  const byId = new Map(nodes.map(node => [node.id, node]));
  return { nodes, edges: buildConstellationTopology(nodes).map(edge => ({ ...edge, a: byId.get(edge.from), b: byId.get(edge.to) })) };
}

export default function TasteConstellation({ library, queue, mood, listening }) {
  const id = useId().replaceAll(':', '');
  const { nodes, edges } = useMemo(() => buildField(library, queue), [library, queue]);
  const activeIds = new Set(queue.map(track => track.id));
  const first = queue[0]?.id;
  const activeNodes = nodes.filter(node => activeIds.has(node.id));
  const activePath = [...activeNodes].sort((a, b) => a.energy - b.energy);
  return <figure className={`taste-field ${listening ? 'is-listening' : ''}`}>
    <div className="field-heading"><span>PERSONAL / SKY</span><span>{library.length} TRACKS{library.length > 48 ? ' · 48 STARS' : ''}</span></div>
    <svg className="taste-constellation" viewBox="0 0 520 320" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>내 취향의 별자리 · {mood.label} 무드</title>
      <desc id={`${id}-description`}>가져온 곡의 활기와 밝기를 바탕으로 배치한 별자리. 표시된 {nodes.length}개의 별 중 현재 추천에 포함된 {activeNodes.length}개가 강조됩니다. 별의 위치는 무드를 전환해도 유지됩니다.</desc>
      <defs>
        <radialGradient id={`${id}-nebula`}><stop stopColor="var(--mood)" stopOpacity=".12" /><stop offset="1" stopColor="var(--mood)" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-halo`}><stop stopColor="var(--mood)" stopOpacity=".6" /><stop offset=".25" stopColor="var(--mood)" stopOpacity=".16" /><stop offset="1" stopColor="var(--mood)" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-route`}><stop stopColor="#70d6ff" /><stop offset=".55" stopColor="#c084fc" /><stop offset="1" stopColor="#ed70bc" /></linearGradient>
      </defs>
      <ellipse cx="260" cy="160" rx="220" ry="145" fill={`url(#${id}-nebula)`} />
      <g className="field-reticle" fill="none">
        <ellipse cx="260" cy="160" rx="212" ry="136" /><ellipse cx="260" cy="160" rx="145" ry="93" strokeDasharray="2 7" />
        <path d="M260 18v10m0 264v10M35 160h10m430 0h10" />
      </g>
      <g aria-hidden="true">{Array.from({ length: 42 }, (_, index) => <circle key={index} cx={24 + hash01(`drive:sky:${index}:x`) * 470} cy={25 + hash01(`drive:sky:${index}:y`) * 265} r={index % 7 === 0 ? 1 : 0.55} fill="#b7cbed" opacity={0.12 + hash01(`drive:sky:${index}`) * 0.28} />)}</g>
      <g className="field-connections">{edges.map(edge => <line key={`${edge.from}:${edge.to}`} x1={edge.a.x} y1={edge.a.y} x2={edge.b.x} y2={edge.b.y} stroke={edge.color} />)}</g>
      <polyline className="field-route" points={activePath.map(node => `${node.x},${node.y}`).join(' ')} fill="none" stroke={`url(#${id}-route)`} />
      {nodes.map(node => <g key={node.id} className={`field-star ${activeIds.has(node.id) ? 'is-selected' : ''} ${node.id === first ? 'is-anchor' : ''}`} data-track-id={node.id}>
        <title>{node.name} · {node.artist}</title>
        <circle className="star-halo" cx={node.x} cy={node.y} r={node.id === first ? 29 : 19} fill={`url(#${id}-halo)`} />
        {node.id === first && <><circle className="star-anchor-ring" cx={node.x} cy={node.y} r="13" fill="none" stroke="var(--mood)" /><path d={`M${node.x - 19} ${node.y}h6m26 0h6M${node.x} ${node.y - 19}v6m0 26v6`} stroke="var(--mood)" strokeWidth=".6" /></>}
        <circle cx={node.x} cy={node.y} r={activeIds.has(node.id) ? 2.7 : 1.6} fill={activeIds.has(node.id) ? '#f2f5ff' : node.color} />
        {activeIds.has(node.id) && <path d={`M${node.x - 5} ${node.y}h10M${node.x} ${node.y - 5}v10`} stroke="#e6eaff" strokeWidth=".5" opacity=".65" />}
      </g>)}
      <text x="30" y="309" className="field-axis">차분하게</text><text x="490" y="309" textAnchor="end" className="field-axis">활기 있게</text>
    </svg>
    <figcaption><span className="field-legend-dot" />지금의 무드로 이어진 음악<span>취향·태그 기반 시각화</span></figcaption>
  </figure>;
}
