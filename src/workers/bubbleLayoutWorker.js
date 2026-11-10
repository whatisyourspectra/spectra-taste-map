// Bubble layout Web Worker — collision detection off the main thread
const FEATURE_KEYS = ['valence', 'energy', 'danceability', 'acousticness', 'instrumentalness'];
const FEATURE_META = {
    valence:          { fallback: 0.5 },
    energy:           { fallback: 0.5 },
    danceability:     { fallback: 0.5 },
    acousticness:     { fallback: 0.5 },
    instrumentalness: { fallback: 0 },
};
const CLUSTER_COLORS = ['#a78bfa', '#34d399', '#f87171', '#fbbf24', '#60a5fa', '#f472b6'];

function getTrackFeature(track, key) {
    const v = track?.[key];
    return (typeof v === 'number' && Number.isFinite(v)) ? v : (FEATURE_META[key]?.fallback ?? 0.5);
}

function hash01(str) {
    let h = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 10_000) / 10_000;
}

function pickInRange(seed, min, max) { return min + (max - min) * seed; }

// Stable, well-mixed samples: sequential demo/provider IDs must not line up.
function scatterHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    return (hash >>> 0) / 4294967296;
}

function exploratoryAnchors(tracks, assignments, expressiveSpacing = false) {
    const groups = new Map();
    for (const track of tracks) {
        const cluster = assignments.get(track.id) ?? 0;
        const artist = String(track.layoutArtist || track.id).trim().toLowerCase();
        const key = `${cluster}:${artist}`;
        if (!groups.has(key)) groups.set(key, { key, cluster, genre: track.layoutGenreKey || `region-${cluster}`, members: [] });
        groups.get(key).members.push(track);
    }
    const regions = new Map();
    for (const group of groups.values()) {
        if (!regions.has(group.genre)) regions.set(group.genre, { key: group.genre, family: group.genre.split('/')[0], count: 0 });
        regions.get(group.genre).count += group.members.length;
    }
    const families = [...new Set([...regions.values()].map(region => region.family))].sort();
    const familyAnchors = new Map();
    for (const family of families) {
        let best = null;
        for (let attempt = 0; attempt < 64; attempt++) {
            const x = .15 + scatterHash(`${family}:${attempt}:x`) * .7;
            const y = .15 + scatterHash(`${family}:${attempt}:y`) * .7;
            const clearance = familyAnchors.size
                ? Math.min(...[...familyAnchors.values()].map(point => Math.hypot(point.x - x, point.y - y)))
                : .3;
            const score = clearance * (.85 + scatterHash(`${family}:${attempt}:variation`) * .3);
            if (!best || score > best.score) best = { x, y, score };
        }
        familyAnchors.set(family, families.length === 1 ? { x: .5, y: .5 } : best);
    }
    for (const region of regions.values()) {
        const parent = familyAnchors.get(region.family);
        const angle = scatterHash(`${region.key}:bearing`) * Math.PI * 2;
        const radius = .025 + scatterHash(`${region.key}:offset`) * .05;
        region.x = parent.x + Math.cos(angle) * radius;
        region.y = parent.y + Math.sin(angle) * radius;
    }
    const anchors = new Map();
    for (const group of groups.values()) {
        const region = regions.get(group.genre);
        const angle = scatterHash(`${group.key}:bearing`) * Math.PI * 2;
        const reach = families.length === 1 ? .3 : .035 + .1 * Math.sqrt(region.count / tracks.length);
        const radius = Math.sqrt(scatterHash(`${group.key}:distance`)) * reach
            * (expressiveSpacing ? .6 + scatterHash(`${group.key}:reach`) * 1.1 : 1);
        let centerX = region.x + Math.cos(angle) * radius * 1.1;
        let centerY = region.y + Math.sin(angle) * radius;
        // A few artist neighborhoods drift into the gaps, producing sparse
        // bridges and outliers rather than a ring, wave, or uniform cloud.
        if (scatterHash(`${group.key}:outlier`) > .85) {
            centerX = centerX * .4 + (.08 + scatterHash(`${group.key}:far-x`) * .84) * .6;
            centerY = centerY * .4 + (.08 + scatterHash(`${group.key}:far-y`) * .84) * .6;
        }
        const orientation = scatterHash(`${group.key}:tilt`) * Math.PI * 2;
        for (const track of group.members) {
            const angle = scatterHash(`${track.id}:angle`) * Math.PI * 2;
            // Dense artist cores with a few loose satellites. Keeping most
            // anchors close makes neighborhoods readable at a glance; zooming
            // separates their lightly overlapping artwork for inspection.
            const tail = scatterHash(`${track.id}:tail`) > .85 ? 3.2 : 1;
            const role = scatterHash(`${track.id}:spacing-role`);
            const fringe = expressiveSpacing && role >= .68;
            const radius = fringe
                ? .7 + scatterHash(`${track.id}:radius`) * 2.8
                : Math.pow(scatterHash(`${track.id}:radius`), expressiveSpacing ? 2.1 : 1.8) * tail;
            const spread = Math.min(.04, .004 + Math.sqrt(group.members.length) * .003);
            const stretch = expressiveSpacing ? .7 + scatterHash(`${group.key}:stretch`) * 1.4 : 1;
            const dx = Math.cos(angle) * radius * spread * 1.5 * stretch;
            const dy = Math.sin(angle) * radius * spread * .72 / Math.sqrt(stretch);
            let x = centerX + dx * Math.cos(orientation) - dy * Math.sin(orientation);
            let y = centerY + dx * Math.sin(orientation) + dy * Math.cos(orientation);
            if (scatterHash(`${track.id}:wanderer`) > .9) {
                x = x * .3 + (.05 + scatterHash(`${track.id}:wide-x`) * .9) * .7;
                y = y * .3 + (.06 + scatterHash(`${track.id}:wide-y`) * .88) * .7;
            }
            anchors.set(track.id, [
                Math.max(.06, Math.min(.94, x)),
                Math.max(.08, Math.min(.92, y)),
            ]);
        }
    }
    return anchors;
}

self.onmessage = ({ data }) => {
    const {
        tracks: allTracks,
        affinityEntries,
        fixedBaseEntries,
        fieldW,
        fieldH,
        worldScale,
        xAxis,
        yAxis,
        assignmentEntries,
        playWeightEntries,
        projected2dEntries,
        layoutMode,
        spacingProfile,
    } = data;

    const assignmentByTrackId = new Map(assignmentEntries);
    const playWeightById = new Map(playWeightEntries || []);
    const projected2dByTrackId = new Map(projected2dEntries || []);
    const fixedBase = new Map(fixedBaseEntries || []);
    const allIds = new Set(allTracks.map(track => track.id));
    const affinity = new Map((affinityEntries || []).filter(([id, anchor]) => id !== anchor && allIds.has(anchor)));
    // Lay out imported songs first: additions must not rescale or displace them.
    let tracks = allTracks.filter(track => !affinity.has(track.id));
    // Corrupt/cyclic provenance must never make songs disappear.
    if (!tracks.length) { tracks = allTracks; affinity.clear(); }
    const count = tracks.length;
    if (count === 0) { self.postMessage({ nodes: [] }); return; }

    const isGenreProjected = projected2dByTrackId.size > 0;
    const exploratory = layoutMode === 'exploratory';
    const expressiveSpacing = exploratory && spacingProfile === 'expressive';
    const neighborhoodAnchors = exploratory ? exploratoryAnchors(tracks, assignmentByTrackId, expressiveSpacing) : new Map();
    const virtualW = Math.max(1, fieldW * worldScale);
    const virtualH = Math.max(1, fieldH * worldScale);

    const pad = 90;
    // Keep large sets readable, but widen the visual size range so play-count
    // differences are easier to perceive at a glance.
    const sizeMin = count > 2000 ? 18 : count > 1000 ? 22 : count > 500 ? 24 : count > 300 ? 30 : count > 150 ? 36 : 44;
    const sizeMax = count > 2000 ? 38 : count > 1000 ? 44 : count > 500 ? 50 : count > 300 ? 64 : count > 150 ? 78 : 92;
    const sepPad  = count > 2000 ? 12 : count > 1000 ? 16 : count > 500 ? 22 : count > 300 ? 36 : count > 150 ? 62 : 92;
    const jitterRange = count > 2000 ? 84 : count > 500 ? 72 : count > 300 ? 58 : 44;
    const spacingFactor = isGenreProjected ? 0.76 : 1.0;
    const sepPadAdjusted = sepPad * spacingFactor;
    const overviewZoom = Math.max(.1, 1 / Math.max(1, worldScale));
    const overviewCoverScale = Math.max(.3, Math.min(1.3, Math.pow(overviewZoom / 1.2, .4)));

    // Precompute normalized weight [0,1] for each track.
    // Recent-play counts get a stronger nonlinear stretch so relative size
    // differences are emphasized.
    const recentValues = [...playWeightById.values()]
        .filter((w) => w.type === 'recent')
        .map((w) => Number(w.value) || 0)
        .filter((v) => Number.isFinite(v) && v > 0)
        .sort((a, b) => a - b);
    const recentMin = recentValues.length ? recentValues[0] : 0;
    const recentMax = recentValues.length ? recentValues[recentValues.length - 1] : 1;
    const recentP90 = recentValues.length
        ? recentValues[Math.min(recentValues.length - 1, Math.floor((recentValues.length - 1) * 0.9))]
        : recentMax;
    const recentUpper = Math.max(recentMin + 1, recentP90 || recentMax || 1);

    function getSizeT(trackId) {
        const pw = playWeightById.get(trackId);
        if (!pw || pw.type === 'none') return 0.26;
        if (pw.type === 'recent') {
            const value = Math.max(0, Number(pw.value) || 0);
            if (!Number.isFinite(value)) return 0.26;
            if (recentUpper <= recentMin) return 0.62;
            const clamped = Math.min(recentUpper, value);
            const linear = (clamped - recentMin) / (recentUpper - recentMin);
            const stretched = Math.pow(Math.min(1, Math.max(0, linear)), 1.65);
            return 0.18 + 0.82 * stretched;
        }
        // popularity fallback should still be visible but weaker than recent-play signal.
        const popNorm = Math.min(1, Math.max(0, (Number(pw.value) || 0) / 100));
        return 0.14 + 0.56 * Math.pow(popNorm, 1.2);
    }

    const nodes = tracks.map((track) => {
        const t = getSizeT(track.id);
        const size = sizeMin + (sizeMax - sizeMin) * t;
        const projected = exploratory ? neighborhoodAnchors.get(track.id) : projected2dByTrackId.get(track.id);
        const hasProjected = Array.isArray(projected) && projected.length >= 2;
        const xRaw = hasProjected ? Math.min(1, Math.max(0, projected[0])) : getTrackFeature(track, xAxis);
        const yRaw = hasProjected ? Math.min(1, Math.max(0, projected[1])) : getTrackFeature(track, yAxis);
        // In genre projection mode, gently compress around center to avoid over-separated islands.
        const xVal = hasProjected && !exploratory ? 0.5 + (xRaw - 0.5) * 0.84 : xRaw;
        const yVal = hasProjected && !exploratory ? 0.5 + (yRaw - 0.5) * 0.84 : yRaw;
        const jx = pickInRange(hash01(track.id + 'jx'), -jitterRange, jitterRange);
        const jy = pickInRange(hash01(track.id + 'jy'), -jitterRange, jitterRange);
        const rawX = Math.min(virtualW - pad, Math.max(pad, pad + xVal * (virtualW - pad * 2) + jx));
        const rawY = Math.min(virtualH - pad, Math.max(pad, pad + (1 - yVal) * (virtualH - pad * 2) + jy));
        const clusterId = assignmentByTrackId.get(track.id);
        const color = CLUSTER_COLORS[(clusterId ?? 0) % CLUSTER_COLORS.length];
        const fixed = fixedBase.get(track.id);
        const fringe = expressiveSpacing && scatterHash(`${track.id}:spacing-role`) >= .68;
        return { id: track.id, rawX, rawY, x: rawX, y: rawY, size, color, clusterId,
            // Leave room around fringe tracks while retaining compact cores.
            // Applying the same large gap to every song flattens the density.
            spacing: exploratory ? fringe ? 12 + scatterHash(`${track.id}:gap`) * 24
                : 1 + Math.pow(scatterHash(`${track.id}:gap`), 2) * 10 : 0,
            packing: fringe ? 1.35 + scatterHash(`${track.id}:air`) * .95
                : .62 + Math.pow(scatterHash(`${track.layoutArtist || track.id}:density`), 2) * .95,
            clearance: fringe ? 1.15 : 1,
            artist: track.layoutArtist,
            ...(fixed ? { x: fixed.nX * virtualW, y: fixed.nY * virtualH,
                rawX: fixed.nRawX * virtualW, rawY: fixed.nRawY * virtualH } : {}) };
    });

    // Compute coarse per-cluster centers from raw coordinates.
    const clusterBuckets = new Map();
    nodes.forEach((node) => {
        if (!Number.isInteger(node.clusterId)) return;
        if (!clusterBuckets.has(node.clusterId)) {
            clusterBuckets.set(node.clusterId, { sumX: 0, sumY: 0, count: 0 });
        }
        const bucket = clusterBuckets.get(node.clusterId);
        bucket.sumX += node.rawX;
        bucket.sumY += node.rawY;
        bucket.count += 1;
    });
    const clusterCenters = new Map(
        [...clusterBuckets.entries()].map(([clusterId, bucket]) => [
            clusterId,
            { x: bucket.sumX / bucket.count, y: bucket.sumY / bucket.count, count: bucket.count },
        ]),
    );

    const clusterPull = count > 2000 ? 0.012 : count > 1000 ? 0.016 : count > 600 ? 0.022 : count > 300 ? 0.028 : 0.034;
    const cellSize = Math.max((sizeMax + sepPadAdjusted) * 2.0,
        exploratory ? (sizeMax * overviewCoverScale * (expressiveSpacing ? 2.3 : 1.57)
            + (expressiveSpacing ? 36 : 11)) / overviewZoom : 0);
    // Large imports favor fast, stable placement over imperceptible late-pass
    // collision refinements. This keeps multi-thousand-track layouts fast and responsive.
    const layoutIterations = count > 2500 ? 18 : count > 1600 ? 22 : count > 900 ? 28 : count > 450 ? 36 : 44;

    const baseIsFixed = tracks.every(track => fixedBase.has(track.id));
    for (let iter = 0; !baseIsFixed && iter < layoutIterations; iter++) {
        // Fast integer spatial hash grid (1 insertion per node)
        const grid = new Map();
        for (let i = 0; i < nodes.length; i++) {
            const gx = Math.floor(nodes[i].x / cellSize);
            const gy = Math.floor(nodes[i].y / cellSize);
            const key = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
            const cell = grid.get(key);
            if (!cell) {
                grid.set(key, [i]);
            } else {
                cell.push(i);
            }
        }

        // Check 3x3 neighborhood around each node
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            const gx = Math.floor(a.x / cellSize);
            const gy = Math.floor(a.y / cellSize);

            for (let dxi = -1; dxi <= 1; dxi++) {
                for (let dyi = -1; dyi <= 1; dyi++) {
                    const neighborKey = (((gx + dxi) * 73856093) ^ ((gy + dyi) * 19349663)) >>> 0;
                    const cell = grid.get(neighborKey);
                    if (!cell) continue;

                    for (let c = 0; c < cell.length; c++) {
                        const j = cell[c];
                        if (j <= i) continue;
                        const b = nodes[j];
                        const sameCluster = Number.isInteger(a.clusterId)
                            && Number.isInteger(b.clusterId)
                            && a.clusterId === b.clusterId;
                        const clusterGap = sameCluster
                            ? sepPadAdjusted * (isGenreProjected ? 0.98 : 1.12)
                            : sepPadAdjusted * (isGenreProjected ? 1.18 : 1.62);
                        const sameArtist = a.artist && a.artist === b.artist;
                        const gap = (a.spacing + b.spacing) / 2 * (sameArtist ? .2 : 1);
                        const packing = sameArtist ? (a.packing + b.packing) / 2
                            : Math.max(a.clearance, b.clearance) * (sameCluster ? .94 : 1);
                        const minDist = exploratory
                            ? ((a.size + b.size) / 2 * overviewCoverScale * packing + gap) / overviewZoom
                            : (a.size + b.size) / 2 + clusterGap;
                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const dist = Math.hypot(dx, dy) || 0.001;
                        if (dist < minDist) {
                            const push = (minDist - dist) * 0.52;
                            const nx = dx / dist, ny = dy / dist;
                            a.x = Math.max(pad, Math.min(virtualW - pad, a.x - nx * push));
                            a.y = Math.max(pad, Math.min(virtualH - pad, a.y - ny * push));
                            b.x = Math.max(pad, Math.min(virtualW - pad, b.x + nx * push));
                            b.y = Math.max(pad, Math.min(virtualH - pad, b.y + ny * push));
                        }
                    }
                }
            }
        }

        // Keep tracks mildly attracted to their cluster center so overview
        // keeps recognizable cluster islands while still preserving local spread.
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!Number.isInteger(node.clusterId)) continue;
            const center = exploratory ? { x: node.rawX, y: node.rawY } : clusterCenters.get(node.clusterId);
            if (!center) continue;
            const pull = exploratory ? .002 : clusterPull;
            node.x = Math.max(pad, Math.min(virtualW - pad, node.x + (center.x - node.x) * pull));
            node.y = Math.max(pad, Math.min(virtualH - pad, node.y + (center.y - node.y) * pull));
        }
    }

    // Do not blend the separated positions back into crowded raw anchors at
    // render time. Every consumer (navigator, selection and additions) agrees.
    if (exploratory) for (const node of nodes) { node.rawX = node.x; node.rawY = node.y; }

    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const pending = allTracks.filter(track => affinity.has(track.id));
    while (pending.length) {
        const index = pending.findIndex(track => nodeById.has(affinity.get(track.id)));
        const track = pending.splice(index < 0 ? 0 : index, 1)[0];
        const anchor = nodeById.get(affinity.get(track.id));
        const displayX = node => node.x + (node.rawX - node.x) * 0.18;
        const displayY = node => node.y + (node.rawY - node.y) * 0.18;
        const centerX = anchor ? displayX(anchor) : virtualW / 2;
        const centerY = anchor ? displayY(anchor) : virtualH / 2;
        const size = sizeMin + (sizeMax - sizeMin) * getSizeT(track.id);
        let best = null;
        // Search a deterministic spiral for space beside the seed, without
        // pushing existing songs. Identical snapshots reproduce the placement.
        for (let attempt = 0; attempt < 240; attempt++) {
            const angle = hash01(track.id) * Math.PI * 2 + attempt * 2.399963229728653;
            const radius = (size + (anchor?.size || size)) / 2 + 24 + Math.sqrt(attempt) * 14;
            const x = Math.max(pad, Math.min(virtualW - pad, centerX + Math.cos(angle) * radius));
            const y = Math.max(pad, Math.min(virtualH - pad, centerY + Math.sin(angle) * radius));
            const clearance = nodes.reduce((min, node) => Math.min(min,
                Math.hypot(x - displayX(node), y - displayY(node)) - (size + node.size) / 2 - 12), Infinity);
            if (!best || clearance > best.clearance) best = { x, y, clearance };
            if (clearance >= 0) break;
        }
        const clusterId = assignmentByTrackId.get(track.id);
        const node = { id: track.id, ...best, rawX: best.x, rawY: best.y, size,
            color: CLUSTER_COLORS[(clusterId ?? 0) % CLUSTER_COLORS.length], clusterId };
        nodes.push(node);
        nodeById.set(node.id, node);
    }

    // Normalize to [0,1] so the main thread can scale to any field size
    const nodes_out = nodes.map((n) => ({
        id:    n.id,
        nRawX: n.rawX / virtualW,
        nRawY: n.rawY / virtualH,
        nX:    n.x    / virtualW,
        nY:    n.y    / virtualH,
        size:  n.size,
        color: n.color,
        clusterId: n.clusterId,
    }));

    self.postMessage({ nodes: nodes_out });
};
