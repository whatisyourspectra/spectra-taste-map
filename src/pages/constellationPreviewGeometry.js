const SVG_WIDTH = 360;
const SVG_HEIGHT = 190;

function coordinate(node, normalizedKey, fallbackKey) {
    if (Number.isFinite(node?.[normalizedKey])) return node[normalizedKey];
    return Number.isFinite(node?.[fallbackKey]) ? node[fallbackKey] : null;
}

export function buildConstellationPreviewGeometry(clusterNodes = [], clusterEdges = [], selectedTrackId = null) {
    const useMapPositions = clusterNodes.length > 0 && clusterNodes.every((node) => (
        Number.isFinite(node?.previewX) && Number.isFinite(node?.previewY)
    ));
    const sourceNodes = clusterNodes
        .map((node) => ({
            id: node.track?.id || node.id,
            sourceX: useMapPositions ? node.previewX : coordinate(node, 'nX', 'x'),
            sourceY: useMapPositions ? node.previewY : coordinate(node, 'nY', 'y'),
        }))
        .filter((node) => node.id && node.sourceX !== null && node.sourceY !== null);

    if (!sourceNodes.length) {
        return {
            svgW: SVG_WIDTH,
            svgH: SVG_HEIGHT,
            hasLayout: false,
            nodes: selectedTrackId ? [{ id: selectedTrackId, x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2, isSelected: true }] : [],
            edges: [],
        };
    }

    const xs = sourceNodes.map((node) => node.sourceX);
    const ys = sourceNodes.map((node) => node.sourceY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const scale = Math.min(
        spanX > 0 ? 280 / spanX : Infinity,
        spanY > 0 ? 124 / spanY : Infinity,
    );
    const fittedScale = Number.isFinite(scale) ? scale : 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const nodes = sourceNodes.map((node) => ({
        id: node.id,
        x: SVG_WIDTH / 2 + (node.sourceX - centerX) * fittedScale,
        y: SVG_HEIGHT / 2 + (node.sourceY - centerY) * fittedScale,
        isSelected: node.id === selectedTrackId,
    }));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const edges = clusterEdges.flatMap((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        return from && to ? [{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }] : [];
    });

    return { svgW: SVG_WIDTH, svgH: SVG_HEIGHT, hasLayout: true, nodes, edges };
}
