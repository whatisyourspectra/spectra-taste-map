import React, { useEffect, useMemo, useRef, useState } from 'react';
import './TasteMapMetroStudio.css';
import {
    buildMetroMapLayout,
    buildMetroTasteLines,
    buildSeedGenreLines,
    createMetroMapDefinition,
    getMetroMagneticPosition,
    getMetroColor,
    METRO_CANVAS_GROWTH,
    METRO_GRID_SIZE,
    METRO_MAP_HEIGHT,
    METRO_MAP_WIDTH,
    reorderMetroStationOnLine,
    snapMetroPoint,
    swapMetroStationsOnLine,
} from './metroMap2Engine';

const STORAGE_VERSION = 1;

const COPY = {
    ko: {
        studio: 'METRO MAP 2 · STUDIO',
        newMetro: '새 노선도',
        close: '닫기',
        mapName: '노선도 이름',
        createTitle: '나의 음악으로 새로운 도시를 만드세요',
        createDescription: '취향별 노선을 고르거나, 한 곡에서 시작해 장르 노선을 방사형으로 펼칠 수 있어요.',
        tasteMode: '취향 노선으로 만들기',
        tasteModeDesc: 'Taste Field에서 분류된 취향을 노선으로 사용합니다.',
        seedMode: '한 곡에서 뻗어나가기',
        seedModeDesc: '선택한 곡을 중심역으로 두고 장르별 노선을 펼칩니다.',
        chooseLines: '포함할 취향 노선',
        chooseLinesDesc: '일부만 골라도 되고, 전부 선택해도 됩니다.',
        chooseSeed: '중심이 될 곡',
        chooseBranches: '뻗어나갈 장르 노선',
        searchTrack: '곡 또는 아티스트 검색',
        detailedSettings: '노선도 생성 상세 설정',
        maxPerLine: '노선당 최대 역',
        maxTotal: '전체 최대 역',
        densityHint: '곡이 많으면 노선별 분포와 인기도를 함께 고려해 자동으로 선곡합니다.',
        transferRule: '환승곡 정하기',
        transferAuto: '자동 선택',
        transferManual: '직접 선택',
        transferNone: '환승 없음',
        transferCount: '환승곡 수',
        transferCandidates: '환승곡 후보',
        create: '노선도 생성하기',
        cancel: '취소',
        lines: '노선',
        stations: '역',
        transfers: '환승',
        seed: '중심역',
        editMap: '노선도 편집',
        addLine: '노선 추가',
        addTrack: '곡 추가',
        lineEmpty: '추가할 수 있는 취향 노선이 없습니다.',
        selectLineFirst: '먼저 곡을 추가할 노선을 선택하세요.',
        availableTracks: '추가 가능한 곡',
        noTracks: '추가할 수 있는 곡이 없습니다.',
        stationDetail: '역 정보',
        selectStation: '노선도의 역을 선택하면 곡과 편집 옵션이 표시됩니다.',
        makeTransfer: '환승역으로 만들기',
        removeStation: '이 역 삭제',
        removeLine: '노선 삭제',
        duplicate: '복제',
        deleteMap: '노선도 삭제',
        saveSvg: 'SVG 저장',
        fit: '맞춤',
        libraryScope: '현재 Taste Field의 곡만 사용합니다.',
        autoSaved: '이 브라우저에 자동 저장됨',
        mapTypeTaste: '취향 조합형',
        mapTypeSeed: '중심곡 방사형',
        allSelected: '전체 선택',
        clear: '선택 해제',
        songs: '곡',
        zoom: '배율',
        stationRemoved: '중심역은 삭제할 수 없습니다.',
        dragHint: '역을 움직이면 가까운 격자점에 붙습니다',
        mapGestureHint: '격자 노선 · 빈 공간 이동 · 휠 확대',
        resetLayout: '배치 초기화',
    },
    en: {
        studio: 'METRO MAP 2 · STUDIO',
        newMetro: 'New metro',
        close: 'Close',
        mapName: 'Map name',
        createTitle: 'Build a new city from your music',
        createDescription: 'Use taste groups as lines, or grow genre routes outward from one seed track.',
        tasteMode: 'Build from taste lines',
        tasteModeDesc: 'Use the taste groups classified in your Taste Field as routes.',
        seedMode: 'Grow from one track',
        seedModeDesc: 'Place one track at the center and branch out by genre.',
        chooseLines: 'Taste lines to include',
        chooseLinesDesc: 'Choose a few routes or include them all.',
        chooseSeed: 'Center track',
        chooseBranches: 'Genre branches',
        searchTrack: 'Search track or artist',
        detailedSettings: 'Generation settings',
        maxPerLine: 'Max stations per line',
        maxTotal: 'Max stations overall',
        densityHint: 'When there are too many tracks, selection balances route coverage and popularity.',
        transferRule: 'Transfer tracks',
        transferAuto: 'Automatic',
        transferManual: 'Choose manually',
        transferNone: 'No transfers',
        transferCount: 'Number of transfers',
        transferCandidates: 'Transfer candidates',
        create: 'Create metro map',
        cancel: 'Cancel',
        lines: 'Lines',
        stations: 'Stations',
        transfers: 'Transfers',
        seed: 'Seed',
        editMap: 'Edit metro',
        addLine: 'Add line',
        addTrack: 'Add track',
        lineEmpty: 'There are no more taste lines to add.',
        selectLineFirst: 'Choose the line that should receive the track first.',
        availableTracks: 'Available tracks',
        noTracks: 'There are no tracks left to add.',
        stationDetail: 'Station detail',
        selectStation: 'Select a station on the map to see its track and editing options.',
        makeTransfer: 'Make transfer station',
        removeStation: 'Remove station',
        removeLine: 'Remove line',
        duplicate: 'Duplicate',
        deleteMap: 'Delete map',
        saveSvg: 'Save SVG',
        fit: 'Fit',
        libraryScope: 'Uses tracks from the current Taste Field.',
        autoSaved: 'Saved automatically in this browser',
        mapTypeTaste: 'Taste mix',
        mapTypeSeed: 'Seed radial',
        allSelected: 'Select all',
        clear: 'Clear',
        songs: 'tracks',
        zoom: 'Zoom',
        stationRemoved: 'The seed station cannot be removed.',
        dragHint: 'Stations snap to the nearest grid point',
        mapGestureHint: 'Grid routes · drag map · wheel to zoom',
        resetLayout: 'Reset layout',
    },
};

function loadStoredMaps(storageKey) {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
        if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.maps)) return [];
        return parsed.maps
            .filter((map) => map?.id && Array.isArray(map.lines))
            .map((map) => {
                if (map.canvas?.width && map.canvas?.height) return map;
                const shiftX = (METRO_MAP_WIDTH - 1600) / 2;
                const shiftY = (METRO_MAP_HEIGHT - 960) / 2;
                const stationPositions = Object.fromEntries(
                    Object.entries(map.stationPositions || {}).map(([trackId, point]) => [trackId, {
                        x: (Number(point?.x) || 0) + shiftX,
                        y: (Number(point?.y) || 0) + shiftY,
                    }]),
                );
                return {
                    ...map,
                    canvas: { width: METRO_MAP_WIDTH, height: METRO_MAP_HEIGHT },
                    stationPositions,
                };
            });
    } catch {
        return [];
    }
}

function persistMaps(storageKey, maps) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(storageKey, JSON.stringify({ version: STORAGE_VERSION, maps }));
    } catch {
        // Local storage can be unavailable or full. The in-memory studio still works.
    }
}

function downloadSvg(svgNode, filename) {
    if (!svgNode) return;
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${svgNode.outerHTML}`;
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function stationCountForMap(map) {
    const ids = new Set(map?.transferIds || []);
    (map?.lines || []).forEach((line) => line.trackIds.forEach((trackId) => ids.add(trackId)));
    return ids.size;
}

function mapTrackIds(map) {
    const ids = new Set(map?.transferIds || []);
    (map?.lines || []).forEach((line) => line.trackIds.forEach((trackId) => ids.add(trackId)));
    return ids;
}

function MetroTrackRow({ track, selected, onClick, meta }) {
    if (!track) return null;
    return (
        <button
            type="button"
            className={`tm2-track-row${selected ? ' selected' : ''}`}
            onClick={onClick}
        >
            {track.coverUrl ? (
                <img src={track.coverUrl} alt="" loading="lazy" />
            ) : (
                <span className="tm2-track-fallback" aria-hidden>♪</span>
            )}
            <span className="tm2-track-copy">
                <strong>{track.name}</strong>
                <small>{track.artists || '-'}</small>
            </span>
            {meta ? <span className="tm2-track-meta">{meta}</span> : null}
            <span className="tm2-track-check" aria-hidden>{selected ? '✓' : '+'}</span>
        </button>
    );
}

function MetroCreationWizard({ tracks, lineOptions, lang, canCancel, onCancel, onCreate }) {
    const copy = COPY[lang] || COPY.ko;
    const sourceTracks = useMemo(
        () => (Array.isArray(tracks) ? tracks : []).filter((track) => track?.id && track?.name),
        [tracks],
    );
    const firstSeed = sourceTracks[0] || null;
    const initialSeedLines = buildSeedGenreLines(firstSeed, sourceTracks);
    const [mode, setMode] = useState('taste');
    const [name, setName] = useState(lang === 'en' ? 'Seoul Night Metro' : '서울의 밤');
    const [selectedLineKeys, setSelectedLineKeys] = useState(() => lineOptions.slice(0, 4).map((line) => line.key));
    const [seedTrackId, setSeedTrackId] = useState(firstSeed?.id || null);
    const [selectedSeedLineKeys, setSelectedSeedLineKeys] = useState(() => initialSeedLines.slice(0, 4).map((line) => line.key));
    const [trackSearch, setTrackSearch] = useState('');
    const [maxPerLine, setMaxPerLine] = useState(12);
    const [maxTotal, setMaxTotal] = useState(64);
    const [transferMode, setTransferMode] = useState('auto');
    const [transferCount, setTransferCount] = useState(2);
    const [manualTransferIds, setManualTransferIds] = useState([]);
    const seedTrack = sourceTracks.find((track) => track.id === seedTrackId) || firstSeed;
    const seedLines = useMemo(() => buildSeedGenreLines(seedTrack, sourceTracks), [seedTrack, sourceTracks]);

    const filteredTracks = useMemo(() => {
        const query = trackSearch.trim().toLowerCase();
        const sorted = [...sourceTracks].sort((a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0));
        if (!query) return sorted.slice(0, 36);
        return sorted
            .filter((track) => `${track.name} ${track.artists || ''}`.toLowerCase().includes(query))
            .slice(0, 36);
    }, [sourceTracks, trackSearch]);

    const transferCandidates = useMemo(() => {
        const selected = new Set(selectedLineKeys);
        const membership = new Map();
        lineOptions.forEach((line) => {
            if (!selected.has(line.key)) return;
            line.trackIds.forEach((trackId) => membership.set(trackId, (membership.get(trackId) || 0) + 1));
        });
        return sourceTracks
            .filter((track) => membership.has(track.id))
            .sort((a, b) => {
                const shared = (membership.get(b.id) || 0) - (membership.get(a.id) || 0);
                return shared || (Number(b.popularity) || 0) - (Number(a.popularity) || 0);
            })
            .slice(0, 30)
            .map((track) => ({ track, count: membership.get(track.id) || 1 }));
    }, [lineOptions, selectedLineKeys, sourceTracks]);

    const activeLines = useMemo(
        () => (mode === 'seed'
            ? seedLines.filter((line) => selectedSeedLineKeys.includes(line.key))
            : lineOptions.filter((line) => selectedLineKeys.includes(line.key))),
        [mode, seedLines, selectedSeedLineKeys, lineOptions, selectedLineKeys],
    );
    const canCreate = Boolean(name.trim() && activeLines.length && (mode !== 'seed' || seedTrack));
    const previewMap = useMemo(() => (
        canCreate
            ? createMetroMapDefinition({
                name,
                mode,
                selectedLines: activeLines,
                tracks: sourceTracks,
                maxPerLine,
                maxTotal,
                transferMode,
                transferCount,
                manualTransferIds,
                seedTrackId: seedTrack?.id || null,
            })
            : null
    ), [
        canCreate,
        name,
        mode,
        activeLines,
        sourceTracks,
        maxPerLine,
        maxTotal,
        transferMode,
        transferCount,
        manualTransferIds,
        seedTrack,
    ]);
    const previewLayout = useMemo(
        () => buildMetroMapLayout(previewMap, sourceTracks),
        [previewMap, sourceTracks],
    );

    const toggleValue = (value, setter) => {
        setter((previous) => (previous.includes(value)
            ? previous.filter((item) => item !== value)
            : [...previous, value]));
    };

    return (
        <div className="tm2-wizard">
            <div className="tm2-create-preview" aria-hidden="true">
                {previewMap ? (
                    <MetroMapSvg
                        map={previewMap}
                        layout={previewLayout}
                        selectedStationId={null}
                        selectedLineKey={null}
                        onStationSelect={() => {}}
                        onLineSelect={() => {}}
                        interactive={false}
                    />
                ) : null}
            </div>
            <div className="tm2-create-shade" aria-hidden="true" />
            <aside className="tm2-create-panel">
                <button type="button" className="tm2-create-close" onClick={onCancel} aria-label={copy.close}>×</button>
                <div className="tm2-wizard-hero">
                    <span>SPECTRA · {copy.newMetro}</span>
                    <h2>{copy.createTitle}</h2>
                    <p>{copy.createDescription}</p>
                </div>

            <div className="tm2-mode-grid" role="radiogroup" aria-label={copy.createTitle}>
                <button
                    type="button"
                    role="radio"
                    aria-checked={mode === 'taste'}
                    className={`tm2-mode-card${mode === 'taste' ? ' active' : ''}`}
                    onClick={() => setMode('taste')}
                >
                    <span className="tm2-mode-number">01</span>
                    <strong>{copy.tasteMode}</strong>
                    <small>{copy.tasteModeDesc}</small>
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={mode === 'seed'}
                    className={`tm2-mode-card${mode === 'seed' ? ' active' : ''}`}
                    onClick={() => setMode('seed')}
                >
                    <span className="tm2-mode-number">02</span>
                    <strong>{copy.seedMode}</strong>
                    <small>{copy.seedModeDesc}</small>
                </button>
            </div>

            <div className="tm2-wizard-grid">
                <section className="tm2-wizard-main">
                    <label className="tm2-field-label" htmlFor="tm2-map-name">{copy.mapName}</label>
                    <input
                        id="tm2-map-name"
                        className="tm2-name-input"
                        value={name}
                        maxLength={42}
                        onChange={(event) => setName(event.target.value)}
                    />

                    {mode === 'taste' ? (
                        <>
                            <div className="tm2-section-heading">
                                <div>
                                    <h3>{copy.chooseLines}</h3>
                                    <p>{copy.chooseLinesDesc}</p>
                                </div>
                                <div className="tm2-inline-actions">
                                    <button type="button" onClick={() => setSelectedLineKeys(lineOptions.map((line) => line.key))}>{copy.allSelected}</button>
                                    <button type="button" onClick={() => setSelectedLineKeys([])}>{copy.clear}</button>
                                </div>
                            </div>
                            <div className="tm2-line-choice-grid">
                                {lineOptions.map((line) => {
                                    const selected = selectedLineKeys.includes(line.key);
                                    return (
                                        <button
                                            key={line.key}
                                            type="button"
                                            className={`tm2-line-choice${selected ? ' selected' : ''}`}
                                            onClick={() => toggleValue(line.key, setSelectedLineKeys)}
                                        >
                                            <span className="tm2-line-swatch" style={{ background: line.color }} />
                                            <span>
                                                <strong>{line.label}</strong>
                                                <small>{line.count} {copy.songs} · {line.genres.slice(0, 2).join(' / ')}</small>
                                            </span>
                                            <span className="tm2-choice-check" aria-hidden>{selected ? '✓' : '+'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="tm2-section-heading">
                                <div>
                                    <h3>{copy.chooseSeed}</h3>
                                    <p>{copy.seedModeDesc}</p>
                                </div>
                            </div>
                            <input
                                type="search"
                                className="tm2-search-input"
                                value={trackSearch}
                                placeholder={copy.searchTrack}
                                onChange={(event) => setTrackSearch(event.target.value)}
                            />
                            <div className="tm2-track-picker">
                                {filteredTracks.map((track) => (
                                    <MetroTrackRow
                                        key={track.id}
                                        track={track}
                                        selected={track.id === seedTrack?.id}
                                        onClick={() => {
                                            const nextLines = buildSeedGenreLines(track, sourceTracks);
                                            setSeedTrackId(track.id);
                                            setSelectedSeedLineKeys(nextLines.slice(0, 4).map((line) => line.key));
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="tm2-section-heading compact">
                                <div>
                                    <h3>{copy.chooseBranches}</h3>
                                </div>
                            </div>
                            <div className="tm2-branch-chips">
                                {seedLines.map((line) => (
                                    <button
                                        type="button"
                                        key={line.key}
                                        className={selectedSeedLineKeys.includes(line.key) ? 'active' : ''}
                                        style={{ '--tm2-branch': line.color }}
                                        onClick={() => toggleValue(line.key, setSelectedSeedLineKeys)}
                                    >
                                        <span />{line.label}<small>{line.count}</small>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </section>

                <aside className="tm2-settings-panel">
                    <div className="tm2-settings-title">
                        <span>DETAIL</span>
                        <h3>{copy.detailedSettings}</h3>
                    </div>
                    <label className="tm2-range-field">
                        <span><strong>{copy.maxPerLine}</strong><b>{maxPerLine}</b></span>
                        <input type="range" min="5" max="24" value={maxPerLine} onChange={(event) => setMaxPerLine(Number(event.target.value))} />
                    </label>
                    <label className="tm2-range-field">
                        <span><strong>{copy.maxTotal}</strong><b>{maxTotal}</b></span>
                        <input type="range" min="24" max="120" step="4" value={maxTotal} onChange={(event) => setMaxTotal(Number(event.target.value))} />
                    </label>
                    <p className="tm2-settings-hint">{copy.densityHint}</p>

                    {mode === 'taste' ? (
                        <>
                            <div className="tm2-setting-label">{copy.transferRule}</div>
                            <div className="tm2-segmented">
                                {[
                                    ['auto', copy.transferAuto],
                                    ['manual', copy.transferManual],
                                    ['none', copy.transferNone],
                                ].map(([value, label]) => (
                                    <button
                                        type="button"
                                        key={value}
                                        className={transferMode === value ? 'active' : ''}
                                        onClick={() => setTransferMode(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {transferMode === 'auto' ? (
                                <label className="tm2-range-field compact">
                                    <span><strong>{copy.transferCount}</strong><b>{transferCount}</b></span>
                                    <input type="range" min="1" max="6" value={transferCount} onChange={(event) => setTransferCount(Number(event.target.value))} />
                                </label>
                            ) : null}
                            {transferMode === 'manual' ? (
                                <div className="tm2-transfer-picker">
                                    <span>{copy.transferCandidates}</span>
                                    {transferCandidates.map(({ track, count }) => (
                                        <MetroTrackRow
                                            key={track.id}
                                            track={track}
                                            selected={manualTransferIds.includes(track.id)}
                                            meta={count > 1 ? `${count}×` : null}
                                            onClick={() => toggleValue(track.id, setManualTransferIds)}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className="tm2-seed-summary">
                            <span>{copy.seed}</span>
                            <strong>{seedTrack?.name || '-'}</strong>
                            <small>{seedTrack?.artists || '-'}</small>
                            <p>{activeLines.length} {copy.lines} · {activeLines.reduce((sum, line) => sum + Math.min(line.count, maxPerLine), 0) + 1} {copy.stations}</p>
                        </div>
                    )}
                </aside>
            </div>

            <footer className="tm2-wizard-footer">
                <span>{copy.libraryScope}</span>
                <div>
                    {canCancel ? <button type="button" className="tm2-secondary-btn" onClick={onCancel}>{copy.cancel}</button> : null}
                    <button
                        type="button"
                        className="tm2-primary-btn"
                        disabled={!canCreate}
                        onClick={() => onCreate(createMetroMapDefinition({
                            name,
                            mode,
                            selectedLines: activeLines,
                            tracks: sourceTracks,
                            maxPerLine,
                            maxTotal,
                            transferMode,
                            transferCount,
                            manualTransferIds,
                            seedTrackId: seedTrack?.id || null,
                        }))}
                    >
                        {copy.create}<span aria-hidden>→</span>
                    </button>
                </div>
            </footer>
            </aside>
        </div>
    );
}

function MetroMapSvg({
    map,
    layout,
    selectedStationId,
    selectedLineKey,
    hoveredStationId = null,
    hoveredLineKey = null,
    draggingStationId = null,
    dragSnapTarget = null,
    dragMagnetStrength = 0,
    onStationSelect,
    onStationHover,
    onStationDragStart,
    onStationDragMove,
    onStationDragEnd,
    onStationNudge,
    onLineSelect,
    onLineHover,
    onCanvasSelect,
    svgRef,
    interactive = true,
}) {
    const lineByKey = new Map(layout.lines.map((line) => [line.key, line]));
    const safeMapId = String(map.id || 'preview').replace(/[^a-zA-Z0-9_-]/g, '');

    return (
        <svg
            ref={svgRef}
            className="tm2-map-svg"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-label={`${map.name} metro map`}
            xmlns="http://www.w3.org/2000/svg"
            width={layout.width}
            height={layout.height}
            fontFamily="Pretendard, system-ui, sans-serif"
        >
            <defs>
                <pattern id={`tm2-grid-${safeMapId}`} width={METRO_GRID_SIZE} height={METRO_GRID_SIZE} patternUnits="userSpaceOnUse">
                    <path d={`M ${METRO_GRID_SIZE} 0 L 0 0 0 ${METRO_GRID_SIZE}`} fill="none" stroke="#24313a" strokeWidth="1" />
                    <circle cx="0" cy="0" r="2.4" fill="#40515e" />
                </pattern>
                {layout.stations.map((station, stationIndex) => {
                    const size = station.isSeed ? 54 : (station.isTransfer ? 46 : 40);
                    return (
                        <clipPath key={station.trackId} id={`tm2-cover-${safeMapId}-${stationIndex}`}>
                            <rect x={station.x - (size / 2) + 3} y={station.y - (size / 2) + 3} width={size - 6} height={size - 6} rx="7" />
                        </clipPath>
                    );
                })}
            </defs>
            <rect width={layout.width} height={layout.height} fill="#0c1319" data-tm2-background="true" onClick={interactive ? onCanvasSelect : undefined} />
            <rect width={layout.width} height={layout.height} fill={`url(#tm2-grid-${safeMapId})`} data-tm2-background="true" onClick={interactive ? onCanvasSelect : undefined} />

            {layout.lines.map((line) => {
                const focusedLineKey = selectedLineKey || hoveredLineKey;
                const active = !focusedLineKey || focusedLineKey === line.key;
                const highlighted = selectedLineKey === line.key || (!selectedLineKey && hoveredLineKey === line.key);
                const labelOnRight = line.labelPoint.x > layout.width / 2;
                const labelWidth = Math.min(154, Math.max(82, (line.label.length * 8) + 24));
                return (
                    <g
                        key={`route-${line.key}`}
                        className={`tm2-svg-line${active ? '' : ' dimmed'}${highlighted ? ' highlighted' : ''}`}
                        onClick={interactive ? () => onLineSelect(line.key) : undefined}
                        onMouseEnter={interactive ? () => onLineHover?.(line.key) : undefined}
                        onMouseLeave={interactive ? () => onLineHover?.(null) : undefined}
                    >
                        {highlighted ? (
                            <path d={line.pathData} fill="none" stroke={line.color} strokeWidth="18" opacity="0.16" strokeLinecap="round" strokeLinejoin="round" />
                        ) : null}
                        <path d={line.pathData} fill="none" stroke="#080d12" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={line.pathData} fill="none" stroke={line.color} strokeWidth={highlighted ? 8 : 7} strokeLinecap="round" strokeLinejoin="round" />
                        <g transform={`translate(${line.labelPoint.x} ${line.labelPoint.y})`}>
                            <rect
                                x={labelOnRight ? -(labelWidth + 30) : 30}
                                y="-15"
                                width={labelWidth}
                                height="30"
                                rx="8"
                                fill="#111a21"
                                stroke={line.color}
                                strokeWidth="2"
                            />
                            <text
                                x={labelOnRight ? -(labelWidth + 18) : 42}
                                y="5"
                                textAnchor="start"
                                fill="#edf2f5"
                                fontSize="13"
                                fontWeight="750"
                            >
                                {line.label.length > 18 ? `${line.label.slice(0, 17)}…` : line.label}
                            </text>
                        </g>
                    </g>
                );
            })}

            {layout.stations.map((station, stationIndex) => {
                const primaryLine = lineByKey.get(station.lineKeys[0]);
                const color = primaryLine?.color || '#ffffff';
                const selected = station.trackId === selectedStationId;
                const hovered = station.trackId === hoveredStationId;
                const dragging = station.trackId === draggingStationId;
                const focusedLineKey = selectedLineKey || hoveredLineKey;
                const dimmed = focusedLineKey && !station.lineKeys.includes(focusedLineKey);
                const nodeSize = station.isSeed ? 54 : (station.isTransfer ? 46 : 40);
                const halfSize = nodeSize / 2;
                return (
                    <g
                        key={station.trackId}
                        className={`tm2-svg-station${selected ? ' selected' : ''}${hovered ? ' hovered' : ''}${dragging ? ' dragging' : ''}${dimmed ? ' dimmed' : ''}`}
                        role={interactive ? 'button' : undefined}
                        tabIndex={interactive ? 0 : undefined}
                        aria-label={`${station.track.name} — ${station.track.artists || ''}`}
                        onClick={interactive ? () => onStationSelect(station.trackId) : undefined}
                        onMouseEnter={interactive ? () => onStationHover?.(station.trackId) : undefined}
                        onMouseLeave={interactive ? () => onStationHover?.(null) : undefined}
                        onPointerDown={interactive ? (event) => onStationDragStart?.(station.trackId, event) : undefined}
                        onPointerMove={interactive ? (event) => onStationDragMove?.(station.trackId, event) : undefined}
                        onPointerUp={interactive ? (event) => onStationDragEnd?.(station.trackId, event) : undefined}
                        onPointerCancel={interactive ? (event) => onStationDragEnd?.(station.trackId, event) : undefined}
                        onKeyDown={interactive ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onStationSelect(station.trackId);
                                return;
                            }
                            const direction = {
                                ArrowLeft: [-1, 0],
                                ArrowRight: [1, 0],
                                ArrowUp: [0, -1],
                                ArrowDown: [0, 1],
                            }[event.key];
                            if (direction) {
                                event.preventDefault();
                                onStationNudge?.(station.trackId, direction[0], direction[1]);
                            }
                        } : undefined}
                    >
                        {dragging && dragSnapTarget && dragMagnetStrength > 0 ? (
                            <g className="tm2-snap-target" aria-hidden="true" opacity={0.3 + (dragMagnetStrength * 0.7)}>
                                <circle cx={dragSnapTarget.x} cy={dragSnapTarget.y} r={halfSize + 15} fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 5" />
                                <path d={`M ${dragSnapTarget.x - halfSize - 20} ${dragSnapTarget.y} H ${dragSnapTarget.x + halfSize + 20} M ${dragSnapTarget.x} ${dragSnapTarget.y - halfSize - 20} V ${dragSnapTarget.y + halfSize + 20}`} stroke={color} strokeWidth="1.5" opacity="0.7" />
                            </g>
                        ) : null}
                        {(selected || hovered) ? (
                            <rect
                                x={station.x - halfSize - 7}
                                y={station.y - halfSize - 7}
                                width={nodeSize + 14}
                                height={nodeSize + 14}
                                rx="13"
                                fill={color}
                                opacity={selected ? 0.2 : 0.1}
                            />
                        ) : null}
                        <rect
                            x={station.x - halfSize}
                            y={station.y - halfSize}
                            width={nodeSize}
                            height={nodeSize}
                            rx="10"
                            fill="#10181f"
                            stroke={station.isTransfer || station.isSeed ? '#eef2f3' : color}
                            strokeWidth={station.isTransfer || station.isSeed ? 4 : 3}
                        />
                        {station.track.coverUrl ? (
                            <image
                                href={station.track.coverUrl}
                                x={station.x - halfSize + 3}
                                y={station.y - halfSize + 3}
                                width={nodeSize - 6}
                                height={nodeSize - 6}
                                preserveAspectRatio="xMidYMid slice"
                                clipPath={`url(#tm2-cover-${safeMapId}-${stationIndex})`}
                            />
                        ) : (
                            <g aria-hidden="true">
                                <rect x={station.x - halfSize + 3} y={station.y - halfSize + 3} width={nodeSize - 6} height={nodeSize - 6} rx="7" fill={color} opacity="0.34" />
                                <text x={station.x} y={station.y + 6} textAnchor="middle" fill="#eef3f5" fontSize="18" fontWeight="750">♪</text>
                            </g>
                        )}
                        <rect
                            x={station.x - halfSize}
                            y={station.y - halfSize}
                            width={nodeSize}
                            height={nodeSize}
                            rx="10"
                            fill="none"
                            stroke="#071015"
                            strokeWidth="1.5"
                            opacity="0.72"
                        />
                        {station.isTransfer && station.lineKeys.slice(0, 4).map((lineKey, index) => (
                            <circle
                                key={lineKey}
                                cx={station.x - (((Math.min(4, station.lineKeys.length) - 1) * 5) / 2) + (index * 5)}
                                cy={station.y + halfSize + 6}
                                r="3.2"
                                fill={lineByKey.get(lineKey)?.color || color}
                                stroke={lineByKey.get(lineKey)?.color || color}
                                strokeWidth="1"
                            />
                        ))}
                        {station.isSeed ? <circle cx={station.x + halfSize - 2} cy={station.y - halfSize + 2} r="6" fill="#f2f5f5" stroke="#0c1319" strokeWidth="3" /> : null}
                    </g>
                );
            })}
        </svg>
    );
}

export default function TasteMapMetroStudio({
    open,
    onClose,
    tracks,
    activeTrackIds,
    assignmentByTrackId,
    clusterById,
    libraryId = 'guest',
    lang = 'ko',
}) {
    const copy = COPY[lang] || COPY.ko;
    const storageKey = `spectra.metro-map-2.${libraryId || 'guest'}`;
    const [maps, setMaps] = useState(() => loadStoredMaps(storageKey));
    const [activeMapId, setActiveMapId] = useState(() => loadStoredMaps(storageKey)[0]?.id || null);
    const [creating, setCreating] = useState(() => loadStoredMaps(storageKey).length === 0);
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [selectedLineKey, setSelectedLineKey] = useState(null);
    const [hoveredStationId, setHoveredStationId] = useState(null);
    const [hoveredLineKey, setHoveredLineKey] = useState(null);
    const [dragPosition, setDragPosition] = useState(null);
    const [draggingStationId, setDraggingStationId] = useState(null);
    const [isPanning, setIsPanning] = useState(false);
    const [editorMode, setEditorMode] = useState('line');
    const [editorOpen, setEditorOpen] = useState(false);
    const [trackSearch, setTrackSearch] = useState('');
    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);
    const wheelAnchorRef = useRef(null);
    const svgRef = useRef(null);
    const canvasStageRef = useRef(null);
    const stationDragRef = useRef(null);
    const panDragRef = useRef(null);
    const suppressStationClickRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    const sourceTracks = useMemo(
        () => (Array.isArray(tracks) ? tracks : [])
            .filter((track) => track?.id && track?.name)
            .filter((track) => !activeTrackIds || activeTrackIds.has(track.id)),
        [tracks, activeTrackIds],
    );
    const trackById = useMemo(() => new Map(sourceTracks.map((track) => [track.id, track])), [sourceTracks]);
    const lineOptions = useMemo(() => buildMetroTasteLines({
        tracks: sourceTracks,
        assignmentByTrackId,
        clusterById,
    }), [sourceTracks, assignmentByTrackId, clusterById]);
    const activeMap = maps.find((map) => map.id === activeMapId) || maps[0] || null;
    const mapForLayout = useMemo(() => {
        if (!activeMap || !dragPosition) return activeMap;
        return {
            ...activeMap,
            stationPositions: {
                ...(activeMap.stationPositions || {}),
                [dragPosition.trackId]: { x: dragPosition.x, y: dragPosition.y },
            },
        };
    }, [activeMap, dragPosition]);
    const layout = useMemo(
        () => buildMetroMapLayout(mapForLayout, sourceTracks, { transientStationId: draggingStationId }),
        [mapForLayout, sourceTracks, draggingStationId],
    );
    useEffect(() => {
        if (!open || creating || !activeMapId) return undefined;
        let measureFrame = null;
        const frame = window.requestAnimationFrame(() => {
            measureFrame = window.requestAnimationFrame(() => {
                const stage = canvasStageRef.current;
                const svg = svgRef.current;
                if (!stage || !svg) return;
                const stationRects = [...svg.querySelectorAll('.tm2-svg-station')]
                    .map((station) => station.getBoundingClientRect())
                    .filter((rect) => rect.width > 0 && rect.height > 0);
                if (!stationRects.length) {
                    stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
                    stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
                    return;
                }
                const stageRect = stage.getBoundingClientRect();
                const minX = Math.min(...stationRects.map((rect) => rect.left));
                const maxX = Math.max(...stationRects.map((rect) => rect.right));
                const minY = Math.min(...stationRects.map((rect) => rect.top));
                const maxY = Math.max(...stationRects.map((rect) => rect.bottom));
                const mapCenterX = ((minX + maxX) / 2) - stageRect.left + stage.scrollLeft;
                const mapCenterY = ((minY + maxY) / 2) - stageRect.top + stage.scrollTop;
                stage.scrollLeft = Math.max(0, mapCenterX - (stage.clientWidth / 2));
                stage.scrollTop = Math.max(0, mapCenterY - (stage.clientHeight / 2));
            });
        });
        return () => {
            window.cancelAnimationFrame(frame);
            if (measureFrame) window.cancelAnimationFrame(measureFrame);
        };
    }, [open, creating, activeMapId]);
    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);
    useEffect(() => {
        if (!open || creating || !activeMapId) return undefined;
        const stage = canvasStageRef.current;
        if (!stage) return undefined;
        let zoomFrame = null;
        let zoomCommitTimer = null;
        let pendingWheelDelta = 0;
        const handleNativeWheel = (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            if (!event.deltaY) return;
            if (!wheelAnchorRef.current) {
                const currentZoom = zoomRef.current;
                wheelAnchorRef.current = {
                    x: (stage.scrollLeft + (stage.clientWidth / 2)) / currentZoom,
                    y: (stage.scrollTop + (stage.clientHeight / 2)) / currentZoom,
                };
            }
            pendingWheelDelta += event.deltaY;
            if (zoomFrame) return;
            zoomFrame = window.requestAnimationFrame(() => {
                zoomFrame = null;
                const currentZoom = zoomRef.current;
                const zoomFactor = Math.exp(-pendingWheelDelta * 0.0012);
                pendingWheelDelta = 0;
                const nextZoom = Math.min(1.9, Math.max(0.72, Number((currentZoom * zoomFactor).toFixed(3))));
                const anchor = wheelAnchorRef.current;
                if (!anchor) return;
                if (nextZoom === currentZoom) {
                    wheelAnchorRef.current = null;
                    return;
                }
                const canvasWidth = Number(stage.dataset.canvasWidth) || METRO_MAP_WIDTH;
                const canvasHeight = Number(stage.dataset.canvasHeight) || METRO_MAP_HEIGHT;
                const gutter = METRO_GRID_SIZE * 10;
                zoomRef.current = nextZoom;
                stage.style.setProperty('--tm2-canvas-zoom', String(nextZoom));
                stage.style.setProperty('--tm2-shell-width', `${(canvasWidth + (gutter * 2)) * nextZoom}px`);
                stage.style.setProperty('--tm2-shell-height', `${(canvasHeight + (gutter * 2)) * nextZoom}px`);
                stage.scrollLeft = (anchor.x * nextZoom) - (stage.clientWidth / 2);
                stage.scrollTop = (anchor.y * nextZoom) - (stage.clientHeight / 2);
                if (zoomCommitTimer) window.clearTimeout(zoomCommitTimer);
                zoomCommitTimer = window.setTimeout(() => {
                    setZoom(zoomRef.current);
                    wheelAnchorRef.current = null;
                    zoomCommitTimer = null;
                }, 90);
            });
        };
        stage.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => {
            stage.removeEventListener('wheel', handleNativeWheel);
            if (zoomFrame) window.cancelAnimationFrame(zoomFrame);
            if (zoomCommitTimer) window.clearTimeout(zoomCommitTimer);
            wheelAnchorRef.current = null;
        };
    }, [open, creating, activeMapId]);
    const selectedStation = layout.stations.find((station) => station.trackId === selectedStationId) || null;
    const existingLineKeys = new Set(activeMap?.lines.map((line) => line.key) || []);
    const addableLines = lineOptions.filter((line) => !existingLineKeys.has(line.key));
    const activeLine = activeMap?.lines.find((line) => line.key === selectedLineKey) || null;
    const usedTrackIds = mapTrackIds(activeMap);
    const availableTracks = sourceTracks
        .filter((track) => !usedTrackIds.has(track.id))
        .filter((track) => {
            const query = trackSearch.trim().toLowerCase();
            return !query || `${track.name} ${track.artists || ''}`.toLowerCase().includes(query);
        })
        .slice(0, 28);

    const commitMaps = (nextMaps) => {
        setMaps(nextMaps);
        persistMaps(storageKey, nextMaps);
    };

    const updateActiveMap = (updater) => {
        if (!activeMap) return;
        const nextMaps = maps.map((map) => {
            if (map.id !== activeMap.id) return map;
            const updated = typeof updater === 'function' ? updater(map) : updater;
            return { ...updated, updatedAt: new Date().toISOString() };
        });
        commitMaps(nextMaps);
    };

    const getPointerMapPosition = (event) => {
        const svg = svgRef.current;
        const matrix = svg?.getScreenCTM?.();
        if (!svg || !matrix) return null;
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const transformed = point.matrixTransform(matrix.inverse());
        return {
            x: Math.min(layout.width - METRO_GRID_SIZE, Math.max(METRO_GRID_SIZE, transformed.x)),
            y: Math.min(layout.height - METRO_GRID_SIZE, Math.max(METRO_GRID_SIZE, transformed.y)),
        };
    };

    const getMagneticPointerMapPosition = (event, trackId) => {
        const point = getPointerMapPosition(event);
        if (!point) return null;
        const nearestGridPoint = snapMetroPoint(point, [], layout);
        const nearestStation = layout.stations.find((station) => (
            station.trackId !== trackId
            && Math.abs(station.x - nearestGridPoint.x) < 1
            && Math.abs(station.y - nearestGridPoint.y) < 1
        ));
        const canSwap = nearestStation
            && Math.hypot(point.x - nearestGridPoint.x, point.y - nearestGridPoint.y) <= METRO_GRID_SIZE * 0.56
            && activeMap?.lines.some((line) => (
                line.trackIds.includes(trackId) && line.trackIds.includes(nearestStation.trackId)
            ));
        const occupiedPoints = layout.stations
            .filter((station) => station.trackId !== trackId && (!canSwap || station.trackId !== nearestStation.trackId))
            .map((station) => ({ x: station.x, y: station.y }));
        return {
            ...getMetroMagneticPosition(point, occupiedPoints, 38, layout),
            swapTrackId: canSwap ? nearestStation.trackId : null,
        };
    };

    const handleStationDragStart = (trackId, event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const point = getPointerMapPosition(event);
        if (!point) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        stationDragRef.current = {
            trackId,
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startPosition: layout.stations.find((station) => station.trackId === trackId) || point,
            moved: false,
        };
        setDraggingStationId(trackId);
    };

    const handleStationDragMove = (trackId, event) => {
        const drag = stationDragRef.current;
        if (!drag || drag.trackId !== trackId || drag.pointerId !== event.pointerId) return;
        const distance = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY);
        if (!drag.moved && distance < 3) return;
        drag.moved = true;
        const point = getMagneticPointerMapPosition(event, trackId);
        if (!point) return;
        event.preventDefault();
        setDragPosition({ trackId, ...point });
    };

    const handleStationDragEnd = (trackId, event) => {
        const drag = stationDragRef.current;
        if (!drag || drag.trackId !== trackId || drag.pointerId !== event.pointerId) return;
        const point = getMagneticPointerMapPosition(event, trackId);
        try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* pointer capture may already be released */ }
        if (drag.moved && point) {
            let viewportShift = null;
            updateActiveMap((map) => {
                const dropPoint = point.snapTarget || snapMetroPoint(point, [], layout);
                const swapTrackId = point.swapTrackId;
                const reorderedMap = swapTrackId
                    ? swapMetroStationsOnLine(map, trackId, swapTrackId)
                    : reorderMetroStationOnLine(map, sourceTracks, trackId, dropPoint);
                const growLeft = dropPoint.x <= METRO_GRID_SIZE * 2;
                const growRight = dropPoint.x >= layout.width - (METRO_GRID_SIZE * 2);
                const growTop = dropPoint.y <= METRO_GRID_SIZE * 2;
                const growBottom = dropPoint.y >= layout.height - (METRO_GRID_SIZE * 2);
                const shiftX = growLeft ? METRO_CANVAS_GROWTH : 0;
                const shiftY = growTop ? METRO_CANVAS_GROWTH : 0;
                const grows = growLeft || growRight || growTop || growBottom;
                const stationPositions = grows
                    ? Object.fromEntries(layout.stations.map((station) => [station.trackId, {
                        x: station.x + shiftX,
                        y: station.y + shiftY,
                    }]))
                    : { ...(reorderedMap.stationPositions || {}) };
                const placedPoint = {
                    x: dropPoint.x + shiftX,
                    y: dropPoint.y + shiftY,
                };
                stationPositions[trackId] = placedPoint;
                if (swapTrackId && drag.startPosition) {
                    stationPositions[swapTrackId] = {
                        x: drag.startPosition.x + shiftX,
                        y: drag.startPosition.y + shiftY,
                    };
                }
                if (shiftX || shiftY) viewportShift = { x: shiftX, y: shiftY };
                return {
                    ...reorderedMap,
                    canvas: {
                        width: layout.width + (growLeft ? METRO_CANVAS_GROWTH : 0) + (growRight ? METRO_CANVAS_GROWTH : 0),
                        height: layout.height + (growTop ? METRO_CANVAS_GROWTH : 0) + (growBottom ? METRO_CANVAS_GROWTH : 0),
                    },
                    stationPositions,
                };
            });
            if (viewportShift) {
                const stage = canvasStageRef.current;
                window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
                    if (!stage) return;
                    stage.scrollLeft += viewportShift.x * zoom;
                    stage.scrollTop += viewportShift.y * zoom;
                }));
            }
            suppressStationClickRef.current = trackId;
            window.setTimeout(() => {
                if (suppressStationClickRef.current === trackId) suppressStationClickRef.current = null;
            }, 0);
        }
        stationDragRef.current = null;
        setDragPosition(null);
        setDraggingStationId(null);
    };

    const handleStationNudge = (trackId, deltaX, deltaY) => {
        const station = layout.stations.find((item) => item.trackId === trackId);
        if (!station) return;
        const occupiedPoints = layout.stations
            .filter((item) => item.trackId !== trackId)
            .map((item) => ({ x: item.x, y: item.y }));
        const point = snapMetroPoint({
            x: station.x + (deltaX * METRO_GRID_SIZE),
            y: station.y + (deltaY * METRO_GRID_SIZE),
        }, occupiedPoints, layout);
        updateActiveMap((map) => ({
            ...map,
            stationPositions: {
                ...(map.stationPositions || {}),
                [trackId]: point,
            },
        }));
    };

    const handleStationSelect = (trackId) => {
        if (suppressStationClickRef.current === trackId) {
            suppressStationClickRef.current = null;
            return;
        }
        setSelectedStationId((current) => current === trackId ? null : trackId);
    };

    const handleCanvasPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (!event.target?.dataset?.tm2Background) return;
        const stage = canvasStageRef.current;
        if (!stage) return;
        stage.setPointerCapture?.(event.pointerId);
        panDragRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startScrollLeft: stage.scrollLeft,
            startScrollTop: stage.scrollTop,
        };
        setIsPanning(true);
    };

    const handleCanvasPointerMove = (event) => {
        const pan = panDragRef.current;
        const stage = canvasStageRef.current;
        if (!pan || !stage || pan.pointerId !== event.pointerId) return;
        stage.scrollLeft = pan.startScrollLeft - (event.clientX - pan.startClientX);
        stage.scrollTop = pan.startScrollTop - (event.clientY - pan.startClientY);
    };

    const handleCanvasPointerEnd = (event) => {
        const pan = panDragRef.current;
        const stage = canvasStageRef.current;
        if (!pan || pan.pointerId !== event.pointerId) return;
        try { stage?.releasePointerCapture?.(event.pointerId); } catch { /* pointer capture may already be released */ }
        panDragRef.current = null;
        setIsPanning(false);
    };

    const handleCreate = (map) => {
        const nextMaps = [...maps, map];
        commitMaps(nextMaps);
        setActiveMapId(map.id);
        setCreating(false);
        setSelectedStationId(null);
        setSelectedLineKey(null);
        setEditorOpen(false);
        setZoom(1);
    };

    const handleDeleteMap = () => {
        if (!activeMap) return;
        const nextMaps = maps.filter((map) => map.id !== activeMap.id);
        commitMaps(nextMaps);
        setActiveMapId(nextMaps[0]?.id || null);
        setCreating(nextMaps.length === 0);
        setSelectedStationId(null);
        setSelectedLineKey(null);
        setEditorOpen(false);
    };

    const handleDuplicateMap = () => {
        if (!activeMap) return;
        const duplicate = {
            ...activeMap,
            id: `${activeMap.id}-copy-${Date.now().toString(36)}`,
            name: `${activeMap.name} Copy`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lines: activeMap.lines.map((line) => ({ ...line, trackIds: [...line.trackIds] })),
            transferIds: [...activeMap.transferIds],
        };
        const nextMaps = [...maps, duplicate];
        commitMaps(nextMaps);
        setActiveMapId(duplicate.id);
        setSelectedStationId(null);
    };

    const addLine = (option) => {
        if (!activeMap || !option) return;
        const unavailable = mapTrackIds(activeMap);
        const limit = activeMap.settings?.maxPerLine || 12;
        const trackIds = option.trackIds.filter((trackId) => trackById.has(trackId) && !unavailable.has(trackId)).slice(0, limit);
        if (!trackIds.length) return;
        updateActiveMap((map) => ({
            ...map,
            lines: [...map.lines, {
                key: option.key,
                label: option.label,
                color: option.color || getMetroColor(map.lines.length),
                trackIds,
                genres: option.genres || [],
            }],
        }));
        setSelectedLineKey(option.key);
    };

    const addTrack = (trackId) => {
        if (!activeLine || !trackById.has(trackId)) return;
        updateActiveMap((map) => ({
            ...map,
            lines: map.lines.map((line) => line.key === activeLine.key
                ? { ...line, trackIds: [...line.trackIds, trackId] }
                : line),
        }));
        setSelectedStationId(trackId);
    };

    const removeLine = (lineKey) => {
        if (!activeMap || activeMap.lines.length <= 1) return;
        updateActiveMap((map) => ({
            ...map,
            lines: map.lines.filter((line) => line.key !== lineKey),
        }));
        if (selectedLineKey === lineKey) setSelectedLineKey(null);
        setSelectedStationId(null);
    };

    const removeStation = () => {
        if (!activeMap || !selectedStation) return;
        if (selectedStation.isSeed) return;
        updateActiveMap((map) => ({
            ...map,
            transferIds: map.transferIds.filter((trackId) => trackId !== selectedStation.trackId),
            lines: map.lines.map((line) => ({
                ...line,
                trackIds: line.trackIds.filter((trackId) => trackId !== selectedStation.trackId),
            })),
        }));
        setSelectedStationId(null);
    };

    const makeTransfer = () => {
        if (!activeMap || !selectedStation || selectedStation.isTransfer || activeMap.mode === 'seed') return;
        updateActiveMap((map) => ({
            ...map,
            transferIds: [...new Set([...map.transferIds, selectedStation.trackId])],
            lines: map.lines.map((line) => ({
                ...line,
                trackIds: line.trackIds.filter((trackId) => trackId !== selectedStation.trackId),
            })),
        }));
    };

    if (!open) return null;

    return (
        <div className="tm2-backdrop" role="presentation">
            <section className="tm2-studio" role="dialog" aria-modal="true" aria-label={copy.studio}>
                {creating ? (
                    <MetroCreationWizard
                        key={`wizard-${maps.length}-${lang}`}
                        tracks={sourceTracks}
                        lineOptions={lineOptions}
                        lang={lang}
                        canCancel={maps.length > 0}
                        onCancel={() => {
                            if (maps.length) setCreating(false);
                            else onClose();
                        }}
                        onCreate={handleCreate}
                    />
                ) : activeMap ? (
                    <div className="tm2-map-view">
                        <div
                            ref={canvasStageRef}
                            className={`tm2-canvas-stage${isPanning ? ' panning' : ''}`}
                            data-canvas-width={layout.width}
                            data-canvas-height={layout.height}
                            style={{
                                '--tm2-canvas-width': `${layout.width}px`,
                                '--tm2-canvas-height': `${layout.height}px`,
                                '--tm2-grid-size': `${METRO_GRID_SIZE}px`,
                                '--tm2-canvas-gutter': `${METRO_GRID_SIZE * 10}px`,
                                '--tm2-canvas-zoom': zoom,
                                '--tm2-shell-width': `${(layout.width + (METRO_GRID_SIZE * 20)) * zoom}px`,
                                '--tm2-shell-height': `${(layout.height + (METRO_GRID_SIZE * 20)) * zoom}px`,
                            }}
                            onPointerDown={handleCanvasPointerDown}
                            onPointerMove={handleCanvasPointerMove}
                            onPointerUp={handleCanvasPointerEnd}
                            onPointerCancel={handleCanvasPointerEnd}
                            onDoubleClick={() => setZoom(1)}
                        >
                            <div className="tm2-canvas-shell" data-tm2-background="true">
                                <div className="tm2-canvas-plane" data-tm2-background="true">
                                    <MetroMapSvg
                                        map={activeMap}
                                        layout={layout}
                                        selectedStationId={selectedStationId}
                                        selectedLineKey={selectedLineKey}
                                        hoveredStationId={hoveredStationId}
                                        hoveredLineKey={hoveredLineKey}
                                        draggingStationId={draggingStationId}
                                        dragSnapTarget={dragPosition?.snapTarget || null}
                                        dragMagnetStrength={dragPosition?.magnetStrength || 0}
                                        onStationSelect={handleStationSelect}
                                        onStationHover={setHoveredStationId}
                                        onStationDragStart={handleStationDragStart}
                                        onStationDragMove={handleStationDragMove}
                                        onStationDragEnd={handleStationDragEnd}
                                        onStationNudge={handleStationNudge}
                                        onLineSelect={(lineKey) => setSelectedLineKey((current) => current === lineKey ? null : lineKey)}
                                        onLineHover={setHoveredLineKey}
                                        onCanvasSelect={() => {
                                            if (isPanning) return;
                                            setSelectedStationId(null);
                                            setSelectedLineKey(null);
                                        }}
                                        svgRef={svgRef}
                                    />
                                </div>
                            </div>
                        </div>

                        <header className="tm2-map-heading">
                            <span className="tm2-map-kicker">Metro Map 2</span>
                            <input
                                aria-label={copy.mapName}
                                value={activeMap.name}
                                maxLength={42}
                                onChange={(event) => updateActiveMap((map) => ({ ...map, name: event.target.value }))}
                            />
                            <p>
                                <span>● LIVE MAP</span>
                                {activeMap.mode === 'seed' ? copy.mapTypeSeed : copy.mapTypeTaste}
                                <b>{activeMap.lines.length} {copy.lines}</b>
                                <b>{stationCountForMap(activeMap)} {copy.stations}</b>
                            </p>
                        </header>

                        <div className="tm2-interaction-hint">
                            <strong>{copy.dragHint}</strong>
                            <span>{copy.mapGestureHint}</span>
                        </div>

                        <div className="tm2-map-actions">
                            <button
                                type="button"
                                onClick={() => downloadSvg(svgRef.current, `${activeMap.name.replace(/\s+/g, '-').toLowerCase() || 'metro-map'}.svg`)}
                            >
                                {copy.saveSvg}
                            </button>
                            <button type="button" className="tm2-close" onClick={onClose} aria-label={copy.close}>×</button>
                        </div>

                        <nav className="tm2-line-rail" aria-label={copy.lines}>
                            <span>{copy.lines}</span>
                            {activeMap.lines.map((line, index) => (
                                <button
                                    type="button"
                                    key={line.key}
                                    className={selectedLineKey === line.key ? 'active' : ''}
                                    onClick={() => setSelectedLineKey((current) => current === line.key ? null : line.key)}
                                >
                                    <i style={{ background: line.color }} />
                                    <b>{String(index + 1).padStart(2, '0')}</b>
                                    <strong>{line.label}</strong>
                                    <small>{line.trackIds.length}</small>
                                </button>
                            ))}
                        </nav>

                        {selectedStation && !editorOpen ? (
                            <aside className="tm2-station-popover">
                                <button type="button" className="tm2-popover-close" onClick={() => setSelectedStationId(null)} aria-label={copy.close}>×</button>
                                <div className="tm2-selected-track">
                                    {selectedStation.track.coverUrl ? (
                                        <img src={selectedStation.track.coverUrl} alt="" />
                                    ) : (
                                        <span className="tm2-selected-fallback" aria-hidden>♪</span>
                                    )}
                                    <div>
                                        <span>{selectedStation.isSeed ? copy.seed : (selectedStation.isTransfer ? copy.transfers : copy.stations)}</span>
                                        <strong>{selectedStation.track.name}</strong>
                                        <small>{selectedStation.track.artists || '-'}</small>
                                    </div>
                                    <div className="tm2-station-lines">
                                        {selectedStation.lineKeys.map((lineKey) => {
                                            const line = activeMap.lines.find((item) => item.key === lineKey);
                                            return line ? <span key={lineKey} style={{ '--tm2-station-line': line.color }}>{line.label}</span> : null;
                                        })}
                                    </div>
                                    <div className="tm2-inspector-actions">
                                        {!selectedStation.isTransfer && activeMap.mode !== 'seed' ? <button type="button" onClick={makeTransfer}>{copy.makeTransfer}</button> : null}
                                        <button type="button" onClick={() => setEditorOpen(true)}>{copy.editMap}</button>
                                    </div>
                                </div>
                            </aside>
                        ) : null}

                        <aside className={`tm2-editor${editorOpen ? ' open' : ''}`}>
                            <div className="tm2-editor-head">
                                <div>
                                    <span>{lang === 'en' ? 'Map editor' : '노선 편집'}</span>
                                    <h2>{copy.editMap}</h2>
                                </div>
                                <div className="tm2-editor-stats">
                                    <span><b>{activeMap.lines.length}</b>{copy.lines}</span>
                                    <span><b>{stationCountForMap(activeMap)}</b>{copy.stations}</span>
                                </div>
                                <button type="button" className="tm2-editor-close" onClick={() => setEditorOpen(false)} aria-label={copy.close}>×</button>
                            </div>

                            <section className="tm2-editor-section">
                                <div className="tm2-editor-title"><h3>{copy.lines}</h3></div>
                                <div className="tm2-editor-lines">
                                    {activeMap.lines.map((line, index) => (
                                        <div key={line.key} className={selectedLineKey === line.key ? 'active' : ''}>
                                            <button type="button" onClick={() => setSelectedLineKey(line.key)}>
                                                <span style={{ background: line.color }}>{String(index + 1).padStart(2, '0')}</span>
                                                <strong>{line.label}</strong>
                                                <small>{line.trackIds.length}</small>
                                            </button>
                                            <button type="button" className="tm2-line-remove" disabled={activeMap.lines.length <= 1} onClick={() => removeLine(line.key)} aria-label={copy.removeLine}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="tm2-editor-section tm2-station-inspector">
                                <div className="tm2-editor-title"><h3>{copy.stationDetail}</h3></div>
                                {selectedStation ? (
                                    <div className="tm2-selected-track">
                                        {selectedStation.track.coverUrl ? (
                                            <img src={selectedStation.track.coverUrl} alt="" />
                                        ) : (
                                            <span className="tm2-selected-fallback" aria-hidden>♪</span>
                                        )}
                                        <div>
                                            <span>{selectedStation.isSeed ? copy.seed : (selectedStation.isTransfer ? copy.transfers : copy.stations)}</span>
                                            <strong>{selectedStation.track.name}</strong>
                                            <small>{selectedStation.track.artists || '-'}</small>
                                        </div>
                                        <div className="tm2-station-lines">
                                            {selectedStation.lineKeys.map((lineKey) => {
                                                const line = activeMap.lines.find((item) => item.key === lineKey);
                                                return line ? <span key={lineKey} style={{ '--tm2-station-line': line.color }}>{line.label}</span> : null;
                                            })}
                                        </div>
                                        <div className="tm2-inspector-actions">
                                            {!selectedStation.isTransfer && activeMap.mode !== 'seed' ? <button type="button" onClick={makeTransfer}>{copy.makeTransfer}</button> : null}
                                            <button type="button" className="danger" disabled={selectedStation.isSeed} title={selectedStation.isSeed ? copy.stationRemoved : undefined} onClick={removeStation}>{copy.removeStation}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="tm2-editor-empty">{copy.selectStation}</p>
                                )}
                            </section>

                            <section className="tm2-editor-section tm2-add-section">
                                <div className="tm2-editor-tabs">
                                    <button type="button" className={editorMode === 'line' ? 'active' : ''} onClick={() => setEditorMode('line')}>＋ {copy.addLine}</button>
                                    <button type="button" className={editorMode === 'track' ? 'active' : ''} onClick={() => setEditorMode('track')}>＋ {copy.addTrack}</button>
                                </div>
                                {editorMode === 'line' ? (
                                    <div className="tm2-add-list">
                                        {addableLines.length ? addableLines.map((line) => (
                                            <button type="button" key={line.key} className="tm2-add-line" onClick={() => addLine(line)}>
                                                <span style={{ background: line.color }} />
                                                <strong>{line.label}</strong>
                                                <small>{line.count} {copy.songs}</small>
                                                <b>＋</b>
                                            </button>
                                        )) : <p className="tm2-editor-empty">{copy.lineEmpty}</p>}
                                    </div>
                                ) : (
                                    <div className="tm2-add-list">
                                        {!activeLine ? <p className="tm2-editor-empty">{copy.selectLineFirst}</p> : (
                                            <>
                                                <div className="tm2-add-target"><span style={{ background: activeLine.color }} />{activeLine.label}</div>
                                                <input type="search" value={trackSearch} onChange={(event) => setTrackSearch(event.target.value)} placeholder={copy.searchTrack} />
                                                {availableTracks.length ? availableTracks.map((track) => (
                                                    <MetroTrackRow key={track.id} track={track} selected={false} onClick={() => addTrack(track.id)} />
                                                )) : <p className="tm2-editor-empty">{copy.noTracks}</p>}
                                            </>
                                        )}
                                    </div>
                                )}
                            </section>
                            <div className="tm2-editor-map-actions">
                                <button type="button" onClick={() => updateActiveMap((map) => ({ ...map, stationPositions: {} }))}>{copy.resetLayout}</button>
                                <button type="button" onClick={handleDuplicateMap}>{copy.duplicate}</button>
                                <button type="button" className="danger" onClick={handleDeleteMap}>{copy.deleteMap}</button>
                            </div>
                        </aside>

                        <div className="tm2-bottom-dock">
                            <button type="button" className="tm2-field-return" onClick={onClose}>← {lang === 'en' ? 'Taste Field' : '취향 필드'}</button>
                            <span className="tm2-dock-divider" aria-hidden />
                            <nav className="tm2-map-tabs" aria-label="Metro maps">
                                {maps.map((map, index) => (
                                    <button
                                        key={map.id}
                                        type="button"
                                        className={activeMap.id === map.id ? 'active' : ''}
                                        onClick={() => {
                                            setActiveMapId(map.id);
                                            setSelectedStationId(null);
                                            setSelectedLineKey(null);
                                            setEditorOpen(false);
                                            setZoom(1);
                                        }}
                                    >
                                        <span>{String(index + 1).padStart(2, '0')}</span>{map.name}
                                    </button>
                                ))}
                                <button type="button" className="tm2-new-tab" onClick={() => setCreating(true)}>＋ {copy.newMetro}</button>
                            </nav>
                            <span className="tm2-dock-divider" aria-hidden />
                            <div className="tm2-map-toolbar">
                                <button type="button" onClick={() => setZoom((value) => Math.max(0.72, value - 0.12))}>−</button>
                                <button type="button" className="value" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
                                <button type="button" onClick={() => setZoom((value) => Math.min(1.6, value + 0.12))}>＋</button>
                            </div>
                            <button type="button" className={`tm2-edit-toggle${editorOpen ? ' active' : ''}`} onClick={() => setEditorOpen((current) => !current)}>＋ {copy.editMap}</button>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
