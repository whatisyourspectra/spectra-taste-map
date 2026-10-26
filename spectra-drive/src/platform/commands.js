import { executeAction } from '../moodEngine.js';

export async function performCommand(state, action, platform) {
  const result = executeAction(state, action);
  const simulation = platform.getSnapshot?.().mode === 'simulation';
  if (!result.ok) return { ...result, simulation, lightingResult: { status: 'not_requested' } };
  const lightEffect = result.effects.find(effect => effect.type === 'lighting.apply');
  let lightingResult = { status: 'not_requested' };
  if (lightEffect) {
    try {
      const capability = await platform.checkLightingCapability();
      if (['read_write', 'write'].includes(capability.access)) lightingResult = await platform.applyLighting(lightEffect.lighting);
      else lightingResult = { status: capability.access === 'read' ? 'read_only' : capability.access === 'error' ? 'error' : 'unsupported', simulation: capability.simulation };
    } catch { lightingResult = { status: 'error' }; }
  }
  const musicChanged = result.effects.some(effect => effect.type === 'music.queue');
  const lightMessages = {
    applied: '요청한 조명 설정을 차량에 적용했어요.',
    simulated: '조명 미리보기에 적용했어요. 실제 차량은 연결되지 않았어요.',
    unsupported: '이 환경은 조명 변경을 지원하지 않아 조명은 적용하지 못했어요.',
    read_only: '조명은 읽기 전용이라 요청한 설정을 적용하지 못했어요.',
    error: '조명 연결에 실패했어요. 요청 설정은 유지하고 현재 조명은 바꾸지 않았어요.',
    invalid: '조명 설정을 확인해주세요.',
  };
  const message = lightingResult.status === 'not_requested' ? result.message
    : `${musicChanged ? '취향에 맞춰 음악 추천을 바꿨어요. ' : ''}${lightMessages[lightingResult.status] || '조명 적용 결과를 확인할 수 없어요.'}`;
  return { ...result, simulation, lightingResult, message };
}

export function decodeGleoAction(payload) {
  const value = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!value || !['SET_MOOD', 'ADJUST_MOOD', 'SAVE_MOOD'].includes(value.action)) throw new Error('Unknown Gleo action');
  if (!value.actionParameters || typeof value.actionParameters !== 'object' || Array.isArray(value.actionParameters)) throw new Error('Invalid Gleo parameters');
  return { name: value.action, parameters: value.actionParameters };
}

// Returned for inspection/transport by a future native adapter, never sent by the web app.
export function buildGleoCallback(action, result, playback = 'not_requested', origin = 'app') {
  const incomplete = !['not_requested', 'simulated', 'applied'].includes(result.lightingResult.status);
  const musicChanged = result.effects.some(effect => effect.type === 'music.queue');
  return {
    functionName: action?.name || 'UNKNOWN',
    status: !result.ok ? 'asking' : result.lightingResult.status === 'error' && !musicChanged ? 'error' : incomplete ? 'fail' : 'success',
    mode: origin === 'gleo' ? 'voice' : 'silent',
    message: !result.ok ? 'The requested mood action needs valid parameters.'
      : incomplete ? 'Music settings were updated when requested, but the requested lighting could not be applied.'
        : 'The requested settings were processed. Playback and lighting outcomes are provided in the data.',
    data: JSON.stringify([{
      music: musicChanged ? 'queue_updated' : 'unchanged',
      playback, lighting: result.lightingResult.status,
      simulation: Boolean(result.simulation || result.lightingResult.simulation),
    }]),
  };
}

export function responseOwner(origin, voiceEnabled) {
  return origin === 'gleo' ? 'gleo' : voiceEnabled ? 'app' : 'silent';
}
