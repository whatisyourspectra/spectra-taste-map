// Original vector study, inspired by IONIQ 6's dual-display cockpit.
// The cluster, scenery and steering wheel are presentation-only, not vehicle telemetry.
export function CabinArtwork() {
  return <svg className="cp-cabin-art" viewBox="0 0 1600 900" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="cp-sky" x2="0" y2="1"><stop stopColor="#152b46" /><stop offset=".65" stopColor="#6c7d92" /><stop offset="1" stopColor="#d0b5a4" /></linearGradient>
      <linearGradient id="cp-road" x2="0" y2="1"><stop stopColor="#565764" /><stop offset="1" stopColor="#1c2632" /></linearGradient>
      <linearGradient id="cp-dash" x1="800" y1="390" x2="800" y2="800" gradientUnits="userSpaceOnUse"><stop stopColor="#4a4d53" /><stop offset=".22" stopColor="#2b3038" /><stop offset=".35" stopColor="#171d25" /><stop offset="1" stopColor="#080c12" /></linearGradient>
      <linearGradient id="cp-trim"><stop stopColor="#313a45" /><stop offset=".3" stopColor="#76808b" /><stop offset=".55" stopColor="#303a46" /><stop offset="1" stopColor="#79818c" /></linearGradient>
      <linearGradient id="cp-console" x2=".4" y2="1"><stop stopColor="#303741" /><stop offset=".3" stopColor="#151a22" /><stop offset="1" stopColor="#080b11" /></linearGradient>
      <radialGradient id="cp-haze"><stop stopColor="#f9c8a2" stopOpacity=".4" /><stop offset="1" stopColor="#e8b69c" stopOpacity="0" /></radialGradient>
      <pattern id="cp-texture" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0h1v1H0zM3 3h1v1H3z" fill="#fff" opacity=".025" /></pattern>
    </defs>
    <path fill="url(#cp-sky)" d="M0 0h1600v490H0z" />
    <ellipse cx="650" cy="225" rx="600" ry="170" fill="url(#cp-haze)" />
    <path d="M0 198 130 163 200 181 341 152 475 192 630 164 840 190 1050 142 1200 174 1430 150 1600 189V330H0Z" fill="#3e5065" opacity=".7" />
    {Array.from({ length: 27 }, (_, index) => {
      const x = index * 64 - 20; const h = 28 + ((index * 47) % 77); const y = 275 - h;
      return <g key={index}><path d={`M${x} ${y}h${44 + index % 3 * 5}v${h + 40}h-${44 + index % 3 * 5}Z`} fill={index % 2 ? '#475361' : '#394858'} />{Array.from({ length: 4 }, (_, row) => <path key={row} d={`M${x + 9} ${y + 10 + row * 13}h4m9 0h4m9 0h4`} stroke={index % 3 ? '#b9a99b' : '#a8c1cb'} strokeOpacity=".35" strokeWidth="3" />)}</g>;
    })}
    <path d="M650 248 1230 470H0Z" fill="#34444e" /><path d="M649 248 976 480H110Z" fill="url(#cp-road)" />
    <path d="M636 256 154 480m517-223 285 222" stroke="#d3d3c5" strokeWidth="3" opacity=".65" />
    <g className="cp-road-dashes" stroke="#e4dece" strokeWidth="3" opacity=".65"><path d="m647 262-9 19m-9 16-15 31m-16 29-28 56m-14 28-25 50" /><path d="m658 263 8 19m8 17 17 35m13 30 26 57m13 28 20 43" /></g>
    <path d="M0 344 592 251m118 0 890 97" stroke="#d4bda5" strokeOpacity=".45" strokeWidth="3" />
    {[150, 350, 500, 805, 1040, 1430].map((x, index) => <g key={x} stroke="#53606c" strokeWidth={index % 3 + 2}><path d={`M${x} ${300 + Math.abs(x - 650) * .08}V${120 + Math.abs(x - 650) * .06}q0-10 ${x < 650 ? 20 : -20}-10`} /><path d={`M${x} ${126 + Math.abs(x - 650) * .06}h${x < 650 ? 26 : -26}`} stroke="#f6d7ac" strokeWidth="3" /></g>)}
    <path d="M0 0h86l158 409-51 71L0 193ZM1600 0h-66l-125 403 70 81 121-204Z" fill="#222a32" />
    <path d="m65 0 159 420m1320-420-125 416" stroke="#727b84" strokeOpacity=".45" strokeWidth="4" />
    <path d="M0 447Q325 385 799 409t801 25V900H0Z" fill="url(#cp-dash)" />
    <path d="M0 447Q325 385 799 409t801 25V900H0Z" fill="url(#cp-texture)" />
    <path d="M0 555q345-18 760-5t840-8" stroke="#0b1017" strokeWidth="31" />
    <path d="M0 546q345-18 760-5t840-8" stroke="url(#cp-trim)" strokeWidth="2" />
    {[554, 561, 568].map(y => <path key={y} d={`M0 ${y}q345-18 760-5t840-8`} stroke="#46505b" strokeOpacity=".48" />)}
    <path d="M0 594q345-18 760-5t840-8" stroke="#659baf" strokeOpacity=".2" strokeWidth="10" />
    <path d="M0 594q345-18 760-5t840-8" stroke="#86bbcb" strokeOpacity=".65" strokeWidth="1.5" />
    <rect x="1052" y="542" width="38" height="35" rx="4" fill="#171b22" stroke="#626873" /><path d="m1071 549 11 19h-22Z" stroke="#d69b9f" strokeWidth="1.5" /><path d="M1071 555v6m0 3v1" stroke="#d69b9f" />
    <path d="M845 635q193-25 393-8l90 273H867Z" fill="url(#cp-console)" stroke="#454c57" strokeWidth="2" />
    <path d="M865 651q175-16 352-10l12 81q-183-12-370 5Z" fill="#10151c" stroke="#555e69" />
    <path d="M877 666h320" stroke="#7e8793" strokeWidth="22" strokeOpacity=".42" />
    <g fill="#b5beca" fontFamily="sans-serif" fontSize="9" textAnchor="middle"><text x="900" y="669">MAP</text><text x="948" y="669">NAV</text><text x="996" y="669">MEDIA</text><text x="1052" y="669">SEEK</text><text x="1110" y="669">TRACK</text><text x="1170" y="669">SETUP</text></g>
    <g fill="#b6d6e3" fontFamily="sans-serif" fontSize="26"><text x="885" y="708">22.0°</text><text x="1140" y="708">22.0°</text></g><text x="1035" y="704" fill="#a4aeb9" fontFamily="sans-serif" fontSize="10" textAnchor="middle">AUTO  ·  A/C  ·  SYNC</text>
    <path d="M901 779h295l29 121H883Z" fill="#070b11" stroke="#3d4551" /><path d="M930 797h229" stroke="#25303e" /><ellipse cx="1030" cy="859" rx="49" ry="24" fill="#0b1018" stroke="#3c4653" /><ellipse cx="1144" cy="859" rx="49" ry="24" fill="#0b1018" stroke="#3c4653" />
    <path d="M0 705 165 642l63 258H0Z" fill="#111720" stroke="#323d48" /><path d="m0 725 130-48" stroke="#77aaba" strokeOpacity=".4" />
    <path d="M1600 674 1422 630l-61 270h239Z" fill="#131922" stroke="#303b47" />
    <path d="M0 0h1600v33Q790 7 0 33Z" fill="#0a1019" />
  </svg>;
}

export function SteeringWheel({ listening }) {
  return <svg className={`cp-wheel ${listening ? 'is-listening' : ''}`} viewBox="0 0 1600 900" fill="none" aria-hidden="true">
    <defs><linearGradient id="cp-wheel-metal" x2=".7" y2="1"><stop stopColor="#8b919b" /><stop offset=".4" stopColor="#414a57" /><stop offset=".6" stopColor="#9ba3ae" /><stop offset="1" stopColor="#303944" /></linearGradient><linearGradient id="cp-leather" x2=".7" y2="1"><stop stopColor="#4f5661" /><stop offset=".3" stopColor="#222a35" /><stop offset="1" stopColor="#080e16" /></linearGradient><radialGradient id="cp-hub"><stop stopColor="#3b4350" /><stop offset="1" stopColor="#202834" /></radialGradient></defs>
    <ellipse cx="474" cy="754" rx="242" ry="246" stroke="#000" strokeOpacity=".5" strokeWidth="49" />
    <ellipse cx="474" cy="747" rx="239" ry="242" stroke="url(#cp-leather)" strokeWidth="42" />
    <ellipse cx="474" cy="747" rx="240" ry="244" stroke="#8a9097" strokeOpacity=".2" strokeWidth="1.5" />
    <path d="M250 705q43-28 104 3l37 42-37 41-103-28Zm448 0q-43-28-104 3l-37 42 37 41 103-28ZM420 823l-20 133 148 0-20-133Z" fill="url(#cp-leather)" stroke="#5e6774" />
    <path d="m263 767 100 27m323-27-100 27M413 838l-6 94m128-94 6 94" stroke="url(#cp-wheel-metal)" strokeWidth="5" />
    <path d="M358 696q116-44 232 0l12 96q-6 68-128 73-122-5-128-73Z" fill="url(#cp-hub)" stroke="#69717e" strokeWidth="2" />
    <path d="M366 701q108-39 216 0" stroke="#9096a1" strokeOpacity=".4" />
    <g className="cp-pixel-lights" fill={listening ? '#91d9f5' : '#d2d9e1'}>{[438, 460, 482, 504].map(x => <rect key={x} x={x} y="758" width="5" height="5" rx=".7" />)}</g>
    <text x="474" y="828" textAnchor="middle" fill="#717b89" fontFamily="sans-serif" fontSize="9" letterSpacing="3">AIRBAG</text>
    <rect x="280" y="715" width="52" height="49" rx="7" fill="#17202a" stroke="#4c5664" /><path d="M291 750h30m-14-24v13m-9-6h17" stroke="#a1adbd" strokeWidth="2" />
    <rect x="619" y="715" width="47" height="49" rx="7" fill="#17202a" stroke="#4c5664" /><path d="M630 726h24m-24 13h24m-13-1v17m-5-7 5 7 5-7" stroke="#a1adbd" strokeWidth="1.2" />
    <path d="M722 641h35q11 0 11 11v14q0 11-11 11h-37" fill="#343e4a" stroke="#717b89" /><text x="742" y="663" fill="#c5cbd4" fontFamily="sans-serif" fontSize="13">D</text>
  </svg>;
}
