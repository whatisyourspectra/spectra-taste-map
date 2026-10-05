import { useId } from 'react';
import { hash01 } from '../taste/constellationTopology.js';
import './ConstellationArtwork.css';

/** One drawing language for the daily result, calendar marks, and saved details. */
export default function ConstellationArtwork({ result, compact = false, label, activeId, onSelect }) {
    const id = useId().replaceAll(':', '');
    const color = result.color || '#b4c3db';
    const nodes = result.nodes || [];
    return <svg viewBox="0 0 360 320" className={`oracle-art${compact ? ' oracle-art--compact' : ''}`}
        role={onSelect ? 'group' : label ? 'img' : undefined} aria-label={label} aria-hidden={!label || undefined}>
        <defs>
            <radialGradient id={`${id}-halo`}>
                <stop offset="0" stopColor={color} stopOpacity="0.38" />
                <stop offset="0.3" stopColor={color} stopOpacity="0.1" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#e1e8f4" stopOpacity="0.62" />
                <stop offset="0.6" stopColor={color} stopOpacity="0.48" />
                <stop offset="1" stopColor={color} stopOpacity="0.2" />
            </linearGradient>
        </defs>
        {!compact && <g aria-hidden="true">
            <circle cx="180" cy="160" r="133" fill="none" stroke="#b0bfd4" strokeOpacity="0.09" strokeWidth="0.5" />
            <path d="M180 20v8m0 264v8M40 160h8m264 0h8" stroke="#b0bfd4" strokeOpacity="0.3" strokeWidth="0.6" />
            {Array.from({ length: 36 }, (_, i) => <circle key={i}
                cx={20 + hash01(`oracle:sky:${i}:x`) * 320} cy={24 + hash01(`oracle:sky:${i}:y`) * 272}
                r={i % 5 === 0 ? 0.8 : 0.45} fill="#cbd8eb" opacity={0.12 + hash01(`oracle:sky:${i}`) * 0.26} />)}
            <text x="22" y="26" className="oracle-art__annotation">PERSONAL / SKY</text>
            <text x="338" y="300" textAnchor="end" className="oracle-art__annotation">{String(nodes.length).padStart(2, '0')} TRACKS</text>
        </g>}
        <g fill="none" stroke={compact ? color : `url(#${id}-line)`} strokeWidth={compact ? 4 : 0.9} strokeLinecap="round">
            {(result.edges || []).map(([a, b], index) => {
                const from = nodes[a];
                const to = nodes[b];
                if (!from || !to) return null;
                // A little space around each star keeps the lines light and legible.
                const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
                const gap = Math.min(compact ? 7 : 5, length / 3);
                const dx = (to.x - from.x) / length * gap;
                const dy = (to.y - from.y) / length * gap;
                return <line key={index} x1={from.x + dx} y1={from.y + dy} x2={to.x - dx} y2={to.y - dy} />;
            })}
        </g>
        {nodes.map((node, index) => <g key={node.id || index}
            className={`oracle-art__star${activeId === node.id ? ' is-active' : ''}`}
            role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? `${String(index + 1).padStart(2, '0')} · ${node.name} · ${node.artists || ''}` : undefined}
            aria-pressed={onSelect ? activeId === node.id : undefined}
            onClick={onSelect ? () => onSelect(node.id) : undefined}
            onKeyDown={onSelect ? event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.id); }
            } : undefined}>
            {!compact && <>
                <circle cx={node.x} cy={node.y} r={node.isSelected ? 28 : 16} fill={`url(#${id}-halo)`} />
                {onSelect && <circle cx={node.x} cy={node.y} r="22" fill="transparent" />}
                <circle className="oracle-art__focus" cx={node.x} cy={node.y} r="11" fill="none" stroke={color} strokeWidth="0.8" />
                {node.isSelected && <path d={`M${node.x - 9} ${node.y}h18M${node.x} ${node.y - 9}v18`} stroke="#d5e2f4" strokeWidth="0.55" opacity="0.65" />}
                <text x={node.x + 10} y={node.y - 9} className="oracle-art__number">{String(index + 1).padStart(2, '0')}</text>
            </>}
            <circle cx={node.x} cy={node.y} r={compact ? (node.isSelected ? 11 : 7) : (node.isSelected ? 2.7 : 1.7)} fill={compact ? color : '#f1f5ff'} />
        </g>)}
    </svg>;
}
