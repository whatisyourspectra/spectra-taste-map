import { trackGenreTags } from './musicTags.js';

// Unit-length TF-IDF vectors: similarity must hold against the ORIGINAL seed,
// not just a neighbour. This prevents DBSCAN chains joining unrelated genres.
export const MIN_GENRE_SIMILARITY = 0.68;

export function clusterGenreProfiles(tracks, points, vocab) {
    const vocabulary = new Set(vocab);
    const profiles = new Map();
    tracks.forEach((track, index) => {
        const allGenres = trackGenreTags(track).sort();
        const genres = allGenres.filter(genre => vocabulary.has(genre));
        // Parent-only and zero vectors are not direct musical evidence.
        if (!genres.length) return;
        const key = JSON.stringify(allGenres);
        const profile = profiles.get(key);
        if (profile) profile.indices.push(index);
        else profiles.set(key, { key, genres, vector: points[index], indices: [index] });
    });
    // Stable for reordered imports. Frequent complete profiles seed first;
    // ties prefer fewer tags so broad crossover profiles don't lead the group.
    const ordered = [...profiles.values()].sort((a, b) =>
        b.indices.length - a.indices.length || a.genres.length - b.genres.length || a.key.localeCompare(b.key));
    const groups = [];
    for (const profile of ordered) {
        let best = null, bestSimilarity = MIN_GENRE_SIMILARITY - 1e-10;
        for (const group of groups) {
            const common = group.core.filter(genre => profile.genres.includes(genre));
            if (!common.length) continue;
            const similarity = profile.vector.reduce((sum, value, i) => sum + value * group.anchor[i], 0);
            if (similarity >= MIN_GENRE_SIMILARITY && similarity > bestSimilarity) {
                best = { group, common };
                bestSimilarity = similarity;
            }
        }
        if (best) {
            best.group.core = best.common;
            best.group.indices.push(...profile.indices);
        } else groups.push({ anchor: profile.vector, core: profile.genres, indices: [...profile.indices] });
    }
    const labels = Array(tracks.length).fill(-1);
    let clusterCount = 0;
    for (const group of groups) {
        if (group.indices.length < 2) continue;
        for (const index of group.indices) labels[index] = clusterCount;
        clusterCount++;
    }
    return { labels, clusterCount };
}
