import { useRef, useState } from 'react';
import './ImportVideoGuide.css';

const STEPS = [
    { id: 'connect', title: '연결하고 목록 선택', description: 'Spotify에 로그인한 뒤, 지도에 담을 플레이리스트를 선택하세요.', mobile: '새 탭에서 Spotify를 연결하고 내보낼 목록을 선택하세요.' },
    { id: 'export', title: 'CSV로 내보내기', description: '파일 내보내기에서 CSV를 선택하고 내보내기를 시작하세요.', mobile: 'CSV를 선택해 내보내고 파일을 다운로드하세요.' },
    { id: 'upload', title: '스펙트라에 파일 가져오기', description: '다운로드를 마치면 이 화면으로 돌아와 파일을 놓거나 선택하세요.', mobile: '이 화면으로 돌아와 ‘다운로드한 파일 선택’을 누르세요. 파일 선택기의 ‘다운로드’ 폴더에서 CSV를 찾으면 됩니다.' },
];

const YOUTUBE_STEPS = [
    { id: 'connect', title: '연결하고 목록 선택', description: 'TuneMyMusic에서 YouTube Music을 연결하고 가져올 플레이리스트를 선택하세요.', mobile: '새 탭에서 YouTube Music을 연결하고 가져올 목록을 선택하세요.' },
    { id: 'export', title: 'TXT로 내보내기', description: '목적지를 파일 내보내기로 고른 뒤 TXT 형식을 선택해 다운로드하세요.', mobile: '파일 내보내기에서 TXT를 선택하고 파일을 다운로드하세요.' },
    { id: 'upload', title: '스펙트라에 파일 가져오기', description: '이 화면으로 돌아와 다운로드한 TXT 파일을 놓거나 선택하세요.', mobile: '‘다운로드한 파일 선택’을 누르고 파일 선택기의 ‘다운로드’ 폴더에서 TXT 파일을 선택하세요.' },
];

export default function ImportVideoGuide({ onChooseFile, platform = 'spotify' }) {
    const [step, setStep] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const videoRef = useRef(null);
    const isSpotify = platform === 'spotify';
    const steps = isSpotify ? STEPS : YOUTUBE_STEPS;
    const current = steps[step];
    const replay = () => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
    };
    return <section className={`import-video-guide${expanded ? ' is-expanded' : ''}`} aria-label={`${isSpotify ? 'Spotify' : 'YouTube Music'} 곡 목록 가져오기 안내`}>
        <ol className="ivg-steps">
            {steps.map((item, index) => <li key={item.id}><button type="button" aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}><span>0{index + 1}</span>{item.title}</button></li>)}
        </ol>
        <div className="ivg-copy" aria-live="polite">
            <h3>{current.title}</h3>
            <p className="ivg-desktop-copy">{current.description}</p>
            <p className="ivg-mobile-copy">{current.mobile}</p>
        </div>
        {isSpotify && <button type="button" className="ivg-expand" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '영상 접기' : '영상으로 보기'}</button>}
        {isSpotify && <div className="ivg-media">
            <video key={current.id} ref={videoRef} controls playsInline preload="none" aria-label={`${current.title} 영상 안내`}>
                <source src={`/guides/spotify-${current.id}.mp4`} type="video/mp4" />
                동영상을 지원하지 않는 브라우저입니다. 위의 문장 안내를 따라 진행해 주세요.
            </video>
            <p className="ivg-note">TuneMyMusic 화면 예시입니다. 목록과 버튼 위치는 이용 환경에 따라 달라질 수 있어요.</p>
        </div>}
        <div className="ivg-actions">
            <button type="button" disabled={step === 0} onClick={() => setStep(value => value - 1)}>이전</button>
            {isSpotify && <button type="button" className="ivg-replay" onClick={replay}>다시 보기</button>}
            {step < steps.length - 1 ? <button type="button" onClick={() => setStep(value => value + 1)}>다음 단계 →</button> : <button type="button" onClick={onChooseFile}>다운로드한 파일 선택</button>}
        </div>
    </section>;
}
