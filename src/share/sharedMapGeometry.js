const DEFAULT_SIZE = { width: 800, height: 640 };
const MIN_ZOOM = .65;
const MAX_ZOOM = 4;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

function mapSize(size = {}) {
    return {
        width: Number.isFinite(size.width) && size.width > 0 ? size.width : DEFAULT_SIZE.width,
        height: Number.isFinite(size.height) && size.height > 0 ? size.height : DEFAULT_SIZE.height,
    };
}

function mapCamera(camera = {}) {
    return {
        x: finite(camera.x, 0),
        y: finite(camera.y, 0),
        zoom: clamp(Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1, MIN_ZOOM, MAX_ZOOM),
    };
}

/** Map normalized song features into the viewport, reserving room for controls. */
export function getMapPoints(tracks, size) {
    const { width, height } = mapSize(size);
    const side = Math.min(32, width / 2);
    const vertical = Math.min(80, height / 2);
    const innerWidth = width - 2 * side;
    const innerHeight = height - 2 * vertical;
    const jitter = Math.min(24, innerWidth / 10, innerHeight / 10);
    return (Array.isArray(tracks) ? tracks : []).map((track, index) => ({
        x: clamp(side + clamp(finite(track?.x, .5), 0, 1) * innerWidth + Math.sin(index * 2.4) * jitter, side, width - side),
        y: clamp(vertical + (1 - clamp(finite(track?.y, .5), 0, 1)) * innerHeight + Math.cos(index * 3.1) * jitter, vertical, height - vertical),
    }));
}

/**
 * Connect each point to at most maxNeighbors nearest points in maxDistance.
 * Edges are undirected, so incoming links can give a point a higher degree.
 * Only neighboring spatial buckets are searched; candidates are kept in a
 * short ordered list instead of sorting the entire map for every point.
 */
export function buildMapEdges(points, maxDistance = 125, maxNeighbors = 2) {
    if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(maxDistance) || maxDistance <= 0 || !Number.isFinite(maxNeighbors)) return [];
    const count = Math.max(0, Math.min(points.length - 1, Math.floor(maxNeighbors)));
    if (!count) return [];
    const buckets = new Map();
    const valid = [];
    points.forEach((point, index) => {
        if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
        const bx = Math.floor(point.x / maxDistance);
        const by = Math.floor(point.y / maxDistance);
        const key = `${bx},${by}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(index);
        valid.push({ index, bx, by });
    });
    const distanceLimit = maxDistance * maxDistance;
    const seen = new Set();
    const edges = [];
    for (const { index, bx, by } of valid) {
        const point = points[index];
        const nearest = [];
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
            const bucket = buckets.get(`${bx + dx},${by + dy}`);
            if (!bucket) continue;
            for (const otherIndex of bucket) {
                if (otherIndex === index) continue;
                const other = points[otherIndex];
                const distance = (point.x - other.x) ** 2 + (point.y - other.y) ** 2;
                if (distance > distanceLimit) continue;
                let position = 0;
                while (position < nearest.length && (nearest[position].distance < distance || (nearest[position].distance === distance && nearest[position].index < otherIndex))) position++;
                if (position >= count) continue;
                nearest.splice(position, 0, { index: otherIndex, distance });
                if (nearest.length > count) nearest.pop();
            }
        }
        for (const other of nearest) {
            const a = Math.min(index, other.index);
            const b = Math.max(index, other.index);
            const key = `${a}-${b}`;
            if (!seen.has(key)) {
                seen.add(key);
                edges.push([a, b]);
            }
        }
    }
    return edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** Zoom around a viewport-space anchor while keeping its world point fixed. */
export function zoomCameraAt(camera, anchor, factor, size) {
    const current = mapCamera(camera);
    const { width, height } = mapSize(size);
    const x = finite(anchor?.x, width / 2) - width / 2;
    const y = finite(anchor?.y, height / 2) - height / 2;
    const multiplier = Number.isFinite(factor) && factor > 0 ? factor : 1;
    const zoom = clamp(current.zoom * multiplier, MIN_ZOOM, MAX_ZOOM);
    const ratio = zoom / current.zoom;
    return { x: x - (x - current.x) * ratio, y: y - (y - current.y) * ratio, zoom };
}

/** Center a selected world-space point, retaining zoom when already enlarged. */
export function focusCameraOn(point, camera, size) {
    const { width, height } = mapSize(size);
    const zoom = Math.max(1.35, mapCamera(camera).zoom);
    return {
        x: (width / 2 - finite(point?.x, width / 2)) * zoom,
        y: (height / 2 - finite(point?.y, height / 2)) * zoom,
        zoom,
    };
}
