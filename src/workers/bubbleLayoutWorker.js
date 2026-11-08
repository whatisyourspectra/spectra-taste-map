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
        const projected = projected2dByTrackId.get(track.id);
        const hasProjected = Array.isArray(projected) && projected.length >= 2;
        const xRaw = hasProjected ? Math.min(1, Math.max(0, projected[0])) : getTrackFeature(track, xAxis);
        const yRaw = hasProjected ? Math.min(1, Math.max(0, projected[1])) : getTrackFeature(track, yAxis);
        // In genre projection mode, gently compress around center to avoid over-separated islands.
        const xVal = hasProjected ? 0.5 + (xRaw - 0.5) * 0.84 : xRaw;
        const yVal = hasProjected ? 0.5 + (yRaw - 0.5) * 0.84 : yRaw;
        const jx = pickInRange(hash01(track.id + 'jx'), -jitterRange, jitterRange);
        const jy = pickInRange(hash01(track.id + 'jy'), -jitterRange, jitterRange);
        const rawX = Math.min(virtualW - pad, Math.max(pad, pad + xVal * (virtualW - pad * 2) + jx));
        const rawY = Math.min(virtualH - pad, Math.max(pad, pad + (1 - yVal) * (virtualH - pad * 2) + jy));
        const clusterId = assignmentByTrackId.get(track.id);
        const color = CLUSTER_COLORS[(clusterId ?? 0) % CLUSTER_COLORS.length];
        const fixed = fixedBase.get(track.id);
        return { id: track.id, rawX, rawY, x: rawX, y: rawY, size, color, clusterId,
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
    const cellSize = (sizeMax + sepPadAdjusted) * 2.0;
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
                        const minDist = (a.size + b.size) / 2 + clusterGap;
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
            const center = clusterCenters.get(node.clusterId);
            if (!center) continue;
            node.x = Math.max(pad, Math.min(virtualW - pad, node.x + (center.x - node.x) * clusterPull));
            node.y = Math.max(pad, Math.min(virtualH - pad, node.y + (center.y - node.y) * clusterPull));
        }
    }

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
