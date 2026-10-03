export const MAX_IMPORT_TRACKS = 5000;

/** Keep the source list intact up to the import limit, without representative sampling. */
export function limitImportTracks(list) {
    if (!Array.isArray(list)) {
        return { items: [], capped: false, originalTotal: 0 };
    }
    const capped = list.length > MAX_IMPORT_TRACKS;
    return {
        items: capped ? list.slice(0, MAX_IMPORT_TRACKS) : list,
        capped,
        originalTotal: list.length,
    };
}
