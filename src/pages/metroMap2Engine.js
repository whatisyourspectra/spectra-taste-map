const METRO_COLORS = [
    '#ff5d73',
    '#ffb84d',
    '#58d68d',
    '#4dabf7',
    '#9b7bff',
    '#f06ac2',
    '#38c7c4',
    '#b6d94c',
];

export const METRO_MAP_WIDTH = 2400;
export const METRO_MAP_HEIGHT = 1440;
export const METRO_GRID_SIZE = 80;
export const METRO_CANVAS_GROWTH = METRO_GRID_SIZE * 8;

function getMetroCanvasSize(map) {
    return {
        width: Math.max(METRO_MAP_WIDTH, Number(map?.canvas?.width) || METRO_MAP_WIDTH),
        height: Math.max(METRO_MAP_HEIGHT, Number(map?.canvas?.height) || METRO_MAP_HEIGHT),
    };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeGenre(value) {
    return String(value || '').trim().toLowerCase();
}

function titleize(value) {
    return String(value || '')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function hashText(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

export function getMetroTrackGenres(track) {
    const source = Array.isArray(track?.genres) && track.genres.length
        ? track.genres
        : (Array.isArray(track?.spotifyGenres) ? track.spotifyGenres : []);
    return unique(source.map(normalizeGenre)).slice(0, 8);
}

function scoreTrack(track, salt) {
    const popularity = clamp(Number(track?.popularity) || 0, 0, 100) / 100;
    const randomPart = (hashText(`${salt}:${track?.id}`) % 10000) / 10000;
    return (randomPart * 0.72) + (popularity * 0.28);
}

function sampleTrackIds(trackIds, trackById, limit, salt) {
    if (trackIds.length <= limit) return [...trackIds];
    return [...trackIds]
        .sort((a, b) => scoreTrack(trackById.get(b), salt) - scoreTrack(trackById.get(a), salt))
        .slice(0, limit);
}

export function buildMetroTasteLines({
    tracks,
    activeTrackIds,
    assignmentByTrackId,
    clusterById,
    maxLines = 10,
}) {
    const scopedTracks = (Array.isArray(tracks) ? tracks : [])
        .filter((track) => track?.id && track?.name)
        .filter((track) => !activeTrackIds || activeTrackIds.has(track.id));

    const clusterGroups = new Map();
    scopedTracks.forEach((track) => {
        const clusterId = assignmentByTrackId?.get(track.id);
        if (clusterId === undefined || clusterId === null || !clusterById?.[clusterId]) return;
        if (!clusterGroups.has(clusterId)) clusterGroups.set(clusterId, []);
        clusterGroups.get(clusterId).push(track);
    });

    const clustered = [...clusterGroups.entries()]
        .map(([clusterId, members], index) => {
            const cluster = clusterById?.[clusterId];
            const genres = unique([
                ...(Array.isArray(cluster?.topGenres) ? cluster.topGenres.map(normalizeGenre) : []),
                ...members.flatMap(getMetroTrackGenres),
            ]).slice(0, 5);
            return {
                key: `taste-${clusterId}`,
                label: cluster?.label?.name || genres.slice(0, 2).map(titleize).join(' + ') || `Taste ${index + 1}`,
                color: cluster?.color || METRO_COLORS[index % METRO_COLORS.length],
                trackIds: members.map((track) => track.id),
                count: members.length,
                genres,
                source: 'cluster',
            };
        })
        .filter((line) => line.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxLines);

    if (clustered.length >= 2) return clustered;

    const genreGroups = new Map();
    scopedTracks.forEach((track) => {
        getMetroTrackGenres(track).slice(0, 4).forEach((genre) => {
            if (!genreGroups.has(genre)) genreGroups.set(genre, []);
            genreGroups.get(genre).push(track.id);
        });
    });

    return [...genreGroups.entries()]
        .map(([genre, ids], index) => ({
            key: `genre-${genre}`,
            label: titleize(genre),
            color: METRO_COLORS[index % METRO_COLORS.length],
            trackIds: unique(ids),
            count: unique(ids).length,
            genres: [genre],
            source: 'genre',
        }))
        .filter((line) => line.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxLines);
}

export function buildSeedGenreLines(seedTrack, tracks, maxLines = 5) {
    if (!seedTrack) return [];
    const seedGenres = getMetroTrackGenres(seedTrack);
    const relatedGenreCount = new Map();

    (Array.isArray(tracks) ? tracks : []).forEach((track) => {
        if (!track?.id || track.id === seedTrack.id) return;
        const genres = getMetroTrackGenres(track);
        const overlap = genres.some((genre) => seedGenres.includes(genre));
        if (!overlap && seedGenres.length) return;
        genres.forEach((genre) => {
            relatedGenreCount.set(genre, (relatedGenreCount.get(genre) || 0) + 1);
        });
    });

    const orderedGenres = unique([
        ...seedGenres,
        ...[...relatedGenreCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([genre]) => genre),
    ]).slice(0, maxLines);

    return orderedGenres.map((genre, index) => {
        const trackIds = (Array.isArray(tracks) ? tracks : [])
            .filter((track) => track?.id !== seedTrack.id && getMetroTrackGenres(track).includes(genre))
            .map((track) => track.id);
        return {
            key: `seed-${genre}`,
            label: titleize(genre),
            color: METRO_COLORS[index % METRO_COLORS.length],
            trackIds,
            count: trackIds.length,
            genres: [genre],
            source: 'seed-genre',
        };
    }).filter((line) => line.count > 0);
}

function pickAutomaticTransfers(selectedLines, trackById, count, salt) {
    const membership = new Map();
    selectedLines.forEach((line) => {
        line.trackIds.forEach((trackId) => {
            if (!membership.has(trackId)) membership.set(trackId, []);
            membership.get(trackId).push(line.key);
        });
    });
    const candidates = [...membership.entries()]
        .map(([trackId, lineKeys]) => ({ trackId, lineKeys, track: trackById.get(trackId) }))
        .filter((item) => item.track)
        .sort((a, b) => {
            const membershipDiff = b.lineKeys.length - a.lineKeys.length;
            if (membershipDiff) return membershipDiff;
            return scoreTrack(b.track, salt) - scoreTrack(a.track, salt);
        });
    return candidates.slice(0, count).map((item) => item.trackId);
}

export function createMetroMapDefinition({
    name,
    mode,
    selectedLines,
    tracks,
    maxPerLine = 12,
    maxTotal = 64,
    transferMode = 'auto',
    transferCount = 2,
    manualTransferIds = [],
    seedTrackId = null,
}) {
    const sourceTracks = (Array.isArray(tracks) ? tracks : []).filter((track) => track?.id);
    const trackById = new Map(sourceTracks.map((track) => [track.id, track]));
    const seed = `${Date.now()}:${name}:${mode}`;
    const safeLines = (Array.isArray(selectedLines) ? selectedLines : []).filter((line) => line?.key);
    const automaticIds = transferMode === 'auto' && mode !== 'seed'
        ? pickAutomaticTransfers(safeLines, trackById, transferCount, seed)
        : [];
    const transferIds = mode === 'seed'
        ? (seedTrackId ? [seedTrackId] : [])
        : (transferMode === 'manual' ? unique(manualTransferIds) : automaticIds);
    const excludedIds = new Set(transferIds);
    const lineLimit = Math.max(3, Math.min(maxPerLine, Math.floor(maxTotal / Math.max(1, safeLines.length))));
    const usedIds = new Set(transferIds);

    const lines = safeLines.map((line, index) => {
        const candidates = unique(line.trackIds)
            .filter((trackId) => trackById.has(trackId) && !excludedIds.has(trackId) && !usedIds.has(trackId));
        const sampled = sampleTrackIds(candidates, trackById, lineLimit, `${seed}:${line.key}`);
        sampled.forEach((trackId) => usedIds.add(trackId));
        return {
            key: line.key,
            label: line.label,
            color: line.color || METRO_COLORS[index % METRO_COLORS.length],
            trackIds: sampled,
            genres: Array.isArray(line.genres) ? line.genres : [],
        };
    }).filter((line) => line.trackIds.length || mode === 'seed');

    const now = new Date().toISOString();
    return {
        id: `metro-${hashText(`${seed}:${Math.random()}`).toString(36)}`,
        name: String(name || '').trim() || 'My Metro',
        mode: mode === 'seed' ? 'seed' : 'taste',
        createdAt: now,
        updatedAt: now,
        seedTrackId: mode === 'seed' ? seedTrackId : null,
        transferIds,
        lines,
        canvas: {
            width: METRO_MAP_WIDTH,
            height: METRO_MAP_HEIGHT,
        },
        settings: {
            maxPerLine,
            maxTotal,
            transferMode,
            transferCount,
        },
    };
}

function pointAlongPolyline(points, ratio) {
    if (!points.length) return { x: 0, y: 0 };
    if (points.length === 1) return points[0];
    const segments = [];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1];
        const end = points[index];
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        segments.push({ start, end, length });
        total += length;
    }
    let target = clamp(ratio, 0, 1) * total;
    for (const segment of segments) {
        if (target <= segment.length) {
            const local = segment.length ? target / segment.length : 0;
            return {
                x: segment.start.x + ((segment.end.x - segment.start.x) * local),
                y: segment.start.y + ((segment.end.y - segment.start.y) * local),
            };
        }
        target -= segment.length;
    }
    return points[points.length - 1];
}

function projectPointOnPolyline(point, points) {
    if (!point || points.length < 2) return 0;
    let traversed = 0;
    let best = { distance: Infinity, progress: 0 };
    for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1];
        const end = points[index];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = (dx * dx) + (dy * dy);
        const length = Math.sqrt(lengthSquared);
        const ratio = lengthSquared
            ? clamp((((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / lengthSquared, 0, 1)
            : 0;
        const projected = { x: start.x + (dx * ratio), y: start.y + (dy * ratio) };
        const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
        if (distance < best.distance) {
            best = { distance, progress: traversed + (length * ratio) };
        }
        traversed += length;
    }
    return best;
}

function progressAlongPolyline(point, points) {
    const projection = projectPointOnPolyline(point, points);
    return typeof projection === 'number' ? projection : projection.progress;
}

function pathFromPoints(points) {
    if (!points.length) return '';
    return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

function roundedPathFromPoints(points) {
    if (!points.length) return '';
    if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    const commands = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
    for (let index = 1; index < points.length - 1; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const next = points[index + 1];
        const incoming = { x: previous.x - current.x, y: previous.y - current.y };
        const outgoing = { x: next.x - current.x, y: next.y - current.y };
        const incomingLength = Math.hypot(incoming.x, incoming.y);
        const outgoingLength = Math.hypot(outgoing.x, outgoing.y);
        const cross = (incoming.x * outgoing.y) - (incoming.y * outgoing.x);

        if (!incomingLength || !outgoingLength || Math.abs(cross) < 0.01) {
            commands.push(`L ${current.x.toFixed(1)} ${current.y.toFixed(1)}`);
            continue;
        }

        const cornerRadius = Math.min(
            current.isStation ? 15 : 26,
            incomingLength * 0.36,
            outgoingLength * 0.36,
        );
        const beforeCorner = {
            x: current.x + ((incoming.x / incomingLength) * cornerRadius),
            y: current.y + ((incoming.y / incomingLength) * cornerRadius),
        };
        const afterCorner = {
            x: current.x + ((outgoing.x / outgoingLength) * cornerRadius),
            y: current.y + ((outgoing.y / outgoingLength) * cornerRadius),
        };
        commands.push(`L ${beforeCorner.x.toFixed(1)} ${beforeCorner.y.toFixed(1)}`);
        commands.push(`Q ${current.x.toFixed(1)} ${current.y.toFixed(1)} ${afterCorner.x.toFixed(1)} ${afterCorner.y.toFixed(1)}`);
    }
    const last = points[points.length - 1];
    commands.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`);
    return commands.join(' ');
}

function gridPointKey(point) {
    return `${Math.round(point.x)}:${Math.round(point.y)}`;
}

export function snapMetroPoint(point, occupiedPoints = [], canvasSize = null) {
    const width = Math.max(METRO_MAP_WIDTH, Number(canvasSize?.width) || METRO_MAP_WIDTH);
    const height = Math.max(METRO_MAP_HEIGHT, Number(canvasSize?.height) || METRO_MAP_HEIGHT);
    const minX = METRO_GRID_SIZE;
    const minY = METRO_GRID_SIZE;
    const maxX = width - METRO_GRID_SIZE;
    const maxY = height - METRO_GRID_SIZE;
    const origin = {
        x: clamp(Math.round((Number(point?.x) || minX) / METRO_GRID_SIZE) * METRO_GRID_SIZE, minX, maxX),
        y: clamp(Math.round((Number(point?.y) || minY) / METRO_GRID_SIZE) * METRO_GRID_SIZE, minY, maxY),
    };
    const occupied = new Set(occupiedPoints.map(gridPointKey));
    if (!occupied.has(gridPointKey(origin))) return origin;

    const maxRadius = Math.max(
        Math.ceil(width / METRO_GRID_SIZE),
        Math.ceil(height / METRO_GRID_SIZE),
    );
    for (let radius = 1; radius <= maxRadius; radius += 1) {
        const candidates = [];
        for (let dx = -radius; dx <= radius; dx += 1) {
            for (let dy = -radius; dy <= radius; dy += 1) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
                const candidate = {
                    x: origin.x + (dx * METRO_GRID_SIZE),
                    y: origin.y + (dy * METRO_GRID_SIZE),
                };
                if (candidate.x < minX || candidate.x > maxX || candidate.y < minY || candidate.y > maxY) continue;
                if (!occupied.has(gridPointKey(candidate))) candidates.push(candidate);
            }
        }
        candidates.sort((a, b) => (
            Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y)
        ));
        if (candidates[0]) return candidates[0];
    }
    return origin;
}

export function getMetroMagneticPosition(point, occupiedPoints = [], radius = 38, canvasSize = null) {
    const width = Math.max(METRO_MAP_WIDTH, Number(canvasSize?.width) || METRO_MAP_WIDTH);
    const height = Math.max(METRO_MAP_HEIGHT, Number(canvasSize?.height) || METRO_MAP_HEIGHT);
    const rawPoint = {
        x: clamp(Number(point?.x) || METRO_GRID_SIZE, METRO_GRID_SIZE, width - METRO_GRID_SIZE),
        y: clamp(Number(point?.y) || METRO_GRID_SIZE, METRO_GRID_SIZE, height - METRO_GRID_SIZE),
    };
    const snapTarget = snapMetroPoint(rawPoint, occupiedPoints, { width, height });
    const distance = Math.hypot(rawPoint.x - snapTarget.x, rawPoint.y - snapTarget.y);
    const coreRadius = 9;
    if (distance >= radius) {
        return { ...rawPoint, isSnapped: false, magnetStrength: 0, snapTarget };
    }
    if (distance <= coreRadius) {
        return { ...snapTarget, isSnapped: true, magnetStrength: 1, snapTarget };
    }

    const normalized = 1 - ((distance - coreRadius) / (radius - coreRadius));
    const eased = normalized * normalized * (3 - (2 * normalized));
    const strength = eased * 0.76;
    return {
        x: rawPoint.x + ((snapTarget.x - rawPoint.x) * strength),
        y: rawPoint.y + ((snapTarget.y - rawPoint.y) * strength),
        isSnapped: false,
        magnetStrength: strength,
        snapTarget,
    };
}

function simplifyGridPath(points) {
    const result = [];
    points.forEach((point) => {
        const previous = result[result.length - 1];
        if (previous && previous.x === point.x && previous.y === point.y) {
            if (point.isStation) result[result.length - 1] = { ...previous, ...point, isStation: true };
            return;
        }
        const beforePrevious = result[result.length - 2];
        if (
            beforePrevious
            && !previous.isStation
            && ((beforePrevious.x === previous.x && previous.x === point.x)
                || (beforePrevious.y === previous.y && previous.y === point.y))
        ) {
            result[result.length - 1] = point;
            return;
        }
        result.push(point);
    });
    return result;
}

function buildGridRoute(stations, lineKey) {
    if (!stations.length) return [];
    const points = [{ x: stations[0].x, y: stations[0].y, isStation: true, stationId: stations[0].trackId }];
    for (let index = 1; index < stations.length; index += 1) {
        const start = stations[index - 1];
        const end = stations[index];
        if (start.x !== end.x && start.y !== end.y) {
            const horizontalFirst = hashText(`${lineKey}:${index}`) % 2 === 0;
            points.push(horizontalFirst
                ? { x: end.x, y: start.y }
                : { x: start.x, y: end.y });
        }
        points.push({ x: end.x, y: end.y, isStation: true, stationId: end.trackId });
    }
    return simplifyGridPath(points);
}

function buildSeedLayout(map, trackById, canvasSize) {
    const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const stationsByTrackId = new Map();
    const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0.82, y: -1 },
        { x: -0.82, y: 1 },
        { x: 0.82, y: 1 },
        { x: -0.82, y: -1 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
    ];
    const seedTrack = trackById.get(map.seedTrackId);
    if (seedTrack) {
        stationsByTrackId.set(seedTrack.id, {
            id: `station-${seedTrack.id}`,
            trackId: seedTrack.id,
            track: seedTrack,
            x: center.x,
            y: center.y,
            lineKeys: map.lines.map((line) => line.key),
            isTransfer: true,
            isSeed: true,
        });
    }

    const lines = map.lines.map((line, index) => {
        const direction = directions[index % directions.length];
        const endX = direction.x * (Math.abs(direction.x) < 0.1 ? 0 : 610);
        const endY = direction.y * (Math.abs(direction.y) < 0.1 ? 0 : 330);
        const end = {
            x: clamp(center.x + endX, 120, canvasSize.width - 120),
            y: clamp(center.y + endY, 110, canvasSize.height - 110),
        };
        const points = direction.x && direction.y
            ? [
                center,
                { x: center.x + (direction.x * 165), y: center.y },
                end,
            ]
            : [center, end];
        const stationIds = seedTrack ? [seedTrack.id] : [];
        line.trackIds.forEach((trackId, trackIndex) => {
            const track = trackById.get(trackId);
            if (!track) return;
            const position = pointAlongPolyline(points, (trackIndex + 1) / Math.max(1, line.trackIds.length));
            stationsByTrackId.set(trackId, {
                id: `station-${trackId}`,
                trackId,
                track,
                x: position.x,
                y: position.y,
                lineKeys: [line.key],
                isTransfer: false,
                isSeed: false,
            });
            stationIds.push(trackId);
        });
        return {
            ...line,
            pathData: pathFromPoints(points),
            routePoints: points,
            stationIds,
            labelPoint: end,
        };
    });

    return { lines, stations: [...stationsByTrackId.values()] };
}

function buildTasteLayout(map, trackById, canvasSize) {
    const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const transferIds = map.transferIds.filter((trackId) => trackById.has(trackId));
    const hubSpan = Math.min(640, Math.max(0, (transferIds.length - 1) * 190));
    const hubs = transferIds.map((trackId, index) => ({
        trackId,
        x: transferIds.length <= 1
            ? center.x
            : center.x - (hubSpan / 2) + ((hubSpan * index) / (transferIds.length - 1)),
        y: center.y,
    }));
    const lineHubMap = new Map(map.lines.map((line) => [line.key, []]));
    hubs.forEach((hub, index) => {
        const branchIndex = map.lines.length > 1 ? 1 + (index % (map.lines.length - 1)) : 0;
        [0, branchIndex].forEach((lineIndex) => {
            const line = map.lines[lineIndex];
            if (line && !lineHubMap.get(line.key).some((item) => item.trackId === hub.trackId)) {
                lineHubMap.get(line.key).push(hub);
            }
        });
    });

    const stationsByTrackId = new Map();
    hubs.forEach((hub) => {
        const lineKeys = map.lines
            .filter((line) => lineHubMap.get(line.key).some((item) => item.trackId === hub.trackId))
            .map((line) => line.key);
        stationsByTrackId.set(hub.trackId, {
            id: `station-${hub.trackId}`,
            trackId: hub.trackId,
            track: trackById.get(hub.trackId),
            x: hub.x,
            y: hub.y,
            lineKeys,
            isTransfer: lineKeys.length > 1,
            isSeed: false,
        });
    });

    const branchDirections = [
        { x: 0.82, y: 1 },
        { x: 0.82, y: -1 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: -0.82, y: 1 },
        { x: -0.82, y: -1 },
    ];
    const lines = map.lines.map((line, index) => {
        const direction = index === 0 ? { x: 1, y: 0 } : branchDirections[(index - 1) % branchDirections.length];
        const lineHubs = [...(lineHubMap.get(line.key) || [])].sort((a, b) => a.x - b.x);
        const anchor = lineHubs.length
            ? {
                x: lineHubs.reduce((sum, hub) => sum + hub.x, 0) / lineHubs.length,
                y: center.y,
            }
            : {
                x: clamp(center.x - 470 + (index * 190), 280, canvasSize.width - 280),
                y: center.y,
            };
        const start = index === 0
            ? { x: center.x - 670, y: center.y }
            : {
                x: clamp(anchor.x - (direction.x * 430), 110, canvasSize.width - 110),
                y: clamp(anchor.y - (direction.y * 335), 105, canvasSize.height - 105),
            };
        const end = index === 0
            ? { x: center.x + 670, y: center.y }
            : {
                x: clamp(anchor.x + (direction.x * 430), 110, canvasSize.width - 110),
                y: clamp(anchor.y + (direction.y * 335), 105, canvasSize.height - 105),
            };
        const points = index === 0
            ? [start, ...lineHubs.map((hub) => ({ x: hub.x, y: hub.y })), end]
            : [
                start,
                ...lineHubs.map((hub) => ({ x: hub.x, y: hub.y })),
                end,
            ];
        const stationIds = [];

        line.trackIds.forEach((trackId, trackIndex) => {
            const track = trackById.get(trackId);
            if (!track) return;
            const ratio = line.trackIds.length <= 1 ? 0.5 : trackIndex / (line.trackIds.length - 1);
            let position = pointAlongPolyline(points, ratio);
            const tooCloseToHub = lineHubs.some((hub) => Math.hypot(position.x - hub.x, position.y - hub.y) < 34);
            if (tooCloseToHub) position = pointAlongPolyline(points, clamp(ratio + 0.035, 0.04, 0.96));
            stationsByTrackId.set(trackId, {
                id: `station-${trackId}`,
                trackId,
                track,
                x: position.x,
                y: position.y,
                lineKeys: [line.key],
                isTransfer: false,
                isSeed: false,
            });
            stationIds.push(trackId);
        });
        lineHubs.forEach((hub) => stationIds.push(hub.trackId));
        stationIds.sort((a, b) => {
            const stationA = stationsByTrackId.get(a);
            const stationB = stationsByTrackId.get(b);
            return progressAlongPolyline(stationA, points) - progressAlongPolyline(stationB, points);
        });

        return {
            ...line,
            pathData: pathFromPoints(points),
            routePoints: points,
            stationIds,
            labelPoint: index % 2 === 0 ? end : start,
        };
    });

    return { lines, stations: [...stationsByTrackId.values()] };
}

function applyGridStationPositions(map, result, canvasSize, { transientStationId = null } = {}) {
    const savedPositions = map?.stationPositions || {};
    const occupiedPoints = [];
    const stations = result.stations.map((station) => {
        const saved = savedPositions[station.trackId];
        const requested = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
            ? saved
            : station;
        const preserveFreePosition = station.trackId === transientStationId;
        const positioned = preserveFreePosition
            ? {
                x: clamp(requested.x, METRO_GRID_SIZE, canvasSize.width - METRO_GRID_SIZE),
                y: clamp(requested.y, METRO_GRID_SIZE, canvasSize.height - METRO_GRID_SIZE),
            }
            : snapMetroPoint(requested, occupiedPoints, canvasSize);
        positioned.x = clamp(positioned.x, METRO_GRID_SIZE, canvasSize.width - METRO_GRID_SIZE);
        occupiedPoints.push(preserveFreePosition ? snapMetroPoint(positioned, [], canvasSize) : positioned);
        return {
            ...station,
            x: positioned.x,
            y: positioned.y,
        };
    });
    const stationById = new Map(stations.map((station) => [station.trackId, station]));
    const lines = result.lines.map((line) => {
        const stationIds = unique(line.stationIds).filter((trackId) => stationById.has(trackId));
        const routeStations = stationIds.map((trackId) => stationById.get(trackId));
        const routePoints = buildGridRoute(routeStations, line.key);
        return {
            ...line,
            stationIds,
            routePoints,
            pathData: roundedPathFromPoints(routePoints),
            labelPoint: routePoints[routePoints.length - 1] || line.labelPoint,
        };
    });
    return { lines, stations };
}

export function buildMetroMapLayout(map, tracks, options = {}) {
    if (!map) return { width: METRO_MAP_WIDTH, height: METRO_MAP_HEIGHT, lines: [], stations: [] };
    const canvasSize = getMetroCanvasSize(map);
    const trackById = new Map((Array.isArray(tracks) ? tracks : []).map((track) => [track.id, track]));
    const result = map.mode === 'seed'
        ? buildSeedLayout(map, trackById, canvasSize)
        : buildTasteLayout(map, trackById, canvasSize);
    const positioned = applyGridStationPositions(map, result, canvasSize, options);
    return {
        width: canvasSize.width,
        height: canvasSize.height,
        ...positioned,
    };
}

export function reorderMetroStationOnLine(map, tracks, trackId, position) {
    if (!map || !trackId || !position) return map;
    const targetLine = map.lines.find((line) => line.trackIds.includes(trackId));
    if (!targetLine || targetLine.trackIds.length < 2) return map;

    const remainingIds = targetLine.trackIds.filter((id) => id !== trackId);
    const previewMap = {
        ...map,
        lines: map.lines.map((line) => line.key === targetLine.key
            ? { ...line, trackIds: remainingIds }
            : line),
    };
    const previewLayout = buildMetroMapLayout(previewMap, tracks);
    const previewLine = previewLayout.lines.find((line) => line.key === targetLine.key);
    if (!previewLine || previewLine.routePoints.length < 2) return map;

    const projection = projectPointOnPolyline(position, previewLine.routePoints);
    if (typeof projection === 'number' || projection.distance > METRO_GRID_SIZE * 1.5) return map;

    const stationById = new Map(previewLayout.stations.map((station) => [station.trackId, station]));
    const orderedRemaining = remainingIds
        .map((id, originalIndex) => ({
            id,
            originalIndex,
            progress: progressAlongPolyline(stationById.get(id), previewLine.routePoints),
        }))
        .sort((a, b) => (a.progress - b.progress) || (a.originalIndex - b.originalIndex));
    const insertionIndex = orderedRemaining.filter((item) => item.progress < projection.progress).length;
    const nextTrackIds = orderedRemaining.map((item) => item.id);
    nextTrackIds.splice(insertionIndex, 0, trackId);

    if (nextTrackIds.every((id, index) => id === targetLine.trackIds[index])) return map;
    return {
        ...map,
        lines: map.lines.map((line) => line.key === targetLine.key
            ? { ...line, trackIds: nextTrackIds }
            : line),
    };
}

export function swapMetroStationsOnLine(map, firstTrackId, secondTrackId) {
    if (!map || !firstTrackId || !secondTrackId || firstTrackId === secondTrackId) return map;
    let swapped = false;
    const lines = map.lines.map((line) => {
        const firstIndex = line.trackIds.indexOf(firstTrackId);
        const secondIndex = line.trackIds.indexOf(secondTrackId);
        if (firstIndex < 0 || secondIndex < 0) return line;
        const trackIds = [...line.trackIds];
        [trackIds[firstIndex], trackIds[secondIndex]] = [trackIds[secondIndex], trackIds[firstIndex]];
        swapped = true;
        return { ...line, trackIds };
    });
    return swapped ? { ...map, lines } : map;
}

export function getMetroColor(index) {
    return METRO_COLORS[index % METRO_COLORS.length];
}
