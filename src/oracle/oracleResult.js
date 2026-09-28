import { hash01 } from '../taste/constellationTopology.js';

const NAMES = {
    clarity: ['아침의 윤곽자리', 'The Morning Outline'],
    focus: ['흔들림 없는 빛자리', 'The Steady Light'],
    solace: ['안개 뒤의 빛자리', 'The Light Beyond Haze'],
    burnout: ['숨 고르는 파도자리', 'The Resting Tide'],
    wanderlust: ['경계 밖의 빛자리', 'The Light Beyond'],
    stillness: ['머무는 숨자리', 'The Quiet Breath'],
    regret: ['지나간 밤의 틈자리', 'The Space After Night'],
    solitude: ['혼자 걷는 빛자리', 'The Solitary Light'],
    flow: ['깊은 밤의 결자리', 'The Midnight Current'],
    custom: ['오늘의 조각자리', 'The Piece of Today'],
};

function feature(track, key) {
    const value = track?.[key];
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : hash01(`${track?.id}:${key}`);
}

function closestTree(nodes) {
    const connected = new Set([0]);
    const edges = [];
    while (connected.size < nodes.length) {
        let nearest = null;
        for (const from of connected) {
            nodes.forEach((toNode, to) => {
                if (connected.has(to)) return;
                const fromNode = nodes[from];
                const distance = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
                if (!nearest || distance < nearest.distance) nearest = { from, to, distance };
            });
        }
        if (!nearest) break;
        edges.push([nearest.from, nearest.to]);
        connected.add(nearest.to);
    }
    return edges;
}

export function buildOracleResult(library = [], context, shift, prescribed, day) {
    if (!prescribed?.id || !shift) return null;

    const targetEnergy = Number.isFinite(shift.targetEnergy) ? shift.targetEnergy : 0.5;
    const tracks = [prescribed, ...library
        .filter((track) => track?.id && track.id !== prescribed.id)
        .sort((a, b) => {
            const score = (track) => Math.abs(feature(track, 'energy') - targetEnergy) * 0.8
                + Math.abs(feature(track, 'valence') - feature(prescribed, 'valence')) * 0.2
                + hash01(`${day}:${shift.id}:${track.id}`) * 0.06;
            return score(a) - score(b) || String(a.id).localeCompare(String(b.id));
        })]
        .filter((track, index, all) => all.findIndex((item) => item.id === track.id) === index)
        .slice(0, 8);

    const source = tracks.map((track) => ({
        id: track.id,
        name: track.name || '',
        artists: track.artists || '',
        coverUrl: track.coverUrl || track.albumArt || track.imageUrl || track.album?.images?.[0]?.url || null,
        sourceX: feature(track, 'valence') + (hash01(`${track.id}:x`) - 0.5) * 0.06,
        sourceY: 1 - feature(track, 'energy') + (hash01(`${track.id}:y`) - 0.5) * 0.06,
    }));
    const xs = source.map((node) => node.sourceX);
    const ys = source.map((node) => node.sourceY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const scale = Math.min(spanX > 0 ? 260 / spanX : Infinity, spanY > 0 ? 194 / spanY : Infinity);
    const fittedScale = Number.isFinite(scale) ? scale : 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const nodes = source.map((node, index) => ({
        id: node.id,
        name: node.name,
        artists: node.artists,
        coverUrl: node.coverUrl,
        x: Math.round((180 + (node.sourceX - centerX) * fittedScale) * 100) / 100,
        y: Math.round((160 + (node.sourceY - centerY) * fittedScale) * 100) / 100,
        isSelected: index === 0,
    }));
    const edges = closestTree(nodes);
    const name = NAMES[context?.archetypeKey] || NAMES.wanderlust;
    const line = targetEnergy < 0.38
        ? ['오늘은 잠깐 느려져도 괜찮아요.', 'It is okay to slow down for a moment.']
        : targetEnergy > 0.66
            ? ['오늘은 한 걸음 먼저 움직여도 좋아요.', 'Take the first small step today.']
            : ['오늘은 나에게 맞는 속도를 다시 찾아봐요.', 'Find a pace that feels like yours today.'];

    return {
        name: name[0],
        nameEn: name[1],
        line: line[0],
        lineEn: line[1],
        context: context?.label || '',
        contextEn: context?.labelEn || context?.label || '',
        color: shift.color || '#a9b8ff',
        trackId: prescribed.id,
        nodes,
        edges,
    };
}
