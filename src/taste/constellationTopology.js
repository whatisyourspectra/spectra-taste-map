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

