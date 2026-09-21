import { useEffect, useId, useMemo, useState } from 'react';
import './LivingConstellationAvatar.css';

export default function LivingConstellationAvatar({
    avatar,
    reaction,
    lang = 'ko',
    showReceiver = true,
    fixedFrame = false,
    spatial = false,
    onSelect,
    activeGenre = null,
}) {
    const id = useId().replace(/:/g, '');
    const [paused, setPaused] = useState(false);
    const points = [...avatar.nodes, ...avatar.orbits];
    const minX = Math.min(...points.map((node) => node.x));
    const maxX = Math.max(...points.map((node) => node.x));
    const minY = Math.min(...points.map((node) => node.y));
    const maxY = Math.max(...points.map((node) => node.y));
    const extent = Math.max(180, maxX - minX + 64, maxY - minY + 64);
    const viewBox = !showReceiver && points.length
        ? `${(minX + maxX - extent) / 2} ${(minY + maxY - extent) / 2} ${extent} ${extent}`
        : '0 0 360 360';

    // Find the primary anchor star for the active genre cluster
    const anchorStarId = useMemo(() => {
        if (!activeGenre) return null;
        const matching = avatar.nodes.filter((node) => node.genre === activeGenre);
        if (!matching.length) return null;
        return matching.reduce((max, node) => (node.radius > max.radius ? node : max), matching[0]).id;
    }, [avatar.nodes, activeGenre]);

    useEffect(() => {
        const onVisibility = () => setPaused(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);
    return (
        <svg className={`lc-avatar${spatial ? ' lc-spatial' : ''}${paused ? ' is-paused' : ''}`}
            viewBox={fixedFrame ? "-20 -34 400 400" : viewBox} role={onSelect ? "group" : "img"} aria-labelledby={`${id}-title ${id}-desc`}
            style={{ overflow: showReceiver ? 'visible' : 'hidden', '--lc-pulse': `${avatar.pulseSeconds}s`, '--lc-drift': `${avatar.driftSeconds}s` }}>
            <title id={`${id}-title`}>{lang === 'en' ? 'Your living Spectra' : '살아 있는 나의 스펙트라'}</title>
            <desc id={`${id}-desc`}>{lang === 'en'
                ? `${avatar.nodes.length} track stars connected by taste, with ${avatar.orbits.length} exploration stars in orbit.`
                : `취향으로 연결된 ${avatar.nodes.length}개의 곡 별과 탐색 중인 ${avatar.orbits.length}개의 공전하는 별.`}</desc>
            <defs>
                <radialGradient id={`${id}-glow`}>
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
                    <stop offset="35%" stopColor="currentColor" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${id}-celestial-glow`}>
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                    <stop offset="28%" stopColor="currentColor" stopOpacity="0.32" />
                    <stop offset="70%" stopColor="currentColor" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${id}-focus-nebula`}>
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
                    <stop offset="55%" stopColor="currentColor" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${id}-warmth`}>
                    <stop stopColor={avatar.warmth > 0.5 ? '#ebc6a6' : '#99b9f4'} stopOpacity="0.08" />
                    <stop offset="1" stopColor="#080c13" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="180" cy="166" r="150" fill={`url(#${id}-warmth)`} />
            {!spatial && avatar.orbits.length > 0 && <ellipse className="lc-orbit-guide" cx="180" cy="166" rx="150" ry="134" />}
            <g className="lc-body">
                {avatar.regions.slice(0, 8).map((region) => {
                    const isFocus = activeGenre ? region.genre === activeGenre : false;
                    const isDim = activeGenre ? !isFocus : false;
                    return (
                        <circle
                            key={region.genre}
                            cx={region.x}
                            cy={region.y}
                            r={(40 + region.strength * 28) * (isFocus ? 1.25 : 1)}
                            className={`lc-region${isFocus ? ' is-tour-focus' : ''}${isDim ? ' is-tour-dim' : ''}`}
                            style={{ color: region.color }}
                            fill={isFocus ? `url(#${id}-focus-nebula)` : `url(#${id}-glow)`}
                            opacity={isFocus ? '0.85' : isDim ? '0.12' : '0.3'}
                        />
                    );
                })}
                <g className="lc-connections">
                    {avatar.edges.map((edge) => {
                        const isFocus = activeGenre
                            ? (edge.a?.genre === activeGenre || edge.b?.genre === activeGenre)
                            : false;
                        const isDim = activeGenre ? !isFocus : false;
                        return (
                            <line
                                key={`${edge.from}:${edge.to}`}
                                x1={edge.a.x}
                                y1={edge.a.y}
                                x2={edge.b.x}
                                y2={edge.b.y}
                                stroke={edge.color}
                                className={`${edge.secondary ? 'secondary' : ''}${isFocus ? ' is-tour-focus' : ''}${isDim ? ' is-tour-dim' : ''}`}
                            />
                        );
                    })}
                </g>
                {avatar.nodes.map((node) => {
                    const isFocus = activeGenre ? node.genre === activeGenre : false;
                    const isDim = activeGenre ? !isFocus : false;
                    const isAnchor = isFocus && node.id === anchorStarId;
                    return (
                        <g
                            key={node.id}
                            className={`lc-star${node.emerging ? ' emerging' : ''}${isFocus ? ' is-tour-focus' : ''}${isDim ? ' is-tour-dim' : ''}`}
                            data-track-id={node.id}
                            role={onSelect ? 'button' : undefined}
                            tabIndex={onSelect ? 0 : undefined}
                            aria-label={onSelect ? node.title : undefined}
                            onClick={onSelect ? () => onSelect(node.id) : undefined}
                            onKeyDown={onSelect ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.id); } } : undefined}
                            style={{
                                color: node.color,
                                '--lc-star-opacity': node.opacity,
                                transformOrigin: `${node.x}px ${node.y}px`,
                            }}
                        >
                            <title>{node.title}</title>
                            {onSelect && <circle cx={node.x} cy={node.y} r="12" fill="transparent" />}

                            {/* Celestial Reticle Ring for the primary anchor star */}
                            {isAnchor && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={node.radius + 8}
                                    fill="none"
                                    stroke={node.color}
                                    strokeWidth="0.55"
                                    strokeDasharray="2 3"
                                    className="lc-celestial-reticle"
                                />
                            )}

                            {/* Soft starlight aura */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.radius * (isFocus ? 5.6 : 5)}
                                fill={isFocus ? `url(#${id}-celestial-glow)` : `url(#${id}-glow)`}
                            />

                            {/* Main star color body */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.radius * (isFocus ? 1.15 : 1)}
                                fill={node.color}
                            />

                            {/* Brilliant diamond starlight center */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.radius * (isFocus ? 0.48 : 0.43)}
                                fill="#ffffff"
                            />

                            {/* Hairline starlight gleam on anchor or large stars */}
                            {(node.radius > 4 || isAnchor) && (
                                <path
                                    d={`M${node.x - 6} ${node.y}h12 M${node.x} ${node.y - 6}v12`}
                                    stroke="#ffffff"
                                    strokeWidth="0.45"
                                    opacity={isFocus ? '0.75' : '0.45'}
                                />
                            )}
                        </g>
                    );
                })}
            </g>
            {avatar.orbits.map((orbit) => {
                const isDim = activeGenre ? orbit.genre !== activeGenre : false;
                return (
                    <g
                        className={`lc-orbit${isDim ? ' is-tour-dim' : ''}`}
                        key={orbit.id}
                        data-orbit-id={orbit.id}
                        style={{ '--lc-orbit-angle': `${orbit.angle}rad`, visibility: reaction?.trackId === orbit.id ? 'hidden' : 'visible' }}
                    >
                        <g transform={`translate(${orbit.x} ${orbit.y})`} style={{ color: orbit.color }}>
                            <title>{orbit.title}</title>
                            <circle r="18" fill={`url(#${id}-glow)`} />
                            <circle r="5.5" fill="none" stroke={orbit.color} strokeWidth="0.65" />
                            <circle r="2.3" fill="#eef4ff" />
                        </g>
                    </g>
                );
            })}
            {/* One quiet receiving star visually links the card below to this body. */}
            {showReceiver && <path className="lc-drop-thread" d="M180 345v-22" />}
            {showReceiver && <circle cx="180" cy="326" r="2" fill="#b3c9eb" opacity="0.5" />}
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
