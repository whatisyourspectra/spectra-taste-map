// Explicit sample places for scenario testing. These are not the user's real places.
export const DEMO_PLACES = {
  home: { name: '집', latitude: 37.5665, longitude: 126.9780 },
  work: { name: '회사', latitude: 37.4979, longitude: 127.0276 },
  other: { name: '다른 목적지', latitude: 37.5112, longitude: 127.0980 },
};
const validCoordinate = point => point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;

export function distanceMeters(a, b) {
  if (!validCoordinate(a) || !validCoordinate(b)) return Infinity;
  const rad = value => value * Math.PI / 180;
  const lat = rad(b.latitude - a.latitude);
  const lng = rad(b.longitude - a.longitude);
  const h = Math.sin(lat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function identifyPlace(destination, places = DEMO_PLACES) {
  return Object.entries(places).map(([key, place]) => ({ key, distance: distanceMeters(destination, place) }))
    .filter(item => item.distance <= 150).sort((a, b) => a.distance - b.distance)[0]?.key || null;
}

export function getCommuteSuggestion(state, context, places = DEMO_PLACES) {
  const commute = state.saved.find(item => item.name === '퇴근 모드');
  if (!commute) return null;
  // Active route wins over a previous geofence event. No inference from a POI name.
  if (context.destination) {
    if (identifyPlace(context.destination, places) !== 'home') return null;
    return { key: `route:${context.navigationRevision}:${commute.name}`, name: commute.name, reason: '저장한 집 위치와 목적지가 일치해요.', source: 'navigation' };
  }
  if (context.locationSupported && context.locationEvent?.placeId === 'work' && context.locationEvent.transition === 'exit') {
    return { key: context.locationEvent.id, name: commute.name, reason: '저장한 회사 영역을 벗어났어요.', source: 'location' };
  }
  return null;
}
