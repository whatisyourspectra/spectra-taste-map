import { importedArtwork } from './trackArtwork.js';

// Platform-independent actions shared by browser speech and future Gleo intents.
export const MOODS = {
  calm: { label: '편안하게', energy: 0.28, brightness: 0.48, color: '#70d6ff', lightLevel: 0.4 },
  uplift: { label: '활기 있게', energy: 0.76, brightness: 0.78, color: '#ed70bc', lightLevel: 0.65 },
  familiar: { label: '익숙하게', energy: 0.5, brightness: 0.55, color: '#c084fc', lightLevel: 0.5 },
};
export const LIGHT_COLORS = { '하늘색': '#70d6ff', '보라색': '#c084fc', '핑크색': '#ed70bc', '흰색': '#d7e2f2' };
const clamp = value => Math.max(0, Math.min(1, value));
const isMood = value => typeof value === 'string' && Object.hasOwn(MOODS, value);
export const presetLighting = mood => ({ color: MOODS[mood].color, brightness: MOODS[mood].lightLevel });
export const initialState = () => ({ mood: 'calm', activeName: '', energy: 0.28, brightness: 0.48, lighting: presetLighting('calm'), saved: [] });
export const validLevel = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
export const validLighting = value => Boolean(value && /^#[0-9a-f]{6}$/i.test(value.color) && validLevel(value.brightness));
const lightingOrDefault = (value, mood) => validLighting(value) ? { color: value.color, brightness: value.brightness } : presetLighting(mood);

export function restoreState(raw) {
  try {
    const value = JSON.parse(raw);
    if (!isMood(value.mood) || !validLevel(value.energy) || !validLevel(value.brightness)) return initialState();
    const saved = Array.isArray(value.saved) ? value.saved.filter(item =>
      typeof item?.name === 'string' && item.name.trim().length > 0 && item.name.length <= 30
      && isMood(item.mood) && validLevel(item.energy) && validLevel(item.brightness)) : [];
    return {
      mood: value.mood, activeName: typeof value.activeName === 'string' ? value.activeName.slice(0, 30) : '',
      energy: value.energy, brightness: value.brightness, lighting: lightingOrDefault(value.lighting, value.mood),
      saved: [...new Map(saved.map(item => [item.name, {
        name: item.name, mood: item.mood, energy: item.energy, brightness: item.brightness,
        lighting: lightingOrDefault(item.lighting, item.mood),
      }])).values()].slice(0, 12),
    };
  } catch { return initialState(); }
}

export function executeAction(state, action) {
  const args = action?.parameters || {};
  const fail = message => ({ state, ok: false, effects: [], message });
  switch (action?.name) {
    case 'SET_MOOD': {
      const preset = isMood(args.mood) ? MOODS[args.mood] : null;
      const saved = state.saved.find(item => item.name === args.mood);
      const target = args.target ?? 'all';
      if (!['all', 'music', 'lighting'].includes(target)) return fail('음악과 조명 중 바꿀 대상을 알려주세요.');
      if (!preset && !saved) return fail('어떤 무드로 바꿀까요? 편안하게, 활기 있게, 익숙하게 중에서 말해주세요.');
      const music = preset ? { mood: args.mood, activeName: '', energy: preset.energy, brightness: preset.brightness }
        : { mood: saved.mood, activeName: saved.name, energy: saved.energy, brightness: saved.brightness };
      const lighting = { ...(saved?.lighting || presetLighting(saved?.mood || args.mood)) };
      const next = { ...state, ...(target !== 'lighting' ? music : {}), ...(target !== 'music' ? { lighting } : {}) };
      const effects = [];
      if (target !== 'lighting') effects.push({ type: 'music.queue' });
      if (target !== 'music') effects.push({ type: 'lighting.apply', lighting });
      return { state: next, ok: true, effects, message: `${saved?.name || preset.label} 무드의 ${target === 'all' ? '음악과 조명 설정을 불러왔어요' : target === 'music' ? '음악을 골랐어요. 조명은 그대로예요' : '조명 설정을 불러왔어요'}.` };
    }
    case 'ADJUST_MOOD': {
      const target = args.target ?? 'music';
      if (!['music', 'lighting'].includes(target)) return fail('음악과 조명 중 조정할 대상을 알려주세요.');
      if (target === 'lighting' && args.dimension === 'color') {
        if (typeof args.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(args.color)) return fail('조명 색상을 알려주세요.');
        const lighting = { ...state.lighting, color: args.color };
        return { state: { ...state, lighting, activeName: '' }, ok: true, effects: [{ type: 'lighting.apply', lighting }], message: '음악은 유지하고 조명 색상을 요청했어요.' };
      }
      if (!['up', 'down'].includes(args.direction) || !(target === 'music' ? ['energy', 'brightness'] : ['brightness']).includes(args.dimension)) {
        return fail('음악 활기·밝기 또는 조명 밝기를 더할지, 줄일지 말해주세요.');
      }
      const previous = target === 'music' ? state[args.dimension] : state.lighting.brightness;
      const value = clamp(previous + (args.direction === 'up' ? 0.12 : -0.12));
      const lighting = target === 'lighting' ? { ...state.lighting, brightness: value } : state.lighting;
      return {
        state: { ...state, activeName: '', ...(target === 'music' ? { [args.dimension]: value } : { lighting }) }, ok: true,
        effects: target === 'music' ? [{ type: 'music.queue' }] : [{ type: 'lighting.apply', lighting }],
        message: value === previous ? '이미 조정할 수 있는 끝에 도달했어요.'
          : `${target === 'lighting' ? '조명 밝기를' : args.dimension === 'energy' ? '음악의 활기를' : '음악의 밝기를'} 조금 ${args.direction === 'up' ? '더했어요' : '줄였어요'}.${target === 'music' ? ' 조명은 그대로예요.' : ' 음악은 그대로예요.'}`,
      };
    }
    case 'SAVE_MOOD': {
      const name = typeof args.name === 'string' ? args.name.trim() : '';
      if (!name || name.length > 30 || Object.hasOwn(MOODS, name)) return fail('무드 이름은 기본 무드와 겹치지 않는 1~30자로 정해주세요.');
      const item = { name, mood: state.mood, energy: state.energy, brightness: state.brightness, lighting: { ...state.lighting } };
      const saved = [item, ...state.saved.filter(entry => entry.name !== name)].slice(0, 12);
      return { state: { ...state, activeName: name, saved }, ok: true, effects: [], message: `${name}, 음악과 조명 설정을 이 기기에서 기억할게요.` };
    }
    default: return fail('아직 이해하지 못했어요. “편안하게”, “조금 더 밝게”, “퇴근 모드로 저장해”처럼 말해주세요.');
  }
}

// Limited Korean parser for the prototype. Production Gleo supplies structured actions.
export function parseCommand(text, saved = []) {
  const input = String(text).trim().replace(/[.!?,。]/g, '').replace(/\s+/g, ' ').replace(/^(?:스펙트라|글레오|gleo)\s+/i, '');
  if (!input || /하지\s*마|말아|말고|않|싫/.test(input)) return null;
  const save = input.match(/^(?:이거\s*|이대로\s*|현재\s*무드를?\s*|이 분위기를?\s*)?(.{1,30}?)(?:으로|로)\s*(?:저장|기억)(?:해줘|해|해 줘|해 주세요)?$/);
  if (save) return { name: 'SAVE_MOOD', parameters: { name: save[1].trim() } };
  const remembered = saved.find(item => input === item.name || input === `${item.name}로 바꿔줘` || input === `${item.name}으로 바꿔줘`);
  if (remembered) return { name: 'SET_MOOD', parameters: { mood: remembered.name } };
  const lightColor = input.match(/^조명(?:만|을)?\s*(하늘색|보라색|핑크색|흰색)(?:으로)?(?:\s*(?:바꿔줘|해줘))?$/);
  if (lightColor) return { name: 'ADJUST_MOOD', parameters: { target: 'lighting', dimension: 'color', color: LIGHT_COLORS[lightColor[1]] } };
  const target = /^조명/.test(input) ? 'lighting' : 'music';
  const adjustment = input.replace(/^(?:음악|조명)(?:만|을|의)?\s*/, '').replace(/\s*조명은\s*그대로$/, '');
  const action = (dimension, direction) => ({ name: 'ADJUST_MOOD', parameters: { target, dimension, direction } });
  if (/^(?:조금\s*)?(?:더\s*)?밝게(?:\s*해줘)?$/.test(adjustment)) return action('brightness', 'up');
  if (/^(?:조금\s*)?(?:덜\s*밝게|차분하게)(?:\s*해줘)?$/.test(adjustment)) return action('brightness', 'down');
  if (target === 'music' && /^(?:너무 처져\s*)?(?:조금(?:만)?\s*)?(?:더\s*)?(?:신나게|활기차게)(?:\s*해줘)?$/.test(adjustment)) return action('energy', 'up');
  if (target === 'music' && /^(?:조금\s*)?(?:덜 신나게|활기 줄여줘|에너지 줄여줘)$/.test(adjustment)) return action('energy', 'down');
  const preset = /^(?:(?:퇴근했어|오늘은)\s*)?(?:좀\s*)?편안하게(?:\s*가자|\s*해줘)?$/.test(input) ? 'calm'
    : /^(?:활기 있게|활기있게)(?:\s*해줘)?$/.test(input) ? 'uplift'
      : /^익숙하게(?:\s*해줘)?$/.test(input) ? 'familiar' : null;
  return preset ? { name: 'SET_MOOD', parameters: { mood: preset } } : null;
}

export function normalizeLibrary(data) {
  const source = Array.isArray(data) ? data : data?.tracks;
  if (!Array.isArray(source) || !source.length || source.length > 5000) throw new Error('1~5,000곡이 들어 있는 tracks JSON 파일을 선택해주세요.');
  const seen = new Set();
  const tracks = source.filter(item => item && typeof item.name === 'string' && item.name.trim()).flatMap(item => {
    const artistValue = item.artists ?? item.artist ?? '알 수 없는 아티스트';
    const artist = Array.isArray(artistValue) ? artistValue.map(value => typeof value === 'string' ? value : value?.name || '').join(', ')
      : typeof artistValue === 'string' ? artistValue : '알 수 없는 아티스트';
    const key = `${artist.trim().toLowerCase()}::${item.name.trim().toLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const tags = (Array.isArray(item.genres) ? item.genres : []).filter(value => typeof value === 'string');
    const tagText = tags.join(' ').toLowerCase();
    const energy = validLevel(item.energy) ? item.energy : /ambient|acoustic|chill|classical/.test(tagText) ? 0.25 : /dance|rock|disco|house/.test(tagText) ? 0.75 : 0.5;
    const brightness = validLevel(item.valence) ? item.valence : /happy|funk|disco/.test(tagText) ? 0.75 : 0.5;
    const album = typeof item.album === 'string' ? item.album.trim() : typeof item.album?.name === 'string' ? item.album.name.trim() : '';
    return [{ id: key, name: item.name.trim(), artist, album, coverUrl: importedArtwork(item, artist, item.name.trim()), tags, energy, brightness,
      basis: validLevel(item.energy) && validLevel(item.valence) ? '가져온 무드 값' : tags.length ? '장르 태그 기반 추정' : '무드 정보 없음 · 중간값 적용' }];
  });
  if (!tracks.length) throw new Error('곡의 name 필드를 찾을 수 없어요. SPECTRA tracks 형식을 확인해주세요.');
  return tracks;
}

export function rankTracks(tracks, state) {
  return tracks.map(track => ({ ...track, distance: Math.hypot(track.energy - state.energy, track.brightness - state.brightness) }))
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id)).slice(0, 6);
}
