import { useRef, useState } from 'react';
import { translate } from '../i18n/translate.js';
import MusicServiceIcon from './MusicServiceIcon.jsx';
import PlaylistImportGuide from './PlaylistImportGuide.jsx';
import { IMPORT_PLATFORMS } from './playlistImportGuides.js';

export default function PlaylistExportHelp({ onChooseFile }) {
    const guideRef = useRef(null);
    const [selected, setSelected] = useState(() => {
        try { return sessionStorage.getItem('spectra:import-platform') || ''; } catch { return ''; }
    });
    const platform = IMPORT_PLATFORMS.find(item => item.id === selected);
    const select = id => {
        setSelected(id);
        if (guideRef.current) guideRef.current.open = true;
        try { sessionStorage.setItem('spectra:import-platform', id); } catch { /* This selection still works. */ }
    };
    return <section className="llp-import-sources" aria-labelledby="import-platform-label">
        <h3 id="import-platform-label">{translate('어디서 듣든, 하나의 취향 지도로.')}</h3>
        <p>{translate('세 서비스의 플레이리스트를 CSV·TXT 곡 목록으로 가져올 수 있어요.')}</p>
        <div className="llp-platform-strip" role="group" aria-labelledby="import-platform-label">
            {IMPORT_PLATFORMS.map(item => <button key={item.id} type="button" className="llp-platform-chip" aria-pressed={selected === item.id} aria-controls="playlist-export-guide" onClick={() => select(item.id)}><MusicServiceIcon service={item.id} />{item.label}</button>)}
        </div>
        <details className="llp-export-help" ref={guideRef} id="playlist-export-guide">
            <summary>{translate('파일이 없나요? 플레이리스트 내보내기 안내')}<span aria-hidden="true">＋</span></summary>
            <p>{translate('이미 파일이 있다면 바로 업로드하세요. 파일이 없으면 위에서 음악 서비스를 골라 내보내는 방법을 확인하세요.')}</p>
            {platform ? <PlaylistImportGuide key={platform.id} platform={platform} onChooseFile={onChooseFile} /> : <>
                <ol className="llp-guide-steps">
                    <li>{translate('Tune My Music에서 음악 서비스를 연결하고 가져올 플레이리스트를 선택하세요.')}</li>
                    <li>{translate('목적지를 파일 내보내기로 고르고 CSV 또는 TXT 파일을 다운로드하세요.')}</li>
                    <li>{translate('이 화면으로 돌아와 다운로드한 파일을 선택하세요.')}</li>
                </ol>
                <button type="button" className="llp-export-choose" onClick={onChooseFile}>{translate('다운로드한 파일 선택')}</button>
            </>}
        </details>
    </section>;
}
