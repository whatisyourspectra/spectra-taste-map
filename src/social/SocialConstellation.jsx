import { useMemo } from 'react';
import { titleizeGenre } from '../taste/genreIdentity.js';
const colors = ['#f179cb', '#b89bff', '#72d6ff', '#91e5c6', '#f4c88c'];

export default function SocialConstellation({ snapshot, label }) {
    const nodes = useMemo(() => snapshot.genreProfile.slice(0, 16).map((item, i) => {
        const seed = [...item.genre].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        const angle = i * 2.39996 + seed * .005;
        const distance = 30 + Math.sqrt(i) * 32;
        return { ...item, x: 280 + Math.cos(angle) * distance * 1.3, y: 150 + Math.sin(angle) * distance * .78,
            r: 4 + Math.sqrt(item.strength) * 26, color: colors[seed % colors.length] };
    }), [snapshot]);
    return <svg className="social-constellation" viewBox="0 0 560 300" role="img" aria-label={label}>
        <ellipse cx="280" cy="150" rx="210" ry="105" fill="none" stroke="#aebaff12" />
        <ellipse cx="280" cy="150" rx="145" ry="72" fill="none" stroke="#aebaff10" />
        {nodes.flatMap((node, i) => nodes.slice(0, i).map((other, j) => Math.hypot(node.x - other.x, node.y - other.y) < 160
            ? <line key={`${i}-${j}`} x1={node.x} y1={node.y} x2={other.x} y2={other.y} stroke={node.color} opacity=".24" /> : null))}
        {nodes.map(node => <g key={node.genre}>
            <circle cx={node.x} cy={node.y} r={node.r * 3} fill={node.color} opacity=".04" />
            <circle cx={node.x} cy={node.y} r={node.r * 1.65} fill={node.color} opacity=".12" />
            <circle cx={node.x} cy={node.y} r={node.r} fill={node.color} opacity=".85"><title>{titleizeGenre(node.genre)}</title></circle>
            <circle cx={node.x} cy={node.y} r="2" fill="#fff" />
        </g>)}
        {!nodes.length && <text x="280" y="155" textAnchor="middle" fill="#aebdd4" fontSize="14">SPECTRA</text>}
    </svg>;
}
