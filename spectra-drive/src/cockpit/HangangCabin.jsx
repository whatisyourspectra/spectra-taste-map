// Generated scene plate; the two live screens are composited separately in HTML.
// This is a visual concept of a Han River commute, not a camera or map feed.
export default function HangangCabin({ listening }) {
  return <>
    <img className="cp-hangang-plate" src="/cockpit/ioniq6-hangang-sunset-v2.png" alt="한강의 노을과 다리가 보이는 아이오닉 6 콘셉트 운전석" width="1672" height="941" fetchPriority="high" draggable="false" />
    <div className="cp-climate-overlay" aria-hidden="true"><span>22.0<small>°</small></span><div><small>AUTO</small><span>⌁　A/C　　SYNC</span></div><span>22.0<small>°</small></span></div>
    <svg className={`cp-pixel-feedback ${listening ? 'is-listening' : ''}`} viewBox="0 0 1600 900" fill="none" aria-hidden="true"><g>{[445, 468, 490, 513].map(x => <rect key={x} x={x - 2.5} y="727.5" width="5" height="5" rx="1.1" />)}</g></svg>
  </>;
}
