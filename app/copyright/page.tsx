'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { submitCopyrightRequest } from '@/lib/cloud';
import { getSupabase } from '@/lib/supabase/client';

function extractMapId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const id = url.searchParams.get('id');
    return id?.trim() || null;
  } catch {
    return null;
  }
}

export default function CopyrightPage() {
  const supabase = getSupabase();
  const [mapUrl, setMapUrl] = useState('');
  const [reason, setReason] = useState('copyright');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUrl = mapUrl.trim();
    const trimmedDetails = details.trim();
    if (!trimmedUrl || !trimmedDetails) { setMessage('譜面URLと申立て内容を入力してください。'); return; }
    try { new URL(trimmedUrl); } catch { setMessage('有効な譜面URLを入力してください。'); return; }
    setLoading(true);
    setMessage('');
    const result = await submitCopyrightRequest({ mapUrl: trimmedUrl, mapId: extractMapId(trimmedUrl), reason, details: trimmedDetails });
    setLoading(false);
    if (result.ok) { setMapUrl(''); setDetails(''); setMessage('申立てを受け付けました。管理者が内容を確認します。'); }
    else setMessage(result.error ?? '送信に失敗しました。');
  };

  return <>
    <SiteHeader />
    <main className="container section">
      <div className="page-head"><div><p className="eyebrow">COPYRIGHT / TAKEDOWN</p><h1 className="page-title">著作権に関する申立て</h1><p className="muted">譜面に関する権利上の問題を管理者へ送信できます。</p></div></div>
      <div className="card" style={{maxWidth:760}}>
        <div className="notice">このフォームは譜面の削除依頼・権利上の問題の連絡用です。送信内容は管理者画面で確認されます。</div>
        <form className="form" onSubmit={submit} style={{marginTop:16}}>
          <div className="field"><label htmlFor="map-url">譜面URL</label><input id="map-url" type="url" required value={mapUrl} onChange={(e)=>setMapUrl(e.target.value)} placeholder="https://.../play?id=..." /></div>
          <div className="field"><label htmlFor="reason">申立て理由</label><select id="reason" value={reason} onChange={(e)=>setReason(e.target.value)}><option value="copyright">著作権・権利上の問題</option><option value="trademark">商標・ブランドに関する問題</option><option value="other">その他の権利上の問題</option></select></div>
          <div className="field"><label htmlFor="details">内容</label><textarea id="details" required maxLength={5000} value={details} onChange={(e)=>setDetails(e.target.value)} placeholder="どの点に問題があるのか、管理者に伝えたい内容を入力してください。" /></div>
          {message && <div className={message.includes('受け付けました') ? 'notice' : 'error'}>{message}</div>}
          <div className="cta-row"><button className="btn primary" disabled={loading || !supabase}>{loading ? '送信中…' : '申立てを送信'}</button><Link className="btn" href="/">戻る</Link></div>
        </form>
      </div>
    </main>
  </>;
}
