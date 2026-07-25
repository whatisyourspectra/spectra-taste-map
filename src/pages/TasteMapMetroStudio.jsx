import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './TasteMapMetroStudio.css';
import MetroYouTubePlayer from './MetroYouTubePlayer';
import {
    buildMetroMapLayout,
    buildMetroTrainRoute,
    buildMetroTasteLines,
    buildSeedGenreLines,
    createMetroMapDefinition,
    getMetroAdjacentStationIds,
    getMetroMagneticPosition,
    getMetroColor,
    getMetroTrainPosition,
    getMetroTrainRouteProjection,
    METRO_CANVAS_GROWTH,
    METRO_GRID_SIZE,
    METRO_MAP_HEIGHT,
    METRO_MAP_WIDTH,
    reorderMetroStationOnLine,
    snapMetroPoint,
    swapMetroStationsOnLine,
} from './metroMap2Engine';

const STORAGE_VERSION = 1;
const EMPTY_TRAINS = [];
const HISTORY_LIMIT = 80;
const METRO_MIN_ZOOM = 0.5;
const TRAIN_COLORS = ['#f4d35e', '#70d6ff', '#ff7c8b', '#8ee3a8', '#b79cff', '#f7a65a'];
const DEFAULT_TRAIN_SPEED = 96;
const TRAIN_DWELL_SECONDS = 1.2;
const LEGACY_TRAIN_STYLE = {
    city: { color: '#f4d35e', speed: 96 },
    express: { color: '#70d6ff', speed: 142 },
    night: { color: '#b79cff', speed: 72 },
};

function getTrainColor(train) {
    return train?.color || LEGACY_TRAIN_STYLE[train?.type]?.color || TRAIN_COLORS[0];
}

function getTrainSpeed(train) {
    const speed = Number(train?.speed) || LEGACY_TRAIN_STYLE[train?.type]?.speed || DEFAULT_TRAIN_SPEED;
    return Math.min(170, Math.max(55, speed));
}

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
        resetLayout: '배치 초기화',
        trains: '열차',
        trainControl: '열차 운행',
        trainControlDesc: '열차를 만든 뒤 지도에서 직접 끌어 원하는 노선과 위치에 놓을 수 있어요.',
        addTrain: '열차 놓기',
        newTrain: '새 열차',
        trainName: '열차 이름',
        trainNamePlaceholder: '예: 퇴근길 열차',
        trainColor: '열차 색상',
        trainSpeed: '운행 속도',
        slower: '느리게',
        faster: '빠르게',
        routeMethod: '운행 경로',
        lineRoute: '노선 선택',
        customRoute: '직접 선택',
        customRouteHint: '밝게 표시된 역만 다음 경유지로 선택할 수 있어요.',
        customRouteEmpty: '지도에서 출발역을 선택하세요.',
        customRouteInvalid: '현재 역과 바로 연결된 역을 선택해주세요.',
        routeSongs: '경유 곡 묶음',
        currentLocation: '현재 위치',
        nextStation: '다음 역',
        running: '운행 중',
        paused: '일시 정지',
        pause: '정지',
        resume: '출발',
        resetTrain: '출발역으로',
        removeTrain: '열차 삭제',
        noTrains: '아직 운행 중인 열차가 없습니다.',
        selectAtLeastTwo: '두 개 이상의 연결된 역이 필요합니다.',
        removeLastStop: '마지막 역 취소',
        playlistReady: '플레이리스트 준비됨',
        dragTrainHint: '열차를 잡아 다른 노선이나 위치로 옮겨보세요.',
        dropTrainHint: '놓으면 가장 가까운 노선에 붙습니다.',
        trainMoved: '열차가 새 노선으로 이동했습니다.',
        youtubeNoVideos: '이 노선에서 재생 가능한 YouTube 영상을 찾지 못했습니다.',
        previousTrack: '이전 곡',
        nextTrack: '다음 곡',
        seekPlayback: '곡 재생 위치 이동',
        routeProgress: '전체 노선 진행률',
        oneTrainOnly: '이 지도에는 열차 한 대만 운행할 수 있습니다.',
        myGroup: '내 그룹',
        exportPlaylist: '내보내기',
        exportSoon: '플레이리스트 내보내기는 준비 중입니다.',
        nowPassing: '지나는 곡',
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
        resetLayout: 'Reset layout',
        trains: 'Trains',
        trainControl: 'Train service',
        trainControlDesc: 'Create a train, then drag it directly onto any line and position on the map.',
        addTrain: 'Place train',
        newTrain: 'New train',
        trainName: 'Train name',
        trainNamePlaceholder: 'e.g. Evening train',
        trainColor: 'Train color',
        trainSpeed: 'Travel speed',
        slower: 'Slower',
        faster: 'Faster',
        routeMethod: 'Journey route',
        lineRoute: 'Choose a line',
        customRoute: 'Pick stations',
        customRouteHint: 'Only the brightly marked stations can be chosen as the next stop.',
        customRouteEmpty: 'Choose the first station on the map.',
        customRouteInvalid: 'Choose a station directly connected to the current stop.',
        routeSongs: 'Route song bundle',
        currentLocation: 'Current position',
        nextStation: 'Next station',
        running: 'Running',
        paused: 'Paused',
        pause: 'Pause',
        resume: 'Depart',
        resetTrain: 'Back to start',
        removeTrain: 'Remove train',
        noTrains: 'There are no trains in service yet.',
        selectAtLeastTwo: 'Choose at least two connected stations.',
        removeLastStop: 'Undo last stop',
        playlistReady: 'Playlist ready',
        dragTrainHint: 'Grab a train and move it to another line or position.',
        dropTrainHint: 'It snaps to the nearest line when dropped.',
        trainMoved: 'Train moved to a new line.',
        youtubeNoVideos: 'No playable YouTube videos were found on this route.',
        previousTrack: 'Previous track',
        nextTrack: 'Next track',
        seekPlayback: 'Seek track playback',
        routeProgress: 'Full route progress',
        oneTrainOnly: 'Only one train can run on this map.',
        myGroup: 'My group',
        exportPlaylist: 'Export',
        exportSoon: 'Playlist export is coming soon.',
        nowPassing: 'Now passing',
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
                const normalizedMap = {
                    ...map,
                    trains: Array.isArray(map.trains)
                        ? map.trains
                            .filter((train) => train?.id && Array.isArray(train.routeStationIds))
                            .map((train, index) => ({
                                ...train,
                                name: train.name || `Train ${index + 1}`,
                                color: getTrainColor(train),
                                speed: getTrainSpeed(train),
                            }))
                        : [],
                };
                if (map.canvas?.width && map.canvas?.height) return normalizedMap;
                const shiftX = (METRO_MAP_WIDTH - 1600) / 2;
                const shiftY = (METRO_MAP_HEIGHT - 960) / 2;
                const stationPositions = Object.fromEntries(
                    Object.entries(map.stationPositions || {}).map(([trackId, point]) => [trackId, {
                        x: (Number(point?.x) || 0) + shiftX,
                        y: (Number(point?.y) || 0) + shiftY,
                    }]),
                );
                return {
                    ...normalizedMap,
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

function cloneMetroHistoryValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function trimHistoryStack(stack) {
    return stack.length > HISTORY_LIMIT ? stack.slice(stack.length - HISTORY_LIMIT) : stack;
}

function sanitizeEditorState(nextMaps, nextActiveMapId, nextCreating) {
    const safeMaps = Array.isArray(nextMaps) ? nextMaps : [];
    const resolvedActiveMapId = nextActiveMapId && safeMaps.some((map) => map.id === nextActiveMapId)
        ? nextActiveMapId
        : (safeMaps[0]?.id || null);
    return {
        maps: safeMaps,
        activeMapId: resolvedActiveMapId,
        creating: typeof nextCreating === 'boolean' ? nextCreating : safeMaps.length === 0,
    };
}

function isEditableShortcutTarget(target) {
    const element = target instanceof HTMLElement ? target : null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tagName = element.tagName?.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function downloadSvg(svgNode, filename) {
    if (!svgNode) return;
    const exportNode = svgNode.cloneNode(true);
    exportNode.querySelectorAll('[data-tm2-export-ignore="true"]').forEach((node) => node.remove());
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${exportNode.outerHTML}`;
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
                                                <small>
                                                    {line.count} {copy.songs}
                                                    {' · '}
                                                    {line.source === 'custom' ? copy.myGroup : line.genres.slice(0, 2).join(' / ')}
                                                </small>
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

function MetroTrainGlyph({ trainView, selected, dragging, onSelect, onDragStart, onDragMove, onDragEnd }) {
    const { train, position } = trainView;
    const color = getTrainColor(train);
    return (
        <g
            className={`tm2-svg-train${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}`}
            transform={`translate(${position.x} ${position.y}) rotate(${position.angle})`}
            role="button"
            tabIndex="0"
            aria-label={train.name}
            onPointerDown={(event) => onDragStart(train.id, event)}
            onPointerMove={(event) => onDragMove(train.id, event)}
            onPointerUp={(event) => onDragEnd(train.id, event)}
            onPointerCancel={(event) => onDragEnd(train.id, event)}
            onClick={(event) => {
                event.stopPropagation();
                onSelect(train.id);
            }}
            onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelect(train.id);
            }}
        >
            {selected || dragging ? <rect x="-29" y="-16" width="58" height="32" rx="12" fill="#ffffff" opacity={dragging ? 0.24 : 0.16} /> : null}
            <rect x="-23" y="-11" width="46" height="22" rx="7" fill={color} stroke="#f7fbfd" strokeWidth="3" />
            <rect x="-12" y="-4" width="21" height="8" rx="2" fill="#17242b" />
            <circle cx="17" cy="0" r="2.5" fill="#f7fbfd" />
        </g>
    );
}

function CurrentTrackTrainGlyph({ trainView }) {
    if (!trainView?.position) return null;
    const color = getTrainColor(trainView.train);
    return (
        <g
            className="tm2-svg-current-train"
            transform={`translate(${trainView.position.x} ${trainView.position.y}) rotate(${trainView.position.angle || 0})`}
            aria-label={trainView.train.name}
        >
            <circle r="37" fill={color} opacity="0.12" />
            <circle r="29" fill="none" stroke={color} strokeWidth="3" opacity="0.7" />
            <rect x="-24" y="-12" width="48" height="24" rx="8" fill={color} stroke="#071015" strokeWidth="4" />
            <rect x="-14" y="-6" width="28" height="11" rx="3" fill="#13202a" />
            <circle cx="-14" cy="13" r="3.5" fill="#071015" />
            <circle cx="14" cy="13" r="3.5" fill="#071015" />
        </g>
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
    trainViews = [],
    currentTrackTrainView = null,
    selectedTrainId = null,
    routePreview = null,
    routeDraftStationIds = [],
    routeSelectableIds = [],
    routePicking = false,
    trainDragCandidateLineKey = null,
    draggingTrainId = null,
    onStationSelect,
    onStationHover,
    onStationDragStart,
    onStationDragMove,
    onStationDragEnd,
    onStationNudge,
    onLineSelect,
    onLineHover,
    onTrainSelect,
    onTrainDragStart,
    onTrainDragMove,
    onTrainDragEnd,
    onCanvasSelect,
    svgRef,
    interactive = true,
    compact = false,
    viewport = null,
}) {
    const lineByKey = new Map(layout.lines.map((line) => [line.key, line]));
    const safeMapId = String(map.id || 'preview').replace(/[^a-zA-Z0-9_-]/g, '');
    const draftStationSet = new Set(routeDraftStationIds);
    const selectableStationSet = new Set(routeSelectableIds);

    return (
        <svg
            ref={svgRef}
            className={`tm2-map-svg${compact ? ' compact' : ''}${routePicking ? ' route-picking' : ''}${draggingTrainId ? ' train-dragging' : ''}`}
            viewBox={viewport || `0 0 ${layout.width} ${layout.height}`}
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
                const dropCandidate = trainDragCandidateLineKey === line.key;
                const active = dropCandidate || (!trainDragCandidateLineKey && (!focusedLineKey || focusedLineKey === line.key));
                const highlighted = dropCandidate || selectedLineKey === line.key || (!selectedLineKey && hoveredLineKey === line.key);
                const labelOnRight = line.labelPoint.x > layout.width / 2;
                const labelWidth = Math.min(154, Math.max(82, (line.label.length * 8) + 24));
                return (
                    <g
                        key={`route-${line.key}`}
                        className={`tm2-svg-line${active ? '' : ' dimmed'}${highlighted ? ' highlighted' : ''}${dropCandidate ? ' train-drop-target' : ''}`}
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

            {routePreview?.valid ? (
                <g className="tm2-route-preview" aria-hidden="true" data-tm2-export-ignore="true">
                    <path d={routePreview.pathData} fill="none" stroke="#071015" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={routePreview.pathData} fill="none" stroke="#f3f7fb" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" opacity="0.86" />
                    <path d={routePreview.pathData} fill="none" stroke="#75d7ff" strokeWidth="4" strokeDasharray="5 12" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            ) : null}

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
                const routeSelected = draftStationSet.has(station.trackId);
                const routeSelectable = selectableStationSet.has(station.trackId);
                const routeUnavailable = routePicking && !routeSelected && !routeSelectable;
                const stationInteractive = interactive && !routeUnavailable;
                return (
                    <g
                        key={station.trackId}
                        className={`tm2-svg-station${selected ? ' selected' : ''}${hovered ? ' hovered' : ''}${dragging ? ' dragging' : ''}${dimmed ? ' dimmed' : ''}${routeSelected ? ' route-selected' : ''}${routeSelectable ? ' route-selectable' : ''}${routeUnavailable ? ' route-unavailable' : ''}`}
                        role={stationInteractive ? 'button' : undefined}
                        tabIndex={stationInteractive ? 0 : undefined}
                        aria-label={`${station.track.name} — ${station.track.artists || ''}`}
                        onClick={stationInteractive ? () => onStationSelect(station.trackId) : undefined}
                        onMouseEnter={stationInteractive ? () => onStationHover?.(station.trackId) : undefined}
                        onMouseLeave={stationInteractive ? () => onStationHover?.(null) : undefined}
                        onPointerDown={stationInteractive ? (event) => onStationDragStart?.(station.trackId, event) : undefined}
                        onPointerMove={stationInteractive ? (event) => onStationDragMove?.(station.trackId, event) : undefined}
                        onPointerUp={stationInteractive ? (event) => onStationDragEnd?.(station.trackId, event) : undefined}
                        onPointerCancel={stationInteractive ? (event) => onStationDragEnd?.(station.trackId, event) : undefined}
                        onKeyDown={stationInteractive ? (event) => {
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
                        {routeSelected ? (
                            <circle cx={station.x + halfSize - 1} cy={station.y - halfSize + 1} r="8" fill="#75d7ff" stroke="#071015" strokeWidth="3" />
                        ) : null}
                        {routeSelectable ? (
                            <rect
                                className="tm2-route-choice-ring"
                                x={station.x - halfSize - 9}
                                y={station.y - halfSize - 9}
                                width={nodeSize + 18}
                                height={nodeSize + 18}
                                rx="15"
                                fill="none"
                                stroke="#91e6ff"
                                strokeWidth="4"
                            />
                        ) : null}
                    </g>
                );
            })}

            {trainViews.map((trainView) => (
                <MetroTrainGlyph
                    key={trainView.train.id}
                    trainView={trainView}
                    selected={selectedTrainId === trainView.train.id}
                    dragging={trainView.train.id === draggingTrainId}
                    onSelect={onTrainSelect}
                    onDragStart={onTrainDragStart}
                    onDragMove={onTrainDragMove}
                    onDragEnd={onTrainDragEnd}
                />
            ))}
            {currentTrackTrainView ? <CurrentTrackTrainGlyph trainView={currentTrackTrainView} /> : null}
        </svg>
    );
}

function MiniMetroMap({
    map,
    layout,
    selectedTrack,
    trackContext,
    currentTrackTrainView,
    onTrackSelect,
    onExploreTrack,
    onAddTrack,
    onOpenTrack,
    onExpand,
    onDismiss,
    lang,
}) {
    const baseViewportWidth = 720;
    const baseViewportHeight = 400;
    const currentStation = layout?.stations.find((station) => station.trackId === selectedTrack?.id) || null;
    const currentLine = map?.lines.find((line) => currentStation?.lineKeys.includes(line.key)) || null;
    const initialCenter = currentStation || {
        x: (layout?.width || METRO_MAP_WIDTH) / 2,
        y: (layout?.height || METRO_MAP_HEIGHT) / 2,
    };
    const [view, setView] = useState(() => ({ x: initialCenter.x, y: initialCenter.y, zoom: 1 }));
    const [detailsOpen, setDetailsOpen] = useState(false);
    const viewRef = useRef(view);
    const dragRef = useRef(null);
    const cameraAnimationRef = useRef(null);
    const previousTrackIdRef = useRef(selectedTrack?.id || null);
    const viewportWidth = baseViewportWidth / view.zoom;
    const viewportHeight = baseViewportHeight / view.zoom;
    const viewport = `${view.x - (viewportWidth / 2)} ${view.y - (viewportHeight / 2)} ${viewportWidth} ${viewportHeight}`;

    useEffect(() => {
        viewRef.current = view;
    }, [view]);

    useEffect(() => {
        const nextTrackId = selectedTrack?.id || null;
        if (!currentStation || previousTrackIdRef.current === nextTrackId) return undefined;
        previousTrackIdRef.current = nextTrackId;
        if (cameraAnimationRef.current) window.cancelAnimationFrame(cameraAnimationRef.current);

        const start = { ...viewRef.current };
        const target = { x: currentStation.x, y: currentStation.y, zoom: start.zoom };
        const startedAt = performance.now();
        const duration = 560;
        const animateCamera = (now) => {
            const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
            const eased = 1 - ((1 - progress) ** 3);
            const next = {
                x: start.x + ((target.x - start.x) * eased),
                y: start.y + ((target.y - start.y) * eased),
                zoom: start.zoom,
            };
            viewRef.current = next;
            setView(next);
            if (progress < 1) {
                cameraAnimationRef.current = window.requestAnimationFrame(animateCamera);
            } else {
                cameraAnimationRef.current = null;
            }
        };
        cameraAnimationRef.current = window.requestAnimationFrame(animateCamera);
        return () => {
            if (cameraAnimationRef.current) {
                window.cancelAnimationFrame(cameraAnimationRef.current);
                cameraAnimationRef.current = null;
            }
        };
    }, [currentStation, selectedTrack?.id]);

    const handlePointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (event.target?.closest?.('.tm2-svg-station')) return;
        if (cameraAnimationRef.current) {
            window.cancelAnimationFrame(cameraAnimationRef.current);
            cameraAnimationRef.current = null;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        dragRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            centerX: view.x,
            centerY: view.y,
            viewportWidth,
            viewportHeight,
            clientWidth: Math.max(1, bounds.width),
            clientHeight: Math.max(1, bounds.height),
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = ((event.clientX - drag.x) / drag.clientWidth) * drag.viewportWidth;
        const dy = ((event.clientY - drag.y) / drag.clientHeight) * drag.viewportHeight;
        setView((current) => ({
            ...current,
            x: drag.centerX - dx,
            y: drag.centerY - dy,
        }));
    };

    const handlePointerEnd = (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        dragRef.current = null;
    };

    const updateZoom = (nextZoom) => {
        setView((current) => ({
            ...current,
            zoom: Math.min(2.5, Math.max(0.72, Number(nextZoom.toFixed(2)))),
        }));
    };

    const resetView = () => {
        const center = currentStation || initialCenter;
        setView({ x: center.x, y: center.y, zoom: 1 });
    };

    return (
        <aside className="tm2-mini" aria-label={lang === 'en' ? 'Now playing metro map' : '현재 곡 미니 메트로 맵'}>
            <header className="tm2-mini-head">
                <div>
                    <span><i /> LIVE METRO</span>
                    <strong>{map?.name || (lang === 'en' ? 'Taste Metro' : '취향 메트로')}</strong>
                </div>
                <div className="tm2-mini-head-actions">
                    <button type="button" onClick={onExpand} aria-label={lang === 'en' ? 'Open full metro map' : '메트로 맵 전체 화면'}>
                        <span aria-hidden>↗</span>
                    </button>
                    <button type="button" onClick={onDismiss} aria-label={lang === 'en' ? 'Close mini metro map' : '미니 메트로 맵 닫기'}>×</button>
                </div>
            </header>

            <div
                className="tm2-mini-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onDoubleClick={resetView}
                onWheel={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    updateZoom(view.zoom * Math.exp(-event.deltaY * 0.0015));
                }}
            >
                {map && layout?.lines.length ? (
                    <div className="tm2-mini-map-plane">
                        <MetroMapSvg
                            map={map}
                            layout={layout}
                            selectedStationId={selectedTrack?.id || null}
                            selectedLineKey={map.mode === 'seed' ? null : (currentLine?.key || null)}
                            currentTrackTrainView={currentTrackTrainView}
                            onStationSelect={(trackId) => {
                                const station = layout.stations.find((item) => item.trackId === trackId);
                                if (!station?.track) return;
                                const focusedView = {
                                    ...viewRef.current,
                                    x: station.x,
                                    y: station.y,
                                };
                                viewRef.current = focusedView;
                                setView(focusedView);
                                onTrackSelect?.(station.track);
                            }}
                            onLineSelect={() => {}}
                            interactive
                            compact
                            viewport={viewport}
                        />
                    </div>
                ) : (
                    <div className="tm2-mini-empty">
                        <span>⌁</span>
                        <strong>{lang === 'en' ? 'Build your first metro map' : '첫 노선도를 만들어 보세요'}</strong>
                    </div>
                )}
                <div className="tm2-mini-zoom" onPointerDown={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => updateZoom(view.zoom - 0.16)} aria-label="zoom out">−</button>
                    <button type="button" className="value" onClick={resetView}>{Math.round(view.zoom * 100)}%</button>
                    <button type="button" onClick={() => updateZoom(view.zoom + 0.16)} aria-label="zoom in">＋</button>
                </div>
                {detailsOpen && trackContext ? (
                    <section className="tm2-mini-details" onPointerDown={(event) => event.stopPropagation()}>
                        <div className="tm2-mini-details-head">
                            <div>
                                <span>{trackContext.source === 'recommendation'
                                    ? (lang === 'en' ? 'RECOMMENDATION' : '추천 곡')
                                    : (lang === 'en' ? 'MY TASTE FIELD' : '내 취향 필드')}</span>
                                <strong>{trackContext.cluster?.label?.name || (lang === 'en' ? 'New territory' : '새로운 영역')}</strong>
                            </div>
                            <button type="button" onClick={() => setDetailsOpen(false)} aria-label={lang === 'en' ? 'Close track info' : '곡 정보 닫기'}>×</button>
                        </div>
                        <div className="tm2-mini-detail-values">
                            <b>{trackContext.xLabel} {trackContext.xValue}</b>
                            <b>{trackContext.yLabel} {trackContext.yValue}</b>
                        </div>
                        {trackContext.genres?.length ? (
                            <div className="tm2-mini-detail-tags">
                                {trackContext.genres.map((genre) => <span key={`${selectedTrack?.id}-${genre}`}>{genre}</span>)}
                            </div>
                        ) : null}
                    </section>
                ) : null}
            </div>

            <footer className="tm2-mini-footer">
                <div className="tm2-mini-now">
                    {selectedTrack?.coverUrl ? <img src={selectedTrack.coverUrl} alt="" /> : <span className="tm2-mini-cover-fallback">♪</span>}
                    <div>
                        <span>{lang === 'en' ? 'TRAIN AT CURRENT TRACK' : '현재 곡 위치의 열차'}</span>
                        <strong>{selectedTrack?.name || (lang === 'en' ? 'Select a track' : '곡을 선택하세요')}</strong>
                        <small>{selectedTrack?.artists || currentLine?.label || '-'}</small>
                    </div>
                    <b style={{ '--tm2-current-line': currentLine?.color || '#78a8ff' }}>{currentLine?.label || (lang === 'en' ? 'Metro' : '메트로')}</b>
                </div>
                <nav className="tm2-mini-actions" aria-label={lang === 'en' ? 'Track actions' : '곡 기능'}>
                    <button type="button" disabled={!trackContext?.cluster} onClick={onExploreTrack}>
                        <span aria-hidden>◎</span>{lang === 'en' ? 'Explore' : '탐색'}
                    </button>
                    <button type="button" disabled={!trackContext?.track || trackContext.alreadyInField} onClick={onAddTrack}>
                        <span aria-hidden>{trackContext?.alreadyInField ? '✓' : '+'}</span>
                        {trackContext?.alreadyInField ? (lang === 'en' ? 'Added' : '추가됨') : (lang === 'en' ? 'Add' : '추가')}
                    </button>
                    <button type="button" disabled={!selectedTrack} onClick={() => onOpenTrack?.('spotify')}>
                        <span aria-hidden>S</span>Spotify
                    </button>
                    <button type="button" disabled={!selectedTrack} onClick={() => onOpenTrack?.('youtube')}>
                        <span aria-hidden>▶</span>YouTube
                    </button>
                    <button type="button" className={detailsOpen ? 'active' : ''} disabled={!trackContext} onClick={() => setDetailsOpen((current) => !current)}>
                        <span aria-hidden>i</span>{lang === 'en' ? 'Info' : '정보'}
                    </button>
                </nav>
            </footer>
        </aside>
    );
}

function getTrainJourneyState(route, runtime) {
    if (!route?.valid || !route.stationIds.length) return null;
    const direction = runtime?.direction === -1 ? -1 : 1;
    const distance = Math.min(route.totalLength, Math.max(0, (runtime?.progress || 0) * route.totalLength));
    let currentIndex;
    let nextIndex;
    if (direction > 0) {
        currentIndex = 0;
        for (let index = 0; index < route.stationOffsets.length; index += 1) {
            if (route.stationOffsets[index] <= distance + 0.5) currentIndex = index;
        }
        nextIndex = Math.min(route.stationIds.length - 1, currentIndex + 1);
    } else {
        currentIndex = route.stationIds.length - 1;
        for (let index = route.stationOffsets.length - 1; index >= 0; index -= 1) {
            if (route.stationOffsets[index] >= distance - 0.5) currentIndex = index;
        }
        nextIndex = Math.max(0, currentIndex - 1);
    }
    return {
        currentStationId: route.stationIds[currentIndex],
        nextStationId: route.stationIds[nextIndex],
        currentIndex,
        nextIndex,
        direction,
        progress: route.totalLength ? distance / route.totalLength : 0,
    };
}

function buildTrainPlaybackStops(stationIds) {
    const forward = Array.isArray(stationIds) ? stationIds.filter(Boolean) : [];
    if (forward.length < 2) return forward;
    return [...forward, ...forward.slice(1, -1).reverse()];
}

function getNearestTrainStop(route, rawProgress) {
    if (!route?.valid || !route.stationIds?.length || !route.totalLength) return null;
    const targetDistance = Math.min(1, Math.max(0, Number(rawProgress) || 0)) * route.totalLength;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    route.stationOffsets.forEach((offset, index) => {
        const distance = Math.abs(offset - targetDistance);
        if (distance >= nearestDistance) return;
        nearestDistance = distance;
        nearestIndex = index;
    });
    return {
        stationId: route.stationIds[nearestIndex],
        stationIndex: nearestIndex,
        progress: route.stationOffsets[nearestIndex] / route.totalLength,
    };
}

export default function TasteMapMetroStudio({
    open,
    expanded = false,
    onClose,
    onExpand,
    onDismiss,
    onTrackSelect,
    trackContext = null,
    onExploreTrack,
    onAddTrack,
    onOpenTrack,
    selectedTrack = null,
    tracks,
    activeTrackIds,
    assignmentByTrackId,
    clusterById,
    customGroups = [],
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
    const [trainPanelOpen, setTrainPanelOpen] = useState(false);
    const [trainComposerOpen, setTrainComposerOpen] = useState(false);
    const [selectedTrainId, setSelectedTrainId] = useState(null);
    const [trainDraftName, setTrainDraftName] = useState('');
    const [trainDraftColor, setTrainDraftColor] = useState(TRAIN_COLORS[0]);
    const [trainDraftSpeed, setTrainDraftSpeed] = useState(DEFAULT_TRAIN_SPEED);
    const [trainDraftMode, setTrainDraftMode] = useState('line');
    const [trainDraftLineKey, setTrainDraftLineKey] = useState(null);
    const [trainDraftStationIds, setTrainDraftStationIds] = useState([]);
    const [trainRouteError, setTrainRouteError] = useState('');
    const [youtubeSession, setYoutubeSession] = useState(null);
    const [youtubePlaybackError, setYoutubePlaybackError] = useState('');
    const [youtubeProgress, setYoutubeProgress] = useState({ positionMs: 0, durationMs: 0 });
    const [trainRuntimeById, setTrainRuntimeById] = useState({});
    const [trainDrag, setTrainDrag] = useState(null);
    const [trackSearch, setTrackSearch] = useState('');
    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);
    const wheelAnchorRef = useRef(null);
    const svgRef = useRef(null);
    const canvasStageRef = useRef(null);
    const stationDragRef = useRef(null);
    const trainDragRef = useRef(null);
    const trainTrashRef = useRef(null);
    const panDragRef = useRef(null);
    const suppressStationClickRef = useRef(null);
    const suppressTrainClickRef = useRef(null);
    const youtubePlayerRef = useRef(null);
    const youtubeSessionCounterRef = useRef(0);
    const historyRef = useRef({ past: [], future: [] });

    const closeStudio = useCallback(() => {
        const trainId = youtubeSession?.trainId;
        if (trainId) {
            setMaps((current) => {
                const next = current.map((map) => ({
                    ...map,
                    trains: (map.trains || []).map((train) => (
                        train.id === trainId ? { ...train, running: false } : train
                    )),
                }));
                persistMaps(storageKey, next);
                return next;
            });
        }
        setYoutubeSession(null);
        setYoutubePlaybackError('');
        setYoutubeProgress({ positionMs: 0, durationMs: 0 });
        onClose();
    }, [onClose, storageKey, youtubeSession?.trainId]);

    const buildEditorSnapshot = useCallback((state = { maps, activeMapId, creating }) => {
        const source = state || { maps: [], activeMapId: null, creating: true };
        return {
            maps: cloneMetroHistoryValue(source.maps || []),
            activeMapId: source.activeMapId || null,
            creating: Boolean(source.creating),
        };
    }, [activeMapId, creating, maps]);

    const applyEditorState = useCallback((nextState) => {
        const resolved = sanitizeEditorState(nextState.maps, nextState.activeMapId, nextState.creating);
        setMaps(resolved.maps);
        persistMaps(storageKey, resolved.maps);
        setActiveMapId(resolved.activeMapId);
        setCreating(resolved.creating);
    }, [storageKey]);

    const commitMaps = useCallback((nextMaps, options = {}) => {
        const currentState = { maps, activeMapId, creating };
        if (options.trackHistory !== false && currentState) {
            historyRef.current = {
                past: trimHistoryStack([...historyRef.current.past, buildEditorSnapshot(currentState)]),
                future: [],
            };
        }
        const resolved = sanitizeEditorState(
            nextMaps,
            Object.prototype.hasOwnProperty.call(options, 'activeMapId') ? options.activeMapId : currentState?.activeMapId,
            Object.prototype.hasOwnProperty.call(options, 'creating') ? options.creating : currentState?.creating,
        );
        applyEditorState(resolved);
    }, [activeMapId, applyEditorState, buildEditorSnapshot, creating, maps]);

    const undoMapChange = useCallback(() => {
        if (!historyRef.current.past.length) return;
        const currentState = { maps, activeMapId, creating };
        const previous = historyRef.current.past[historyRef.current.past.length - 1];
        historyRef.current = {
            past: historyRef.current.past.slice(0, -1),
            future: trimHistoryStack([...historyRef.current.future, buildEditorSnapshot(currentState)]),
        };
        applyEditorState(previous);
    }, [activeMapId, applyEditorState, buildEditorSnapshot, creating, maps]);

    const redoMapChange = useCallback(() => {
        if (!historyRef.current.future.length) return;
        const currentState = { maps, activeMapId, creating };
        const next = historyRef.current.future[historyRef.current.future.length - 1];
        historyRef.current = {
            past: trimHistoryStack([...historyRef.current.past, buildEditorSnapshot(currentState)]),
            future: historyRef.current.future.slice(0, -1),
        };
        applyEditorState(next);
    }, [activeMapId, applyEditorState, buildEditorSnapshot, creating, maps]);

    useEffect(() => {
        if (!open || !expanded) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && !event.altKey && !isEditableShortcutTarget(event.target)) {
                const key = event.key.toLowerCase();
                const redo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.metaKey);
                const undo = key === 'z' && !event.shiftKey;
                if (redo) {
                    event.preventDefault();
                    redoMapChange();
                    return;
                }
                if (undo) {
                    event.preventDefault();
                    undoMapChange();
                    return;
                }
            }
            if (event.key === 'Escape') {
                closeStudio();
                return;
            }
            if (event.code !== 'Space' || event.repeat || !youtubeSession?.trainId) return;
            const target = event.target;
            if (
                target instanceof Element
                && target.closest('input, textarea, select, button, [contenteditable="true"], [role="slider"]')
            ) return;
            event.preventDefault();
            setYoutubeSession((current) => current ? { ...current, playRequested: true } : current);
            youtubePlayerRef.current?.toggle();
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeStudio, expanded, open, redoMapChange, undoMapChange, youtubeSession?.trainId]);

    const libraryTracks = useMemo(
        () => (Array.isArray(tracks) ? tracks : []).filter((track) => track?.id && track?.name),
        [tracks],
    );
    const customGroupTrackIds = useMemo(
        () => new Set((Array.isArray(customGroups) ? customGroups : []).flatMap((group) => group.trackIds || [])),
        [customGroups],
    );
    const tasteLineTracks = useMemo(
        () => libraryTracks.filter((track) => !activeTrackIds || activeTrackIds.has(track.id)),
        [libraryTracks, activeTrackIds],
    );
    const sourceTracks = useMemo(
        () => libraryTracks.filter((track) => (
            !activeTrackIds || activeTrackIds.has(track.id) || customGroupTrackIds.has(track.id)
        )),
        [libraryTracks, activeTrackIds, customGroupTrackIds],
    );
    const displayTracks = useMemo(() => (
        selectedTrack?.id && !sourceTracks.some((track) => track.id === selectedTrack.id)
            ? [...sourceTracks, selectedTrack]
            : sourceTracks
    ), [selectedTrack, sourceTracks]);
    const trackById = useMemo(() => new Map(displayTracks.map((track) => [track.id, track])), [displayTracks]);
    const lineOptions = useMemo(() => {
        const sourceTrackIds = new Set(sourceTracks.map((track) => track.id));
        const customLines = (Array.isArray(customGroups) ? customGroups : [])
            .map((group, index) => {
                const trackIds = [...new Set((group.trackIds || []).filter((trackId) => sourceTrackIds.has(trackId)))];
                return {
                    key: `custom-${group.id}`,
                    label: group.name,
                    color: group.color || getMetroColor(index),
                    trackIds,
                    count: trackIds.length,
                    genres: [],
                    source: 'custom',
                };
            })
            .filter((line) => line.count >= 2);
        const tasteLines = buildMetroTasteLines({
            tracks: tasteLineTracks,
            assignmentByTrackId,
            clusterById,
        });
        return [...customLines, ...tasteLines];
    }, [sourceTracks, tasteLineTracks, assignmentByTrackId, clusterById, customGroups]);
    const activeMap = maps.find((map) => map.id === activeMapId) || maps[0] || null;
    const miniMap = useMemo(() => {
        if (!selectedTrack?.id || !displayTracks.length) return null;
        const existingSeedMap = maps.find((map) => (
            map.selectionDriven && map.mode === 'seed' && map.seedTrackId === selectedTrack.id
        ));
        if (existingSeedMap) return existingSeedMap;
        const seedLines = buildSeedGenreLines(selectedTrack, displayTracks, 4);
        const selectedLines = seedLines.length ? seedLines : lineOptions.slice(0, 4);
        if (!selectedLines.length) return null;
        const definition = createMetroMapDefinition({
            name: `${selectedTrack.name} · Metro`,
            mode: 'seed',
            selectedLines,
            tracks: displayTracks,
            maxPerLine: 8,
            maxTotal: 32,
            transferMode: 'none',
            transferCount: 0,
            seedTrackId: selectedTrack.id,
        });
        return { ...definition, selectionDriven: true };
    }, [displayTracks, lineOptions, maps, selectedTrack]);
    const miniLayout = useMemo(
        () => buildMetroMapLayout(miniMap, displayTracks),
        [displayTracks, miniMap],
    );
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
        () => buildMetroMapLayout(mapForLayout, displayTracks, { transientStationId: draggingStationId }),
        [mapForLayout, displayTracks, draggingStationId],
    );
    const activeTrains = Array.isArray(activeMap?.trains) ? activeMap.trains : EMPTY_TRAINS;
    const trainRoutes = useMemo(() => new Map(
        activeTrains.map((train) => [train.id, buildMetroTrainRoute(layout, train.routeStationIds)]),
    ), [activeTrains, layout]);
    const layoutStationById = useMemo(
        () => new Map(layout.stations.map((station) => [station.trackId, station])),
        [layout.stations],
    );
    const lineTrainRoutes = useMemo(() => new Map(
        layout.lines.map((line) => [line.key, buildMetroTrainRoute(layout, line.stationIds)]),
    ), [layout]);
    const resolvedTrainDraftLineKey = activeMap?.lines.some((line) => line.key === trainDraftLineKey)
        ? trainDraftLineKey
        : (activeMap?.lines[0]?.key || null);
    const lineDraftStationIds = layout.lines.find((line) => line.key === resolvedTrainDraftLineKey)?.stationIds || [];
    const activeDraftStationIds = trainDraftMode === 'line' ? lineDraftStationIds : trainDraftStationIds;
    const trainDraftRoute = buildMetroTrainRoute(layout, activeDraftStationIds);
    const routeSelectableIds = useMemo(() => {
        if (!trainPanelOpen || !trainComposerOpen || trainDraftMode !== 'custom') return [];
        const lastStationId = trainDraftStationIds[trainDraftStationIds.length - 1];
        if (!lastStationId) return layout.stations.map((station) => station.trackId);
        const usedIds = new Set(trainDraftStationIds);
        return getMetroAdjacentStationIds(layout, lastStationId).filter((trackId) => !usedIds.has(trackId));
    }, [layout, trainComposerOpen, trainDraftMode, trainDraftStationIds, trainPanelOpen]);

    useEffect(() => {
        if (!open || creating || !activeTrains.some((train) => train.running !== false)) return undefined;
        let animationFrame = null;
        let lastUpdateTime = performance.now();
        const animate = (now) => {
            if (now - lastUpdateTime >= 30) {
                const elapsed = Math.min(0.06, Math.max(0, (now - lastUpdateTime) / 1000));
                lastUpdateTime = now;
                setTrainRuntimeById((current) => {
                    let changed = false;
                    const next = { ...current };
                    activeTrains.forEach((train) => {
                        if (
                            train.running === false
                            || trainDrag?.trainId === train.id
                            || youtubeSession?.trainId === train.id
                        ) return;
                        const route = trainRoutes.get(train.id);
                        if (!route?.valid || !route.totalLength) return;
                        const previous = current[train.id] || { progress: 0, direction: 1, dwellRemaining: TRAIN_DWELL_SECONDS };
                        const runtime = { ...previous };
                        if ((runtime.dwellRemaining || 0) > 0) {
                            runtime.dwellRemaining = Math.max(0, runtime.dwellRemaining - elapsed);
                            next[train.id] = runtime;
                            changed = true;
                            return;
                        }
                        const speed = getTrainSpeed(train);
                        const previousDistance = runtime.progress * route.totalLength;
                        const travelDistance = speed * elapsed;
                        if (runtime.direction > 0) {
                            const targetDistance = Math.min(route.totalLength, previousDistance + travelDistance);
                            const nextStop = route.stationOffsets.find((offset) => (
                                offset > previousDistance + 0.5 && offset <= targetDistance + 0.5
                            ));
                            if (nextStop !== undefined) {
                                runtime.progress = nextStop / route.totalLength;
                                runtime.dwellRemaining = TRAIN_DWELL_SECONDS;
                                if (nextStop >= route.totalLength - 0.5) runtime.direction = -1;
                            } else {
                                runtime.progress = targetDistance / route.totalLength;
                            }
                        } else {
                            const targetDistance = Math.max(0, previousDistance - travelDistance);
                            const nextStop = [...route.stationOffsets].reverse().find((offset) => (
                                offset < previousDistance - 0.5 && offset >= targetDistance - 0.5
                            ));
                            if (nextStop !== undefined) {
                                runtime.progress = nextStop / route.totalLength;
                                runtime.dwellRemaining = TRAIN_DWELL_SECONDS;
                                if (nextStop <= 0.5) runtime.direction = 1;
                            } else {
                                runtime.progress = targetDistance / route.totalLength;
                            }
                        }
                        next[train.id] = runtime;
                        changed = true;
                    });
                    return changed ? next : current;
                });
            }
            animationFrame = window.requestAnimationFrame(animate);
        };
        animationFrame = window.requestAnimationFrame(animate);
        return () => {
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
        };
    }, [activeTrains, creating, open, trainDrag?.trainId, trainRoutes, youtubeSession?.trainId]);

    const trainViews = activeTrains.map((train) => {
        const route = trainRoutes.get(train.id);
        const runtime = trainRuntimeById[train.id] || { progress: 0, direction: 1 };
        const fallbackStation = (train.routeStationIds || [])
            .map((stationId) => layoutStationById.get(stationId))
            .find(Boolean);
        const routePosition = getMetroTrainPosition(route, runtime.progress)
            || (fallbackStation ? { x: fallbackStation.x, y: fallbackStation.y, angle: 0 } : null);
        const position = trainDrag?.trainId === train.id && trainDrag.position
            ? trainDrag.position
            : routePosition;
        if (!position) return null;
        return {
            train,
            route,
            runtime,
            position: trainDrag?.trainId === train.id
                ? position
                : (runtime.direction < 0 ? { ...position, angle: position.angle + 180 } : position),
            journey: getTrainJourneyState(route, runtime),
        };
    }).filter(Boolean);
    const miniCurrentStation = miniLayout.stations.find((station) => station.trackId === selectedTrack?.id)
        || miniLayout.stations[0]
        || null;
    const fullCurrentStation = layout.stations.find((station) => station.trackId === selectedTrack?.id)
        || layout.stations[0]
        || null;
    const makeCurrentTrackTrainView = (station) => station && selectedTrack ? {
        train: {
            id: `current-track-${selectedTrack.id}`,
            name: `${selectedTrack.name} · ${lang === 'en' ? 'current track' : '현재 곡'}`,
            color: station.lineKeys
                .map((lineKey) => miniMap?.lines.find((line) => line.key === lineKey)?.color)
                .find(Boolean) || TRAIN_COLORS[0],
        },
        position: { x: station.x, y: station.y, angle: 0 },
    } : null;
    const miniCurrentTrackTrainView = makeCurrentTrackTrainView(miniCurrentStation);
    const fullCurrentTrackTrainView = makeCurrentTrackTrainView(fullCurrentStation);
    const resolvedSelectedTrainId = activeTrains.some((train) => train.id === selectedTrainId)
        ? selectedTrainId
        : (activeTrains[0]?.id || null);
    const selectedTrainDefinition = activeTrains.find((train) => train.id === resolvedSelectedTrainId) || null;
    const activeTrainView = trainViews.find((view) => view.train.id === resolvedSelectedTrainId) || trainViews[0] || null;
    const activeTrainCurrentTrack = activeTrainView?.journey
        ? trackById.get(activeTrainView.journey.currentStationId)
        : null;
    const activeTrainNextTrack = activeTrainView?.journey
        ? trackById.get(activeTrainView.journey.nextStationId)
        : null;
    const activeTrainSongCount = activeTrainView
        ? (activeTrainView.train.playlist?.trackIds?.length || activeTrainView.train.routeStationIds.length)
        : 0;
    const activeTrainProgressPercent = activeTrainView?.journey
        ? Math.round((activeTrainView.journey.progress || 0) * 100)
        : 0;
    const youtubeTrainView = youtubeSession
        ? trainViews.find((view) => view.train.id === youtubeSession.trainId) || null
        : null;
    const youtubeStopIds = youtubeSession?.stopIds || [];
    const youtubeStep = youtubeStopIds.length ? youtubeSession.step % youtubeStopIds.length : 0;
    const youtubeCurrentStationId = youtubeStopIds[youtubeStep] || null;
    const youtubeNextStationId = youtubeStopIds.length
        ? youtubeStopIds[(youtubeStep + 1) % youtubeStopIds.length]
        : null;
    const youtubeCurrentTrack = youtubeCurrentStationId ? trackById.get(youtubeCurrentStationId) : null;
    const youtubeNextTrack = youtubeNextStationId ? trackById.get(youtubeNextStationId) : null;
    const activeTrainHasYoutube = Boolean(
        youtubeSession && activeTrainView && youtubeSession.trainId === activeTrainView.train.id,
    );
    const youtubeProgressPercent = youtubeProgress.durationMs > 0
        ? Math.min(100, Math.max(0, (youtubeProgress.positionMs / youtubeProgress.durationMs) * 100))
        : 0;
    useEffect(() => {
        if (!open || creating || !activeMapId) return undefined;
        let measureFrame = null;
        const frame = window.requestAnimationFrame(() => {
            measureFrame = window.requestAnimationFrame(() => {
                const stage = canvasStageRef.current;
                const svg = svgRef.current;
                if (!stage || !svg) return;
                const focusStation = layout.stations.find((station) => station.trackId === selectedTrack?.id);
                if (focusStation) {
                    const currentZoom = zoomRef.current || 1;
                    const gutter = METRO_GRID_SIZE * 10;
                    stage.scrollTo({
                        left: Math.max(0, ((gutter + focusStation.x) * currentZoom) - (stage.clientWidth / 2)),
                        top: Math.max(0, ((gutter + focusStation.y) * currentZoom) - (stage.clientHeight / 2)),
                        behavior: 'smooth',
                    });
                    return;
                }
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
    }, [open, creating, activeMapId, layout.stations, selectedTrack?.id]);
    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);
    useEffect(() => {
        if (!open || creating || !activeMapId) return undefined;
        const stage = canvasStageRef.current;
        if (!stage) return undefined;
        let zoomFrame = null;
        let zoomAnchorResetTimer = null;
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
                const nextZoom = Math.min(1.9, Math.max(METRO_MIN_ZOOM, Number((currentZoom * zoomFactor).toFixed(3))));
                const anchor = wheelAnchorRef.current;
                if (!anchor) return;
                if (nextZoom === currentZoom) {
                    if (zoomAnchorResetTimer) window.clearTimeout(zoomAnchorResetTimer);
                    zoomAnchorResetTimer = window.setTimeout(() => {
                        wheelAnchorRef.current = null;
                        zoomAnchorResetTimer = null;
                    }, 90);
                    return;
                }
                const canvasWidth = Number(stage.dataset.canvasWidth) || METRO_MAP_WIDTH;
                const canvasHeight = Number(stage.dataset.canvasHeight) || METRO_MAP_HEIGHT;
                const gutter = METRO_GRID_SIZE * 10;
                zoomRef.current = nextZoom;
                setZoom(nextZoom);
                stage.style.setProperty('--tm2-canvas-zoom', String(nextZoom));
                stage.style.setProperty('--tm2-shell-width', `${(canvasWidth + (gutter * 2)) * nextZoom}px`);
                stage.style.setProperty('--tm2-shell-height', `${(canvasHeight + (gutter * 2)) * nextZoom}px`);
                stage.scrollLeft = (anchor.x * nextZoom) - (stage.clientWidth / 2);
                stage.scrollTop = (anchor.y * nextZoom) - (stage.clientHeight / 2);
                if (zoomAnchorResetTimer) window.clearTimeout(zoomAnchorResetTimer);
                zoomAnchorResetTimer = window.setTimeout(() => {
                    wheelAnchorRef.current = null;
                    zoomAnchorResetTimer = null;
                }, 90);
            });
        };
        stage.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => {
            stage.removeEventListener('wheel', handleNativeWheel);
            if (zoomFrame) window.cancelAnimationFrame(zoomFrame);
            if (zoomAnchorResetTimer) window.clearTimeout(zoomAnchorResetTimer);
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

    const updateActiveMap = (updater) => {
        if (!activeMap) return;
        const nextMaps = maps.map((map) => {
            if (map.id !== activeMap.id) return map;
            const updated = typeof updater === 'function' ? updater(map) : updater;
            return { ...updated, updatedAt: new Date().toISOString() };
        });
        commitMaps(nextMaps);
    };

    const openTrainControl = () => {
        setTrainPanelOpen(true);
        setEditorOpen(false);
        setSelectedStationId(null);
        setTrainRouteError('');
        if (!activeTrains.length) {
            setTrainComposerOpen(true);
            setSelectedLineKey(trainDraftMode === 'line' ? resolvedTrainDraftLineKey : null);
        } else {
            setTrainComposerOpen(false);
            setSelectedLineKey(null);
        }
        if (!trainDraftLineKey) setTrainDraftLineKey(activeMap?.lines[0]?.key || null);
    };

    const closeTrainControl = () => {
        setTrainPanelOpen(false);
        setTrainComposerOpen(false);
        setSelectedLineKey(null);
        setTrainRouteError('');
    };

    const startTrainComposer = () => {
        if (activeTrains.length) return;
        setTrainComposerOpen(true);
        setTrainRouteError('');
        setSelectedLineKey(trainDraftMode === 'line' ? resolvedTrainDraftLineKey : null);
    };

    const stopTrainComposer = () => {
        setTrainComposerOpen(false);
        setSelectedLineKey(null);
        setTrainRouteError('');
    };

    const updateTrain = (trainId, patch) => {
        updateActiveMap((map) => ({
            ...map,
            trains: (map.trains || []).map((train) => train.id === trainId ? { ...train, ...patch } : train),
        }));
    };

    const setTrainRunning = (trainId, running) => {
        const train = activeTrains.find((item) => item.id === trainId);
        if (!train || (train.running !== false) === running) return;
        updateTrain(trainId, { running });
    };

    const toggleTrain = (trainId) => {
        if (youtubeSession?.trainId === trainId) {
            setYoutubeSession((current) => current ? { ...current, playRequested: true } : current);
            youtubePlayerRef.current?.toggle();
            return;
        }
        const train = activeTrains.find((item) => item.id === trainId);
        if (train?.running === false) {
            startYoutubeJourney(trainId);
            return;
        }
        updateActiveMap((map) => ({
            ...map,
            trains: (map.trains || []).map((train) => train.id === trainId
                ? { ...train, running: train.running === false }
                : train),
        }));
    };

    const syncYoutubeLegProgress = (session, rawRatio) => {
        if (!session?.trainId || !session.stopIds?.length) return;
        const route = trainRoutes.get(session.trainId);
        if (!route?.valid || !route.totalLength) return;
        const step = session.step % session.stopIds.length;
        const fromStationId = session.stopIds[step];
        const toStationId = session.stopIds[(step + 1) % session.stopIds.length];
        const fromIndex = route.stationIds.indexOf(fromStationId);
        const toIndex = route.stationIds.indexOf(toStationId);
        if (fromIndex < 0 || toIndex < 0) return;
        const fromOffset = route.stationOffsets[fromIndex];
        const toOffset = route.stationOffsets[toIndex];
        const ratio = Math.min(1, Math.max(0, Number(rawRatio) || 0));
        const distance = fromOffset + ((toOffset - fromOffset) * ratio);
        setTrainRuntimeById((current) => ({
            ...current,
            [session.trainId]: {
                progress: distance / route.totalLength,
                direction: toOffset >= fromOffset ? 1 : -1,
                dwellRemaining: 0,
            },
        }));
    };

    const closeYoutubePlayback = () => {
        const trainId = youtubeSession?.trainId;
        setYoutubeSession(null);
        setYoutubePlaybackError('');
        setYoutubeProgress({ positionMs: 0, durationMs: 0 });
        if (trainId) setTrainRunning(trainId, false);
    };

    const startYoutubeJourney = (trainId = activeTrainView?.train.id) => {
        const journeyView = trainViews.find((view) => view.train.id === trainId) || null;
        const route = journeyView?.route;
        if (!journeyView || !route?.valid || route.stationIds.length < 2) return;
        if (youtubeSession?.trainId && youtubeSession.trainId !== journeyView.train.id) {
            setTrainRunning(youtubeSession.trainId, false);
        }
        const stopIds = buildTrainPlaybackStops(route.stationIds);
        youtubeSessionCounterRef.current += 1;
        const session = {
            id: `${journeyView.train.id}-${youtubeSessionCounterRef.current}`,
            trainId: journeyView.train.id,
            stopIds,
            step: 0,
            consecutiveSkips: 0,
            playRequested: true,
        };
        setYoutubePlaybackError('');
        setYoutubeProgress({ positionMs: 0, durationMs: 0 });
        setSelectedTrainId(journeyView.train.id);
        setTrainRunning(journeyView.train.id, false);
        syncYoutubeLegProgress(session, 0);
        setYoutubeSession(session);
    };

    const handleYoutubePlaybackState = (state) => {
        const trainId = youtubeSession?.trainId;
        if (!trainId) return;
        setTrainRunning(trainId, state === 'playing');
        if (state === 'playing' && youtubeSession.consecutiveSkips) {
            setYoutubeSession((current) => current ? { ...current, consecutiveSkips: 0 } : current);
        }
    };

    const handleYoutubeProgress = ({ positionMs, durationMs }) => {
        if (!youtubeSession || durationMs <= 0) return;
        setYoutubeProgress({ positionMs, durationMs });
        syncYoutubeLegProgress(youtubeSession, positionMs / durationMs);
    };

    const handleYoutubeEnded = () => {
        if (!youtubeSession) return;
        syncYoutubeLegProgress(youtubeSession, 1);
        setYoutubeProgress({ positionMs: 0, durationMs: 0 });
        setYoutubeSession((current) => current ? {
            ...current,
            step: (current.step + 1) % current.stopIds.length,
            consecutiveSkips: 0,
        } : current);
    };

    const handleYoutubePrevious = () => {
        if (!youtubeSession?.stopIds?.length) return;
        const nextStep = (youtubeSession.step - 1 + youtubeSession.stopIds.length)
            % youtubeSession.stopIds.length;
        const nextSession = {
            ...youtubeSession,
            step: nextStep,
            consecutiveSkips: 0,
        };
        setYoutubeProgress({ positionMs: 0, durationMs: 0 });
        syncYoutubeLegProgress(nextSession, 0);
        setYoutubeSession(nextSession);
    };

    const handleYoutubeNext = () => {
        if (!youtubeSession?.stopIds?.length) return;
        syncYoutubeLegProgress(youtubeSession, 1);
        const nextSession = {
            ...youtubeSession,
            step: (youtubeSession.step + 1) % youtubeSession.stopIds.length,
            consecutiveSkips: 0,
        };
        setYoutubeProgress({ positionMs: 0, durationMs: 0 });
        syncYoutubeLegProgress(nextSession, 0);
        setYoutubeSession(nextSession);
    };

    const handleYoutubeUnavailable = () => {
        if (!youtubeSession) return;
        const nextSkipCount = youtubeSession.consecutiveSkips + 1;
        setYoutubeProgress({ positionMs: 0, durationMs: 0 });
        syncYoutubeLegProgress(youtubeSession, 1);
        if (nextSkipCount >= youtubeSession.stopIds.length) {
            setTrainRunning(youtubeSession.trainId, false);
            setYoutubeSession(null);
            setYoutubePlaybackError(copy.youtubeNoVideos);
            return;
        }
        setYoutubeSession((current) => current ? {
            ...current,
            step: (current.step + 1) % current.stopIds.length,
            consecutiveSkips: nextSkipCount,
        } : current);
    };

    const resetTrain = (trainId) => {
        setTrainRuntimeById((current) => ({
            ...current,
            [trainId]: { progress: 0, direction: 1, dwellRemaining: TRAIN_DWELL_SECONDS },
        }));
        if (youtubeSession?.trainId === trainId) {
            setTrainRunning(trainId, false);
            setYoutubeProgress({ positionMs: 0, durationMs: 0 });
            youtubeSessionCounterRef.current += 1;
            setYoutubeSession((current) => current ? {
                ...current,
                id: `${trainId}-${youtubeSessionCounterRef.current}`,
                step: 0,
                consecutiveSkips: 0,
            } : current);
        }
    };

    const seekYoutubePlayback = (event) => {
        youtubePlayerRef.current?.seekTo(Number(event.target.value));
    };

    const removeTrain = (trainId) => {
        updateActiveMap((map) => ({
            ...map,
            trains: (map.trains || []).filter((train) => train.id !== trainId),
        }));
        setTrainRuntimeById((current) => {
            const next = { ...current };
            delete next[trainId];
            return next;
        });
        if (youtubeSession?.trainId === trainId) {
            setYoutubeSession(null);
            setYoutubePlaybackError('');
        }
        if (selectedTrainId === trainId) setSelectedTrainId(null);
    };

    const createTrain = ({
        routeStationIds,
        routeMode = 'line',
        lineKey = null,
        routeLabel,
        name = '',
        color = TRAIN_COLORS[activeTrains.length % TRAIN_COLORS.length] || TRAIN_COLORS[0],
        speed = DEFAULT_TRAIN_SPEED,
    }) => {
        if (activeTrains.length) {
            setTrainRouteError(copy.oneTrainOnly);
            setTrainComposerOpen(false);
            return null;
        }
        const route = buildMetroTrainRoute(layout, routeStationIds);
        if (!route.valid || routeStationIds.length < 2) {
            setTrainRouteError(copy.selectAtLeastTwo);
            return null;
        }
        const trainNumber = (activeMap?.trains?.length || 0) + 1;
        const createdAt = new Date().toISOString();
        const trainId = `${activeMap.id}-train-${Date.now().toString(36)}`;
        const train = {
            id: trainId,
            name: name.trim() || (lang === 'en' ? `Train ${trainNumber}` : `${trainNumber}호 열차`),
            color,
            speed,
            routeMode,
            lineKey,
            routeLabel: routeLabel || copy.lineRoute,
            routeStationIds,
            running: false,
            createdAt,
            playlist: {
                name: `${activeMap.name} · ${routeLabel || copy.lineRoute}`,
                trackIds: [...routeStationIds],
                createdAt,
            },
        };
        updateActiveMap((map) => ({ ...map, trains: [...(map.trains || []), train] }));
        setTrainRuntimeById((current) => ({
            ...current,
            [trainId]: { progress: 0, direction: 1, dwellRemaining: TRAIN_DWELL_SECONDS },
        }));
        youtubeSessionCounterRef.current += 1;
        setYoutubeProgress({ positionMs: 0, durationMs: 0 });
        setYoutubePlaybackError('');
        setYoutubeSession({
            id: `${trainId}-${youtubeSessionCounterRef.current}`,
            trainId,
            stopIds: buildTrainPlaybackStops(routeStationIds),
            step: 0,
            consecutiveSkips: 0,
            playRequested: false,
        });
        setSelectedTrainId(trainId);
        return trainId;
    };

    const addTrain = () => {
        const routeStationIds = [...activeDraftStationIds];
        const line = activeMap.lines.find((item) => item.key === resolvedTrainDraftLineKey);
        const routeLabel = trainDraftMode === 'line'
            ? (line?.label || copy.lineRoute)
            : (lang === 'en' ? 'Custom journey' : '직접 선택 경로');
        const createdTrainId = createTrain({
            routeStationIds,
            routeMode: trainDraftMode,
            lineKey: trainDraftMode === 'line' ? resolvedTrainDraftLineKey : null,
            routeLabel,
            name: trainDraftName,
            color: trainDraftColor,
            speed: trainDraftSpeed,
        });
        if (!createdTrainId) return;
        setTrainDraftName('');
        setTrainDraftStationIds([]);
        setTrainRouteError('');
        setTrainComposerOpen(false);
        setSelectedLineKey(null);
    };

    const createDefaultTrainForActiveMap = () => {
        if (!activeMap) return null;
        const candidateLineKeys = [
            selectedLineKey,
            resolvedTrainDraftLineKey,
            ...activeMap.lines.map((line) => line.key),
        ].filter((value, index, list) => value && list.indexOf(value) === index);
        const targetLineKey = candidateLineKeys.find((lineKey) => {
            const route = lineTrainRoutes.get(lineKey);
            const stationIds = layout.lines.find((line) => line.key === lineKey)?.stationIds || [];
            return route?.valid && stationIds.length >= 2;
        });
        if (!targetLineKey) {
            setTrainRouteError(copy.selectAtLeastTwo);
            return null;
        }
        const targetLine = activeMap.lines.find((line) => line.key === targetLineKey);
        const routeStationIds = [...(layout.lines.find((line) => line.key === targetLineKey)?.stationIds || [])];
        return createTrain({
            routeStationIds,
            routeMode: 'line',
            lineKey: targetLineKey,
            routeLabel: targetLine?.label || copy.lineRoute,
        });
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

    const isPointerOverTrainTrash = (event) => {
        const rect = trainTrashRef.current?.getBoundingClientRect();
        if (!rect) return false;
        return event.clientX >= rect.left
            && event.clientX <= rect.right
            && event.clientY >= rect.top
            && event.clientY <= rect.bottom;
    };

    const getTrainDropTarget = (trainId, point) => {
        if (!point) return null;
        const train = activeTrains.find((item) => item.id === trainId);
        const currentRoute = trainRoutes.get(trainId);
        const currentProjection = getMetroTrainRouteProjection(currentRoute, point);
        let closestLineTarget = null;
        lineTrainRoutes.forEach((route, lineKey) => {
            const projection = getMetroTrainRouteProjection(route, point);
            if (!projection || (closestLineTarget && closestLineTarget.distance <= projection.distance)) return;
            closestLineTarget = {
                kind: 'line',
                lineKey,
                route,
                progress: projection.progress,
                distance: projection.distance,
                position: { x: projection.x, y: projection.y, angle: projection.angle },
            };
        });
        const snapDistance = METRO_GRID_SIZE * 1.05;
        if (
            train?.routeMode === 'custom'
            && currentProjection
            && currentProjection.distance <= snapDistance
            && (!closestLineTarget || currentProjection.distance <= closestLineTarget.distance + 10)
        ) {
            return {
                kind: 'current',
                lineKey: null,
                route: currentRoute,
                progress: currentProjection.progress,
                distance: currentProjection.distance,
                position: { x: currentProjection.x, y: currentProjection.y, angle: currentProjection.angle },
            };
        }
        if (closestLineTarget?.distance <= snapDistance) return closestLineTarget;
        if (currentProjection?.distance <= snapDistance) {
            return {
                kind: 'current',
                lineKey: train?.lineKey || null,
                route: currentRoute,
                progress: currentProjection.progress,
                distance: currentProjection.distance,
                position: { x: currentProjection.x, y: currentProjection.y, angle: currentProjection.angle },
            };
        }
        return null;
    };

    const handleTrainDragStart = (trainId, event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const view = trainViews.find((item) => item.train.id === trainId);
        if (!view) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        trainDragRef.current = {
            trainId,
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            moved: false,
            target: null,
        };
        setSelectedTrainId(trainId);
        setTrainDrag({
            trainId,
            moved: false,
            target: null,
            position: { ...view.position },
        });
    };

    const handleTrainDragMove = (trainId, event) => {
        const drag = trainDragRef.current;
        if (!drag || drag.trainId !== trainId || drag.pointerId !== event.pointerId) return;
        const distance = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY);
        if (!drag.moved && distance < 4) return;
        if (!drag.moved) {
            if (youtubeSession?.trainId === trainId) youtubePlayerRef.current?.pause();
            setTrainRunning(trainId, false);
        }
        const point = getPointerMapPosition(event);
        if (!point) return;
        event.preventDefault();
        event.stopPropagation();
        drag.moved = true;
        drag.target = isPointerOverTrainTrash(event) ? { kind: 'trash' } : getTrainDropTarget(trainId, point);
        setTrainDrag({
            trainId,
            moved: true,
            target: drag.target,
            position: drag.target?.position || { ...point, angle: 0 },
        });
    };

    const handleTrainDragEnd = (trainId, event) => {
        const drag = trainDragRef.current;
        if (!drag || drag.trainId !== trainId || drag.pointerId !== event.pointerId) return;
        const point = getPointerMapPosition(event);
        const target = drag.moved && isPointerOverTrainTrash(event)
            ? { kind: 'trash' }
            : (drag.moved && point ? getTrainDropTarget(trainId, point) : drag.target);
        try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* pointer capture may already be released */ }
        if (drag.moved && target) {
            if (target.kind === 'trash') {
                removeTrain(trainId);
            } else {
                const previousRuntime = trainRuntimeById[trainId] || { progress: 0, direction: 1 };
                const nearestStop = getNearestTrainStop(target.route, target.progress);
                if (target.kind === 'line') {
                    const lineLayout = layout.lines.find((line) => line.key === target.lineKey);
                    const lineDefinition = activeMap.lines.find((line) => line.key === target.lineKey);
                    if (lineLayout && lineDefinition) {
                        updateActiveMap((map) => ({
                            ...map,
                            trains: (map.trains || []).map((train) => train.id === trainId ? {
                                ...train,
                                routeMode: 'line',
                                lineKey: target.lineKey,
                                routeLabel: lineDefinition.label,
                                routeStationIds: [...lineLayout.stationIds],
                                playlist: {
                                    ...(train.playlist || {}),
                                    name: `${map.name} · ${lineDefinition.label}`,
                                    trackIds: [...lineLayout.stationIds],
                                },
                            } : train),
                        }));
                    }
                }
                setTrainRuntimeById((current) => ({
                    ...current,
                    [trainId]: {
                        progress: nearestStop?.progress ?? target.progress,
                        direction: previousRuntime.direction,
                        dwellRemaining: 0,
                    },
                }));
                if (nearestStop) {
                    const stopIds = buildTrainPlaybackStops(target.route.stationIds);
                    let step = previousRuntime.direction < 0
                        ? stopIds.lastIndexOf(nearestStop.stationId)
                        : stopIds.indexOf(nearestStop.stationId);
                    if (step < 0) step = 0;
                    if (youtubeSession?.trainId !== trainId) youtubeSessionCounterRef.current += 1;
                    setYoutubeProgress({ positionMs: 0, durationMs: 0 });
                    setYoutubePlaybackError('');
                    setYoutubeSession({
                        id: youtubeSession?.trainId === trainId
                            ? youtubeSession.id
                            : `${trainId}-${youtubeSessionCounterRef.current}`,
                        trainId,
                        stopIds,
                        step,
                        consecutiveSkips: 0,
                        playRequested: true,
                    });
                    if (
                        youtubeSession?.trainId === trainId
                        && youtubeCurrentStationId === nearestStop.stationId
                    ) {
                        youtubePlayerRef.current?.seekTo(0);
                        youtubePlayerRef.current?.play();
                    }
                }
            }
        }
        if (drag.moved) {
            suppressTrainClickRef.current = trainId;
            window.setTimeout(() => {
                if (suppressTrainClickRef.current === trainId) suppressTrainClickRef.current = null;
            }, 0);
        }
        trainDragRef.current = null;
        setTrainDrag(null);
    };

    const handleTrainSelect = (trainId) => {
        if (suppressTrainClickRef.current === trainId) {
            suppressTrainClickRef.current = null;
            return;
        }
        setSelectedTrainId(trainId);
        openTrainControl();
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
        if (trainPanelOpen && trainComposerOpen && trainDraftMode === 'custom') return;
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
        if (trainPanelOpen && trainComposerOpen && trainDraftMode === 'custom') {
            setTrainDraftStationIds((current) => {
                const existingIndex = current.indexOf(trackId);
                if (existingIndex >= 0) {
                    setTrainRouteError('');
                    return current.slice(0, existingIndex + 1);
                }
                if (!current.length) {
                    setTrainRouteError('');
                    return [trackId];
                }
                const lastStationId = current[current.length - 1];
                if (!getMetroAdjacentStationIds(layout, lastStationId).includes(trackId)) {
                    setTrainRouteError(copy.customRouteInvalid);
                    return current;
                }
                setTrainRouteError('');
                return [...current, trackId];
            });
            return;
        }
        const track = trackById.get(trackId);
        setSelectedStationId(trackId);
        if (track) onTrackSelect?.(track);
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
        const nextMaps = [...maps, { ...map, trains: [] }];
        commitMaps(nextMaps, { activeMapId: map.id, creating: false });
        setSelectedStationId(null);
        setSelectedLineKey(null);
        setEditorOpen(false);
        setTrainPanelOpen(false);
        setTrainComposerOpen(false);
        setSelectedTrainId(null);
        setTrainDraftStationIds([]);
        setZoom(1);
    };

    const handleDeleteMap = () => {
        if (!activeMap) return;
        const nextMaps = maps.filter((map) => map.id !== activeMap.id);
        commitMaps(nextMaps, {
            activeMapId: nextMaps[0]?.id || null,
            creating: nextMaps.length === 0,
        });
        setSelectedStationId(null);
        setSelectedLineKey(null);
        setEditorOpen(false);
        setTrainPanelOpen(false);
        setTrainComposerOpen(false);
        setSelectedTrainId(null);
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
            trains: (activeMap.trains || []).map((train, index) => ({
                ...train,
                id: `${activeMap.id}-copy-train-${index}-${Date.now().toString(36)}`,
                running: false,
                routeStationIds: [...train.routeStationIds],
                playlist: train.playlist ? { ...train.playlist, trackIds: [...train.playlist.trackIds] } : null,
            })),
        };
        const nextMaps = [...maps, duplicate];
        commitMaps(nextMaps, { activeMapId: duplicate.id });
        setSelectedStationId(null);
        setSelectedTrainId(null);
        setTrainPanelOpen(false);
        setTrainComposerOpen(false);
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

    const handleAddLineClick = (event) => {
        const option = addableLines.find((line) => line.key === event.currentTarget.dataset.lineKey);
        addLine(option);
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
        updateActiveMap((map) => {
            const lines = map.lines.filter((line) => line.key !== lineKey);
            const remainingIds = new Set([
                ...map.transferIds,
                ...lines.flatMap((line) => line.trackIds),
            ]);
            return {
                ...map,
                lines,
                trains: (map.trains || []).filter((train) => (
                    train.lineKey !== lineKey
                    && train.routeStationIds.every((trackId) => remainingIds.has(trackId))
                )),
            };
        });
        if (selectedLineKey === lineKey) setSelectedLineKey(null);
        setSelectedStationId(null);
    };

    const removeStation = () => {
        if (!activeMap || !selectedStation) return;
        if (selectedStation.isSeed) return;
        updateActiveMap((map) => {
            const trains = (map.trains || []).map((train) => {
                const routeStationIds = train.routeStationIds.filter((trackId) => trackId !== selectedStation.trackId);
                return {
                    ...train,
                    routeStationIds,
                    playlist: train.playlist ? { ...train.playlist, trackIds: [...routeStationIds] } : null,
                };
            }).filter((train) => train.routeStationIds.length >= 2);
            return {
                ...map,
                transferIds: map.transferIds.filter((trackId) => trackId !== selectedStation.trackId),
                lines: map.lines.map((line) => ({
                    ...line,
                    trackIds: line.trackIds.filter((trackId) => trackId !== selectedStation.trackId),
                })),
                trains,
            };
        });
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

    const openMapTab = (mapId) => {
        closeYoutubePlayback();
        setActiveMapId(mapId);
        setSelectedStationId(null);
        setSelectedLineKey(null);
        setEditorOpen(false);
        setTrainPanelOpen(false);
        setTrainComposerOpen(false);
        setZoom(1);
    };

    const toggleTrainPanel = () => {
        if (trainPanelOpen) {
            closeTrainControl();
            return;
        }
        if (!activeTrains.length) {
            const createdTrainId = createDefaultTrainForActiveMap();
            if (createdTrainId) {
                setTrainPanelOpen(false);
                setTrainComposerOpen(false);
                setEditorOpen(false);
                setSelectedStationId(null);
                setSelectedLineKey(null);
                return;
            }
        }
        openTrainControl();
    };

    const toggleEditorPanel = () => {
        closeTrainControl();
        setEditorOpen((current) => !current);
    };

    const expandSelectionMap = () => {
        if (!miniMap) {
            onExpand?.();
            return;
        }
        const mapAlreadyStored = maps.some((map) => map.id === miniMap.id);
        commitMaps(
            mapAlreadyStored ? maps : [miniMap, ...maps],
            {
                activeMapId: miniMap.id,
                creating: false,
                trackHistory: false,
            },
        );
        setSelectedStationId(selectedTrack?.id || null);
        setSelectedLineKey(null);
        setEditorOpen(false);
        closeTrainControl();
        onExpand?.();
    };

    if (!open) return null;

    if (!expanded) {
        return (
            <MiniMetroMap
                map={miniMap}
                layout={miniLayout}
                selectedTrack={selectedTrack}
                trackContext={trackContext}
                currentTrackTrainView={miniCurrentTrackTrainView}
                onTrackSelect={onTrackSelect}
                onExploreTrack={onExploreTrack}
                onAddTrack={onAddTrack}
                onOpenTrack={onOpenTrack}
                onExpand={expandSelectionMap}
                onDismiss={onDismiss}
                lang={lang}
            />
        );
    }

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
                            else closeStudio();
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
                                        trainViews={trainViews}
                                        currentTrackTrainView={fullCurrentTrackTrainView}
                                        selectedTrainId={resolvedSelectedTrainId}
                                        routePreview={trainPanelOpen && trainComposerOpen ? trainDraftRoute : null}
                                        routeDraftStationIds={trainPanelOpen && trainComposerOpen ? activeDraftStationIds : []}
                                        routeSelectableIds={routeSelectableIds}
                                        routePicking={trainPanelOpen && trainComposerOpen && trainDraftMode === 'custom'}
                                        trainDragCandidateLineKey={trainDrag?.target?.kind === 'line' ? trainDrag.target.lineKey : null}
                                        draggingTrainId={trainDrag?.trainId || null}
                                        onStationSelect={handleStationSelect}
                                        onStationHover={setHoveredStationId}
                                        onStationDragStart={handleStationDragStart}
                                        onStationDragMove={handleStationDragMove}
                                        onStationDragEnd={handleStationDragEnd}
                                        onStationNudge={handleStationNudge}
                                        onLineSelect={(lineKey) => {
                                            if (trainPanelOpen && trainComposerOpen && trainDraftMode === 'line') {
                                                setTrainDraftLineKey(lineKey);
                                                setSelectedLineKey(lineKey);
                                                setTrainRouteError('');
                                                return;
                                            }
                                            setSelectedLineKey((current) => current === lineKey ? null : lineKey);
                                        }}
                                        onLineHover={setHoveredLineKey}
                                        onTrainSelect={handleTrainSelect}
                                        onTrainDragStart={handleTrainDragStart}
                                        onTrainDragMove={handleTrainDragMove}
                                        onTrainDragEnd={handleTrainDragEnd}
                                        onCanvasSelect={() => {
                                            if (isPanning) return;
                                            if (trainPanelOpen && trainComposerOpen && trainDraftMode === 'custom') return;
                                            setSelectedStationId(null);
                                            setSelectedLineKey(null);
                                        }}
                                        svgRef={svgRef}
                                    />
                                </div>
                            </div>
                        </div>

                        {trainDrag ? (
                            <div
                                ref={trainTrashRef}
                                className={`tm2-train-trash${trainDrag.target?.kind === 'trash' ? ' over' : ''}`}
                                aria-hidden="true"
                            >
                                <span><i /></span>
                                <strong>{copy.removeTrain}</strong>
                            </div>
                        ) : null}

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

                        {activeTrainView && activeTrainCurrentTrack && !trainDrag ? (
                            <section
                                className="tm2-train-marquee"
                                aria-live="polite"
                                style={{ '--tm2-train-color': getTrainColor(activeTrainView.train) }}
                            >
                                <button type="button" className="tm2-train-marquee-train" onClick={openTrainControl}>
                                    <span className="tm2-train-marquee-mark"><i /></span>
                                    <span className="tm2-train-marquee-train-copy">
                                        <small>{copy.nowPassing}</small>
                                        <strong>{activeTrainView.train.name}</strong>
                                    </span>
                                </button>
                                {activeTrainCurrentTrack.coverUrl ? (
                                    <img src={activeTrainCurrentTrack.coverUrl} alt="" className="tm2-train-marquee-cover" />
                                ) : <span className="tm2-train-marquee-fallback" aria-hidden>♪</span>}
                                <div className="tm2-train-marquee-current">
                                    <span>{copy.currentLocation}</span>
                                    <strong>{activeTrainCurrentTrack.name}</strong>
                                    <small>{activeTrainCurrentTrack.artists || '-'}</small>
                                </div>
                                <div className="tm2-train-marquee-next">
                                    <span>{copy.nextStation}</span>
                                    <strong>{activeTrainNextTrack?.name || activeTrainCurrentTrack.name}</strong>
                                    <small>{activeTrainView.train.routeLabel}</small>
                                </div>
                                <div className={`tm2-train-marquee-progress${activeTrainHasYoutube ? ' interactive' : ''}`}>
                                    {activeTrainHasYoutube ? (
                                        <input
                                            type="range"
                                            min="0"
                                            max={Math.max(1, youtubeProgress.durationMs)}
                                            step="250"
                                            value={Math.min(youtubeProgress.positionMs, Math.max(1, youtubeProgress.durationMs))}
                                            disabled={youtubeProgress.durationMs <= 0}
                                            onChange={seekYoutubePlayback}
                                            aria-label={copy.seekPlayback}
                                            style={{ '--tm2-marquee-play-progress': `${youtubeProgressPercent}%` }}
                                        />
                                    ) : (
                                        <i style={{ width: `${activeTrainProgressPercent}%` }} />
                                    )}
                                </div>
                                <div className="tm2-train-marquee-side">
                                    <div className="tm2-train-marquee-state">
                                        <b>{activeTrainView.train.running === false ? copy.paused : copy.running}</b>
                                        <strong>{activeTrainSongCount}</strong>
                                        <small>{copy.songs}</small>
                                    </div>
                                    <div className="tm2-train-marquee-actions">
                                        <button
                                            type="button"
                                            className="tm2-status-action"
                                            disabled={!activeTrainHasYoutube}
                                            onClick={handleYoutubePrevious}
                                            aria-label={copy.previousTrack}
                                        >
                                            ‹
                                        </button>
                                        <button
                                            type="button"
                                            className="tm2-status-action"
                                            onClick={() => toggleTrain(activeTrainView.train.id)}
                                            aria-label={activeTrainView.train.running === false ? copy.resume : copy.pause}
                                            aria-keyshortcuts="Space"
                                        >
                                            {activeTrainView.train.running === false ? '▶' : 'Ⅱ'}
                                        </button>
                                        <button
                                            type="button"
                                            className="tm2-status-action"
                                            disabled={!activeTrainHasYoutube}
                                            onClick={handleYoutubeNext}
                                            aria-label={copy.nextTrack}
                                        >
                                            ›
                                        </button>
                                        <button
                                            type="button"
                                            className="tm2-status-action"
                                            onClick={() => resetTrain(activeTrainView.train.id)}
                                            aria-label={copy.resetTrain}
                                        >
                                            ↺
                                        </button>
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        <div className="tm2-bottom-dock">
                            <button type="button" className="tm2-field-return" onClick={closeStudio}>← {lang === 'en' ? 'Taste Field' : '취향 필드'}</button>
                            <span className="tm2-dock-divider" aria-hidden />
                            <nav className="tm2-map-tabs" aria-label="Metro maps">
                                {maps.map((map, index) => (
                                    <button
                                        key={map.id}
                                        type="button"
                                        className={activeMap.id === map.id ? 'active' : ''}
                                        onClick={() => openMapTab(map.id)}
                                    >
                                        <span>{String(index + 1).padStart(2, '0')}</span>{map.name}
                                    </button>
                                ))}
                                <button type="button" className="tm2-new-tab" onClick={() => setCreating(true)}>＋ {copy.newMetro}</button>
                            </nav>
                            <span className="tm2-dock-divider" aria-hidden />
                            <div className="tm2-map-toolbar">
                                <button type="button" onClick={() => setZoom((value) => Math.max(METRO_MIN_ZOOM, value - 0.12))}>−</button>
                                <button type="button" className="value" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
                                <button type="button" onClick={() => setZoom((value) => Math.min(1.6, value + 0.12))}>＋</button>
                            </div>
                            <button type="button" className={`tm2-train-toggle${trainPanelOpen ? ' active' : ''}`} onClick={toggleTrainPanel}>▰ {copy.trainControl}</button>
                            <button type="button" className={`tm2-edit-toggle${editorOpen ? ' active' : ''}`} onClick={toggleEditorPanel}>＋ {copy.editMap}</button>
                        </div>

                        <div className="tm2-map-actions">
                            <button
                                type="button"
                                onClick={() => downloadSvg(svgRef.current, `${activeMap.name.replace(/\s+/g, '-').toLowerCase() || 'metro-map'}.svg`)}
                            >
                                {copy.saveSvg}
                            </button>
                            <button type="button" className="tm2-close" onClick={closeStudio} aria-label={copy.close}>×</button>
                        </div>

                        {youtubeSession ? (
                            <MetroYouTubePlayer
                                key={youtubeSession.id}
                                ref={youtubePlayerRef}
                                track={youtubeCurrentTrack}
                                nextTrack={youtubeNextTrack}
                                trainName={youtubeTrainView?.train.name || copy.trains}
                                color={youtubeTrainView ? getTrainColor(youtubeTrainView.train) : TRAIN_COLORS[0]}
                                lang={lang}
                                panelShifted={trainPanelOpen}
                                autoplayRequested={youtubeSession.playRequested}
                                queuePosition={youtubeStep + 1}
                                queueLength={youtubeStopIds.length}
                                onPlaybackState={handleYoutubePlaybackState}
                                onProgress={handleYoutubeProgress}
                                onEnded={handleYoutubeEnded}
                                onPrevious={handleYoutubePrevious}
                                onNext={handleYoutubeNext}
                                onUnavailable={handleYoutubeUnavailable}
                                onClose={closeYoutubePlayback}
                            />
                        ) : null}

                        {youtubePlaybackError ? (
                            <div className="tm2-youtube-notice" role="status">
                                <span>!</span>
                                <strong>{youtubePlaybackError}</strong>
                                <button type="button" onClick={() => setYoutubePlaybackError('')} aria-label={copy.close}>×</button>
                            </div>
                        ) : null}

                        <nav className="tm2-line-rail" aria-label={copy.lines}>
                            <span>{copy.lines}</span>
                            {activeMap.lines.map((line, index) => (
                                <button
                                    type="button"
                                    key={line.key}
                                    className={(selectedLineKey === line.key || (trainPanelOpen && trainComposerOpen && resolvedTrainDraftLineKey === line.key)) ? 'active' : ''}
                                    onClick={() => {
                                        if (trainPanelOpen && trainComposerOpen && trainDraftMode === 'line') {
                                            setTrainDraftLineKey(line.key);
                                            setSelectedLineKey(line.key);
                                            setTrainRouteError('');
                                            return;
                                        }
                                        setSelectedLineKey((current) => current === line.key ? null : line.key);
                                    }}
                                >
                                    <i style={{ background: line.color }} />
                                    <b>{String(index + 1).padStart(2, '0')}</b>
                                    <strong>{line.label}</strong>
                                    <small>{line.trackIds.length}</small>
                                </button>
                            ))}
                        </nav>

                        {selectedStation && !editorOpen && !trainPanelOpen ? (
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
                                        <button type="button" onClick={() => {
                                            setTrainPanelOpen(false);
                                            setTrainComposerOpen(false);
                                            setEditorOpen(true);
                                        }}>{copy.editMap}</button>
                                    </div>
                                </div>
                            </aside>
                        ) : null}

                        <aside className={`tm2-train-panel${trainPanelOpen ? ' open' : ''}`} aria-label={copy.trainControl}>
                            <div className="tm2-train-panel-head">
                                <div>
                                    <h2>{copy.trains}</h2>
                                    <p>{copy.dragTrainHint} {copy.dropTrainHint}</p>
                                </div>
                                <button type="button" className="tm2-editor-close" onClick={closeTrainControl} aria-label={copy.close}>×</button>
                            </div>

                            <section className="tm2-train-panel-section">
                                <div className="tm2-train-section-title">
                                    <h3>{lang === 'en' ? 'On the map' : '지도 위 열차'}</h3>
                                    <span>{activeTrains.length}{lang === 'en' ? '' : '대'}</span>
                                </div>
                                {activeTrains.length ? (
                                    <div className="tm2-train-list">
                                        {activeTrains.map((train) => {
                                            const routeValid = trainRoutes.get(train.id)?.valid;
                                            return (
                                                <div key={train.id} className={`tm2-train-card${resolvedSelectedTrainId === train.id ? ' active' : ''}${routeValid ? '' : ' invalid'}`}>
                                                    <button type="button" className="tm2-train-card-main" onClick={() => {
                                                        setSelectedTrainId(train.id);
                                                    }}>
                                                        <span className="tm2-train-type-mark" style={{ '--tm2-train-color': getTrainColor(train) }}><i /></span>
                                                        <span>
                                                            <strong>{train.name}</strong>
                                                            <small>{train.routeLabel} · {train.routeStationIds.length} {copy.songs}</small>
                                                        </span>
                                                        <i className={train.running === false ? 'paused' : ''}>{train.running === false ? copy.paused : copy.running}</i>
                                                    </button>
                                                    <button type="button" className="tm2-train-icon-btn" onClick={() => toggleTrain(train.id)} aria-label={train.running === false ? copy.resume : copy.pause}>
                                                        {train.running === false ? '▶' : 'Ⅱ'}
                                                    </button>
                                                    <button type="button" className="tm2-train-icon-btn danger" onClick={() => removeTrain(train.id)} aria-label={copy.removeTrain}>×</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <p className="tm2-editor-empty">{copy.noTrains}</p>}

                                {selectedTrainDefinition ? (
                                    <div className="tm2-train-quick-edit">
                                        <input
                                            value={selectedTrainDefinition.name}
                                            aria-label={copy.trainName}
                                            maxLength={24}
                                            onChange={(event) => updateTrain(selectedTrainDefinition.id, { name: event.target.value })}
                                        />
                                        <div className="tm2-color-row" aria-label={copy.trainColor}>
                                            {TRAIN_COLORS.map((color) => (
                                                <button
                                                    type="button"
                                                    key={color}
                                                    className={getTrainColor(selectedTrainDefinition) === color ? 'active' : ''}
                                                    style={{ '--tm2-color': color }}
                                                    onClick={() => updateTrain(selectedTrainDefinition.id, { color })}
                                                    aria-label={color}
                                                />
                                            ))}
                                        </div>
                                        <label>
                                            <span>{copy.trainSpeed}</span>
                                            <input
                                                type="range"
                                                min="55"
                                                max="170"
                                                step="5"
                                                value={getTrainSpeed(selectedTrainDefinition)}
                                                onChange={(event) => updateTrain(selectedTrainDefinition.id, { speed: Number(event.target.value) })}
                                            />
                                        </label>
                                    </div>
                                ) : null}
                            </section>

                            {!activeTrains.length && !trainComposerOpen ? (
                                <button type="button" className="tm2-open-train-composer" onClick={startTrainComposer}>＋ {copy.newTrain}</button>
                            ) : null}

                            {!activeTrains.length && trainComposerOpen ? (
                            <section className="tm2-train-panel-section tm2-new-train">
                                <div className="tm2-train-section-title">
                                    <h3>{copy.newTrain}</h3>
                                    <button type="button" className="tm2-composer-cancel" onClick={stopTrainComposer}>{copy.cancel}</button>
                                </div>
                                <label className="tm2-train-field-label" htmlFor="tm2-train-name">{copy.trainName}</label>
                                <input
                                    id="tm2-train-name"
                                    className="tm2-train-name-input"
                                    value={trainDraftName}
                                    maxLength={24}
                                    placeholder={copy.trainNamePlaceholder}
                                    onChange={(event) => setTrainDraftName(event.target.value)}
                                />

                                <label className="tm2-train-field-label">{copy.trainColor}</label>
                                <div className="tm2-color-row tm2-color-row-large">
                                    {TRAIN_COLORS.map((color) => (
                                        <button
                                            type="button"
                                            key={color}
                                            className={trainDraftColor === color ? 'active' : ''}
                                            style={{ '--tm2-color': color }}
                                            onClick={() => setTrainDraftColor(color)}
                                            aria-label={color}
                                        />
                                    ))}
                                </div>

                                <label className="tm2-train-field-label tm2-speed-label" htmlFor="tm2-train-speed">
                                    <span>{copy.trainSpeed}</span><b>{copy.slower}</b><b>{copy.faster}</b>
                                </label>
                                <input
                                    id="tm2-train-speed"
                                    className="tm2-train-speed-input"
                                    type="range"
                                    min="55"
                                    max="170"
                                    step="5"
                                    value={trainDraftSpeed}
                                    onChange={(event) => setTrainDraftSpeed(Number(event.target.value))}
                                />

                                <label className="tm2-train-field-label">{copy.routeMethod}</label>
                                <div className="tm2-train-route-tabs">
                                    <button
                                        type="button"
                                        className={trainDraftMode === 'line' ? 'active' : ''}
                                        onClick={() => {
                                            setTrainDraftMode('line');
                                            setSelectedLineKey(resolvedTrainDraftLineKey);
                                            setTrainRouteError('');
                                        }}
                                    >{copy.lineRoute}</button>
                                    <button
                                        type="button"
                                        className={trainDraftMode === 'custom' ? 'active' : ''}
                                        onClick={() => {
                                            setTrainDraftMode('custom');
                                            setSelectedLineKey(null);
                                            setTrainRouteError('');
                                        }}
                                    >{copy.customRoute}</button>
                                </div>

                                {trainDraftMode === 'line' ? (
                                    <div className="tm2-train-line-options">
                                        {activeMap.lines.map((line) => (
                                            <button
                                                type="button"
                                                key={line.key}
                                                className={resolvedTrainDraftLineKey === line.key ? 'active' : ''}
                                                onClick={() => {
                                                    setTrainDraftLineKey(line.key);
                                                    setSelectedLineKey(line.key);
                                                    setTrainRouteError('');
                                                }}
                                            >
                                                <i style={{ background: line.color }} />
                                                <strong>{line.label}</strong>
                                                <small>{layout.lines.find((item) => item.key === line.key)?.stationIds.length || 0}</small>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="tm2-custom-route-builder">
                                        <p>{copy.customRouteHint}</p>
                                        {trainDraftStationIds.length ? (
                                            <div className="tm2-route-stop-list">
                                                {trainDraftStationIds.map((trackId, index) => {
                                                    const track = trackById.get(trackId);
                                                    return (
                                                        <span key={`${trackId}-${index}`}>
                                                            <b>{index + 1}</b>{track?.name || trackId}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : <div className="tm2-route-empty">＋ {copy.customRouteEmpty}</div>}
                                        {trainDraftStationIds.length ? (
                                            <button
                                                type="button"
                                                className="tm2-route-undo"
                                                onClick={() => {
                                                    setTrainDraftStationIds((current) => current.slice(0, -1));
                                                    setTrainRouteError('');
                                                }}
                                            >↶ {copy.removeLastStop}</button>
                                        ) : null}
                                    </div>
                                )}

                                {trainRouteError ? <p className="tm2-train-route-error">{trainRouteError}</p> : null}
                                <div className={`tm2-playlist-bundle${trainDraftRoute.valid ? ' ready' : ''}`}>
                                    <span aria-hidden style={{ '--tm2-train-color': trainDraftColor }}><i /></span>
                                    <div>
                                        <strong>{copy.routeSongs}</strong>
                                        <small>{trainDraftRoute.valid ? `${activeDraftStationIds.length} ${copy.songs} · ${copy.playlistReady}` : copy.selectAtLeastTwo}</small>
                                    </div>
                                </div>
                                <button type="button" className="tm2-add-train-btn" disabled={!trainDraftRoute.valid} onClick={addTrain}>
                                    <span style={{ '--tm2-train-color': trainDraftColor }}><i /></span>
                                    {copy.addTrain}<b>→</b>
                                </button>
                            </section>
                            ) : null}
                        </aside>

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
                                            <button
                                                type="button"
                                                key={line.key}
                                                className="tm2-add-line"
                                                data-line-key={line.key}
                                                onClick={handleAddLineClick}
                                            >
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

                    </div>
                ) : null}
            </section>
        </div>
    );
}
