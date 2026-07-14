import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './TasteMapSubwayGenerator.css';
import {
    buildTasteMapSubwaySystem,
    createTasteMapSubwaySvg,
    getSubwayVariantTheme,
    getVisibleSubwayBounds,
    getVisibleSubwayView,
} from './tasteMapSubwayEngine';

const COPY = {
    ko: {
        launcher: '노선도 생성기',
        title: 'Taste Map 지하철 노선도 생성기',
        subtitle: '현재 맵의 곡과 장르를 역과 노선으로 다시 번역합니다.',
        close: '닫기',
        variantSubway: 'Subway',
        variantConstellation: 'Constellation',
        activeScope: '반영 범위',
        activeScopeFiltered: '현재 필터 반영',
        activeScopeAll: '전체 라이브러리',
        stations: '역',
        lines: '노선',
        interchanges: '환승역',
        interchangesOnly: '환승역만 보기',
        allLines: '전체 노선',
        lineList: '노선 목록',
        stationInfo: '역 정보',
        stationEmpty: '노선이나 역을 선택하면 여기서 상세를 볼 수 있습니다.',
        noData: '장르 데이터가 충분한 곡이 더 모이면 노선도를 생성할 수 있습니다.',
        basedOn: '기준 축',
        downloadSvg: 'SVG 저장',
        fitView: '맞춤',
        zoomIn: '확대',
        zoomOut: '축소',
        resetView: '초기화',
        fullscreen: '전체화면',
        exitFullscreen: '기본 화면',
        zoomLevel: '배율',
        zoomSlider: '배율 조절',
        transferTo: '환승',
        genres: '장르',
        popularity: '인기도',
        belongsTo: '속한 노선',
        summaryTracks: '곡',
        modeSummary: '요약',
        modeHybrid: '전환',
        modeDetail: '상세',
    },
    en: {
        launcher: 'Subway Generator',
        title: 'Taste Map Subway Generator',
        subtitle: 'Recompose your current taste map into stations and genre lines.',
        close: 'Close',
        variantSubway: 'Subway',
        variantConstellation: 'Constellation',
        activeScope: 'Scope',
        activeScopeFiltered: 'Current filters applied',
        activeScopeAll: 'Entire library',
        stations: 'Stations',
        lines: 'Lines',
        interchanges: 'Transfers',
        interchangesOnly: 'Transfers only',
        allLines: 'All lines',
        lineList: 'Lines',
        stationInfo: 'Station Detail',
        stationEmpty: 'Choose a line or station to inspect details.',
        noData: 'More tracks with genre data are needed before the generator can build a route map.',
        basedOn: 'Axes',
        downloadSvg: 'Save SVG',
        fitView: 'Fit',
        zoomIn: 'Zoom In',
        zoomOut: 'Zoom Out',
        resetView: 'Reset',
        fullscreen: 'Fullscreen',
        exitFullscreen: 'Windowed',
        zoomLevel: 'Zoom',
        zoomSlider: 'Zoom Slider',
        transferTo: 'Transfer',
        genres: 'Genres',
        popularity: 'Popularity',
        belongsTo: 'Lines',
        summaryTracks: 'tracks',
        modeSummary: 'Summary',
        modeHybrid: 'Blend',
        modeDetail: 'Detail',
    },
};

function downloadSvgFile(filename, svgText) {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function clampValue(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function truncateText(value, maxLength = 32) {
    const text = String(value || '').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function buildVisiblePath(points) {
    if (points.length < 2) return '';
    const path = [];
    points.forEach((point, index) => {
        if (index === 0) {
            path.push(`M ${point.x} ${point.y}`);
            return;
        }
        const prev = points[index - 1];
        if (Math.abs(prev.x - point.x) < 2 || Math.abs(prev.y - point.y) < 2) {
            path.push(`L ${point.x} ${point.y}`);
            return;
        }
        if (Math.abs(point.x - prev.x) >= Math.abs(point.y - prev.y)) {
            path.push(`L ${point.x} ${prev.y} L ${point.x} ${point.y}`);
        } else {
            path.push(`L ${prev.x} ${point.y} L ${point.x} ${point.y}`);
        }
    });
    return path.join(' ');
}

function measureDistance(a, b) {
    if (!a || !b) return 0;
    return Math.hypot((a.mapX ?? a.x) - (b.mapX ?? b.x), (a.mapY ?? a.y) - (b.mapY ?? b.y));
}

function getAverageStationGap(stations) {
    if (!Array.isArray(stations) || stations.length < 2) return 0;
    let total = 0;
    let count = 0;
    for (let i = 1; i < stations.length; i += 1) {
        total += measureDistance(stations[i - 1], stations[i]);
        count += 1;
    }
    return count ? total / count : 0;
}

function canPlaceLabel(occupied, x, y, radius) {
    return !occupied.some((item) => Math.hypot(item.x - x, item.y - y) < Math.max(item.radius, radius));
}

function getZoomDetailMode(zoom, hasLineSelection) {
    if (hasLineSelection) {
        if (zoom < 1.18) return 'summary';
        if (zoom < 2.1) return 'hybrid';
        return 'detail';
    }
    if (zoom < 1.36) return 'summary';
    if (zoom < 2.6) return 'hybrid';
    return 'detail';
}

function pickEvenlySpacedIds(ids, desiredCount) {
    if (!Array.isArray(ids) || !ids.length || desiredCount <= 0) return [];
    if (ids.length <= desiredCount) return [...ids];
    const result = [];
    for (let i = 0; i < desiredCount; i += 1) {
        const ratio = desiredCount === 1 ? 0.5 : i / (desiredCount - 1);
        const index = Math.round(ratio * (ids.length - 1));
        result.push(ids[index]);
    }
    return [...new Set(result)];
}

function buildAdaptiveLabelIds(view, system, {
    zoom,
    hasLineSelection,
    pinnedStationId,
    hiddenStationIds = new Set(),
    priorityStationIds = new Set(),
}) {
    const ids = new Set();
    const occupied = [];
    const stationById = new Map(system.stations.map((station) => [station.id, station]));
    const zoomFloor = Math.max(zoom, 0.72);
    const reserveStation = (station, radius) => {
        if (!station || ids.has(station.id)) return false;
        if (hiddenStationIds.has(station.id)) return false;
        if (!canPlaceLabel(occupied, station.mapX, station.mapY, radius)) return false;
        ids.add(station.id);
        occupied.push({ x: station.mapX, y: station.mapY, radius });
        return true;
    };

    if (pinnedStationId) {
        reserveStation(stationById.get(pinnedStationId), 220 / zoomFloor);
    }

    const interchanges = view.stations
        .filter((station) => station.isInterchange)
        .sort((a, b) => b.interchangeScore - a.interchangeScore);
    const interchangeCap = hasLineSelection
        ? Math.min(14, Math.max(6, Math.round(zoom * 5)))
        : (zoom < 0.96 ? 6 : 10);
    interchanges.slice(0, interchangeCap).forEach((station) => {
        reserveStation(station, 180 / zoomFloor);
    });

    priorityStationIds.forEach((stationId) => {
        reserveStation(stationById.get(stationId), 170 / zoomFloor);
    });

    if (!hasLineSelection && zoom < 0.86) return ids;

    view.lines.forEach((line) => {
        const stations = line.stationIds
            .map((stationId) => stationById.get(stationId))
            .filter((station) => station && !hiddenStationIds.has(station.id));
        if (!stations.length) return;

        const averageGap = Math.max(18, getAverageStationGap(stations));
        const requiredGap = (hasLineSelection ? 220 : 300) / zoomFloor;
        let step = Math.max(1, Math.ceil(requiredGap / averageGap));

        if (!hasLineSelection) {
            if (zoom < 1) step = Math.max(step, 9);
            else if (zoom < 1.3) step = Math.max(step, 6);
            else if (zoom < 1.8) step = Math.max(step, 4);
            else if (zoom >= 2.2) step = Math.max(1, Math.min(step, 2));
        } else if (zoom < 1.2) {
            step = Math.max(step, 4);
        } else if (zoom >= 2.3) {
            step = Math.max(1, Math.min(step, 2));
        }

        const maxLabels = hasLineSelection
            ? Math.min(42, Math.max(8, Math.round(12 * zoom)))
            : Math.min(16, Math.max(3, Math.round(5 * zoom)));
        let added = 0;

        for (let index = 0; index < stations.length; index += 1) {
            const station = stations[index];
            if (!station || station.isInterchange || ids.has(station.id)) continue;
            const boundary = index === 0 || index === stations.length - 1;
            if (!boundary && index % step !== 0) continue;
            if (!reserveStation(station, (hasLineSelection ? 210 : 250) / zoomFloor)) continue;
            added += 1;
            if (added >= maxLabels) break;
        }
    });

    return ids;
}

function formatSummaryLabel(count, copy) {
    return copy.summaryTracks === 'tracks' ? `${count} tracks` : `${count}${copy.summaryTracks}`;
}

function buildSummaryBadges(view, system, {
    zoom,
    hasLineSelection,
    pinnedStationId,
    copy,
}) {
    const stationById = new Map(system.stations.map((station) => [station.id, station]));
    const badges = [];
    const occupied = [];
    const minSegmentSize = hasLineSelection ? 5 : 6;

    view.lines.forEach((line) => {
        const stations = line.stationIds
            .map((stationId) => stationById.get(stationId))
            .filter(Boolean);
        if (stations.length < 8) return;

        const averageGap = getAverageStationGap(stations);
        const effectiveGap = averageGap * Math.max(zoom, 0.72);
        let chunkSize = 0;

        if (!hasLineSelection) {
            if (effectiveGap < 14) chunkSize = 12;
            else if (effectiveGap < 18) chunkSize = 10;
            else if (effectiveGap < 24) chunkSize = 8;
            else if (effectiveGap < 30) chunkSize = 6;
        } else if (zoom < 1.08) {
            if (effectiveGap < 20) chunkSize = 8;
            else if (effectiveGap < 28) chunkSize = 6;
        }

        if (!chunkSize) return;

        let segment = [];
        const flushSegment = () => {
            if (segment.length < Math.max(minSegmentSize, chunkSize)) {
                segment = [];
                return;
            }

            for (let start = 0; start < segment.length; start += chunkSize) {
                const group = segment.slice(start, start + chunkSize);
                if (group.length < minSegmentSize) continue;
                const anchor = group[Math.floor(group.length / 2)];
                const radius = 120 / Math.max(zoom, 0.72);
                if (!canPlaceLabel(occupied, anchor.mapX, anchor.mapY, radius)) continue;
                occupied.push({ x: anchor.mapX, y: anchor.mapY, radius });
                badges.push({
                    id: `${line.key}:${group[0].id}:${group[group.length - 1].id}`,
                    lineKey: line.key,
                    color: line.color,
                    x: anchor.mapX,
                    y: anchor.mapY,
                    label: formatSummaryLabel(group.length, copy),
                    stationIds: group.map((station) => station.id),
                });
            }

            segment = [];
        };

        stations.forEach((station, index) => {
            const isAnchor = station.isInterchange
                || station.id === pinnedStationId
                || index === 0
                || index === stations.length - 1;
            if (isAnchor) {
                flushSegment();
                return;
            }
            segment.push(station);
        });

        flushSegment();
    });

    return badges;
}

function buildStationVisibility(view, {
    detailMode,
    hasLineSelection,
    summaryBadges,
    pinnedStationId,
}) {
    const visibleStationIds = new Set(view.stations.map((station) => station.id));
    const hiddenStationIds = new Set();
    const priorityStationIds = new Set();

    if (detailMode === 'detail') {
        return { visibleStationIds, hiddenStationIds, priorityStationIds };
    }

    summaryBadges.forEach((badge) => {
        const stationIds = Array.isArray(badge.stationIds) ? badge.stationIds : [];
        if (!stationIds.length) return;

        if (detailMode === 'summary') {
            stationIds.forEach((stationId) => {
                if (stationId !== pinnedStationId) {
                    visibleStationIds.delete(stationId);
                    hiddenStationIds.add(stationId);
                }
            });
            return;
        }

        const sampleCount = hasLineSelection ? 5 : 3;
        const sampleIds = new Set(pickEvenlySpacedIds(stationIds, sampleCount));
        sampleIds.forEach((stationId) => priorityStationIds.add(stationId));
        stationIds.forEach((stationId) => {
            if (stationId === pinnedStationId || sampleIds.has(stationId)) return;
            visibleStationIds.delete(stationId);
            hiddenStationIds.add(stationId);
        });
    });

    return { visibleStationIds, hiddenStationIds, priorityStationIds };
}

function getFloatingCardLayout(anchor, system, { width = 168, height = 34, offset = 22 } = {}) {
    const onLeftHalf = anchor.x < system.center.x;
    const onTopHalf = anchor.y < system.center.y;
    const rawX = onLeftHalf ? anchor.x + offset : anchor.x - width - offset;
    const rawY = onTopHalf ? anchor.y - height - 8 : anchor.y + 10;
    return {
        x: clampValue(rawX, 20, system.width - width - 20),
        y: clampValue(rawY, 20, system.height - height - 20),
    };
}

function SubwayPreviewSvg({
    system,
    variant,
    activeLineKeys,
    interchangesOnly,
    pinnedStationId,
    onStationSelect,
    onLineFocus,
    isFullscreen,
    onToggleFullscreen,
    copy,
}) {
    const MIN_ZOOM = 0.28;
    const MAX_ZOOM = 18;
    const DEFAULT_ZOOM = 0.74;
    const theme = getSubwayVariantTheme(variant);
    const svgRef = useRef(null);
    const selectedLineSet = useMemo(
        () => new Set(Array.isArray(activeLineKeys) ? activeLineKeys : []),
        [activeLineKeys],
    );
    const hasLineSelection = selectedLineSet.size > 0;
    const view = useMemo(
        () => getVisibleSubwayView(system, { activeLineKeys, interchangesOnly }),
        [system, activeLineKeys, interchangesOnly],
    );
    const bounds = useMemo(
        () => getVisibleSubwayBounds(system, {
            activeLineKeys,
            interchangesOnly,
            padding: variant === 'constellation' ? 140 : 120,
        }),
        [system, activeLineKeys, interchangesOnly, variant],
    );
    const stationById = useMemo(
        () => new Map(system.stations.map((station) => [station.id, station])),
        [system.stations],
    );
    const [zoom, setZoom] = useState(1);
    const [center, setCenter] = useState({ x: system.width / 2, y: system.height / 2 });
    const detailMode = useMemo(
        () => getZoomDetailMode(zoom, hasLineSelection),
        [zoom, hasLineSelection],
    );
    const summaryBadges = useMemo(
        () => buildSummaryBadges(view, system, {
            zoom,
            hasLineSelection,
            pinnedStationId,
            copy,
        }),
        [view, system, zoom, hasLineSelection, pinnedStationId, copy],
    );
    const stationVisibility = useMemo(
        () => buildStationVisibility(view, {
            detailMode,
            hasLineSelection,
            summaryBadges,
            pinnedStationId,
        }),
        [view, detailMode, hasLineSelection, summaryBadges, pinnedStationId],
    );
    const renderedStationIdSet = stationVisibility.visibleStationIds;
    const labelIds = useMemo(
        () => buildAdaptiveLabelIds(view, system, {
            zoom,
            hasLineSelection,
            pinnedStationId,
            hiddenStationIds: stationVisibility.hiddenStationIds,
            priorityStationIds: stationVisibility.priorityStationIds,
        }),
        [view, system, zoom, hasLineSelection, pinnedStationId, stationVisibility.hiddenStationIds, stationVisibility.priorityStationIds],
    );
    const stars = useMemo(() => {
        if (variant !== 'constellation') return [];
        return Array.from({ length: 50 }, (_, index) => ({
            id: `star-${index}`,
            x: 24 + ((index * 73) % 1000),
            y: 42 + ((index * 127) % 960),
            r: 1 + ((index * 17) % 10) / 4,
            opacity: 0.18 + ((index * 11) % 10) / 16,
        }));
    }, [variant]);
    const gridOffsets = useMemo(
        () => Array.from({ length: Math.ceil(system.width / 120) + 2 }, (_, index) => 60 + (index * 120)),
        [system.width],
    );
    const dragStateRef = useRef({
        active: false,
        startX: 0,
        startY: 0,
        startCenterX: system.width / 2,
        startCenterY: system.height / 2,
    });

    const clampCenter = useCallback((nextCenter, nextZoom) => {
        const viewSize = system.width / nextZoom;
        const half = viewSize / 2;
        if (viewSize >= system.width || viewSize >= system.height) {
            return {
                x: system.width / 2,
                y: system.height / 2,
            };
        }
        return {
            x: Math.min(system.width - half, Math.max(half, nextCenter.x)),
            y: Math.min(system.height - half, Math.max(half, nextCenter.y)),
        };
    }, [system.height, system.width]);

    const resetViewport = useCallback(() => {
        setZoom(DEFAULT_ZOOM);
        setCenter({ x: system.width / 2, y: system.height / 2 });
    }, [DEFAULT_ZOOM, system.height, system.width]);

    const fitToVisible = useCallback(() => {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, system.width / bounds.viewSize));
        setZoom(nextZoom);
        setCenter(clampCenter({
            x: bounds.centerX,
            y: bounds.centerY,
        }, nextZoom));
    }, [bounds.centerX, bounds.centerY, bounds.viewSize, clampCenter, system.width]);

    const applyZoom = useCallback((nextZoom, anchorClient = null) => {
        const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
        setZoom((prevZoom) => {
            const currentViewSize = system.width / prevZoom;
            const nextViewSize = system.width / clampedZoom;

            if (anchorClient && svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                const ratioX = rect.width > 0 ? (anchorClient.x - rect.left) / rect.width : 0.5;
                const ratioY = rect.height > 0 ? (anchorClient.y - rect.top) / rect.height : 0.5;
                setCenter((prevCenter) => {
                    const anchorWorldX = prevCenter.x - currentViewSize / 2 + currentViewSize * ratioX;
                    const anchorWorldY = prevCenter.y - currentViewSize / 2 + currentViewSize * ratioY;
                    return clampCenter({
                        x: anchorWorldX - (ratioX - 0.5) * nextViewSize,
                        y: anchorWorldY - (ratioY - 0.5) * nextViewSize,
                    }, clampedZoom);
                });
            } else {
                setCenter((prevCenter) => clampCenter(prevCenter, clampedZoom));
            }

            return clampedZoom;
        });
    }, [clampCenter, system.width]);

    useEffect(() => {
        if (hasLineSelection || interchangesOnly) {
            fitToVisible();
            return;
        }
        resetViewport();
    }, [hasLineSelection, fitToVisible, interchangesOnly, resetViewport]);

    const viewSize = system.width / zoom;
    const viewBox = useMemo(() => {
        const safeCenter = clampCenter(center, zoom);
        return `${safeCenter.x - viewSize / 2} ${safeCenter.y - viewSize / 2} ${viewSize} ${viewSize}`;
    }, [center, clampCenter, viewSize, zoom]);

    return (
        <div className="tm-subway-preview-canvas">
            <div className="tm-subway-viewport-tools">
                <div className="tm-subway-viewport-status">
                    <span>{variant === 'constellation' ? copy.variantConstellation : copy.variantSubway}</span>
                    <strong>{copy.zoomLevel} {Math.round(zoom * 100)}%</strong>
                    <span>{detailMode === 'summary' ? copy.modeSummary : detailMode === 'hybrid' ? copy.modeHybrid : copy.modeDetail}</span>
                </div>
                <div className="tm-subway-viewport-actions">
                    <button type="button" className="tm-subway-viewport-btn" onClick={fitToVisible}>{copy.fitView}</button>
                    <button type="button" className="tm-subway-viewport-btn icon" onClick={() => applyZoom(zoom * 1.2)} aria-label={copy.zoomIn}>+</button>
                    <button type="button" className="tm-subway-viewport-btn icon" onClick={() => applyZoom(zoom / 1.2)} aria-label={copy.zoomOut}>-</button>
                    <label className="tm-subway-zoom-slider" aria-label={copy.zoomSlider}>
                        <input
                            type="range"
                            min={MIN_ZOOM}
                            max={MAX_ZOOM}
                            step="0.01"
                            value={zoom}
                            onChange={(event) => applyZoom(Number(event.target.value))}
                        />
                    </label>
                    <button type="button" className="tm-subway-viewport-btn" onClick={resetViewport}>{copy.resetView}</button>
                    <button type="button" className={`tm-subway-viewport-btn${isFullscreen ? ' active' : ''}`} onClick={onToggleFullscreen}>
                        {isFullscreen ? copy.exitFullscreen : copy.fullscreen}
                    </button>
                </div>
            </div>

            <svg
                ref={svgRef}
                className="tm-subway-svg"
                viewBox={viewBox}
                role="img"
                aria-label="Taste map subway preview"
                onWheel={(event) => {
                    event.preventDefault();
                    const direction = event.deltaY > 0 ? 1 / 1.12 : 1.12;
                    applyZoom(zoom * direction, { x: event.clientX, y: event.clientY });
                }}
                onPointerDown={(event) => {
                    const interactiveTarget = event.target.closest?.('.tm-subway-station, .tm-subway-summary-badge');
                    if (interactiveTarget) return;
                    dragStateRef.current = {
                        active: true,
                        startX: event.clientX,
                        startY: event.clientY,
                        startCenterX: center.x,
                        startCenterY: center.y,
                    };
                }}
                onPointerMove={(event) => {
                    if (!dragStateRef.current.active || !svgRef.current) return;
                    const rect = svgRef.current.getBoundingClientRect();
                    const worldPerPixelX = rect.width > 0 ? viewSize / rect.width : 1;
                    const worldPerPixelY = rect.height > 0 ? viewSize / rect.height : 1;
                    const deltaX = (event.clientX - dragStateRef.current.startX) * worldPerPixelX;
                    const deltaY = (event.clientY - dragStateRef.current.startY) * worldPerPixelY;
                    setCenter(clampCenter({
                        x: dragStateRef.current.startCenterX - deltaX,
                        y: dragStateRef.current.startCenterY - deltaY,
                    }, zoom));
                }}
                onPointerUp={() => {
                    dragStateRef.current.active = false;
                }}
                onPointerLeave={() => {
                    dragStateRef.current.active = false;
                }}
            >
                <defs>
                    <linearGradient id="tm-subway-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={variant === 'constellation' ? '#07101f' : '#07111d'} />
                        <stop offset="55%" stopColor={variant === 'constellation' ? '#0b182a' : '#0a1828'} />
                        <stop offset="100%" stopColor={variant === 'constellation' ? '#08101d' : '#06101a'} />
                    </linearGradient>
                    <radialGradient id="tm-subway-core" cx="50%" cy="46%" r="52%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                        <stop offset="45%" stopColor={theme.glow} />
                        <stop offset="100%" stopColor="rgba(9,18,30,0)" />
                    </radialGradient>
                    <filter id="tm-subway-glow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="22" result="blur" />
                    </filter>
                    <filter id="tm-subway-line-glow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                    </filter>
                    <filter id="tm-subway-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="16" result="blur" />
                    </filter>
                </defs>

                <rect x={-system.width} y={-system.height} width={system.width * 3} height={system.height * 3} fill="url(#tm-subway-bg)" />
                <rect x={-system.width} y={-system.height} width={system.width * 3} height={system.height * 3} fill="rgba(4, 10, 18, 0.18)" />
                {gridOffsets.map((offset) => (
                    <path
                        key={`grid-v-${offset}`}
                        d={`M ${offset} 40 L ${offset} ${system.height - 40}`}
                        stroke="rgba(164, 190, 220, 0.06)"
                        strokeWidth="1"
                    />
                ))}
                {gridOffsets.map((offset) => (
                    <path
                        key={`grid-h-${offset}`}
                        d={`M 40 ${offset} L ${system.width - 40} ${offset}`}
                        stroke="rgba(164, 190, 220, 0.06)"
                        strokeWidth="1"
                    />
                ))}
                {stars.map((star) => (
                    <circle key={star.id} cx={star.x} cy={star.y} r={star.r} fill="#ffffff" opacity={star.opacity} />
                ))}
                <circle cx={system.center.x} cy={system.center.y} r="320" fill="url(#tm-subway-core)" filter="url(#tm-subway-glow)" />
                <circle cx={system.center.x} cy={system.center.y} r="204" fill="rgba(255,255,255,0.06)" filter="url(#tm-subway-soft-glow)" />

                {system.coreLoopPath && !hasLineSelection ? (
                    <>
                        <path
                            d={system.coreLoopPath}
                            fill="none"
                            stroke="rgba(202, 221, 245, 0.14)"
                            strokeWidth="28"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#tm-subway-soft-glow)"
                        />
                        <path
                            d={system.coreLoopPath}
                            fill="none"
                            stroke={theme.loop}
                            strokeWidth="16"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </>
                ) : null}

                {view.lines.map((line) => {
                    const points = line.stationIds
                        .map((stationId) => stationById.get(stationId))
                        .filter((station) => station && renderedStationIdSet.has(station.id))
                        .map((station) => ({ x: station.mapX, y: station.mapY }));
                    const path = buildVisiblePath(points);
                    if (!path) return null;

                    const labelWidth = Math.max(142, (line.label.length * 10) + 44);
                    const labelLayout = line.labelPoint
                        ? getFloatingCardLayout(line.labelPoint, system, {
                            width: labelWidth,
                            height: 34,
                            offset: 18,
                        })
                        : null;

                    return (
                        <g key={line.key}>
                            <path
                                d={path}
                                fill="none"
                                stroke={line.color}
                                strokeWidth={variant === 'constellation' ? 18 : 20}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={hasLineSelection ? 0.22 : 0.22}
                                filter="url(#tm-subway-line-glow)"
                            />
                            <path
                                d={path}
                                fill="none"
                                stroke="rgba(7, 17, 29, 0.62)"
                                strokeWidth={variant === 'constellation' ? 14 : 16}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={hasLineSelection ? 0.92 : 0.92}
                            />
                            <path
                                d={path}
                                fill="none"
                                stroke={line.color}
                                strokeWidth={variant === 'constellation' ? 10 : 12}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={hasLineSelection ? 0.98 : 0.98}
                            />
                            <path
                                d={path}
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={hasLineSelection ? 0.44 : 0.44}
                            />
                            {labelLayout ? (
                                <g transform={`translate(${labelLayout.x} ${labelLayout.y})`}>
                                    <rect width={labelWidth} height="34" rx="17" fill="rgba(7, 16, 27, 0.82)" stroke="rgba(184, 205, 230, 0.12)" />
                                    <circle cx="18" cy="17" r="5.5" fill={line.color} />
                                    <text x="32" y="22" fill={theme.shell} fontSize="16" fontWeight="700">
                                        {line.label} Line
                                    </text>
                                </g>
                            ) : null}
                        </g>
                    );
                })}

                {summaryBadges.map((badge) => {
                    const badgeWidth = Math.max(72, (badge.label.length * 8) + 22);
                    return (
                        <g
                            key={badge.id}
                            className="tm-subway-summary-badge"
                            transform={`translate(${badge.x} ${badge.y})`}
                            onClick={() => onLineFocus(badge.lineKey)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onLineFocus(badge.lineKey);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            <circle
                                cx="0"
                                cy="0"
                                r="14"
                                fill="rgba(8, 18, 31, 0.94)"
                                stroke={badge.color}
                                strokeWidth="2.5"
                            />
                            <circle cx="0" cy="0" r="4" fill={badge.color} />
                            <g transform={`translate(${-badgeWidth / 2} 18)`}>
                                <rect width={badgeWidth} height="26" rx="13" fill="rgba(8, 18, 31, 0.9)" stroke="rgba(184, 205, 230, 0.14)" />
                                <text x={badgeWidth / 2} y="17" fill={theme.shell} fontSize="12.5" fontWeight="700" textAnchor="middle">
                                    {badge.label}
                                </text>
                            </g>
                        </g>
                    );
                })}

                {view.stations
                    .slice()
                    .filter((station) => renderedStationIdSet.has(station.id))
                    .sort((a, b) => Number(a.isInterchange) - Number(b.isInterchange))
                    .map((station) => {
                        const primaryLine = system.lines.find((line) => line.key === station.primaryLineKey);
                        const isPinned = station.id === pinnedStationId;
                        const radius = station.isInterchange ? station.bubbleSize * 0.72 : station.bubbleSize * 0.52;
                        const ringRadius = radius + (station.isInterchange ? 7 : 4);
                        const labelLayout = labelIds.has(station.id)
                            ? getFloatingCardLayout({ x: station.mapX, y: station.mapY }, system, {
                                width: 230,
                                height: 38,
                                offset: station.isInterchange ? 18 : 14,
                            })
                            : null;

                        return (
                            <g
                                key={station.id}
                                className={`tm-subway-station${isPinned ? ' pinned' : ''}`}
                                onClick={() => onStationSelect((currentId) => (currentId === station.id ? null : station.id))}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onStationSelect((currentId) => (currentId === station.id ? null : station.id));
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                            >
                                {(station.isInterchange || isPinned) ? (
                                    <circle
                                        cx={station.mapX}
                                        cy={station.mapY}
                                        r={ringRadius + (station.isInterchange ? 5 : 2)}
                                        fill={primaryLine?.color || '#ffffff'}
                                        opacity={isPinned ? 0.14 : 0.08}
                                        filter="url(#tm-subway-soft-glow)"
                                    />
                                ) : null}
                                {(station.isInterchange || isPinned) ? (
                                    <circle
                                        cx={station.mapX}
                                        cy={station.mapY}
                                        r={ringRadius}
                                        fill="none"
                                        stroke="#f8fbff"
                                        strokeWidth={isPinned ? 2.6 : 2.2}
                                        opacity={isPinned ? 0.92 : 0.82}
                                    />
                                ) : null}
                                {station.isInterchange ? (
                                    <circle
                                        cx={station.mapX}
                                        cy={station.mapY}
                                        r={ringRadius - 5}
                                        fill="none"
                                        stroke={primaryLine?.color || '#ffffff'}
                                        strokeWidth="3"
                                        opacity="0.95"
                                    />
                                ) : null}
                                {variant === 'constellation' ? (
                                    <path
                                        d={`M ${station.mapX} ${station.mapY - radius}
                                            L ${station.mapX + (radius * 0.3)} ${station.mapY - (radius * 0.3)}
                                            L ${station.mapX + radius} ${station.mapY}
                                            L ${station.mapX + (radius * 0.3)} ${station.mapY + (radius * 0.3)}
                                            L ${station.mapX} ${station.mapY + radius}
                                            L ${station.mapX - (radius * 0.3)} ${station.mapY + (radius * 0.3)}
                                            L ${station.mapX - radius} ${station.mapY}
                                            L ${station.mapX - (radius * 0.3)} ${station.mapY - (radius * 0.3)} Z`}
                                        fill={theme.stationFill}
                                        stroke="rgba(8, 18, 32, 0.92)"
                                        strokeWidth="2.6"
                                    />
                                ) : (
                                    <circle
                                        cx={station.mapX}
                                        cy={station.mapY}
                                        r={radius}
                                        fill="#f7fbff"
                                        stroke="rgba(8, 18, 32, 0.92)"
                                        strokeWidth="2.6"
                                    />
                                )}
                                <circle
                                    cx={station.mapX}
                                    cy={station.mapY}
                                    r={Math.max(3.6, radius * 0.36)}
                                    fill={primaryLine?.color || '#ffffff'}
                                />
                                {labelLayout ? (
                                    <g transform={`translate(${labelLayout.x} ${labelLayout.y})`}>
                                        <rect width="230" height="38" rx="14" fill="rgba(8, 18, 31, 0.88)" stroke="rgba(184, 205, 230, 0.12)" />
                                        <text x="14" y="24" fill={theme.shell} fontSize="16" fontWeight="700">
                                            {truncateText(station.trackName, 26)}
                                        </text>
                                    </g>
                                ) : null}
                            </g>
                        );
                    })}
            </svg>
        </div>
    );
}

export default function TasteMapSubwayGenerator({
    open,
    onClose,
    tracks,
    activeTrackIds,
    assignmentByTrackId,
    clusterById,
    xAxis,
    yAxis,
    lang = 'ko',
}) {
    const copy = COPY[lang] || COPY.ko;
    const [variant, setVariant] = useState('subway');
    const [activeLineKeys, setActiveLineKeys] = useState([]);
    const [interchangesOnly, setInterchangesOnly] = useState(false);
    const [pinnedStationId, setPinnedStationId] = useState(null);
    const [previewFullscreen, setPreviewFullscreen] = useState(false);
    const toggleLineSelection = useCallback((lineKey) => {
        if (!lineKey) return;
        setActiveLineKeys((prev) => (
            prev.includes(lineKey)
                ? prev.filter((key) => key !== lineKey)
                : [...prev, lineKey]
        ));
    }, []);

    const filteredCount = activeTrackIds?.size || 0;
    const totalCount = Array.isArray(tracks) ? tracks.length : 0;
    const usingFilteredScope = filteredCount > 0 && filteredCount < totalCount;
    const singleFocusedLineKey = activeLineKeys.length === 1 ? activeLineKeys[0] : null;

    const system = useMemo(
        () => (
            open
                ? buildTasteMapSubwaySystem({
                    tracks,
                    activeTrackIds,
                    assignmentByTrackId,
                    clusterById,
                    xAxis,
                    yAxis,
                    focusLineKey: singleFocusedLineKey,
                })
                : null
        ),
        [open, tracks, activeTrackIds, assignmentByTrackId, clusterById, xAxis, yAxis, singleFocusedLineKey],
    );

    const effectiveActiveLineKeys = useMemo(
        () => activeLineKeys.filter((lineKey) => system?.lines.some((line) => line.key === lineKey)),
        [activeLineKeys, system],
    );
    const effectivePinnedStationId = pinnedStationId && system?.stations.some((station) => station.id === pinnedStationId)
        ? pinnedStationId
        : null;

    const visibleView = useMemo(
        () => getVisibleSubwayView(system, { activeLineKeys: effectiveActiveLineKeys, interchangesOnly }),
        [system, effectiveActiveLineKeys, interchangesOnly],
    );

    const selectedStation = useMemo(
        () => visibleView.stations.find((station) => station.id === effectivePinnedStationId)
            || system?.stations.find((station) => station.id === effectivePinnedStationId)
            || null,
        [visibleView.stations, system, effectivePinnedStationId],
    );

    useEffect(() => {
        if (!open) return undefined;
        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            if (previewFullscreen) {
                setPreviewFullscreen(false);
                return;
            }
            onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [open, onClose, previewFullscreen]);

    useEffect(() => {
        if (!open) {
            setPreviewFullscreen(false);
        }
    }, [open]);

    if (!open) return null;

    return (
        <div className="tm-subway-modal-backdrop" onClick={onClose} role="presentation">
            <section className={`tm-subway-modal${previewFullscreen ? ' preview-fullscreen' : ''}`} onClick={(event) => event.stopPropagation()}>
                <header className="tm-subway-head">
                    <div className="tm-subway-head-copy">
                        <span className="tm-subway-pill">{copy.launcher}</span>
                        <h2>{copy.title}</h2>
                        <p>{copy.subtitle}</p>
                    </div>
                    <div className="tm-subway-head-actions">
                        <div className="tm-subway-variant-seg">
                            <button
                                type="button"
                                className={variant === 'subway' ? 'active' : ''}
                                onClick={() => setVariant('subway')}
                            >
                                {copy.variantSubway}
                            </button>
                            <button
                                type="button"
                                className={variant === 'constellation' ? 'active' : ''}
                                onClick={() => setVariant('constellation')}
                            >
                                {copy.variantConstellation}
                            </button>
                        </div>
                        <button
                            type="button"
                            className="tm-subway-download-btn"
                            onClick={() => {
                                if (!system) return;
                                const svgText = createTasteMapSubwaySvg({
                                    system,
                                    variant,
                                    activeLineKeys: effectiveActiveLineKeys,
                                    interchangesOnly,
                                    highlightedStationId: effectivePinnedStationId,
                                });
                                downloadSvgFile(`taste-map-${variant}.svg`, svgText);
                            }}
                            disabled={!system}
                        >
                            {copy.downloadSvg}
                        </button>
                        <button type="button" className={`tm-subway-download-btn${previewFullscreen ? ' active' : ''}`} onClick={() => setPreviewFullscreen((prev) => !prev)}>
                            {previewFullscreen ? copy.exitFullscreen : copy.fullscreen}
                        </button>
                        <button type="button" className="tm-subway-close-btn" onClick={onClose}>
                            {copy.close}
                        </button>
                    </div>
                </header>

                {!system ? (
                    <div className="tm-subway-empty">
                        <strong>{copy.noData}</strong>
                    </div>
                ) : (
                    <div className="tm-subway-layout">
                        <div className={`tm-subway-preview-shell variant-${variant}${previewFullscreen ? ' fullscreen' : ''}`}>
                            <div className="tm-subway-preview-meta">
                                <span>{copy.activeScope}</span>
                                <strong>{usingFilteredScope ? copy.activeScopeFiltered : copy.activeScopeAll}</strong>
                                <span>{copy.basedOn}</span>
                                <strong>{xAxis} × {yAxis}</strong>
                            </div>
                            <SubwayPreviewSvg
                                system={system}
                                variant={variant}
                                activeLineKeys={effectiveActiveLineKeys}
                                interchangesOnly={interchangesOnly}
                                pinnedStationId={effectivePinnedStationId}
                                onStationSelect={setPinnedStationId}
                                onLineFocus={(lineKey) => {
                                    setPinnedStationId(null);
                                    toggleLineSelection(lineKey);
                                }}
                                isFullscreen={previewFullscreen}
                                onToggleFullscreen={() => setPreviewFullscreen((prev) => !prev)}
                                copy={copy}
                            />
                        </div>

                        <aside className="tm-subway-sidebar">
                            <div className="tm-subway-stats">
                                <div>
                                    <span>{copy.stations}</span>
                                    <strong>{system.stationCount}</strong>
                                </div>
                                <div>
                                    <span>{copy.lines}</span>
                                    <strong>{system.lineCount}</strong>
                                </div>
                                <div>
                                    <span>{copy.interchanges}</span>
                                    <strong>{system.interchangeCount}</strong>
                                </div>
                            </div>

                        <button
                            type="button"
                            className={`tm-subway-toggle${interchangesOnly ? ' active' : ''}`}
                            onClick={() => {
                                setPinnedStationId(null);
                                setInterchangesOnly((prev) => !prev);
                            }}
                        >
                            {copy.interchangesOnly}
                        </button>

                            <section className="tm-subway-line-panel">
                                <div className="tm-subway-panel-head">
                                    <h3>{copy.lineList}</h3>
                                    <button
                                        type="button"
                                        className={!effectiveActiveLineKeys.length ? 'active' : ''}
                                        onClick={() => {
                                            setPinnedStationId(null);
                                            setActiveLineKeys([]);
                                        }}
                                    >
                                        {copy.allLines}
                                    </button>
                                </div>
                                <div className="tm-subway-line-list">
                                    {system.lines.map((line) => (
                                        <button
                                            key={line.key}
                                            type="button"
                                            className={`tm-subway-line-row${effectiveActiveLineKeys.includes(line.key) ? ' active' : ''}`}
                                            onClick={() => {
                                                setPinnedStationId(null);
                                                toggleLineSelection(line.key);
                                            }}
                                        >
                                            <span className="tm-subway-line-dot" style={{ background: line.color }} />
                                            <span className="tm-subway-line-label">{line.label}</span>
                                            <span className="tm-subway-line-count">{line.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="tm-subway-station-panel">
                                <div className="tm-subway-panel-head">
                                    <h3>{copy.stationInfo}</h3>
                                </div>
                                {!selectedStation ? (
                                    <p className="tm-subway-station-empty">{copy.stationEmpty}</p>
                                ) : (
                                    <div className="tm-subway-station-card">
                                        {selectedStation.coverUrl ? (
                                            <img
                                                src={selectedStation.coverUrl}
                                                alt={selectedStation.trackName}
                                                className="tm-subway-station-cover"
                                            />
                                        ) : (
                                            <div className="tm-subway-station-cover fallback">{selectedStation.trackName.slice(0, 1)}</div>
                                        )}
                                        <div className="tm-subway-station-copy">
                                            <strong>{selectedStation.trackName}</strong>
                                            <span>{selectedStation.artists || '-'}</span>
                                        </div>
                                        <dl className="tm-subway-station-meta">
                                            <div>
                                                <dt>{copy.popularity}</dt>
                                                <dd>{selectedStation.popularity}</dd>
                                            </div>
                                            <div>
                                                <dt>{copy.transferTo}</dt>
                                                <dd>{selectedStation.lineCount}</dd>
                                            </div>
                                        </dl>
                                        <div className="tm-subway-chip-group">
                                            <span className="tm-subway-chip-label">{copy.belongsTo}</span>
                                            {selectedStation.lineKeys.map((lineKey) => {
                                                const line = system.lines.find((item) => item.key === lineKey);
                                                return (
                                                    <button
                                                        key={lineKey}
                                                        type="button"
                                                        className="tm-subway-chip"
                                                        style={{ '--tm-subway-chip-color': line?.color || '#8ea7c2' }}
                                                        onClick={() => {
                                                            setPinnedStationId(null);
                                                            toggleLineSelection(lineKey);
                                                        }}
                                                    >
                                                        {line?.label || lineKey}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="tm-subway-chip-group">
                                            <span className="tm-subway-chip-label">{copy.genres}</span>
                                            {selectedStation.genres.map((genre) => (
                                                <span key={genre} className="tm-subway-chip subtle">
                                                    {genre}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </aside>
                    </div>
                )}
            </section>
        </div>
    );
}
