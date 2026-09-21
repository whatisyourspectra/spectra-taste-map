// Density-based clustering Web Worker (DBSCAN with automatic epsilon)
const FEATURE_KEYS = ['valence', 'energy', 'danceability', 'acousticness', 'instrumentalness'];
const FEATURE_META = {
    valence:          { fallback: 0.5 },
    energy:           { fallback: 0.5 },
    danceability:     { fallback: 0.5 },
    acousticness:     { fallback: 0.5 },
    instrumentalness: { fallback: 0 },
};

function getTrackFeature(track, key) {
    const v = track?.[key];
    return (typeof v === 'number' && Number.isFinite(v)) ? v : (FEATURE_META[key]?.fallback ?? 0.5);
}

function getTrackVector(track) {
    return FEATURE_KEYS.map((key) => getTrackFeature(track, key));
}

function normalizeGenre(g) { return String(g || '').trim().toLowerCase(); }

function getTrackGenres(track) {
    if (!Array.isArray(track?.genres)) return [];
    return [...new Set(track.genres.map(normalizeGenre).filter(Boolean))];
}

function euclidDistSq(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return sum;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function average(values) {
    if (!values.length) return 0;
    return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function uniqueSortedValues(values) {
    return [...new Set(values)].sort((a, b) => a - b);
}

function percentile(sortedValues, q) {
    if (!sortedValues.length) return 0;
    const idx = clamp(Math.floor((sortedValues.length - 1) * q), 0, sortedValues.length - 1);
    return sortedValues[idx];
}

function estimateDbscanParams(points) {
    const n = points.length;
    const dims = points[0]?.length || 1;
    const minPts = clamp(Math.round(2 * Math.log2(Math.max(4, n))), Math.max(4, dims + 1), 18);
    if (n <= minPts + 1) {
        return { minPts: Math.min(minPts, Math.max(2, n - 1)), eps: 0.18 };
    }

    const sampleSize = Math.min(220, n);
    const sampleStep = n / sampleSize;
    const sampledIdx = [];
    for (let i = 0; i < sampleSize; i++) {
        sampledIdx.push(Math.min(n - 1, Math.floor(i * sampleStep)));
    }
    const kNeighbor = Math.max(1, minPts - 1);
    const kDistances = sampledIdx.map((idx) => {
        const base = points[idx];
        const dists = [];
        for (let j = 0; j < n; j++) {
            if (j === idx) continue;
            dists.push(Math.sqrt(euclidDistSq(base, points[j])));
        }
        dists.sort((a, b) => a - b);
        return dists[Math.min(dists.length - 1, kNeighbor)];
    }).sort((a, b) => a - b);

    const p72 = percentile(kDistances, 0.72);
    const p86 = percentile(kDistances, 0.86);
    const med = percentile(kDistances, 0.5);
    const eps = clamp(p72 * 0.8 + p86 * 0.2, med * 0.75, med * 1.85);
    return { minPts, eps: Math.max(0.04, eps) };
}

function dbscan(points, eps, minPts) {
    const n = points.length;
    const UNASSIGNED = -2;
    const NOISE = -1;
    const epsSq = eps * eps;
    const labels = new Array(n).fill(UNASSIGNED);
    const visited = new Array(n).fill(false);
    let clusterId = 0;

    const regionQuery = (idx) => {
        const out = [];
        const p = points[idx];
        const p0 = p[0], p1 = p[1], p2 = p[2];
        for (let j = 0; j < n; j++) {
            const q = points[j];
            if (Math.abs(p0 - q[0]) > eps) continue;
            if (Math.abs(p1 - q[1]) > eps) continue;
            if (Math.abs(p2 - q[2]) > eps) continue;
            if (euclidDistSq(p, q) <= epsSq) out.push(j);
        }
        return out;
    };

    for (let i = 0; i < n; i++) {
        if (visited[i]) continue;
        visited[i] = true;

        const neighbors = regionQuery(i);
        if (neighbors.length < minPts) {
            labels[i] = NOISE;
            continue;
        }

        labels[i] = clusterId;
        const seeds = [...neighbors];
        const queued = new Set(seeds);

        for (let ptr = 0; ptr < seeds.length; ptr++) {
            const pIdx = seeds[ptr];
            if (!visited[pIdx]) {
                visited[pIdx] = true;
                const pNeighbors = regionQuery(pIdx);
                if (pNeighbors.length >= minPts) {
                    pNeighbors.forEach((nIdx) => {
                        if (!queued.has(nIdx)) {
                            queued.add(nIdx);
                            seeds.push(nIdx);
                        }
                    });
                }
            }
            if (labels[pIdx] === UNASSIGNED || labels[pIdx] === NOISE) {
                labels[pIdx] = clusterId;
            }
        }

        clusterId += 1;
    }

    return { labels, clusterCount: clusterId };
}

function buildCentroids(points, labels, clusterCount) {
    if (clusterCount <= 0) return [];
    const dims = points[0]?.length || 0;
    const sums = Array.from({ length: clusterCount }, () => Array(dims).fill(0));
    const counts = Array(clusterCount).fill(0);

    labels.forEach((label, i) => {
        if (label < 0) return;
        counts[label] += 1;
        for (let d = 0; d < dims; d++) sums[label][d] += points[i][d];
    });

    return sums.map((sum, cIdx) => {
        const count = Math.max(1, counts[cIdx]);
        return sum.map((value) => value / count);
    });
}

function matVecMul(matrix, vec) {
    const out = new Array(matrix.length).fill(0);
    for (let r = 0; r < matrix.length; r++) {
        let sum = 0;
        for (let c = 0; c < vec.length; c++) sum += matrix[r][c] * vec[c];
        out[r] = sum;
    }
    return out;
}

function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

function normalizeVec(vec) {
    const norm = Math.sqrt(dot(vec, vec)) || 1;
    return vec.map((v) => v / norm);
}

function computeCovariance(centered) {
    const n = centered.length;
    const d = centered[0]?.length || 0;
    const cov = Array.from({ length: d }, () => Array(d).fill(0));
    if (n < 2 || d === 0) return cov;
    for (let i = 0; i < n; i++) {
        const row = centered[i];
        for (let r = 0; r < d; r++) {
            const vr = row[r];
            for (let c = r; c < d; c++) {
                cov[r][c] += vr * row[c];
            }
        }
    }
    const denom = n - 1;
    for (let r = 0; r < d; r++) {
        for (let c = r; c < d; c++) {
            const value = cov[r][c] / denom;
            cov[r][c] = value;
            cov[c][r] = value;
        }
    }
    return cov;
}

function powerIteration(cov, attempts = 18) {
    const d = cov.length;
    let vec = Array.from({ length: d }, (_, idx) => ((idx * 97) % 17) + 1);
    vec = normalizeVec(vec);
    for (let i = 0; i < attempts; i++) {
        const next = matVecMul(cov, vec);
        const norm = Math.sqrt(dot(next, next));
        if (!Number.isFinite(norm) || norm < 1e-12) break;
        vec = next.map((v) => v / norm);
    }
    return normalizeVec(vec);
}

function deflateCovariance(cov, component, eigenValue) {
    const d = cov.length;
    for (let r = 0; r < d; r++) {
        for (let c = 0; c < d; c++) {
            cov[r][c] -= eigenValue * component[r] * component[c];
        }
    }
}

function buildGenreProjections(points) {
    const n = points.length;
    const d = points[0]?.length || 0;
    if (n === 0 || d === 0) {
        return { projection2D: [], projection3D: [] };
    }

    const means = Array(d).fill(0);
    points.forEach((row) => {
        for (let i = 0; i < d; i++) means[i] += row[i];
    });
    for (let i = 0; i < d; i++) means[i] /= n;
    const centered = points.map((row) => row.map((v, i) => v - means[i]));

    const cov = computeCovariance(centered);
    const components = [];
    const dimCount = Math.min(3, d);
    for (let k = 0; k < dimCount; k++) {
        const comp = powerIteration(cov);
        const mv = matVecMul(cov, comp);
        const eigenValue = dot(comp, mv);
        if (!Number.isFinite(eigenValue) || eigenValue < 1e-10) break;

        // Keep orientation stable by forcing highest-loading axis to be positive.
        let maxAbsIdx = 0;
        for (let i = 1; i < comp.length; i++) {
            if (Math.abs(comp[i]) > Math.abs(comp[maxAbsIdx])) maxAbsIdx = i;
        }
        const signedComp = comp[maxAbsIdx] < 0 ? comp.map((v) => -v) : comp;
        components.push(signedComp);
        deflateCovariance(cov, signedComp, eigenValue);
    }

    if (!components.length) {
        const fallback2D = points.map((row) => [row[0] ?? 0.5, row[1] ?? row[0] ?? 0.5]);
        const fallback3D = points.map((row) => [
            ((row[0] ?? 0.5) - 0.5) * 2,
            ((row[1] ?? row[0] ?? 0.5) - 0.5) * 2,
            ((row[2] ?? row[0] ?? 0.5) - 0.5) * 2,
        ]);
        return { projection2D: fallback2D, projection3D: fallback3D };
    }

    const scores = centered.map((row) => components.map((comp) => dot(row, comp)));
    const cCount = components.length;
    const mins = Array(cCount).fill(Number.POSITIVE_INFINITY);
    const maxs = Array(cCount).fill(Number.NEGATIVE_INFINITY);
    scores.forEach((row) => {
        for (let i = 0; i < cCount; i++) {
            mins[i] = Math.min(mins[i], row[i]);
            maxs[i] = Math.max(maxs[i], row[i]);
        }
    });

    const normalize01 = (value, idx) => {
        const range = maxs[idx] - mins[idx];
        if (!Number.isFinite(range) || range < 1e-10) return 0.5;
        return (value - mins[idx]) / range;
    };
    const normalize11 = (value, idx) => normalize01(value, idx) * 2 - 1;

    const projection2D = scores.map((row) => ([
        normalize01(row[0] ?? 0, 0),
        normalize01(row[1] ?? row[0] ?? 0, Math.min(1, cCount - 1)),
    ]));
    const projection3D = scores.map((row) => ([
        normalize11(row[0] ?? 0, 0),
        normalize11(row[1] ?? row[0] ?? 0, Math.min(1, cCount - 1)),
        normalize11(row[2] ?? row[0] ?? 0, Math.min(2, cCount - 1)),
    ]));

    return { projection2D, projection3D };
}

self.onmessage = ({ data }) => {
    const { tracks, clusterBasis } = data;
    if (!Array.isArray(tracks) || tracks.length === 0) {
        self.postMessage({
            assignments: [],
            centroids: [],
            points: [],
            effectiveClusterBasis: 'audio',
            genreVocab: [],
            noiseClusterId: null,
            projection2D: null,
            projection3D: null,
        });
        return;
    }

    let points = tracks.map(getTrackVector);
    let usingGenre = false;
    let derivedGenreVocab = [];

    if (clusterBasis === 'genre') {
        const trackGenreSets = tracks.map((t) => new Set(getTrackGenres(t)));
        const dfMap = new Map(), freqMap = new Map();
        trackGenreSets.forEach((gs) => gs.forEach((g) => {
            dfMap.set(g, (dfMap.get(g) || 0) + 1);
            freqMap.set(g, (freqMap.get(g) || 0) + 1);
        }));
        const minDf = Math.max(2, Math.floor(tracks.length * 0.004));
        const maxDfRatio = 0.42;
        const filteredFreq = [...freqMap.entries()]
            .filter(([g]) => {
                const df = dfMap.get(g) || 0;
                const dfRatio = df / Math.max(1, tracks.length);
                return df >= minDf && dfRatio <= maxDfRatio;
            });
        const vocab = (filteredFreq.length >= 2 ? filteredFreq : [...freqMap.entries()])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 28)
            .map(([g]) => g);
        if (vocab.length >= 2) {
            const idf = vocab.map((g) => Math.log((tracks.length + 1) / ((dfMap.get(g) || 0) + 1)) + 1);
            const genrePoints = trackGenreSets.map((gs) => {
                const vec = vocab.map((g, idx) => (gs.has(g) ? idf[idx] : 0));
                const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
                return norm > 0 ? vec.map((v) => v / norm) : vec;
            });
            if (genrePoints.some((vec) => vec.some((v) => v > 0))) {
                points = genrePoints;
                usingGenre = true;
                derivedGenreVocab = vocab;
            }
        }
    }

    if (points.length < 3) {
        self.postMessage({
            assignments: points.map(() => 0),
            centroids: [points.reduce((acc, cur) => acc.map((v, idx) => v + cur[idx]), Array(points[0].length).fill(0)).map((v) => v / points.length)],
            points,
            effectiveClusterBasis: usingGenre ? 'genre' : 'audio',
            genreVocab: usingGenre ? derivedGenreVocab : [],
            noiseClusterId: null,
            projection2D: usingGenre ? buildGenreProjections(points).projection2D : null,
            projection3D: usingGenre ? buildGenreProjections(points).projection3D : null,
        });
        return;
    }

    const { minPts, eps } = estimateDbscanParams(points);
    const tight = dbscan(points, eps * 0.88, Math.max(3, minPts - 1));
    const base = dbscan(points, eps, minPts);
    const wide = dbscan(points, eps * 1.12, minPts);

    const candidates = [tight, base, wide].map((candidate) => {
        const clusterCount = Math.max(0, candidate.clusterCount);
        const noiseCount = candidate.labels.filter((label) => label < 0).length;
        const clusterSizes = Array(clusterCount).fill(0);
        candidate.labels.forEach((label) => { if (label >= 0) clusterSizes[label] += 1; });
        const nonTinyClusters = clusterSizes.filter((size) => size >= 4).length;
        const largestShare = clusterSizes.length ? Math.max(...clusterSizes) / points.length : 1;
        const noiseRatio = noiseCount / points.length;
        const compactness = clusterCount > 0
            ? average(clusterSizes.filter(Boolean).map((size) => Math.abs(size - points.length / clusterCount)))
            : points.length;
        const score =
            nonTinyClusters * 3.2
            + Math.min(clusterCount, 18) * 1.3
            - Math.abs(largestShare - 0.38) * 2.5
            - noiseRatio * 4.5
            - compactness / Math.max(1, points.length) * 1.6;
        return { ...candidate, score };
    });

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const assignments = [...best.labels];
    const noiseIdx = [];
    assignments.forEach((label, idx) => {
        if (label < 0) noiseIdx.push(idx);
    });
    let noiseClusterId = null;
    if (noiseIdx.length > 0) {
        const uniqueClusters = uniqueSortedValues(assignments.filter((label) => label >= 0));
        noiseClusterId = uniqueClusters.length;
        noiseIdx.forEach((idx) => {
            assignments[idx] = noiseClusterId;
        });
    }
    const maxClusterId = assignments.reduce((max, value) => Math.max(max, value), 0);
    const centroids = buildCentroids(points, assignments, maxClusterId + 1);
    const projection = usingGenre ? buildGenreProjections(points) : { projection2D: null, projection3D: null };

    self.postMessage({
        assignments,
        centroids,
        points,
        effectiveClusterBasis: usingGenre ? 'genre' : 'audio',
        genreVocab: usingGenre ? derivedGenreVocab : [],
        noiseClusterId,
        projection2D: projection.projection2D,
        projection3D: projection.projection3D,
    });
};
