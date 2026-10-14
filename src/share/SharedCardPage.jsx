import { useState } from 'react';
import { Link } from 'react-router-dom';
import SpectraLogo from '../components/SpectraLogo';
import { validCardImage } from './kakaoShare';
import './share.css';
export default function SharedCardPage() {
    const params = new URLSearchParams(window.location.search);
    const image = validCardImage(params.get('image'));
    const [failed, setFailed] = useState(false);
    return <main className="spectra-shared-card">
        <Link to="/" aria-label="SPECTRA home"><SpectraLogo decorative /></Link>
        <h1>{image && !failed ? (params.get('title') || '친구의 스펙트라').slice(0, 80) : '공유 카드를 불러오지 못했어요'}</h1>
        {image && !failed ? <img className="shared-card-image" src={image} alt="음악 취향 공유 카드" onError={() => setFailed(true)} /> : <p>링크가 올바르지 않거나 카드 보관 기간이 지났을 수 있어요.</p>}
        <Link className="shared-card-cta" to="/">나도 내 취향 만들기 →</Link>
    </main>;
}
