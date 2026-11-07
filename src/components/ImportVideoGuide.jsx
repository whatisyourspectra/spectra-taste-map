import { useRef } from 'react';
import { translate } from '../i18n/translate.js';
import './ImportVideoGuide.css';

const TITLES = { connect: '연결하고 목록 선택', export: 'CSV로 내보내기', upload: '스펙트라에 파일 가져오기' };

// Optional media inside the common four-step guide; never owns step navigation.
export default function ImportVideoGuide({ videoId }) {
    const videoRef = useRef(null);
    if (!TITLES[videoId]) return null;
    const replay = () => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
    };
    return <details className="import-video-guide" onToggle={event => { if (!event.currentTarget.open) videoRef.current?.pause(); }}>
        <summary>{translate('영상으로 보기')}</summary>
        <div className="ivg-media">
            <video ref={videoRef} controls playsInline preload="none" aria-label={translate('{0} 영상 안내', [translate(TITLES[videoId])])}>
                <source src={`/guides/spotify-${videoId}.mp4`} type="video/mp4" />
                {translate('동영상을 지원하지 않는 브라우저입니다. 위의 문장 안내를 따라 진행해 주세요.')}
            </video>
            <p className="ivg-note">{translate('TuneMyMusic 화면 예시입니다. 목록과 버튼 위치는 이용 환경에 따라 달라질 수 있어요.')}</p>
            <button type="button" onClick={replay}>{translate('다시 보기')}</button>
        </div>
    </details>;
}
