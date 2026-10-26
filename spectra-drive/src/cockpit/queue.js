import { buildTasteState } from '../../../src/taste/buildTasteState.js';
import { normalizeGenre, titleizeGenre } from '../../../src/taste/genreIdentity.js';
import { executeAction, initialState, parseCommand } from '../moodEngine.js';

// Reuse the original SPECTRA library/tag analysis. Mood is a session override,
// never a write to the person's underlying taste data or listening history.
export function buildDriveTaste(library) {
  return buildTasteState(library.map(track => ({ ...track, genres: track.tags, valence: track.brightness })));
}

export function baselineMood(taste) {
  return { ...initialState(), mood: 'familiar', energy: taste.averageEnergy, brightness: taste.averageValence };
}

export function selectDriveQueue(library, taste, mood, currentId) {
  const strength = new Map(taste.coreGenres.map(item => [item.genre, item.strength]));
  return library.filter(track => track.id !== currentId).map(track => {
    const affinity = track.tags.length ? track.tags.reduce((total, genre) => total + (strength.get(normalizeGenre(genre)) || 0), 0) / track.tags.length : 0;
    const distance = Math.hypot(track.energy - mood.energy, track.brightness - mood.brightness) / Math.SQRT2;
    return { ...track, score: 0.85 * (1 - distance) + 0.15 * affinity };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 5);
}

export function applyDriveCommand(mood, taste, text) {
  const clean = String(text).trim().replace(/^(?:스펙트라)[,，]?\s*/, '').replace(/[.!?。]/g, '');
  if (/^(?:익숙한 곡 위주로|익숙하게|원래 취향으로|기본 취향으로)$/.test(clean)) {
    return { ok: true, state: { ...mood, ...baselineMood(taste), lighting: mood.lighting }, label: '기본 취향', reply: '내 취향을 기준으로 다음 곡을 다시 골랐어요.' };
  }
  const action = /^(?:퇴근길이니까\s*)?(?:좀\s*)?편안하게(?:\s*들을래)?$/.test(clean)
    ? { name: 'SET_MOOD', parameters: { mood: 'calm', target: 'music' } } : parseCommand(clean);
  if (!action || action.name === 'SAVE_MOOD' || action.parameters?.target === 'lighting') return { ok: false, state: mood, reply: '“편안하게”, “조금 더 신나게”, “기본 취향으로”라고 말해주세요.' };
  // This experience changes music only. The cabin is a visual frame, not an action target.
  const result = executeAction(mood, { ...action, parameters: { ...action.parameters, target: 'music' } });
  const adjustmentLabel = action.parameters?.dimension === 'brightness'
    ? action.parameters.direction === 'up' ? '조금 더 밝게' : '조금 더 차분하게'
    : action.parameters?.direction === 'up' ? '조금 더 활기 있게' : '활기를 조금 낮춰서';
  return { ...result, label: action.name === 'ADJUST_MOOD' ? adjustmentLabel : result.state.mood === 'calm' ? '편안하게' : '활기 있게', reply: result.ok ? '지금 곡은 이어 듣고, 다음 곡부터 바꿨어요.' : result.message };
}

export function queueReason(queue, label) {
  const genre = queue[0]?.tags[0];
  return genre ? `내 ${titleizeGenre(genre)} 취향 안에서 · ${label}` : `내 음악 안에서 · ${label}`;
}
