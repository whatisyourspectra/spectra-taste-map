import { LIGHT_COLORS } from './moodEngine.js';
import { identifyPlace, DEMO_PLACES } from './platform/journey.js';

export function JourneyBar({ snapshot, onDestination, suggestion, onApply, onDismiss, hasCommute }) {
  const place = snapshot.destination ? identifyPlace(snapshot.destination) : null;
  return <section className="journey-context" aria-label="이동 맥락 시뮬레이션">
    <div className="journey-bar"><div><span className="eyebrow">YOUR WAY HOME</span><strong>{snapshot.driving ? '주행 중' : '출발 전'} · {snapshot.destination ? `${DEMO_PLACES[place]?.name || '등록하지 않은 장소'}으로 가는 길` : '목적지 없음'}</strong></div><label>목적지<select aria-label="시뮬레이션 목적지" value={place || 'none'} onChange={event => onDestination(event.target.value)}><option value="none">목적지 없음</option><option value="home">집</option><option value="work">회사</option><option value="other">다른 목적지</option></select></label><span className="simulation-badge">시뮬레이션 · 차량·내비 미연결</span></div>
    {suggestion ? <div className="commute-proposal" role="status"><div><span>{suggestion.reason}</span><strong>저장한 {suggestion.name}로 바꿀까요?</strong><small>{suggestion.source === 'location' ? '회사 영역 이탈 이벤트 시뮬레이션' : '샘플로 저장한 집 좌표와 목적지를 비교했어요.'}</small></div><button onClick={onApply}>퇴근 모드 적용</button><button className="dismiss-proposal" onClick={onDismiss}>지금은 유지</button></div>
      : !hasCommute && <p className="journey-hint">음악과 조명을 맞춘 뒤 “퇴근 모드로 기억해”라고 말하면, 집으로 향할 때 다시 제안해드려요.</p>}
  </section>;
}

export function CabinPreview({ requested, snapshot, outcome, onAction }) {
  const applied = snapshot.appliedLighting;
  const writable = ['read_write', 'write'].includes(snapshot.lightingAccess);
  const status = { read_write: '조명 변경 지원', write: '조명 쓰기 지원', read: '조명 읽기 전용', none: '조명 미지원', error: '조명 연결 오류' }[snapshot.lightingAccess];
  return <section className="cabin-card" aria-label="실내 조명 시뮬레이션" style={{ '--cabin-color': applied.color, '--cabin-level': applied.brightness }}>
    <div className="cabin-heading"><span className="eyebrow">MUSIC & AMBIENCE</span><span>{status} · 시뮬레이션</span></div>
    <svg className="cabin-drawing" viewBox="0 0 400 130" fill="none" aria-hidden="true"><path d="M34 106L57 27Q60 16 75 15H325Q340 16 343 27L366 106" stroke="#516680" /><path d="M49 83Q200 47 351 83M40 105Q200 75 360 105" stroke="#2c415d" /><path className="cabin-light-line" d="M49 83Q200 47 351 83" stroke="var(--cabin-color)" strokeWidth="3" /><path d="M81 97a23 23 0 1 1 46 0M81 97h46m-23-23v23" stroke="#8094af" strokeWidth="2" /><rect x="163" y="75" width="80" height="29" rx="5" fill="#101a2a" stroke="#455b78" /><path d="M174 92h20m7 0h29" stroke="var(--cabin-color)" opacity=".7" /><path d="M68 32h264" stroke="#29394e" /></svg>
    <div className="cabin-readout"><span><i style={{ background: applied.color }} />현재 모의 조명</span><strong>미리보기 {Math.round(applied.brightness * 100)}%</strong></div>
    <div className="light-swatches" role="group" aria-label="조명 색상">{Object.entries(LIGHT_COLORS).map(([name, color]) => <button key={name} style={{ '--swatch': color }} aria-label={`조명 ${name}`} aria-pressed={requested.color === color} disabled={!writable || snapshot.driving} onClick={() => onAction({ name: 'ADJUST_MOOD', parameters: { target: 'lighting', dimension: 'color', color } })}><i />{name}</button>)}</div>
    <div className="light-level"><span>요청 조명 밝기 <strong>{Math.round(requested.brightness * 100)}%</strong></span><div><button aria-label="조명 밝기 줄이기" disabled={!writable || snapshot.driving} onClick={() => onAction({ name: 'ADJUST_MOOD', parameters: { target: 'lighting', dimension: 'brightness', direction: 'down' } })}>−</button><button aria-label="조명 밝기 더하기" disabled={!writable || snapshot.driving} onClick={() => onAction({ name: 'ADJUST_MOOD', parameters: { target: 'lighting', dimension: 'brightness', direction: 'up' } })}>+</button></div></div>
    <p className="cabin-note">{snapshot.driving ? '직접 설정은 정차 후에, 주행 중에는 음성으로 요청해주세요.' : !writable ? '조명은 적용되지 않으며 음악 무드 전환은 계속 사용할 수 있어요.' : '차량 조명 대신 화면의 실내 미리보기에만 적용됩니다.'}{outcome && !['simulated', 'not_requested'].includes(outcome.status) ? ' 요청 설정과 현재 미리보기는 다를 수 있어요.' : ''}</p>
  </section>;
}

export function SimulationSettings({ snapshot, onConfigure, onWorkExit, callback }) {
  return <details className="simulation-settings"><summary>시연 환경 설정 · SDK 연결 준비</summary><div className="simulation-controls"><label>차량 상태<select aria-label="시뮬레이션 차량 상태" value={snapshot.driving ? 'driving' : 'parked'} onChange={event => onConfigure({ driving: event.target.value === 'driving' })}><option value="parked">정차</option><option value="driving">주행</option></select></label><label>조명 접근<select aria-label="시뮬레이션 조명 접근" value={snapshot.lightingAccess} onChange={event => onConfigure({ lightingAccess: event.target.value })}><option value="read_write">읽기·쓰기 지원</option><option value="write">쓰기 전용</option><option value="read">읽기 전용</option><option value="none">미지원</option><option value="error">연결 오류</option></select></label><label className="location-toggle"><input type="checkbox" checked={snapshot.locationSupported} onChange={event => onConfigure({ locationSupported: event.target.checked })} />위치 SDK 지원 환경 가정</label><button disabled={!snapshot.locationSupported} onClick={onWorkExit}>회사 영역 이탈 시뮬레이션</button></div><p>실제 Vehicle·NaviHelper·FusedLocation SDK는 연결되지 않았습니다. 위치는 조회하지 않으며, 집·회사는 샘플 좌표입니다. 지원하지 않는 환경에서는 위치 이벤트가 발생하지 않습니다.</p>{callback && <details className="callback-preview"><summary>마지막 Gleo 응답 계약 미리보기 · 전송하지 않음</summary><pre>{JSON.stringify(callback, null, 2)}</pre></details>}</details>;
}
