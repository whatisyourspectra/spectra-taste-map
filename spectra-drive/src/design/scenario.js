import { executeAction, initialState, normalizeLibrary, rankTracks } from '../moodEngine.js';
import { demoLibrary } from '../demoLibrary.js';

export const DESIGN_SCENES = [
  { id: 'ready', number: '01', title: '정차 · 나의 취향', summary: '좋아하는 음악과 조명을 하나의 무드로 준비합니다.', label: 'BEFORE THE JOURNEY', headline: ['오늘의 이동을,', '나의 취향으로.'], voice: '“이거 퇴근 모드로 기억해.”', note: '음악과 빛을 함께 저장하는 개인화 경험' },
  { id: 'suggestion', number: '02', title: '이동 · 퇴근 무드 제안', summary: '집으로 향하는 맥락에서 저장한 무드를 제안합니다.', label: 'A FAMILIAR WAY HOME', headline: ['집으로 가는 길,', '퇴근 무드로 바꿀까요?'], voice: '“스펙트라, 퇴근 모드로 바꿔줘.”', note: '목적지는 제안의 계기 · 적용은 사용자의 선택' },
  { id: 'applied', number: '03', title: '음성 · 음악과 조명 전환', summary: '한 번의 요청에 취향과 실내 분위기가 함께 바뀝니다.', label: 'YOUR TASTE, IN HARMONY', headline: ['내 음악과 빛이,', '편안한 퇴근 무드로.'], voice: '“스펙트라, 퇴근 모드로 바꿔줘.”', note: '차분한 음악 설정과 하늘빛 조명을 함께 복원' },
  { id: 'refined', number: '04', title: '조정 · 음악만 조금 더', summary: '원하는 부분만 바꾸고, 마음에 드는 분위기는 유지합니다.', label: 'A LITTLE MORE YOUR WAY', headline: ['음악은 조금 더 신나게.', '조명은 그대로.'], voice: '“음악만 더 신나게. 조명은 그대로.”', note: '음악 활기만 조정 · 조명 색상과 밝기 유지' },
];

export const designLibrary = normalizeLibrary(demoLibrary);

export function buildDesignScene(sceneId) {
  const scene = DESIGN_SCENES.find(item => item.id === sceneId) || DESIGN_SCENES[0];
  const commute = executeAction({ ...initialState(), energy: 0.36, brightness: 0.56,
    lighting: { color: '#70d6ff', brightness: 0.42 } }, { name: 'SAVE_MOOD', parameters: { name: '퇴근 모드' } }).state;
  const before = { ...initialState(), mood: 'familiar', energy: 0.5, brightness: 0.55,
    lighting: { color: '#d7e2f2', brightness: 0.35 }, saved: commute.saved };
  const applied = executeAction(before, { name: 'SET_MOOD', parameters: { mood: '퇴근 모드' } }).state;
  const refined = executeAction(applied, { name: 'ADJUST_MOOD', parameters: { target: 'music', dimension: 'energy', direction: 'up' } }).state;
  const state = scene.id === 'refined' ? refined : scene.id === 'applied' ? applied : before;
  return { scene, state, queue: rankTracks(designLibrary, state), isApplied: ['applied', 'refined'].includes(scene.id), isRefined: scene.id === 'refined', parked: scene.id === 'ready' };
}
