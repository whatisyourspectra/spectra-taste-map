import { useEffect, useId, useState } from 'react';
import './LivingConstellationAvatar.css';

export default function LivingConstellationAvatar({ avatar, reaction, lang = 'ko' }) {
    const id = useId().replace(/:/g, '');
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        const onVisibility = () => setPaused(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);
    return (
        <svg className={`lc-avatar${paused ? ' is-paused' : ''}`}
            viewBox="0 0 360 360" role="img" aria-labelledby={`${id}-title ${id}-desc`}
            style={{ '--lc-pulse': `${avatar.pulseSeconds}s`, '--lc-drift': `${avatar.driftSeconds}s` }}>
            <title id={`${id}-title`}>{lang === 'en' ? 'Your living constellation' : '살아 있는 나의 취향 별자리'}</title>
            <desc id={`${id}-desc`}>{lang === 'en'
                ? `${avatar.nodes.length} track stars connected by taste, with ${avatar.orbits.length} exploration stars in orbit.`
                : `취향으로 연결된 ${avatar.nodes.length}개의 곡 별과 탐색 중인 ${avatar.orbits.length}개의 공전하는 별.`}</desc>
            <defs>
                <radialGradient id={`${id}-glow`}>
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.6" />
                    <stop offset="0.28" stopColor="currentColor" stopOpacity="0.16" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${id}-warmth`}>
                    <stop stopColor={avatar.warmth > 0.5 ? '#ebc6a6' : '#99b9f4'} stopOpacity="0.08" />
                    <stop offset="1" stopColor="#080c13" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="180" cy="166" r="150" fill={`url(#${id}-warmth)`} />
            {avatar.orbits.length > 0 && <ellipse className="lc-orbit-guide" cx="180" cy="166" rx="150" ry="134" />}
            <g className="lc-body">
                {avatar.regions.slice(0, 8).map((region) => <circle key={region.genre}
                    cx={region.x} cy={region.y} r={40 + region.strength * 28}
                    style={{ color: region.color }} fill={`url(#${id}-glow)`} opacity="0.3" />)}
                <g className="lc-connections">
                    {avatar.edges.map((edge) => <line key={`${edge.from}:${edge.to}`}
                        x1={edge.a.x} y1={edge.a.y} x2={edge.b.x} y2={edge.b.y}
                        stroke={edge.color} className={edge.secondary ? 'secondary' : ''} />)}
                </g>
                {avatar.nodes.map((node) => (
                    <g key={node.id} className={`lc-star${node.emerging ? ' emerging' : ''}`}
                        data-track-id={node.id} style={{ color: node.color, '--lc-star-opacity': node.opacity }}>
                        <title>{node.title}</title>
                        <circle cx={node.x} cy={node.y} r={node.radius * 5} fill={`url(#${id}-glow)`} />
                        <circle cx={node.x} cy={node.y} r={node.radius} fill={node.color} />
                        <circle cx={node.x} cy={node.y} r={node.radius * 0.43} fill="#f1f5ff" />
                        {node.radius > 3.8 && <path d={`M${node.x - 7} ${node.y}h14 M${node.x} ${node.y - 7}v14`}
                            stroke={node.color} strokeWidth="0.5" opacity="0.6" />}
                    </g>
                ))}
            </g>
            {avatar.orbits.map((orbit) => <g className="lc-orbit" key={orbit.id} data-orbit-id={orbit.id}
                style={{ '--lc-orbit-angle': `${orbit.angle}rad`, visibility: reaction?.trackId === orbit.id ? 'hidden' : 'visible' }}>
                <g transform={`translate(${orbit.x} ${orbit.y})`} style={{ color: orbit.color }}>
                    <title>{orbit.title}</title>
                    <circle r="18" fill={`url(#${id}-glow)`} />
                    <circle r="5.5" fill="none" stroke={orbit.color} strokeWidth="0.65" />
                    <circle r="2.3" fill="#eef4ff" />
                </g>
            </g>)}
            {/* One quiet receiving star visually links the card below to this body. */}
            <path className="lc-drop-thread" d="M180 345v-22" />
            <circle cx="180" cy="326" r="2" fill="#b3c9eb" opacity="0.5" />
            {reaction && <g key={reaction.id} className={`lc-reaction lc-reaction-${reaction.action}`}
                data-reaction={reaction.action}
                style={{ '--lc-target-x': `${reaction.x}px`, '--lc-target-y': `${reaction.y}px`, color: reaction.color }}>
                <circle className="lc-reaction-halo" r="22" fill={`url(#${id}-glow)`} />
                <circle r="4" fill={reaction.color} />
                <circle r="1.7" fill="#fff" />
            </g>}
        </svg>
    );
}
