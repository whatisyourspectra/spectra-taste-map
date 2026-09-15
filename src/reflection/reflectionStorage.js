import { latestDecisions } from '../taste/buildTasteState.js';

export const reflectionKey = (owner, map) => `spectra:reflection:v1:${owner || 'guest'}:${map || 'empty'}`;
export function loadReflection(storage, key) {
    try {
        const data = JSON.parse(storage.getItem(key));
        if (data?.version !== 1) return { decisions: [], snapshot: null };
        const snapshot = data.snapshot;
        return {
            decisions: latestDecisions(Array.isArray(data.decisions) ? data.decisions : []),
            snapshot: snapshot && Array.isArray(snapshot.ids) && Array.isArray(snapshot.decisions)
                && Array.isArray(snapshot.avatar?.nodes) && Array.isArray(snapshot.avatar?.edges)
                && Array.isArray(snapshot.avatar?.orbits) && Array.isArray(snapshot.avatar?.regions)
                && Number.isFinite(snapshot.at) ? snapshot : null,
        };
    } catch { return { decisions: [], snapshot: null }; }
}
export function saveReflection(storage, key, decisions, snapshot) {
    try {
        storage.setItem(key, JSON.stringify({ version: 1, decisions, snapshot }));
        return true;
    } catch { return false; }
}
export function reflectionChanges(previous, tracks, decisions) {
    if (!previous) return { added: [], removed: [], choices: [] };
    const old = new Set(previous.ids);
    const current = new Set(tracks.map((track) => track.id));
    const priorChoices = new Map(previous.decisions.map((choice) => [choice.track.id, choice]));
    return {
        added: tracks.filter((track) => !old.has(track.id)),
        removed: previous.ids.filter((id) => !current.has(id)),
        choices: decisions.filter((choice) => {
            const prior = priorChoices.get(choice.track.id);
            return !prior || prior.action !== choice.action || prior.at !== choice.at;
        }),
    };
}
