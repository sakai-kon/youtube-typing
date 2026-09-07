'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { deleteCloudMap, getCopyrightRequests, updateCopyrightRequest, type CopyrightRequest } from '@/lib/cloud';

export default function CopyrightRequests() {
  const [requests, setRequests] = useState<CopyrightRequest[]>([]);
  const [message, setMessage] = useState('');
  const load = async () => setRequests(await getCopyrightRequests());
  useEffect(() => { void load(); }, []);

  const changeStatus = async (id: number, status: 'pending'|'reviewing'|'resolved'|'rejected') => {
    const result = await updateCopyrightRequest(id, status);
    setMessage(result.ok ? '申立ての状態を更新しました。' : result.error ?? '更新に失敗しました。');
    if (result.ok) await load();
  };

  const removeMap = async (request: CopyrightRequest) => {
    if (!request.map_id) { setMessage('この申立てから譜面IDを取得できません。URLを確認してください。'); return; }
    if (!window.confirm('申立て対象の譜面を削除しますか？この操作は戻せません。')) return;
    const ok = await deleteCloudMap(request.map_id);
    setMessage(ok ? '対象の譜面を削除しました。' : '譜面の削除に失敗しました。');
    if (ok) await changeStatus(request.id, 'resolved');
  };

  return <section className="section"><div className="section-heading"><div><p className="eyebrow">TAKEDOWN INBOX</p><h2>著作権申立て</h2></div><Link className="text-link" href="/copyright">申立てページを見る →</Link></div>{message && <p className="notice">{message}</p>}{requests.length === 0 ? <div className="empty">著作権申立てはありません。</div> : <div className="line-list">{requests.map((request)=><article className="line-item" key={request.id}><div className="line-main"><strong>#{request.id} · {request.reason}</strong><small>{request.map_url}</small><p className="muted" style={{margin:'7px 0 0',lineHeight:1.6}}>{request.details}</p><div className="meta"><span>状態: {request.status}</span><span>•</span><span>{new Date(request.created_at).toLocaleString()}</span></div></div><div className="line-actions"><button className="icon-btn" onClick={()=>changeStatus(request.id,'reviewing')}>確認中</button>{request.map_id && <button className="icon-btn" onClick={()=>removeMap(request)}>削除</button>}<button className="icon-btn" onClick={()=>changeStatus(request.id,'rejected')}>却下</button><button className="icon-btn" onClick={()=>changeStatus(request.id,'resolved')}>解決</button></div></article>)}</div>}</section>;
}
