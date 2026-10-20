import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { supabase } from '../auth/supabaseClient';
import { FEEDBACK_CATEGORIES, feedbackClientId, feedbackPayload, feedbackUuid, sendFeedback } from './feedback';
import './FeedbackTab.css';

const emptyForm = () => ({ category: 'question', subject: '', message: '', email: '', consent: false });

export default function FeedbackTab({ inMenu = false, onOpened }) {
    const { pathname } = useLocation();
    const dialogRef = useRef(null);
    const tabRef = useRef(null);
    const sendingRef = useRef(false);
    const clientId = useRef(null);
    const submission = useRef(null);
    const sourcePath = useRef('/');
    const id = useId();
    const [form, setForm] = useState(emptyForm);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));

    const open = () => {
        sourcePath.current = pathname;
        dialogRef.current.showModal();
        onOpened?.();
    };
    const close = () => dialogRef.current.close();
    const submit = async event => {
        event.preventDefault();
        if (sendingRef.current) return;
        setError('');
        let payload;
        try {
            payload = feedbackPayload(form, {
                pagePath: sourcePath.current,
                deviceType: window.matchMedia('(max-width: 900px)').matches ? 'mobile' : 'desktop',
            });
            if (!clientId.current) {
                let storage;
                try { storage = window.sessionStorage; } catch { /* Storage is optional. */ }
                clientId.current = feedbackClientId(storage);
            }
            const key = JSON.stringify(payload);
            if (submission.current?.key !== key) submission.current = { key, id: feedbackUuid() };
        } catch (validation) { setError(validation.message); return; }
        sendingRef.current = true;
        setStatus('sending');
        try {
            await sendFeedback(supabase, payload, { clientId: clientId.current, requestId: submission.current.id });
            setStatus('sent');
            setForm(emptyForm());
            submission.current = null;
        } catch (failure) { setError(failure.message); setStatus('idle'); }
        finally { sendingRef.current = false; }
    };

    if (pathname.startsWith('/auth/')) return null;
    return <>
        <button ref={tabRef} type="button" className={inMenu ? 'feedback-menu-entry' : 'feedback-tab'} onClick={open} aria-haspopup="dialog" aria-controls={`${id}-dialog`}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" /></svg>
            <span>문의 남기기</span>
        </button>
        {createPortal(<dialog ref={dialogRef} id={`${id}-dialog`} className="feedback-dialog" aria-labelledby={`${id}-title`}
            onClose={() => { const menu = tabRef.current?.closest('details'); (menu && !menu.open ? menu.querySelector('summary') : tabRef.current)?.focus(); }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } }}>
            <div className="feedback-head"><span>SPECTRA · FEEDBACK</span><button type="button" onClick={close} aria-label="문의 창 닫기">×</button></div>
            {status === 'sent' ? <section className="feedback-success" role="status">
                <span className="feedback-success-mark" aria-hidden="true">✦</span>
                <h2 id={`${id}-title`}>소중한 의견을 받았어요.</h2>
                <p>보내주신 내용을 확인하고<br />더 나은 스펙트라를 만드는 데 참고할게요.</p>
                <button type="button" className="feedback-primary" onClick={close}>닫기</button>
                <button type="button" className="feedback-again" onClick={() => { setStatus('idle'); setError(''); }}>다른 의견 남기기</button>
            </section> : <>
                <h2 id={`${id}-title`}>어떤 이야기를 들려주실 건가요?</h2>
                <p className="feedback-intro">궁금한 점, 불편했던 경험, 새로운 아이디어까지.<br />로그인 없이 편하게 남겨주세요.</p>
                <form onSubmit={submit}>
                    <fieldset disabled={status === 'sending'}>
                        <legend className="feedback-sr-only">문의 내용</legend>
                        <label htmlFor={`${id}-category`}>문의 유형</label>
                        <select id={`${id}-category`} value={form.category} onChange={e => update('category', e.target.value)}>{FEEDBACK_CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
                        <label htmlFor={`${id}-subject`}>제목 <span>필수</span></label>
                        <input id={`${id}-subject`} value={form.subject} onChange={e => update('subject', e.target.value)} required minLength={2} maxLength={120} placeholder="어떤 내용인지 짧게 알려주세요" />
                        <label htmlFor={`${id}-message`}>내용 <span>필수</span></label>
                        <textarea id={`${id}-message`} value={form.message} onChange={e => update('message', e.target.value)} required minLength={10} maxLength={4000} rows={5} placeholder="10자 이상 입력해 주세요. 오류라면 어떤 상황에서 발생했는지 알려주세요." aria-describedby={`${id}-count`} />
                        <small id={`${id}-count`} className="feedback-count">{form.message.length.toLocaleString()} / 4,000</small>
                        <label htmlFor={`${id}-email`}>답변받을 이메일 <span>선택</span></label>
                        <input id={`${id}-email`} type="email" autoComplete="email" maxLength={254} value={form.email} onChange={e => update('email', e.target.value)} placeholder="이메일을 남기면 답변드릴 수 있어요" />
                        <p className="feedback-privacy">문의 내용·이메일(입력한 경우)·현재 화면·기기 유형을 문의 확인과 서비스 개선을 위해 저장합니다. 로그인 상태라면 계정도 함께 연결됩니다. 다른 사용자에게 공개되지 않습니다.</p>
                        <label className="feedback-consent"><input type="checkbox" checked={form.consent} onChange={e => update('consent', e.target.checked)} required /><span>문의 처리를 위한 정보 수집에 동의합니다.</span></label>
                    </fieldset>
                    {error && <p className="feedback-error" role="alert">{error}</p>}
                    <button className="feedback-primary" type="submit" disabled={status === 'sending'} aria-busy={status === 'sending'}>{status === 'sending' ? '의견을 보내고 있어요…' : '의견 보내기'}</button>
                </form>
            </>}
        </dialog>, document.body)}
    </>;
}
