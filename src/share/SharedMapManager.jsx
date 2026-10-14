import { useEffect, useState } from 'react';
import { listOwnSharedMaps, revokeSharedMap } from './sharedMapStorage';
export default function SharedMapManager({ refreshId, onRevoked }) {
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
    if (!shares.length) return null;
    return <details className="share-map-manager"><summary>내 공유 지도 관리 ({shares.length})</summary>
        {shares.map(item => <div key={item.id}><span>{item.title} · {new Date(item.created_at).toLocaleDateString('ko-KR')}</span><button type="button" disabled={Boolean(busy)} onClick={() => revoke(item.id)}>{busy === item.id ? '해제 중…' : '공유 해제'}</button></div>)}
        {error && <p role="alert">{error}</p>}
    </details>;
}
