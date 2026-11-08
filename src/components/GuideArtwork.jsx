// Vector examples explain interactions without pretending to be live controls.
function MapDots({ shift = '' }) {
    return <g transform={shift}>
        <path d="m22 55 35-29 32 44 41-35 38 29M57 26l15 68 58-59M22 55l50 39 96-30" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".3" />
        {[[22,55,6,'#b9a3ff'],[57,26,9,'#ef74bd'],[89,70,13,'#b9a3ff'],[130,35,7,'#72d6f6'],[168,64,10,'#72d6f6'],[72,94,5,'#ef74bd']].map(([x,y,r,fill]) => <circle key={x} cx={x} cy={y} r={r} fill={fill} />)}
        <circle cx="89" cy="70" r="22" fill="none" stroke="#b9a3ff" opacity=".35" />
    </g>;
}

export default function GuideArtwork({ topic, en }) {
    return <div className={`guide-artwork guide-artwork-${topic}`} aria-hidden="true">
        <svg viewBox="0 0 400 156" fill="none">
            {topic === 'start' && <>
                <rect x="30" y="28" width="98" height="102" rx="17" fill="#292631" />
                <path d="M66 48h24l13 13v45H66Z" stroke="#d9cbff" strokeWidth="2" strokeLinejoin="round" />
                <path d="M89 48v15h14M76 78h17M76 88h17M76 98h10" stroke="#b9a3ff" strokeWidth="2" strokeLinecap="round" />
                <path className="guide-artwork-route" d="M143 79h62m-7-6 7 6-7 6" stroke="#b9a3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <MapDots shift="translate(211 11)" />
                <text x="79" y="120" textAnchor="middle" fill="#aea6bb" fontSize="9" fontFamily="inherit">CSV / TXT</text>
            </>}
            {topic === 'map' && <>
                <circle cx="187" cy="78" r="61" stroke="#b9a3ff" opacity=".12" />
                <ellipse cx="187" cy="78" rx="123" ry="53" stroke="#b9a3ff" opacity=".08" />
                <MapDots shift="translate(102 11)" />
                <g className="guide-artwork-cursor" transform="translate(202 91)"><path d="m0 0 3 25 6-8 10-2Z" fill="#f1eaff" stroke="#1b1b21" strokeWidth="2" strokeLinejoin="round" /></g>
                <rect x="246" y="109" width="116" height="29" rx="10" fill="#302b3d" />
                <circle cx="260" cy="123.5" r="4" fill="#b9a3ff" /><text x="273" y="127" fill="#e7ddff" fontSize="10" fontFamily="inherit">{en ? 'Song details' : '곡 정보 보기'}</text>
            </>}
            {topic === 'discover' && <>
                <path className="guide-artwork-route" d="M105 78h190" stroke="#b9a3ff" strokeWidth="1.5" strokeDasharray="4 6" opacity=".5" />
                <circle cx="100" cy="78" r="28" fill="#382a40" /><circle cx="100" cy="78" r="17" stroke="#ef74bd" strokeWidth="2" /><circle cx="100" cy="78" r="4" fill="#ef74bd" />
                <circle cx="201" cy="78" r="36" fill="#2b253a" /><circle cx="201" cy="78" r="27" fill="#9e83db" /><path d="m189 86 11-24 13 24-24-12h26" stroke="#e5dcff" strokeWidth="1.5" strokeLinejoin="round" />
                <g className="guide-artwork-confirm"><circle cx="227" cy="52" r="14" fill="#d9cbff" stroke="#1b1d21" strokeWidth="3" /><path d="m221 52 4 4 8-8" stroke="#30223f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
                <circle cx="300" cy="78" r="25" fill="#203a40" /><path d="m290 87 10-21 10 21Z" stroke="#72d6f6" strokeWidth="1.5" />
                <text x="201" y="140" textAnchor="middle" fill="#c4b1f7" fontSize="10" fontFamily="inherit">{en ? 'Part of your map' : '내 지도에 함께 저장돼요'}</text>
            </>}
            {topic === 'share' && <>
                <rect x="83" y="23" width="147" height="112" rx="17" fill="#292631" transform="rotate(-5 156 79)" />
                <rect x="102" y="20" width="147" height="112" rx="17" fill="#302a40" stroke="#b9a3ff" strokeOpacity=".25" />
                <text x="119" y="43" fill="#d9cbff" fontSize="10" fontWeight="700" letterSpacing="1" fontFamily="inherit">SPECTRA</text>
                <MapDots shift="translate(118 44) scale(.62)" />
                <circle cx="291" cy="61" r="18" fill="#3a2c3e" /><circle cx="291" cy="57" r="5" fill="#ef74bd" /><path d="M282 69a9 9 0 0 1 18 0" fill="#ef74bd" />
                <rect x="267" y="87" width="77" height="31" rx="12" fill="#282b34" /><path d="M279 97h32m-32 8h48" stroke="#afa8bf" strokeWidth="2" strokeLinecap="round" />
            </>}
        </svg>
        <span>{en ? 'Illustration' : '사용 예시'}</span>
    </div>;
}
