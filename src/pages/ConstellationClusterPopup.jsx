import React, { useMemo } from 'react';
import './ConstellationClusterPopup.css';
import SpectraSymbol from '../components/SpectraSymbol';
import ClusterEvidence from '../components/ClusterEvidence';
import { getConstellationInfo, hash01 } from '../taste/constellationTopology.js';
import { buildConstellationPreviewGeometry } from './constellationPreviewGeometry.js';

const CONSTELLATION_NAMES = {
    ko: [
        '새벽의 박동 별자리', '은빛 잔향 별자리', '달빛 리듬 별자리', '푸른 선율 별자리',
        '유리빛 파동 별자리', '밤의 소리 별자리', '빛의 화음 별자리', '한밤의 떨림 별자리',
    ],
    en: [
        'Dawn Pulse Constellation', 'Silver Echo Constellation', 'Moonlit Rhythm Constellation', 'Blue Melody Constellation',
        'Glass Wave Constellation', 'Night Sound Constellation', 'Luminous Chord Constellation', 'Midnight Tremor Constellation',
    ],
};

export default function ConstellationClusterPopup({
    trackContext,
    clusterNodes = [],
    clusterEdges = [],
    onStartVoyage,
    onClose,
    onExploreTrack,
    onAddTrack,
    onOpenTrack,
    lang = 'ko',
}) {
    const track = trackContext?.track;
    const cluster = trackContext?.cluster;
    const info = useMemo(() => getConstellationInfo(cluster, lang), [cluster, lang]);
    const nameSeed = `${cluster?.j ?? ''}:${cluster?.label?.name || track?.id || ''}`;
    const nameOptions = CONSTELLATION_NAMES[lang] || CONSTELLATION_NAMES.ko;
    const constellationName = nameOptions[Math.floor(hash01(`name:${nameSeed}`) * nameOptions.length)];

    const previewGeometry = useMemo(
        () => buildConstellationPreviewGeometry(clusterNodes, clusterEdges, track?.id),
        [clusterNodes, clusterEdges, track?.id],
    );

    if (!track) return null;

    return (
        <aside
            className="ccp-card"
            style={{ '--ccp-accent': info.color }}
            aria-label={lang === 'en' ? 'Constellation Track Preview' : '별자리 곡 프리뷰'}
        >
            {/* Top header & badges */}
            <header className="ccp-header">
                <div className="ccp-badge-group">
                    <span className="ccp-constellation-pill">
                        <SpectraSymbol symbol={info.symbol} className="ccp-symbol" />
                        <strong className="ccp-constellation-name">{info.name}</strong>
                    </span>
                    <span className="ccp-essence-text" title={info.essence}>
                        {info.essence}
                    </span>
                </div>
                <button
                    type="button"
                    className="ccp-close-btn"
                    onClick={onClose}
                    aria-label={lang === 'en' ? 'Close card' : '닫기'}
                >
                    ✕
                </button>
            </header>

            {/* Middle: Constellation Art Canvas */}
            <div className="ccp-constellation-canvas">
                <svg
                    viewBox={`0 0 ${previewGeometry.svgW} ${previewGeometry.svgH}`}
                    className="ccp-constellation-svg"
                    aria-hidden="true"
                >
                    <defs>
                        <radialGradient id="ccp-star-glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={info.color} stopOpacity="0.9" />
                            <stop offset="35%" stopColor={info.color} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={info.color} stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="ccp-selected-halo" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                            <stop offset="25%" stopColor={info.color} stopOpacity="0.8" />
                            <stop offset="60%" stopColor={info.color} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={info.color} stopOpacity="0" />
                        </radialGradient>
                        <filter id="ccp-starlight-blur" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.5" result="glow" />
                            <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Starlight connection lines */}
                    {previewGeometry.edges.map((e, idx) => (
                        <g key={idx}>
                            <line
                                x1={e.x1}
                                y1={e.y1}
                                x2={e.x2}
                                y2={e.y2}
                                stroke={info.color}
                                strokeWidth="2.5"
                                strokeOpacity="0.3"
                                strokeLinecap="round"
                                filter="url(#ccp-starlight-blur)"
                            />
                            <line
                                x1={e.x1}
                                y1={e.y1}
                                x2={e.x2}
                                y2={e.y2}
                                stroke="rgba(255, 255, 255, 0.75)"
                                strokeWidth="1"
                                strokeLinecap="round"
                            />
                        </g>
                    ))}

                    {/* Star nodes */}
                    {previewGeometry.nodes.map((node) => {
                        if (node.isSelected) {
                            return (
                                <g key={node.id} className="ccp-star-group ccp-star-group--selected">
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r="22"
                                        className="ccp-pulse-ring"
                                        stroke={info.color}
                                        strokeWidth="1.2"
                                        fill="none"
                                    />
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r="14"
                                        fill="url(#ccp-selected-halo)"
                                    />
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r="4"
                                        fill="#ffffff"
                                    />
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r="1.8"
                                        fill={info.color}
                                    />
                                </g>
                            );
                        }
                        return (
                            <g key={node.id} className="ccp-star-group">
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="7"
                                    fill="url(#ccp-star-glow)"
                                />
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="2.8"
                                    fill={info.color}
                                />
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="1.2"
                                    fill="#ffffff"
                                />
                            </g>
                        );
                    })}
                </svg>

                <p className="ccp-display-name">{lang === 'en' ? 'Constellation nickname' : '별자리 별칭'} · {constellationName}</p>
            </div>

            {cluster && <details className="ccp-evidence"><summary>{lang === 'en' ? 'Grouping basis & representative songs' : '분류 근거·대표곡 보기'}</summary><ClusterEvidence compact cluster={cluster} source={trackContext.classificationSource} lang={lang} /></details>}

            {/* Bottom: Prescribed Track Box & Voyage Launch Action */}
            <div className="ccp-track-box">
                <div className="ccp-track-info-row">
                    {track.coverUrl ? (
                        <img src={track.coverUrl} alt="" className="ccp-track-cover" />
                    ) : (
                        <div className="ccp-track-cover ccp-track-cover--fallback">★</div>
                    )}
                    <div className="ccp-track-meta">
                        <span className="ccp-track-eyebrow">
                            {lang === 'en' ? 'PRESCRIBED STAR' : '선택한 별'}
                        </span>
                        <h4 className="ccp-track-name" title={track.name}>
                            {track.name}
                        </h4>
                        <p className="ccp-track-artist" title={track.artists}>
                            {track.artists || (lang === 'en' ? 'Unknown artist' : '아티스트 미상')}
                        </p>
                    </div>

                </div>

                <div className="ccp-primary-actions">
                    <button
                        type="button"
                        className="ccp-listen-btn"
                        onClick={() => onOpenTrack?.('youtube')}
                    >
                        <span aria-hidden="true">▶</span> {lang === 'en' ? 'Listen on YouTube' : 'YouTube로 듣기'}
                    </button>
                    <button
                        type="button"
                        className="ccp-voyage-launch-btn"
                        onClick={() => onStartVoyage?.(track)}
                    >
                        <span className="ccp-voyage-launch-icon" aria-hidden="true">✦</span>
                        <span>{lang === 'en' ? 'Voyage' : '별자리 항해'}</span>
                    </button>
                </div>

                <div className="ccp-action-bar">
                    <span className="ccp-action-label">{lang === 'en' ? 'MORE OPTIONS' : '다른 선택'}</span>
                    <button
                        type="button"
                        className="ccp-action-chip"
                        onClick={() => onOpenTrack?.('spotify')}
                        title={lang === 'en' ? 'Open in Spotify' : 'Spotify에서 보기'}
                    >
                        Spotify ↗
                    </button>
                    <button
                        type="button"
                        className="ccp-action-chip"
                        disabled={trackContext?.alreadyInField}
                        onClick={onAddTrack}
                        title={trackContext?.alreadyInField ? (lang === 'en' ? 'In field' : '필드에 있음') : (lang === 'en' ? 'Add to field' : '내 필드에 추가')}
                    >
                        <span>{trackContext?.alreadyInField ? '✓' : '＋'}</span>
                        {trackContext?.alreadyInField ? (lang === 'en' ? 'Added' : '추가됨') : (lang === 'en' ? 'Add' : '내 필드')}
                    </button>
                    {onExploreTrack && (
                        <button
                            type="button"
                            className="ccp-action-chip"
                            disabled={!cluster}
                            onClick={onExploreTrack}
                            title={lang === 'en' ? 'Explore around track' : '이 곡 기준으로 탐색'}
                        >
                            <span>◎</span> {lang === 'en' ? 'Find similar songs' : '비슷한 곡 찾기'}
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
