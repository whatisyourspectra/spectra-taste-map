import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createMapViewPng, mapViewSize } from './captureMapView.js';
import { frameMapView, mapTemplateLayout } from './mapViewTemplate.js';
import './SpectraShareDialog.css';
import './MapViewExport.css';

function MapViewDialog({ snapshot, onClose }) {
    const en = snapshot.lang === 'en';
    const id = useId(), dialog = useRef(null);
    const [attempt, setAttempt] = useState(0);
    const [capture, setCapture] = useState(null);
    const [mode, setMode] = useState('template');
    const [result, setResult] = useState(null);
    const [failure, setFailure] = useState(false);
    const ready = result?.mode === mode && result?.capture === capture;
    const dimensions = mode === 'template' ? mapTemplateLayout(snapshot.outputWidth, snapshot.outputHeight)
        : { width: snapshot.outputWidth, height: snapshot.outputHeight };
    useEffect(() => { dialog.current.showModal(); }, []);
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => { setFailure(true); controller.abort(); }, 30000);
        createMapViewPng(snapshot.element, { signal: controller.signal }).then(image => {
            if (controller.signal.aborted) return;
            clearTimeout(timer);
            setCapture(image);
        }).catch(error => {
            if (controller.signal.aborted || error.name === 'AbortError') return;
            clearTimeout(timer); setFailure(true); controller.abort();
        });
        return () => { clearTimeout(timer); controller.abort(); };
    }, [snapshot, attempt]);
    useEffect(() => {
        if (!capture) return;
        let disposed = false, url;
        const generate = mode === 'template' ? frameMapView(capture, { lang: snapshot.lang }) : Promise.resolve(capture);
        generate.then(image => {
            if (disposed) return;
            url = URL.createObjectURL(image.blob);
            setResult({ ...image, url, mode, capture });
        }).catch(() => { if (!disposed) setFailure(true); });
        return () => { disposed = true; if (url) URL.revokeObjectURL(url); };
    }, [capture, mode, snapshot.lang]);
    const close = () => dialog.current.close();
    return <dialog ref={dialog} className="spectra-share-dialog map-view-export-dialog" aria-labelledby={`${id}-title`} onClose={onClose}
        onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
        onClick={event => {
            if (event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
        }}>
        <header className="spectra-share-heading"><div><h2 id={`${id}-title`}>{en ? 'Save current map' : '현재 지도 저장'}</h2></div><button type="button" autoFocus onClick={close} aria-label={en ? 'Close PNG export' : 'PNG 저장 창 닫기'}>×</button></header>
        <p className="spectra-share-description">{en ? 'Keep your current view. Add a simple SPECTRA frame or save just the map.' : '현재 구도는 그대로, 간결한 템플릿을 더하거나 지도만 저장하세요.'}<br /><span>{ready ? `${result.width} × ${result.height}` : `${dimensions.width} × ${dimensions.height}`} px · PNG</span></p>
        <div className="spectra-share-styles" role="group" aria-label={en ? 'Image layout' : '이미지 구성'}>
            {[["template", en ? 'SPECTRA frame' : '기본 템플릿'], ["map", en ? 'Map only' : '지도만']].map(([key, label]) => <button key={key} type="button" aria-pressed={mode === key} disabled={!capture} onClick={() => {
                if (key === mode) return;
                setResult(null); setFailure(false); setMode(key);
            }}>{label}</button>)}
        </div>
        <div className="spectra-share-body"><div className="spectra-share-preview" aria-busy={!ready && !failure}>
            {ready ? <img src={result.url} alt={en ? 'Current map PNG preview' : '현재 지도 PNG 미리보기'} />
                : <div className="spectra-share-placeholder" role={failure ? 'alert' : 'status'}>{failure
                    ? <p>{en ? 'Could not load all map images. Please try again.' : '지도 이미지를 모두 불러오지 못했어요. 다시 시도해 주세요.'}</p>
                    : <><span className="spectra-share-spinner" aria-hidden="true" /><p>{en ? 'Capturing the current view…' : '현재 지도를 이미지로 담고 있어요…'}</p></>}</div>}
        </div></div>
        <footer className="spectra-share-footer">
            {ready ? <a className="spectra-share-primary" href={result.url} download="my-spectra-view.png">{en ? 'Save PNG' : 'PNG 저장'}</a>
                : <button type="button" className="spectra-share-primary" disabled={!failure} onClick={() => { setResult(null); setCapture(null); setFailure(false); setAttempt(value => value + 1); }}>{failure ? (en ? 'Try again' : '다시 시도') : (en ? 'Preparing image…' : '이미지 준비 중…')}</button>}
        </footer>
    </dialog>;
}

export default function MapViewExport({ getCaptureTarget, lang = 'ko', className = '', showLabel = false, disabled = false }) {
    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState(false);
    const en = lang === 'en';
    const label = en ? 'Save current map as PNG' : '현재 지도 PNG 저장';
    const open = () => {
        try {
            const element = getCaptureTarget();
            setSnapshot({ element, ...mapViewSize(element), lang });
            setError(false);
        } catch { setError(true); }
    };
    return <>
        <button type="button" className={className} title={label} aria-label={label} aria-haspopup="dialog" disabled={disabled} onClick={open}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" /></svg>
            {showLabel && (en ? 'Save PNG' : 'PNG 저장')}
        </button>
        {error && <span className="map-view-export-error" role="alert">{en ? 'Open the map to save its view.' : '지도를 연 뒤 다시 저장해 주세요.'}</span>}
        {snapshot && createPortal(<MapViewDialog snapshot={snapshot} onClose={() => setSnapshot(null)} />, document.body)}
    </>;
}
