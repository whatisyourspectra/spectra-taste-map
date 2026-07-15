const SUBWAY_SIZE = 1080;
const SUBWAY_CENTER = { x: 540, y: 540 };
const SUBWAY_MARGIN = 84;
const SUBWAY_LINE_LIMIT = 8;
const SUBWAY_HUB_LIMIT = 12;
const SUBWAY_GRID = 36;
const SUBWAY_ROUTE_EXTENT = 432;
const SUBWAY_LANE_SWAY = 64;
const SUBWAY_CORE_PADDING = 54;
const SUBWAY_STATION_TARGET_TRACKS = 25;
const SUBWAY_STATION_MIN_TRACKS = 20;
const SUBWAY_STATION_MAX_TRACKS = 30;
const SUBWAY_CLUSTER_ITERATIONS = 6;
const SUBWAY_FEATURE_KEYS = [
    'valence',
    'energy',
    'danceability',
    'acousticness',
    'instrumentalness',
];

const LINE_PALETTE = [
    '#4da3ff',
    '#ff7a59',
    '#5dd39e',
    '#ffd166',
    '#8f7cff',
    '#ff5fa2',
    '#48d3f4',
    '#ff9966',
    '#9ad94f',
    '#c084fc',
];

const VARIANT_THEMES = {
    subway: {
        background: '#06111c',
        panel: '#0d1a29',
        shell: '#dce9f8',
        muted: '#7f91a6',
        loop: 'rgba(187, 210, 239, 0.34)',
        glow: 'rgba(77, 163, 255, 0.18)',
        stationFill: '#f7fbff',
        stationStroke: '#06111c',
    },
    constellation: {
        background: '#070817',
        panel: '#11142b',
        shell: '#f7edff',
        muted: '#9da7c5',
        loop: 'rgba(204, 187, 255, 0.28)',
        glow: 'rgba(155, 124, 255, 0.2)',
        stationFill: '#fff9e8',
        stationStroke: '#070817',
    },
};

function hashText(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function clamp01(value, fallback = 0.5) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(1, Math.max(0, n));
}

function normalizeGenre(genre) {
    return String(genre || '').trim().toLowerCase();
}

function titleizeGenre(genre) {
    return String(genre || '')
        .split(/[\s/-]+/)
        .filter(Boolean)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
}

function uniq(values) {
    return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function projectOnAxis(rawX, rawY, angle) {
    const dx = rawX - 0.5;
    const dy = rawY - 0.5;
    return dx * Math.cos(angle) + dy * Math.sin(angle);
}

function projectPerpAxis(rawX, rawY, angle) {
    const dx = rawX - 0.5;
    const dy = rawY - 0.5;
    return -dx * Math.sin(angle) + dy * Math.cos(angle);
}

function createLineColor(key, index) {
    if (LINE_PALETTE[index]) return LINE_PALETTE[index];
    const hue = hashText(key) % 360;
    return `hsl(${hue} 82% 64%)`;
}

function resolveTrackGenres(track, cluster) {
    const direct = uniq((track?.genres || []).map(normalizeGenre)).slice(0, 5);
    if (direct.length) return direct;
    const clusterGenres = uniq((cluster?.topGenres || []).map(normalizeGenre)).slice(0, 5);
    if (clusterGenres.length) return clusterGenres;
    return [];
}

function getTrackFeatureVector(track) {
    return SUBWAY_FEATURE_KEYS.map((key) => clamp01(track?.[key], key === 'instrumentalness' ? 0 : 0.5));
}

function getStationGroupCount(trackCount) {
    if (trackCount <= SUBWAY_STATION_MAX_TRACKS) return 1;

    const minimumGroups = Math.ceil(trackCount / SUBWAY_STATION_MAX_TRACKS);
    const maximumGroups = Math.floor(trackCount / SUBWAY_STATION_MIN_TRACKS);
    const targetGroups = Math.max(1, Math.round(trackCount / SUBWAY_STATION_TARGET_TRACKS));

    if (minimumGroups <= maximumGroups) {
        return clampRange(targetGroups, minimumGroups, maximumGroups);
    }
    return targetGroups;
}

function getBalancedGroupSizes(trackCount, groupCount) {
    const baseSize = Math.floor(trackCount / groupCount);
    const remainder = trackCount % groupCount;
    return Array.from({ length: groupCount }, (_, index) => baseSize + (index < remainder ? 1 : 0));
}

function createGroupCentroid(members) {
    const safeMembers = members.length ? members : [];
    const divisor = Math.max(1, safeMembers.length);
    const features = SUBWAY_FEATURE_KEYS.map((_, featureIndex) => (
        safeMembers.reduce((sum, member) => sum + member.features[featureIndex], 0) / divisor
    ));
    const genreWeights = new Map();
    const clusterWeights = new Map();

    safeMembers.forEach((member) => {
        member.genres.slice(0, 6).forEach((genre) => {
            genreWeights.set(genre, (genreWeights.get(genre) || 0) + (1 / divisor));
        });
        if (member.clusterId !== undefined && member.clusterId !== null) {
            clusterWeights.set(member.clusterId, (clusterWeights.get(member.clusterId) || 0) + (1 / divisor));
        }
    });

    return { features, genreWeights, clusterWeights };
}

function getGroupDistance(item, centroid) {
    const featureDistance = Math.sqrt(item.features.reduce((sum, value, index) => {
        const delta = value - centroid.features[index];
        return sum + (delta * delta);
    }, 0) / item.features.length);

    const itemGenreSet = new Set(item.genres.slice(0, 6));
    const centroidGenres = [...centroid.genreWeights.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    let genreIntersection = 0;
    let genreUnion = itemGenreSet.size;
    centroidGenres.forEach(([genre, weight]) => {
        if (itemGenreSet.has(genre)) {
            genreIntersection += Math.min(1, weight);
            genreUnion += Math.max(1, weight) - 1;
        } else {
            genreUnion += weight;
        }
    });
    const genreDistance = genreUnion > 0 ? 1 - (genreIntersection / genreUnion) : 0.5;
    const clusterDistance = item.clusterId !== undefined && item.clusterId !== null
        ? 1 - (centroid.clusterWeights.get(item.clusterId) || 0)
        : 0.5;

    return (featureDistance * 0.58) + (genreDistance * 0.36) + (clusterDistance * 0.06);
}

function chooseInitialCentroids(items, groupCount) {
    const first = [...items].sort((a, b) => (
        b.popularity - a.popularity || hashText(a.id) - hashText(b.id)
    ))[0];
    const seeds = [first];

    while (seeds.length < groupCount) {
        let nextSeed = null;
        let nextDistance = -1;
        items.forEach((item) => {
            if (seeds.includes(item)) return;
            const nearestDistance = Math.min(...seeds.map((seed) => (
                getGroupDistance(item, createGroupCentroid([seed]))
            )));
            if (nearestDistance > nextDistance) {
                nextDistance = nearestDistance;
                nextSeed = item;
            }
        });
        if (!nextSeed) break;
        seeds.push(nextSeed);
    }

    return seeds.map((seed) => createGroupCentroid([seed]));
}

function assignTracksToBalancedGroups(items, centroids, targetSizes) {
    const groups = centroids.map(() => []);
    const rankedItems = items.map((item) => {
        const distances = centroids
            .map((centroid, index) => ({ index, distance: getGroupDistance(item, centroid) }))
            .sort((a, b) => a.distance - b.distance);
        const confidence = (distances[1]?.distance ?? 1) - distances[0].distance;
        return { item, distances, confidence };
    }).sort((a, b) => b.confidence - a.confidence || hashText(a.item.id) - hashText(b.item.id));

    rankedItems.forEach(({ item, distances }) => {
        const destination = distances.find(({ index }) => groups[index].length < targetSizes[index]);
        if (destination) groups[destination.index].push(item);
    });

    return groups;
}

function groupTracksIntoStations(items) {
    const groupCount = getStationGroupCount(items.length);
    const targetSizes = getBalancedGroupSizes(items.length, groupCount);
    let centroids = chooseInitialCentroids(items, groupCount);
    let groups = [];

    for (let iteration = 0; iteration < SUBWAY_CLUSTER_ITERATIONS; iteration += 1) {
        groups = assignTracksToBalancedGroups(items, centroids, targetSizes);
        centroids = groups.map((members) => createGroupCentroid(members));
    }

    return groups;
}

function getMoodLabel(features) {
    const [valence, energy, , acousticness, instrumentalness] = features;
    if (instrumentalness >= 0.62) return 'Atmospheric';
    if (energy >= 0.7 && valence >= 0.58) return 'Upbeat';
    if (energy >= 0.7 && valence < 0.45) return 'Intense';
    if (energy <= 0.35 && acousticness >= 0.55) return 'Acoustic';
    if (energy <= 0.38) return 'Chill';
    if (valence <= 0.35) return 'Moody';
    if (valence >= 0.7) return 'Bright';
    return 'Flow';
}

function buildStationName(genres, features) {
    const primaryGenre = titleizeGenre(genres[0] || 'Mixed');
    const secondaryGenre = genres[1] ? titleizeGenre(genres[1]) : getMoodLabel(features);
    return `${primaryGenre} · ${secondaryGenre}`;
}

function buildPathData(points) {
    const clean = [];
    points.forEach((point) => {
        if (!point) return;
        const prev = clean[clean.length - 1];
        if (prev && Math.abs(prev.x - point.x) < 1 && Math.abs(prev.y - point.y) < 1) return;
        clean.push({
            x: Math.round(point.x * 10) / 10,
            y: Math.round(point.y * 10) / 10,
        });
    });
    if (!clean.length) return '';
    let d = `M ${clean[0].x} ${clean[0].y}`;
    for (let i = 1; i < clean.length; i += 1) {
        const prev = clean[i - 1];
        const next = clean[i];
        const dx = Math.abs(next.x - prev.x);
        const dy = Math.abs(next.y - prev.y);
        if (dx < 2 || dy < 2) {
            d += ` L ${next.x} ${next.y}`;
            continue;
        }
        if (dx >= dy) {
            d += ` L ${next.x} ${prev.y} L ${next.x} ${next.y}`;
        } else {
            d += ` L ${prev.x} ${next.y} L ${next.x} ${next.y}`;
        }
    }
    return d;
}

function chooseLabelPoint(points, center = SUBWAY_CENTER) {
    if (!points.length) return center;
    const sorted = [...points].sort((a, b) => {
        const da = Math.hypot(a.x - center.x, a.y - center.y);
        const db = Math.hypot(b.x - center.x, b.y - center.y);
        return db - da;
    });
    return sorted[0];
}

function clampCoord(value, size = SUBWAY_SIZE, margin = SUBWAY_MARGIN) {
    return Math.min(size - margin, Math.max(margin, value));
}

function clampRange(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function snapToGrid(value, grid = SUBWAY_GRID) {
    return Math.round(value / grid) * grid;
}

function snapCoord(value, size = SUBWAY_SIZE, margin = SUBWAY_MARGIN, grid = SUBWAY_GRID) {
    return clampCoord(snapToGrid(value, grid), size, margin);
}

function shapeProjection(value) {
    const abs = Math.abs(value);
    return Math.sign(value) * Math.pow(abs, 0.84);
}

function applyFocusedLineLayout(line, stationById, {
    canvasSize,
    margin,
    center,
}) {
    if (!line?.stationIds?.length) return;
    const orderedStations = line.stationIds
        .map((stationId) => stationById.get(stationId))
        .filter(Boolean);
    if (orderedStations.length < 2) return;

    const count = orderedStations.length;
    const angle = line.angle ?? 0;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const baseSamples = orderedStations.map((station) => ({
        station,
        x: station.mapX,
        y: station.mapY,
        along: ((station.mapX - center.x) * dirX) + ((station.mapY - center.y) * dirY),
        perp: ((station.mapX - center.x) * perpX) + ((station.mapY - center.y) * perpY),
    }));
    const alongValues = baseSamples.map((sample) => sample.along);
    const minAlong = Math.min(...alongValues);
    const maxAlong = Math.max(...alongValues);
    const originalSpan = Math.max(24, maxAlong - minAlong);
    const positiveGaps = [];
    for (let i = 1; i < count; i += 1) {
        positiveGaps.push(Math.max(0, alongValues[i] - alongValues[i - 1]));
    }
    const averageBaseGap = positiveGaps.length
        ? positiveGaps.reduce((sum, value) => sum + value, 0) / positiveGaps.length
        : originalSpan;
    const targetGap = clampRange(averageBaseGap * 1.28, 14, 24);
    const denseGapThreshold = clampRange(targetGap * 0.76, 10, 18);
    const groups = [];
    let groupStart = null;

    for (let i = 1; i < count; i += 1) {
        const gap = alongValues[i] - alongValues[i - 1];
        if (gap < denseGapThreshold) {
            if (groupStart === null) groupStart = i - 1;
            continue;
        }
        if (groupStart !== null) {
            const groupEnd = i - 1;
            if ((groupEnd - groupStart + 1) >= 3) {
                groups.push({ start: groupStart, end: groupEnd });
            }
            groupStart = null;
        }
    }

    if (groupStart !== null) {
        const groupEnd = count - 1;
        if ((groupEnd - groupStart + 1) >= 3) {
            groups.push({ start: groupStart, end: groupEnd });
        }
    }

    const adjustedAlong = [...alongValues];
    const adjustedPerp = baseSamples.map((sample) => sample.perp);
    const groupByIndex = new Map();

    groups.forEach((group) => {
        const size = group.end - group.start + 1;
        const baseStart = alongValues[group.start];
        const baseEnd = alongValues[group.end];
        const baseSpan = Math.max(8, baseEnd - baseStart);
        const baseAverageGap = size > 1 ? baseSpan / (size - 1) : baseSpan;
        const severity = clampRange((targetGap - baseAverageGap) / Math.max(1, targetGap), 0.18, 1);
        const desiredLocalGap = clampRange(targetGap * (0.88 + (severity * 0.18)), 14, 26);
        const targetLocalSpan = Math.max(baseSpan, desiredLocalGap * (size - 1));
        const centerAlong = (baseStart + baseEnd) / 2;
        const laneCount = severity > 0.78 && size >= 8 ? 3 : 2;
        const laneGap = clampRange(8 + (severity * 8), 8, 16);
        const waveAmplitude = clampRange(3 + (severity * 6), 3, 9);

        for (let localIndex = 0; localIndex < size; localIndex += 1) {
            const index = group.start + localIndex;
            const station = orderedStations[index];
            const ratio = size > 1 ? localIndex / (size - 1) : 0.5;
            const centered = (ratio * 2) - 1;
            const targetAlong = centerAlong + (centered * (targetLocalSpan / 2));
            const isAnchor = localIndex === 0 || localIndex === size - 1 || station.isInterchange;
            const alongBlend = isAnchor ? (0.06 + (severity * 0.06)) : (0.12 + (severity * 0.14));
            adjustedAlong[index] = (alongValues[index] * (1 - alongBlend)) + (targetAlong * alongBlend);

            const laneIndex = laneCount === 2
                ? (localIndex % 2 === 0 ? -0.5 : 0.5)
                : ((localIndex % 3) - 1);
            const wave = Math.sin(ratio * Math.PI) * waveAmplitude;
            const rawPerpBias = (station.rawY - 0.5) * 6;
            const perpShift = (laneIndex * laneGap) + wave + rawPerpBias;
            const anchorDamping = isAnchor ? 0.45 : 1;
            adjustedPerp[index] = baseSamples[index].perp + (perpShift * anchorDamping);
            groupByIndex.set(index, { laneIndex, severity });
        }
    });

    orderedStations.forEach((station, index) => {
        const finalAlong = adjustedAlong[index];
        const finalPerp = adjustedPerp[index];
        const groupMeta = groupByIndex.get(index);
        station.mapX = clampCoord(center.x + (dirX * finalAlong) + (perpX * finalPerp), canvasSize, margin);
        station.mapY = clampCoord(center.y + (dirY * finalAlong) + (perpY * finalPerp), canvasSize, margin);
        station.focusLaneIndex = groupMeta?.laneIndex || 0;
        station.focusAlongNormalized = originalSpan > 0
            ? (((alongValues[index] - minAlong) / originalSpan) * 2) - 1
            : 0;
    });
}

function buildSchematicTemplate(index) {
    const templates = [
        { angle: -Math.PI / 2, laneOffset: -170 },
        { angle: -Math.PI / 4, laneOffset: -130 },
        { angle: 0, laneOffset: -152 },
        { angle: Math.PI / 4, laneOffset: -70 },
        { angle: Math.PI / 2, laneOffset: 170 },
        { angle: (Math.PI * 3) / 4, laneOffset: 130 },
        { angle: Math.PI, laneOffset: 152 },
        { angle: -(Math.PI * 3) / 4, laneOffset: 70 },
    ];
    return templates[index % templates.length];
}

function buildCoreFramePath(hubs, { size = SUBWAY_SIZE, margin = SUBWAY_MARGIN, corePadding = SUBWAY_CORE_PADDING } = {}) {
    if (!hubs.length) return '';
    const xs = hubs.map((station) => station.mapX);
    const ys = hubs.map((station) => station.mapY);
    const left = snapCoord(Math.min(...xs) - corePadding, size, margin);
    const right = snapCoord(Math.max(...xs) + corePadding, size, margin);
    const top = snapCoord(Math.min(...ys) - corePadding, size, margin);
    const bottom = snapCoord(Math.max(...ys) + corePadding, size, margin);
    if ((right - left) < SUBWAY_GRID * 2 || (bottom - top) < SUBWAY_GRID * 2) return '';
    return `${buildPathData([
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
        { x: left, y: top },
    ])} Z`;
}

export function getSubwayVariantTheme(variant) {
    return VARIANT_THEMES[variant] || VARIANT_THEMES.subway;
}

export function buildTasteMapSubwaySystem({
    tracks,
    activeTrackIds,
    assignmentByTrackId,
    clusterById,
    xAxis = 'valence',
    yAxis = 'energy',
    maxLines = SUBWAY_LINE_LIMIT,
    focusLineKey = null,
}) {
    const scopedTracks = (Array.isArray(tracks) ? tracks : [])
        .filter((track) => track?.id && track?.name)
        .filter((track) => !activeTrackIds || activeTrackIds.has(track.id));

    if (scopedTracks.length < SUBWAY_STATION_MIN_TRACKS) return null;

    const trackItems = scopedTracks.map((track) => {
        const clusterId = assignmentByTrackId?.get(track.id);
        const cluster = clusterId !== undefined && clusterId !== null ? clusterById?.[clusterId] : null;
        const genres = resolveTrackGenres(track, cluster);
        return {
            id: track.id,
            track,
            cluster,
            clusterId,
            genres,
            popularity: Number(track.popularity) || 0,
            features: getTrackFeatureVector(track),
            rawX: clamp01(track?.[xAxis], 0.5),
            rawY: clamp01(track?.[yAxis], 0.5),
        };
    });

    const genreCount = new Map();
    trackItems.forEach((item) => {
        item.genres.forEach((genre) => {
            genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
        });
    });

    const lineKeys = [...genreCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxLines)
        .map(([genre]) => genre);

    if (!lineKeys.length) return null;

    const lineKeySet = new Set(lineKeys);
    const stations = groupTracksIntoStations(trackItems)
        .map((members, stationIndex) => {
            const centroid = createGroupCentroid(members);
            const groupGenreCount = new Map();
            members.forEach((member) => {
                member.genres.forEach((genre) => {
                    groupGenreCount.set(genre, (groupGenreCount.get(genre) || 0) + 1);
                });
            });
            const genres = [...groupGenreCount.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .map(([genre]) => genre)
                .slice(0, 6);
            const minimumLineSupport = Math.max(2, Math.ceil(members.length * 0.16));
            let lineMembership = [...groupGenreCount.entries()]
                .filter(([genre, count]) => lineKeySet.has(genre) && count >= minimumLineSupport)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([genre]) => genre);
            if (!lineMembership.length) {
                const fallbackLine = genres.find((genre) => lineKeySet.has(genre));
                lineMembership = [fallbackLine || lineKeys[0]];
            }

            const representativeItems = [...members]
                .sort((a, b) => (
                    getGroupDistance(a, centroid) - getGroupDistance(b, centroid)
                    || b.popularity - a.popularity
                ));
            const coverItem = representativeItems.find((item) => item.track.coverUrl) || representativeItems[0];
            const representativeTracks = representativeItems.slice(0, 6).map((item) => ({
                id: item.id,
                name: item.track.name,
                artists: item.track.artists || '',
                coverUrl: item.track.coverUrl || null,
            }));
            const averagePopularity = Math.round(
                members.reduce((sum, member) => sum + member.popularity, 0) / members.length,
            );
            const rawX = members.reduce((sum, member) => sum + member.rawX, 0) / members.length;
            const rawY = members.reduce((sum, member) => sum + member.rawY, 0) / members.length;
            const popularityRatio = averagePopularity / 100;
            const stationName = buildStationName(genres, centroid.features);
            const stationId = `station-${stationIndex}-${hashText(members.map((member) => member.id).sort().join('|')).toString(36)}`;
            const artistSummary = uniq(representativeItems.map((item) => item.track.artists || '')).slice(0, 3).join(' · ');

            return {
                id: stationId,
                trackName: stationName,
                artists: artistSummary,
                coverUrl: coverItem?.track.coverUrl || null,
                popularity: averagePopularity,
                rawX,
                rawY,
                genres,
                tracks: members.map((member) => member.track),
                trackCount: members.length,
                representativeTracks,
                lineKeys: lineMembership,
                primaryLineKey: lineMembership[0],
                lineCount: lineMembership.length,
                isInterchange: lineMembership.length > 1,
                bubbleSize: 6 + popularityRatio * 3 + Math.min(2, members.length / SUBWAY_STATION_TARGET_TRACKS),
                interchangeScore: (lineMembership.length * 28) + (averagePopularity * 0.5) + members.length,
            };
        })
        .filter(Boolean);

    if (!stations.length) return null;

    const stationNameTotals = new Map();
    stations.forEach((station) => {
        stationNameTotals.set(station.trackName, (stationNameTotals.get(station.trackName) || 0) + 1);
    });
    const stationNameSequence = new Map();
    stations.forEach((station) => {
        if ((stationNameTotals.get(station.trackName) || 0) < 2) return;
        const sequence = (stationNameSequence.get(station.trackName) || 0) + 1;
        stationNameSequence.set(station.trackName, sequence);
        station.trackName = `${station.trackName} ${sequence}`;
    });

    const stationById = new Map(stations.map((station) => [station.id, station]));

    const lines = lineKeys.map((key, index) => {
        const template = buildSchematicTemplate(index);
        const members = stations.filter((station) => station.lineKeys.includes(key));
        return {
            key,
            label: titleizeGenre(key),
            color: createLineColor(key, index),
            angle: template.angle,
            laneOffset: template.laneOffset,
            stationIds: members.map((station) => station.id),
            count: members.length,
            pathData: '',
            labelPoint: null,
        };
    });

    const maxLineStationCount = Math.max(1, ...lines.map((line) => line.count));
    const focusedLineCount = focusLineKey
        ? (lines.find((line) => line.key === focusLineKey)?.count || 0)
        : 0;
    const lineCount = lines.length;
    const spacingReferenceCount = Math.max(maxLineStationCount, focusLineKey ? Math.round(focusedLineCount * 1.25) : 0);
    const baseStationSpacing = spacingReferenceCount > 360 ? 11 : spacingReferenceCount > 220 ? 13 : spacingReferenceCount > 120 ? 16 : 22;
    const focusSpacingBoost = focusLineKey ? 1.24 : 1;
    const stationSpacing = baseStationSpacing * focusSpacingBoost;
    const routeExtent = Math.max(520, Math.min(5600, ((spacingReferenceCount - 1) * stationSpacing) / 2));
    const canvasSize = snapToGrid(Math.max(1800, Math.min(11200, (routeExtent + 340) * (focusLineKey ? 2.28 : 2))));
    const center = { x: canvasSize / 2, y: canvasSize / 2 };
    const margin = Math.max(84, Math.round(canvasSize * 0.05));
    const laneSway = Math.max(48, Math.min(140, 36 + (lineCount * 8)));
    const corePadding = Math.max(54, Math.round(canvasSize * 0.04));

    const positionCandidatesByStationId = new Map(stations.map((station) => [station.id, []]));

    lines.forEach((line) => {
        const angle = line.angle;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const perpX = -Math.sin(angle);
        const perpY = Math.cos(angle);
        const isFocusedLine = Boolean(focusLineKey) && line.key === focusLineKey;
        const focusExtentBoost = isFocusedLine ? 1.58 : (focusLineKey ? 0.92 : 1);
        const focusLaneBoost = isFocusedLine ? 1.22 : 1;
        const lineRouteExtent = routeExtent * focusExtentBoost;
        const lineLaneOffset = line.laneOffset * (isFocusedLine ? 1.12 : 1);
        const lineLaneSway = laneSway * focusLaneBoost;

        const members = line.stationIds
            .map((stationId) => stationById.get(stationId))
            .filter(Boolean);

        const orderedMembers = members
            .slice()
            .sort((a, b) => projectOnAxis(a.rawX, a.rawY, angle) - projectOnAxis(b.rawX, b.rawY, angle));

        const projections = orderedMembers.map((station) => projectOnAxis(station.rawX, station.rawY, angle));
        const minProjection = Math.min(...projections);
        const maxProjection = Math.max(...projections);
        const projectionSpan = Math.max(0.08, maxProjection - minProjection);

        orderedMembers.forEach((station, index) => {
            const projection = projectOnAxis(station.rawX, station.rawY, angle);
            const normalized = clampRange((((projection - minProjection) / projectionSpan) * 2) - 1, -1, 1);
            const shaped = shapeProjection(normalized);
            const sequenceRatio = orderedMembers.length > 1 ? index / (orderedMembers.length - 1) : 0.5;
            const sequenceNormalized = (sequenceRatio * 2) - 1;
            const alongMix = (shaped * 0.42) + (sequenceNormalized * 0.58);
            const perpendicularBias = projectPerpAxis(station.rawX, station.rawY, angle);
            const along = alongMix * lineRouteExtent;
            const lane = lineLaneOffset + (perpendicularBias * lineLaneSway);
            const candidate = {
                x: clampCoord(center.x + (dirX * along) + (perpX * lane), canvasSize, margin),
                y: clampCoord(center.y + (dirY * along) + (perpY * lane), canvasSize, margin),
            };
            positionCandidatesByStationId.get(station.id)?.push(candidate);
        });

        line.stationIds = orderedMembers.map((station) => station.id);
    });

    stations.forEach((station) => {
        const candidates = positionCandidatesByStationId.get(station.id) || [];
        if (!candidates.length) {
            station.mapX = center.x;
            station.mapY = center.y;
            return;
        }

        const average = candidates.reduce((accumulator, point) => ({
            x: accumulator.x + point.x,
            y: accumulator.y + point.y,
        }), { x: 0, y: 0 });

        const averagedX = average.x / candidates.length;
        const averagedY = average.y / candidates.length;
        const receivesFocusBoost = focusLineKey && station.lineKeys.includes(focusLineKey);
        const sharedPullBase = station.isInterchange ? 0.18 : 0.08;
        const sharedPull = receivesFocusBoost ? sharedPullBase * 0.55 : sharedPullBase;
        const finalX = (averagedX * (1 - sharedPull)) + (center.x * sharedPull);
        const finalY = (averagedY * (1 - sharedPull)) + (center.y * sharedPull);
        station.mapX = station.isInterchange
            ? snapCoord(finalX, canvasSize, margin)
            : clampCoord(Math.round(finalX * 10) / 10, canvasSize, margin);
        station.mapY = station.isInterchange
            ? snapCoord(finalY, canvasSize, margin)
            : clampCoord(Math.round(finalY * 10) / 10, canvasSize, margin);
    });

    const lineByKey = new Map(lines.map((line) => [line.key, line]));
    const occupancy = new Map();
    stations.forEach((station) => {
        const bucketKey = `${Math.round(station.mapX / 10)}:${Math.round(station.mapY / 10)}`;
        if (!occupancy.has(bucketKey)) occupancy.set(bucketKey, []);
        occupancy.get(bucketKey).push(station);
    });

    occupancy.forEach((bucket) => {
        if (bucket.length < 2) return;
        bucket
            .slice()
            .sort((a, b) => a.popularity - b.popularity)
            .forEach((station, index) => {
                const line = lineByKey.get(station.primaryLineKey);
                const angle = line?.angle ?? 0;
                const dirX = Math.cos(angle);
                const dirY = Math.sin(angle);
                const perpX = -Math.sin(angle);
                const perpY = Math.cos(angle);
                const centeredIndex = index - ((bucket.length - 1) / 2);
                const alongOffset = centeredIndex * 10;
                const laneOffset = ((index % 2 === 0 ? -1 : 1) * Math.floor((index + 1) / 2)) * 5;
                station.mapX = clampCoord(station.mapX + (dirX * alongOffset) + (perpX * laneOffset), canvasSize, margin);
                station.mapY = clampCoord(station.mapY + (dirY * alongOffset) + (perpY * laneOffset), canvasSize, margin);
            });
    });

    if (focusLineKey) {
        const focusedLine = lineByKey.get(focusLineKey);
        applyFocusedLineLayout(focusedLine, stationById, {
            canvasSize,
            margin,
            center,
        });
    }

    lines.forEach((line) => {
        const pathPoints = line.stationIds
            .map((stationId) => stationById.get(stationId))
            .filter(Boolean)
            .map((station) => ({
                x: station.mapX,
                y: station.mapY,
            }));
        line.pathData = buildPathData(pathPoints);
        line.labelPoint = chooseLabelPoint(pathPoints, center);
    });

    const hubStations = [...stations]
        .filter((station) => station.isInterchange)
        .sort((a, b) => b.interchangeScore - a.interchangeScore)
        .slice(0, SUBWAY_HUB_LIMIT);

    const coreLoopPath = buildCoreFramePath(hubStations, {
        size: canvasSize,
        margin,
        corePadding,
    });

    return {
        width: canvasSize,
        height: canvasSize,
        center,
        xAxis,
        yAxis,
        lines,
        stations,
        lineCount: lines.length,
        stationCount: stations.length,
        interchangeCount: stations.filter((station) => station.isInterchange).length,
        coreLoopPath: focusLineKey ? '' : coreLoopPath,
        focusLineKey,
    };
}

export function getVisibleSubwayView(system, { activeLineKeys = null, interchangesOnly = false } = {}) {
    if (!system) return { lines: [], stations: [] };
    const activeLineSet = Array.isArray(activeLineKeys) && activeLineKeys.length
        ? new Set(activeLineKeys)
        : null;
    const visibleLines = activeLineSet
        ? system.lines.filter((line) => activeLineSet.has(line.key))
        : system.lines;
    const visibleStations = system.stations.filter((station) => {
        if (activeLineSet && !station.lineKeys.some((key) => activeLineSet.has(key))) return false;
        if (interchangesOnly && !station.isInterchange) return false;
        return true;
    });
    const visibleStationIdSet = new Set(visibleStations.map((station) => station.id));
    return {
        lines: visibleLines.map((line) => ({
            ...line,
            stationIds: line.stationIds.filter((stationId) => visibleStationIdSet.has(stationId)),
        })),
        stations: visibleStations,
    };
}

export function getVisibleSubwayBounds(system, { activeLineKeys = null, interchangesOnly = false, padding = 120 } = {}) {
    if (!system) {
        return {
            minX: 0,
            minY: 0,
            maxX: SUBWAY_SIZE,
            maxY: SUBWAY_SIZE,
            centerX: SUBWAY_CENTER.x,
            centerY: SUBWAY_CENTER.y,
            viewSize: SUBWAY_SIZE,
        };
    }

    const { stations } = getVisibleSubwayView(system, { activeLineKeys, interchangesOnly });
    if (!stations.length) {
        return {
            minX: 0,
            minY: 0,
            maxX: system.width,
            maxY: system.height,
            centerX: system.center.x,
            centerY: system.center.y,
            viewSize: system.width,
        };
    }

    const xs = stations.map((station) => station.mapX);
    const ys = stations.map((station) => station.mapY);
    const minX = clampRange(Math.min(...xs) - padding, 0, system.width);
    const maxX = clampRange(Math.max(...xs) + padding, 0, system.width);
    const minY = clampRange(Math.min(...ys) - padding, 0, system.height);
    const maxY = clampRange(Math.max(...ys) + padding, 0, system.height);
    const viewSize = Math.min(system.width, Math.max(320, maxX - minX, maxY - minY));
    const half = viewSize / 2;

    return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: clampRange((minX + maxX) / 2, half, system.width - half),
        centerY: clampRange((minY + maxY) / 2, half, system.height - half),
        viewSize,
    };
}

function truncateSvgText(value, maxLength = 32) {
    const text = String(value || '').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function getSvgCardLayout(anchor, system, { width = 168, height = 34, offset = 22 } = {}) {
    const onLeftHalf = anchor.x < system.center.x;
    const onTopHalf = anchor.y < system.center.y;
    const rawX = onLeftHalf ? anchor.x + offset : anchor.x - width - offset;
    const rawY = onTopHalf ? anchor.y - height - 8 : anchor.y + 10;
    return {
        x: clampRange(rawX, 20, system.width - width - 20),
        y: clampRange(rawY, 20, system.height - height - 20),
    };
}

export function createTasteMapSubwaySvg({
    system,
    variant = 'subway',
    activeLineKeys = null,
    interchangesOnly = false,
    highlightedStationId = null,
}) {
    if (!system) return '';
    const theme = getSubwayVariantTheme(variant);
    const { lines, stations } = getVisibleSubwayView(system, { activeLineKeys, interchangesOnly });
    const stationById = new Map(system.stations.map((station) => [station.id, station]));
    const stationIdSet = new Set(stations.map((station) => station.id));
    const labelStations = stations
        .filter((station) => station.isInterchange || station.id === highlightedStationId)
        .slice(0, 12);

    const starfield = variant === 'constellation'
        ? Array.from({ length: 44 }, (_, index) => {
            const x = 36 + ((hashText(`sx:${index}`) % 1000) / 1000) * (system.width - 72);
            const y = 36 + ((hashText(`sy:${index}`) % 1000) / 1000) * (system.height - 72);
            const r = 0.9 + ((hashText(`sr:${index}`) % 1000) / 1000) * 2.4;
            const opacity = 0.24 + ((hashText(`so:${index}`) % 1000) / 1000) * 0.5;
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#ffffff" opacity="${opacity.toFixed(2)}" />`;
        }).join('')
        : '';

    const gridMarkup = Array.from({ length: Math.ceil(system.width / 120) + 2 }, (_, index) => 60 + (index * 120))
        .map((offset) => `
            <path d="M ${offset} 40 L ${offset} ${system.height - 40}" stroke="rgba(164, 190, 220, 0.06)" stroke-width="1" />
            <path d="M 40 ${offset} L ${system.width - 40} ${offset}" stroke="rgba(164, 190, 220, 0.06)" stroke-width="1" />
        `)
        .join('');

    const lineMarkup = lines.map((line) => {
        const filteredPoints = line.stationIds
            .map((stationId) => stationById.get(stationId))
            .filter((station) => station && stationIdSet.has(station.id))
            .map((station) => ({ x: station.mapX, y: station.mapY }));
        const pathData = buildPathData(filteredPoints);
        if (!pathData) return '';
        const labelWidth = Math.max(142, (line.label.length * 10) + 44);
        const labelLayout = line.labelPoint
            ? getSvgCardLayout(line.labelPoint, system, {
                width: labelWidth,
                height: 34,
                offset: 18,
            })
            : null;

        return `
            <path d="${pathData}" fill="none" stroke="${line.color}" stroke-width="${variant === 'constellation' ? 18 : 20}" stroke-linecap="round" stroke-linejoin="round" opacity="0.22" filter="url(#subwayLineGlow)" />
            <path d="${pathData}" fill="none" stroke="rgba(7, 17, 29, 0.62)" stroke-width="${variant === 'constellation' ? 14 : 16}" stroke-linecap="round" stroke-linejoin="round" opacity="0.92" />
            <path d="${pathData}" fill="none" stroke="${line.color}" stroke-width="${variant === 'constellation' ? 10 : 12}" stroke-linecap="round" stroke-linejoin="round" opacity="0.98" />
            <path d="${pathData}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.44" />
            ${labelLayout ? `
                <g transform="translate(${labelLayout.x.toFixed(1)} ${labelLayout.y.toFixed(1)})">
                    <rect width="${labelWidth}" height="34" rx="17" fill="rgba(7, 16, 27, 0.82)" stroke="rgba(184, 205, 230, 0.12)" />
                    <circle cx="18" cy="17" r="5.5" fill="${line.color}" />
                    <text x="32" y="22" fill="${theme.shell}" font-size="16" font-family="Pretendard, system-ui, sans-serif" font-weight="700">${escapeXml(line.label)} Line</text>
                </g>
            ` : ''}
        `;
    }).join('');

    const stationMarkup = stations.map((station) => {
        const line = system.lines.find((item) => item.key === station.primaryLineKey);
        const stroke = line?.color || '#ffffff';
        const radius = station.isInterchange ? station.bubbleSize * 0.72 : station.bubbleSize * 0.52;
        const ringRadius = radius + (station.isInterchange ? 7 : 4);
        const isPinned = station.id === highlightedStationId;
        const halo = station.isInterchange || isPinned
            ? `<circle cx="${station.mapX.toFixed(1)}" cy="${station.mapY.toFixed(1)}" r="${(ringRadius + (station.isInterchange ? 5 : 2)).toFixed(1)}" fill="${stroke}" opacity="${isPinned ? 0.14 : 0.08}" filter="url(#subwaySoftGlow)" />`
            : '';
        const outerRing = station.isInterchange || isPinned
            ? `<circle cx="${station.mapX.toFixed(1)}" cy="${station.mapY.toFixed(1)}" r="${ringRadius.toFixed(1)}" fill="none" stroke="#f8fbff" stroke-width="${isPinned ? 2.6 : 2.2}" opacity="${isPinned ? 0.92 : 0.82}" />`
            : '';
        const innerRing = station.isInterchange
            ? `<circle cx="${station.mapX.toFixed(1)}" cy="${station.mapY.toFixed(1)}" r="${(ringRadius - 5).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="3" opacity="0.95" />`
            : '';
        const star = variant === 'constellation'
            ? `<path d="M ${station.mapX.toFixed(1)} ${(station.mapY - radius).toFixed(1)} L ${(station.mapX + (radius * 0.3)).toFixed(1)} ${(station.mapY - (radius * 0.3)).toFixed(1)} L ${(station.mapX + radius).toFixed(1)} ${station.mapY.toFixed(1)} L ${(station.mapX + (radius * 0.3)).toFixed(1)} ${(station.mapY + (radius * 0.3)).toFixed(1)} L ${station.mapX.toFixed(1)} ${(station.mapY + radius).toFixed(1)} L ${(station.mapX - (radius * 0.3)).toFixed(1)} ${(station.mapY + (radius * 0.3)).toFixed(1)} L ${(station.mapX - radius).toFixed(1)} ${station.mapY.toFixed(1)} L ${(station.mapX - (radius * 0.3)).toFixed(1)} ${(station.mapY - (radius * 0.3)).toFixed(1)} Z" fill="${theme.stationFill}" stroke="rgba(8, 18, 32, 0.92)" stroke-width="2.6" />`
            : `<circle cx="${station.mapX.toFixed(1)}" cy="${station.mapY.toFixed(1)}" r="${radius.toFixed(1)}" fill="#f7fbff" stroke="rgba(8, 18, 32, 0.92)" stroke-width="2.6" />`;
        const core = `<circle cx="${station.mapX.toFixed(1)}" cy="${station.mapY.toFixed(1)}" r="${Math.max(3.6, radius * 0.36).toFixed(1)}" fill="${stroke}" />`;
        return `${halo}${outerRing}${innerRing}${star}${core}`;
    }).join('');

    const labelMarkup = labelStations.map((station) => `
        <g transform="translate(${getSvgCardLayout({ x: station.mapX, y: station.mapY }, system, { width: 230, height: 38, offset: station.isInterchange ? 18 : 14 }).x.toFixed(1)} ${getSvgCardLayout({ x: station.mapX, y: station.mapY }, system, { width: 230, height: 38, offset: station.isInterchange ? 18 : 14 }).y.toFixed(1)})">
            <rect width="230" height="38" rx="14" fill="rgba(8, 18, 31, 0.88)" stroke="rgba(184, 205, 230, 0.12)" />
            <text x="14" y="24" fill="${theme.shell}" font-size="16" font-family="Pretendard, system-ui, sans-serif" font-weight="700">${escapeXml(truncateSvgText(`${station.trackName} · ${station.trackCount}`, 26))}</text>
        </g>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${system.width} ${system.height}" width="${system.width}" height="${system.height}">
    <defs>
        <filter id="subwayGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="22" result="blur" />
        </filter>
        <filter id="subwayLineGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
        </filter>
        <filter id="subwaySoftGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="16" result="blur" />
        </filter>
        <linearGradient id="subwayBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${variant === 'constellation' ? '#07101f' : '#07111d'}" />
            <stop offset="55%" stop-color="${variant === 'constellation' ? '#0b182a' : '#0a1828'}" />
            <stop offset="100%" stop-color="${variant === 'constellation' ? '#08101d' : '#06101a'}" />
        </linearGradient>
        <radialGradient id="subwayCore" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
            <stop offset="45%" stop-color="${theme.glow}" />
            <stop offset="100%" stop-color="rgba(9,18,30,0)" />
        </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#subwayBg)" />
    <rect width="100%" height="100%" fill="rgba(4, 10, 18, 0.18)" />
    ${gridMarkup}
    ${starfield}
    <circle cx="${system.center.x}" cy="${system.center.y}" r="320" fill="url(#subwayCore)" filter="url(#subwayGlow)" />
    <circle cx="${system.center.x}" cy="${system.center.y}" r="204" fill="rgba(255,255,255,0.06)" filter="url(#subwaySoftGlow)" />
    ${system.coreLoopPath ? `<path d="${system.coreLoopPath}" fill="none" stroke="rgba(202, 221, 245, 0.14)" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" filter="url(#subwaySoftGlow)" />` : ''}
    ${system.coreLoopPath ? `<path d="${system.coreLoopPath}" fill="none" stroke="${theme.loop}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />` : ''}
    ${lineMarkup}
    ${stationMarkup}
    ${labelMarkup}
</svg>`;
}

function escapeXml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
