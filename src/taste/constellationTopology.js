export function hash01(str) {
    let h = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 10_000) / 10_000;
}

// Build a sparse, stable graph from the Taste Field layout. Kruskal's
// algorithm runs over a local-neighbour candidate set, keeping the graph
// connected inside each taste cluster without turning dense libraries into a
// fully connected web.
export function buildConstellationTopology(nodes) {
    if (nodes.length < 2) return [];

    const groups = new Map();
    nodes.forEach((node) => {
        const clusterId = Number.isInteger(node.clusterId) ? node.clusterId : -1;
        if (!groups.has(clusterId)) groups.set(clusterId, []);
        groups.get(clusterId).push(node);
    });

    const topology = [];
    groups.forEach((group, clusterId) => {
        if (group.length < 2) return;

        const sorted = [...group].sort((a, b) => (
            a.nX - b.nX || a.nY - b.nY || String(a.id).localeCompare(String(b.id))
        ));
        const candidates = [];
        const candidateKeys = new Set();
        const neighbourWindow = Math.min(16, sorted.length - 1);

        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j <= Math.min(sorted.length - 1, i + neighbourWindow); j++) {
                const a = sorted[i];
                const b = sorted[j];
                const key = `${a.id}::${b.id}`;
                if (candidateKeys.has(key)) continue;
                candidateKeys.add(key);
                candidates.push({
                    from: a.id,
                    to: b.id,
                    distance: Math.hypot(a.nX - b.nX, a.nY - b.nY),
                    color: a.color,
                    clusterId,
                });
            }
        }

        candidates.sort((a, b) => (
            a.distance - b.distance
            || hash01(`${a.from}:${a.to}`) - hash01(`${b.from}:${b.to}`)
        ));

        const parent = new Map(sorted.map((node) => [node.id, node.id]));
        const rank = new Map(sorted.map((node) => [node.id, 0]));
        const degree = new Map(sorted.map((node) => [node.id, 0]));
        const selectedKeys = new Set();

        const find = (id) => {
            let root = id;
            while (parent.get(root) !== root) root = parent.get(root);
            let cursor = id;
            while (parent.get(cursor) !== cursor) {
                const next = parent.get(cursor);
                parent.set(cursor, root);
                cursor = next;
            }
            return root;
        };

        const union = (a, b) => {
            const rootA = find(a);
            const rootB = find(b);
            if (rootA === rootB) return false;
            const rankA = rank.get(rootA) || 0;
            const rankB = rank.get(rootB) || 0;
            if (rankA < rankB) parent.set(rootA, rootB);
            else if (rankA > rankB) parent.set(rootB, rootA);
            else {
                parent.set(rootB, rootA);
                rank.set(rootA, rankA + 1);
            }
            return true;
        };

        for (const edge of candidates) {
            if (!union(edge.from, edge.to)) continue;
            topology.push(edge);
            selectedKeys.add(`${edge.from}::${edge.to}`);
            degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
            degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
            if (selectedKeys.size >= sorted.length - 1) break;
        }

        // A few short cross-links make the clusters read as constellations,
        // while the degree cap preserves open negative space.
        const extraLimit = Math.min(36, Math.floor(sorted.length * 0.1));
        let extras = 0;
        for (const edge of candidates) {
            if (extras >= extraLimit) break;
            if (selectedKeys.has(`${edge.from}::${edge.to}`)) continue;
            if (edge.distance > 0.12) break;
            if ((degree.get(edge.from) || 0) >= 3 || (degree.get(edge.to) || 0) >= 3) continue;
            if (hash01(`${edge.from}:${edge.to}:extra`) > 0.32) continue;
            topology.push({ ...edge, secondary: true });
            degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
            degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
            extras += 1;
        }
    });

    // A cluster can occasionally contain a single outlier. Give those points
    // one faint bridge to their nearest neighbour so every star participates
    // in the graph.
    const connectedIds = new Set(topology.flatMap((edge) => [edge.from, edge.to]));
    nodes.forEach((node) => {
        if (connectedIds.has(node.id)) return;
        let nearest = null;
        let nearestDistance = Infinity;
        nodes.forEach((candidate) => {
            if (candidate.id === node.id) return;
            const distance = Math.hypot(node.nX - candidate.nX, node.nY - candidate.nY);
            if (distance >= nearestDistance) return;
            nearest = candidate;
            nearestDistance = distance;
        });
        if (!nearest) return;
        topology.push({
            from: node.id,
            to: nearest.id,
            distance: nearestDistance,
            color: node.color,
            clusterId: node.clusterId,
            secondary: true,
            bridge: true,
        });
        connectedIds.add(node.id);
        connectedIds.add(nearest.id);
    });

    return topology;
}

/**
 * Builds an ordered continuous sequence of track IDs visiting every unique track
 * in the cluster following topological edges.
 */
export function buildVoyageSequence(tracks, edges = [], startingTrackId = null) {
    if (!tracks || tracks.length === 0) return [];
    if (tracks.length === 1) return [tracks[0].id];

    const trackIdSet = new Set(tracks.map((t) => t.id));
    const adjacency = new Map();
    tracks.forEach((t) => adjacency.set(t.id, []));

    edges.forEach((edge) => {
        if (trackIdSet.has(edge.from) && trackIdSet.has(edge.to)) {
            adjacency.get(edge.from).push(edge.to);
            adjacency.get(edge.to).push(edge.from);
        }
    });

    const visited = new Set();
    const sequence = [];
    const startId = (startingTrackId && trackIdSet.has(startingTrackId))
        ? startingTrackId
        : tracks[0].id;

    function dfs(currentId) {
        visited.add(currentId);
        sequence.push(currentId);
        const neighbors = adjacency.get(currentId) || [];
        for (const nextId of neighbors) {
            if (!visited.has(nextId)) {
                dfs(nextId);
            }
        }
    }

    dfs(startId);

    // Visit any disconnected nodes in the cluster
    for (const track of tracks) {
        if (!visited.has(track.id)) {
            dfs(track.id);
        }
    }

    return sequence;
}

export function getVoyageNeighbor(sequence, currentTrackId, direction) {
    if (!Array.isArray(sequence) || (direction !== 1 && direction !== -1)) return null;
    const index = sequence.indexOf(currentTrackId);
    return index < 0 ? null : sequence[index + direction] || null;
}

export function getConstellationInfo(cluster, lang = 'ko') {
    if (!cluster) {
        return {
            name: lang === 'en' ? 'Starlight Cluster' : '나의 별자리',
            symbol: 'sparkle',
            essence: lang === 'en' ? 'Cosmic Melody & Drifting Taste' : '별자리를 잇는 음악 · 나의 취향',
            poem: lang === 'en'
                ? 'Starlight weaves across the quiet expanse, guiding your journey.'
                : '밤하늘을 가로지르는 리듬의 결, 은하수 너머로 울려 퍼지는 선율.',
            color: '#93c5fd',
        };
    }

    const name = String(cluster.label?.name || (lang === 'en' ? 'Taste Constellation' : '취향 별자리'))
        .replaceAll('성좌', '별자리');
    const symbol = cluster.label?.symbol || 'sparkle';
    const color = cluster.color || '#93c5fd';
    const topGenres = (cluster.topGenres || []).slice(0, 3).join(' · ');
    const essence = topGenres || (lang === 'en' ? 'Deep Musical Resonance' : '깊은 음악적 공명');

    const poem = cluster.label?.summary
        ? `“${cluster.label.summary}”`
        : (lang === 'en'
            ? `“In the orbital starlight of ${name}, melodies align into a celestial story.”`
            : `“${name}${name.endsWith('별자리') ? '' : ' 별자리'}의 빛무리 속에서, 서로 다른 기억들이 하나의 별빛으로 이어집니다.”`);

    return {
        name,
        symbol,
        essence,
        poem,
        color,
    };
}

function ccw(p1, p2, p3) {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
}

function segmentsIntersect(a1, a2, b1, b2) {
    if (a1.id === b1.id || a1.id === b2.id || a2.id === b1.id || a2.id === b2.id) return false;
    return (ccw(a1, b1, b2) !== ccw(a2, b1, b2)) && (ccw(a1, a2, b1) !== ccw(a1, a2, b2));
}

/**
 * Builds a clean, non-crossing planar topology (Euclidean MST with optional single loop)
 * tailored for small constellation subsets (6-12 stars).
 */
export function buildPlanarSeedTopology(nodes) {
    if (!nodes || nodes.length < 2) return [];

    const points = nodes.map((n) => ({
        id: n.id,
        x: n.nX ?? n.x ?? 0,
        y: n.nY ?? n.y ?? 0,
        color: n.color || '#93c5fd',
        clusterId: n.clusterId ?? 0,
    }));

    const pointMap = new Map(points.map((p) => [p.id, p]));
    const allEdges = [];

    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const p1 = points[i];
            const p2 = points[j];
            const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            allEdges.push({
                from: p1.id,
                to: p2.id,
                distance,
                color: p1.color,
                clusterId: p1.clusterId,
            });
        }
    }

    // Sort by shortest Euclidean distance
    allEdges.sort((a, b) => a.distance - b.distance);

    const parent = new Map(points.map((p) => [p.id, p.id]));
    const find = (id) => {
        let root = id;
        while (parent.get(root) !== root) root = parent.get(root);
        let cur = id;
        while (parent.get(cur) !== cur) {
            const next = parent.get(cur);
            parent.set(cur, root);
            cur = next;
        }
        return root;
    };
    const union = (a, b) => {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA === rootB) return false;
        parent.set(rootB, rootA);
        return true;
    };

    const acceptedEdges = [];
    const degree = new Map(points.map((p) => [p.id, 0]));

    for (const edge of allEdges) {
        const p1 = pointMap.get(edge.from);
        const p2 = pointMap.get(edge.to);
        if (!p1 || !p2) continue;

        // Ensure new edge never crosses an existing edge
        const intersects = acceptedEdges.some((existing) => {
            const ep1 = pointMap.get(existing.from);
            const ep2 = pointMap.get(existing.to);
            return segmentsIntersect(p1, p2, ep1, ep2);
        });
        if (intersects) continue;

        if (union(edge.from, edge.to)) {
            acceptedEdges.push(edge);
            degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
            degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
            if (acceptedEdges.length === points.length - 1) break;
        }
    }

    // Optional: at most 1 short non-crossing loop edge if degree <= 2
    if (acceptedEdges.length > 0) {
        const avgDist = acceptedEdges.reduce((acc, e) => acc + e.distance, 0) / acceptedEdges.length;
        for (const edge of allEdges) {
            if (acceptedEdges.some((e) => (e.from === edge.from && e.to === edge.to) || (e.from === edge.to && e.to === edge.from))) continue;
            if (edge.distance > avgDist * 1.35) continue;
            if ((degree.get(edge.from) || 0) >= 3 || (degree.get(edge.to) || 0) >= 3) continue;

            const p1 = pointMap.get(edge.from);
            const p2 = pointMap.get(edge.to);
            const intersects = acceptedEdges.some((existing) => {
                const ep1 = pointMap.get(existing.from);
                const ep2 = pointMap.get(existing.to);
                return segmentsIntersect(p1, p2, ep1, ep2);
            });
            if (!intersects) {
                acceptedEdges.push({ ...edge, secondary: true });
                break;
            }
        }
    }

    return acceptedEdges;
}

/**
 * Builds a focused seed constellation of 7-12 stars around a selected track,
 * extracting only the closest, musically related tracks rather than the entire cluster.
 */
export function buildSeedConstellation(seedTrack, bubbleNodes, { maxStars = 8 } = {}) {
    if (!seedTrack?.id || !Array.isArray(bubbleNodes) || bubbleNodes.length === 0) {
        return {
            nodes: [],
            edges: [],
            tracks: seedTrack ? [seedTrack] : [],
            trackIds: seedTrack ? [seedTrack.id] : [],
        };
    }

    const seedNode = bubbleNodes.find((n) => (n.track?.id || n.id) === seedTrack.id);
    if (!seedNode) {
        return {
            nodes: [],
            edges: [],
            tracks: [seedTrack],
            trackIds: [seedTrack.id],
        };
    }

    const seedClusterId = Number.isInteger(seedNode.clusterId) ? seedNode.clusterId : null;
    const seedX = seedNode.nX ?? seedNode.x ?? 0;
    const seedY = seedNode.nY ?? seedNode.y ?? 0;

    // Rank candidate nodes by 2D proximity to seedNode, giving same-cluster tracks a 35% distance preference
    // while preventing distant cluster outliers across the universe from being picked.
    const candidates = bubbleNodes
        .filter((n) => {
            const trackId = n.track?.id || n.id;
            return trackId && trackId !== seedTrack.id;
        })
        .map((node) => {
            const nodeX = node.nX ?? node.x ?? 0;
            const nodeY = node.nY ?? node.y ?? 0;
            const dist = Math.hypot(nodeX - seedX, nodeY - seedY);
            const isSameCluster = seedClusterId !== null && node.clusterId === seedClusterId;
            const score = isSameCluster ? dist * 0.65 : dist;
            return {
                node,
                dist,
                isSameCluster,
                score,
            };
        })
        .sort((a, b) => a.score - b.score);

    const neighborCount = Math.max(1, Math.min(candidates.length, maxStars - 1));
    const selectedNeighbors = candidates.slice(0, neighborCount).map((c) => c.node);
    const selectedNodes = [seedNode, ...selectedNeighbors];

    const uniformClusterId = seedClusterId !== null ? seedClusterId : 0;
    const nodesForTopology = selectedNodes.map((n) => ({
        ...n,
        id: n.track?.id || n.id,
        nX: n.nX ?? n.x ?? 0,
        nY: n.nY ?? n.y ?? 0,
        clusterId: uniformClusterId,
        color: seedNode.color || n.color || '#93c5fd',
    }));

    const edges = buildPlanarSeedTopology(nodesForTopology);
    const tracks = selectedNodes.map((n) => n.track || { id: n.id });
    const trackIds = tracks.map((t) => t.id);

    return {
        nodes: selectedNodes,
        edges,
        tracks,
        trackIds,
    };
}
