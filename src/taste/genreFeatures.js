import { genreParents, trackGenreTags } from './musicTags.js';

// Shared by the worker and diagnostics so saved/legacy and newly imported maps
// use the same vocabulary. Every track has unit norm regardless of tag count.
export function buildGenreFeatures(tracks, { maxGenres = 128, maxParents = 16 } = {}) {
    const directCounts = new Map(), parentCounts = new Map(), documents = new Map();
    const signals = tracks.map(track => {
        const values = new Map();
        const genres = trackGenreTags(track);
        for (const genre of genres) {
            directCounts.set(genre, (directCounts.get(genre) || 0) + 1);
            values.set(genre, 1);
            genreParents(genre).forEach((parent, depth) => {
                values.set(parent, Math.max(values.get(parent) || 0, .45 / (depth + 1)));
            });
        }
        for (const genre of genres) values.set(genre, 1);
        for (const key of values.keys()) {
            documents.set(key, (documents.get(key) || 0) + 1);
            if (!genres.includes(key)) parentCounts.set(key, (parentCounts.get(key) || 0) + 1);
        }
        return values;
    });
    const rank = counts => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key]) => key);
    const direct = rank(directCounts).slice(0, maxGenres);
    const vocab = [...direct, ...rank(parentCounts).filter(key => !direct.includes(key)).slice(0, maxParents)];
    const idf = vocab.map(key => Math.log((tracks.length + 1) / (documents.get(key) + 1)) + 1);
    const points = signals.map(signal => {
        const vector = vocab.map((key, index) => (signal.get(key) || 0) * idf[index]);
        const norm = Math.hypot(...vector);
        return norm ? vector.map(value => value / norm) : vector;
    });
    return { points, vocab };
}
