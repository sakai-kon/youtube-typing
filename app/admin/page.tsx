'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

export default function AdminPage() {
  const supabase = getSupabase();
  const [allowed, setAllowed] = useState(false);
  const [reports, setReports] = useState<Array<{ id: number; map_id: string; reason: string; details: string; status: string; created_at: string }>>([]);
  const [message, setMessage] = useState('確認中…');

  const load = async () => {
    if (!supabase) { setMessage('Supabaseが設定されていません。'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('管理画面にはログインが必要です。'); return; }
    const { data: admin } = await supabase.rpc('is_admin');
    if (!admin) { setMessage('管理者権限がありません。'); return; }
    setAllowed(true);
    const { data, error } = await supabase.from('reports').select('id, map_id, reason, details, status, created_at').order('created_at', { ascending: false }).limit(100);
    if (error) setMessage(error.message); else setReports(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const updateReport = async (id: number, status: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('reports').update({ status, resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null }).eq('id', id);
    if (error) setMessage(error.message); else load();
  };
  const unpublish = async (mapId: string) => {
    if (!supabase || !window.confirm('この譜面を非公開にしますか？')) return;
    const { error } = await supabase.from('maps').update({ visibility: 'private' }).eq('id', mapId);
    setMessage(error ? error.message : '非公開にしました。');
    load();
  };
  const deleteMap = async (mapId: string) => {
    if (!supabase || !window.confirm('この譜面を削除しますか？')) return;
    const { error } = await supabase.from('maps').delete().eq('id', mapId);
    setMessage(error ? error.message : '削除しました。');
    load();
  };

  if (!allowed) return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link></header><main className="container section"><div className="card"><h1>管理画面</h1><div className="notice">{message}</div><Link className="btn" href="/">トップへ戻る</Link></div></main></>;
  return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link><nav className="nav"><Link href="/">トップ</Link></nav></header><main className="container section"><div className="toolbar"><div><p className="muted">管理者</p><h1 style={{margin:0}}>管理画面</h1></div></div>{message && <p className="notice">{message}</p>}<section className="section"><h2>通報一覧</h2>{reports.length === 0 ? <div className="empty">通報はありません。</div> : <div className="line-list">{reports.map((report)=><div className="line-item" key={report.id}><div className="line-main"><strong>{report.reason} — {report.map_id}</strong><small>{report.details || '詳細なし'} / {new Date(report.created_at).toLocaleString()}</small><div className="meta"><span>状態: {report.status}</span><button className="icon-btn" onClick={()=>unpublish(report.map_id)}>非公開化</button><button className="icon-btn" onClick={()=>deleteMap(report.map_id)}>削除</button><button className="icon-btn" onClick={()=>updateReport(report.id,'reviewing')}>確認中</button><button className="icon-btn" onClick={()=>updateReport(report.id,'resolved')}>解決</button><button className="icon-btn" onClick={()=>updateReport(report.id,'dismissed')}>却下</button></div></div></div>)}</div>}</section></main></>;
}
