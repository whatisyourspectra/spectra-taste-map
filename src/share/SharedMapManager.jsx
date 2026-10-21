import { getIntlLocale } from '../i18n/locale.js';
import { translate } from '../i18n/translate.js';
import { useEffect, useState } from 'react';
import { listOwnSharedMaps, revokeSharedMap } from './sharedMapStorage';
export default function SharedMapManager({ refreshId, excludeId, onRevoked }) {
    const [shares, setShares] = useState([]);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => { let disposed = false; listOwnSharedMaps().then(items => {if (!disposed) setShares(items);}).catch(() => {}); return () => {disposed = true;}; }, [refreshId]);
    const revoke = async id => {
        setBusy(id); setError('');
        try { await revokeSharedMap(id); setShares(items => items.filter(item => item.id !== id)); onRevoked(id); }
        catch { setError('공유 해제에 실패했어요. 다시 시도해 주세요.'); }
        finally {setBusy(null);}
    };
    const otherShares = shares.filter(item => item.id !== excludeId);
    if (!otherShares.length) return null;
    return <details className="share-map-manager"><summary>{translate("이전에 공유한 지도 (")}{otherShares.length})</summary>
        {otherShares.map(item => <div className="share-map-record" key={item.id}><span><strong>{item.title}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString(getIntlLocale())}</time></span><button type="button" disabled={Boolean(busy)} aria-label={translate("{0} 공유 해제", [item.title])} onClick={() => revoke(item.id)}>{busy === item.id ? translate("해제 중…") : translate("공유 해제")}</button></div>)}
        {error && <p role="alert">{translate(error)}</p>}
    </details>;
}
