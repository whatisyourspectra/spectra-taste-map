import { hash01 } from '../taste/constellationTopology.js';

export const DEFAULT_CAMERA = { yaw: 0, pitch: 0, zoom: 1 };
export function clampZoom(value) { return Math.max(.65, Math.min(2.4, value)); }

// Stable visual depth, not a measured taste dimension. The same track keeps its
// depth in past/current snapshots. Rotation is applied to XYZ before perspective.
export function projectPoint(point, camera, key) {
    const x = point.x - 180;
    const y = point.y - 166;
    const z = (hash01(`${key}:depth`) - .5) * 150;
    const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
    const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
    const rx = x * cy + z * sy;
    const rz = -x * sy + z * cy;
    const ry = y * cp - rz * sp;
    const depth = y * sp + rz * cp;
    const scale = 520 / (520 - depth) * camera.zoom;
    return { ...point, x: 180 + rx * scale, y: 166 + ry * scale, depth, scale };
}
export function projectSpectra(avatar, camera) {
    const nodes = avatar.nodes.map((node) => {
        const point = projectPoint(node, camera, node.id);
        return { ...point, radius: node.radius * point.scale,
            opacity: Math.max(.2, Math.min(1, node.opacity * (1 + point.depth / 300))) };
    }).sort((a, b) => a.depth - b.depth);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return { ...avatar, nodes,
        edges: avatar.edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to))
            .map((edge) => ({ ...edge, a: byId.get(edge.from), b: byId.get(edge.to) })),
        orbits: avatar.orbits.map((node) => projectPoint(node, camera, node.id)).sort((a, b) => a.depth - b.depth),
        regions: avatar.regions.map((region) => projectPoint(region, camera, region.genre)),
    };
}
