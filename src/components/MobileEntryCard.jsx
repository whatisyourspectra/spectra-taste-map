import { languageUrl } from '../i18n/locale.js';
import { translate } from '../i18n/translate.js';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function MobileEntryCard() {
  const url = languageUrl(new URL('/mobile-start', import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).href);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then(value => { if (active) setQr(value); }).catch(() => {});
    return () => { active = false; };
  }, [url]);
  return <section className="llp-mobile-entry llp-section" aria-labelledby="mobile-entry-title">
    <div><span className="llp-section-eyebrow">TAKE YOUR TASTE WITH YOU</span>
      <h2 id="mobile-entry-title">{translate("취향 탐색, 손안에서도.")}</h2>
      <p>{translate("휴대폰 카메라로 QR을 스캔하면 모바일에서 바로 시작할 수 있어요.")}<br />{translate("처음이라면 데모로 체험하고, 같은 계정으로 로그인하면 저장한 내 지도를 불러와요.")}</p>
      <div className="llp-mobile-actions"><a href={url}>{translate("모바일 화면 열기 ↗")}</a><button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setCopyError(false); }
        catch { setCopyError(true); }
      }}>{copied ? translate("링크 복사됨 ✓") : translate("링크 복사")}</button></div>
      <p className="llp-mobile-status" role="status">{copyError ? translate("이 링크를 복사해 주세요: {0}", [url]) : copied ? translate("휴대폰에 링크를 보내서 열어보세요.") : ''}</p>
    </div>
    <a className="llp-mobile-qr" href={url} aria-label={translate("모바일 데모 시작 링크")}>
      {qr ? <img src={qr} alt={translate("모바일 시작 링크 QR 코드")} width="144" height="144" /> : <span>{translate("모바일 링크 열기 ↗")}</span>}
      <span>SCAN TO EXPLORE</span>
    </a>
  </section>;
}
