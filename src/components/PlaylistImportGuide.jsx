import { useState } from 'react';
import { translate } from '../i18n/translate.js';
import { useLocale } from '../i18n/useLocale.js';
import { IMPORT_GUIDE_STEPS } from './playlistImportGuides.js';
import ImportVideoGuide from './ImportVideoGuide.jsx';
import './PlaylistImportGuide.css';

const guideKey = id => `spectra:import-guide:v1:${id}`;
function savedGuide(id) {
    const defaultDevice = typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches ? 'mobile' : 'desktop';
    try {
        const raw = sessionStorage.getItem(guideKey(id)) ?? (id === 'apple' ? sessionStorage.getItem('spectra:apple-import-guide:v1') : null);
        const saved = JSON.parse(raw);
        return {
            step: Number.isInteger(saved?.step) && saved.step >= 0 && saved.step < IMPORT_GUIDE_STEPS.length ? saved.step : 0,
            device: ['mobile', 'desktop'].includes(saved?.device) ? saved.device : defaultDevice,
        };
    } catch { return { step: 0, device: defaultDevice }; }
}

export default function PlaylistImportGuide({ platform, onChooseFile }) {
    const { lang } = useLocale();
    const [guide, setGuide] = useState(() => savedGuide(platform.id));
    const { step, device } = guide;
    const updateGuide = patch => {
        const next = { ...guide, ...patch };
        setGuide(next);
        try { sessionStorage.setItem(guideKey(platform.id), JSON.stringify(next)); } catch { /* Keep navigation usable without storage. */ }
    };
    const exportUrl = `https://www.tunemymusic.com/${lang === 'ko' ? 'ko/' : ''}transfer/${platform.exportPath}`;
    return <section className="playlist-import-guide" data-platform={platform.id} style={{ '--import-accent': platform.accent }} aria-label={translate('{0} 가져오기 단계별 안내', [platform.label])}>
        <div className="pi-guide-intro">
            <span className="pi-guide-eyebrow">{platform.label.toUpperCase()} → SPECTRA</span>
            <h4>{translate('로그인부터 목록 선택까지, 함께 따라가요.')}</h4>
            <p>{translate('TuneMyMusic에서 {0} 목록을 파일로 저장한 뒤, 이곳에 올리는 방식이에요. SPECTRA 로그인과는 별개입니다.', [platform.label])}</p>
        </div>
        <a className="llp-export-link" href={exportUrl} target="_blank" rel="noopener noreferrer">
            {translate('{0} 곡 목록 내보내기 ↗', [platform.label])}<span>{translate('TuneMyMusic · 새 탭')}</span>
        </a>
        <p className="pi-guide-handoff">{translate('새 탭에서 진행한 뒤 이 탭으로 돌아오세요. 아래 단계는 안내이며 실제 연결 상태를 표시하지 않아요.')}</p>
        <div className="pi-guide-device" role="group" aria-label={translate('안내를 볼 기기')}>
            <button type="button" aria-pressed={device === 'mobile'} onClick={() => updateGuide({ device: 'mobile' })}>{translate('모바일')}</button>
            <button type="button" aria-pressed={device === 'desktop'} onClick={() => updateGuide({ device: 'desktop' })}>Mac / PC</button>
        </div>
        <ol className="pi-guide-steps" aria-label={translate('가져오기 안내 단계')}>
            {IMPORT_GUIDE_STEPS.map((label, index) => <li key={label}><button type="button" aria-current={step === index ? 'step' : undefined} onClick={() => updateGuide({ step: index })}><span>{String(index + 1).padStart(2, '0')}</span>{translate(label)}</button></li>)}
        </ol>
        <div className="pi-guide-panel" aria-live="polite">
            {step === 0 && <>
                <h4>{translate(platform.accountTitle)}</h4>
                <ol className="pi-guide-checklist">
                    <li>{translate('위 버튼으로 TuneMyMusic을 열고, 출발 서비스가 {0}인지 확인하세요.', [platform.label])}</li>
                    <li>{translate(platform.accountCheck)}</li>
                    <li>{translate('{0} 보관함 접근 요청을 확인하고 허용한 뒤, TuneMyMusic의 목록 선택 화면으로 돌아가세요.', [platform.label])}</li>
                </ol>
                <p className="pi-guide-callout">{translate('로그인 정보는 해당 음악 서비스의 로그인 화면에서만 입력하세요. SPECTRA에 입력할 필요는 없어요.')}</p>
            </>}
            {step === 1 && <>
                <h4>{translate('처음에는 익숙한 플레이리스트 하나를 골라보세요.')}</h4>
                <ol className="pi-guide-checklist">
                    <li>{translate('TuneMyMusic에서 보관함의 플레이리스트 목록을 불러오세요.')}</li>
                    <li>{translate('가져올 플레이리스트 이름과 곡 수를 확인하고 선택하세요. 처음에는 곡이 있는 목록 하나로 시작하면 좋아요.')}</li>
                    <li>{translate('곡 선택 화면이 있다면 원하는 곡이 체크되어 있는지 확인한 뒤 다음으로 이동하세요.')}</li>
                </ol>
                <p className="pi-guide-callout">{translate('목록이 비어 있거나 원하는 목록이 없다면 아래 ‘로그인했는데 목록이 안 보여요’를 먼저 확인하세요.')}</p>
            </>}
            {step === 2 && <>
                <h4>{translate('목적지는 다른 음악 서비스 대신 파일로 선택하세요.')}</h4>
                <ol className="pi-guide-checklist">
                    <li>{translate('목적지에서 ‘파일로 내보내기(Export to file)’를 선택하세요.')}</li>
                    <li>{translate('{0} 형식을 고르고 내보내기를 진행한 뒤, 완료 화면에서 파일을 다운로드하세요.', [platform.format])}</li>
                    <li>{translate('파일 이름이 .csv 또는 .txt로 끝나는지 확인하세요. 플레이리스트 공유 링크나 음원 다운로드는 곡 목록 파일과 달라요.')}</li>
                </ol>
                <p className="pi-guide-callout">{translate('내보내기 옵션과 이용 조건은 TuneMyMusic 화면에서 확인할 수 있어요.')}</p>
            </>}
            {step === 3 && <>
                <h4>{translate('다운로드한 파일로 나의 지도를 만드세요.')}</h4>
                <ol className="pi-guide-checklist">
                    <li>{translate('이 SPECTRA 탭으로 돌아와 아래 ‘다운로드한 파일 선택’을 누르세요.')}</li>
                    <li>{device === 'mobile' ? translate('모바일에서는 다운로드 폴더를 확인하세요. iPhone·iPad는 ‘둘러보기 → iCloud Drive → 다운로드’ 또는 ‘나의 iPhone’, Android는 ‘다운로드’에서 찾을 수 있어요.') : translate('Mac·PC에서는 다운로드 폴더에서 파일을 고르거나, 아래 업로드 영역에 끌어다 놓으세요.')}</li>
                    <li>{translate('SPECTRA가 인식한 곡 수를 확인하고 ‘나의 taste맵 생성하기’를 누르면 됩니다.')}</li>
                </ol>
                <button type="button" className="pi-guide-primary" onClick={onChooseFile}>{translate('다운로드한 파일 선택')}</button>
            </>}
        </div>
        <nav className="pi-guide-actions" aria-label={translate('안내 단계 이동')}>
            <button type="button" disabled={step === 0} onClick={() => updateGuide({ step: step - 1 })}>{translate('이전')}</button>
            {step < IMPORT_GUIDE_STEPS.length - 1 && <button type="button" onClick={() => updateGuide({ step: step + 1 })}>{translate('다음 안내 →')}</button>}
        </nav>
        {platform.videoSteps && <ImportVideoGuide key={platform.videoSteps[step]} videoId={platform.videoSteps[step]} />}
        <div className="pi-guide-troubleshooting">
            <h4>{translate('어디서 막혔나요?')}</h4>
            <details>
                <summary>{translate('로그인했는데 목록이 안 보여요')}</summary>
                <ol className="pi-guide-checklist">{platform.missingLibrary.map(text => <li key={text}>{translate(text)}</li>)}</ol>
                {platform.syncHelp && <p>{device === 'mobile' ? translate('iPhone·iPad: 설정에서 ‘음악’을 찾아 ‘보관함 동기화’를 확인하세요. OS 버전에 따라 ‘앱 → 음악’에 있어요.') : translate('Mac: 음악 앱 → 설정 → 일반 → 보관함 동기화. Windows: Apple Music 앱 → 설정 → 일반에서 확인하세요.')}</p>}
                <div className="pi-guide-links">
                    <a href={platform.libraryUrl} target="_blank" rel="noopener noreferrer">{translate('웹에서 내 보관함 확인 ↗')}</a>
                    {platform.syncHelp && <a href={platform.syncHelp} target="_blank" rel="noopener noreferrer">{translate('Apple 보관함 동기화 도움말 ↗')}</a>}
                </div>
            </details>
            <details>
                <summary>{translate('원하는 플레이리스트만 없어요')}</summary>
                {platform.missingPlaylist.map(text => <p key={text}>{translate(text)}</p>)}
                {platform.playlistHelp && <a href={platform.playlistHelp} target="_blank" rel="noopener noreferrer">{translate('Apple 플레이리스트 만들기 도움말 ↗')}</a>}
            </details>
            <details>
                <summary>{translate('로그인이 반복되거나 연결 화면이 열리지 않아요')}</summary>
                <p>{translate('앱 안의 브라우저라면 이 페이지를 Safari 또는 Chrome에서 열어 다시 시도해 보세요. 음악 서비스 로그인을 마친 뒤 TuneMyMusic 탭으로 돌아왔는지도 확인하세요.')}</p>
                <p>{translate('로그인 화면이나 접근 허용 요청을 다시 확인하세요. 계속 실패하면 TuneMyMusic 도움말에서 연결 문제를 확인할 수 있어요.')}</p>
                <a href="https://www.tunemymusic.com/help" target="_blank" rel="noopener noreferrer">{translate('TuneMyMusic 연결 도움말 ↗')}</a>
            </details>
        </div>
        <div className="pi-guide-shortcut"><span>{translate('이미 CSV·TXT 파일을 받았나요?')}</span><button type="button" onClick={onChooseFile}>{translate('바로 파일 선택')}</button></div>
    </section>;
}
