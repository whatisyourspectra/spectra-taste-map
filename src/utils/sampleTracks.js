export const MAX_IMPORT_TRACKS = 5000;

/**
 * Evenly sample tracks across the given list to preserve chronological distribution
 * from early listening history to recent additions.
 *
 * @param {Array} list - Original parsed track list
 * @param {number} max - Maximum number of tracks to keep (default 2000)
 * @returns {{ items: Array, capped: boolean, originalTotal: number }}
 */
export function sampleTracksEvenly(list, max = MAX_IMPORT_TRACKS) {
    if (!Array.isArray(list) || list.length <= max) {
        return { items: list || [], capped: false, originalTotal: list?.length || 0 };
    }
    const step = (list.length - 1) / (max - 1);
    const sampled = [];
    const used = new Set();
    for (let i = 0; i < max; i += 1) {
        const idx = Math.round(i * step);
        if (!used.has(idx) && idx >= 0 && idx < list.length) {
            used.add(idx);
            sampled.push(list[idx]);
        }
    }
    return { items: sampled, capped: true, originalTotal: list.length };
}
