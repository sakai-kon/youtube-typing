'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { YouTubePlayer } from '@/components/youtube-player';
import { findMap } from '@/lib/storage';
import { getMap, isFavorite, recordPlay, submitReport, toggleFavorite } from '@/lib/cloud';
import { demoMap } from '@/lib/demo';
import { nextInputState } from '@/lib/romaji';
import { getSupabase } from '@/lib/supabase/client';
import type { TypingMap } from '@/lib/types';

export default function PlayPage() {
  const params = useParams<{ id: string }>();
  const [map, setMap] = useState<TypingMap | null>(null);
  const [ytTime, setYtTime] = useState(0);
  const [typed, setTyped] = useState('');
  const [misses, setMisses] = useState(0);
  const [acceptedChars, setAcceptedChars] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastKeyOk, setLastKeyOk] = useState<boolean | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const local = findMap(params.id);
      if (local && alive) setMap(local);
      if (params.id === demoMap.id && alive) setMap(demoMap);
      const cloud = await getMap(params.id);
      if (cloud && alive) setMap(cloud);
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (alive) setLoggedIn(!!user);
        if (user && alive) setFavorite(await isFavorite(params.id));
      }
    };
    load();
    return () => { alive = false; };
  }, [params.id]);

  const lines = useMemo(() => map ? [...map.lines].sort((a,b)=>a.startTime-b.startTime) : [], [map]);
  const current = lines[activeIndex];
  const progress = lines.length ? (activeIndex / lines.length) * 100 : 0;
  useEffect(() => { if (!lines.length || finished) return; let index = activeIndex; while (index + 1 < lines.length && ytTime >= lines[index + 1].startTime) index += 1; if (index !== activeIndex) { setActiveIndex(index); setTyped(''); setLastKeyOk(null); } }, [ytTime, lines, activeIndex, finished]);
  const finishLine = useCallback(() => { if (activeIndex >= lines.length - 1) setFinished(true); else { setActiveIndex((i)=>i+1); setTyped(''); setLastKeyOk(null); } }, [activeIndex, lines.length]);

  useEffect(() => {
    if (!current || finished) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key.length !== 1 && event.key !== 'Backspace') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (event.key === 'Backspace') { setTyped((value) => value.slice(0, -1)); return; }
      if (startedAt === null) setStartedAt(Date.now());
      const proposed = typed + event.key.toLowerCase();
      const result = nextInputState(current.reading, proposed);
      setLastKeyOk(result.status === 'correct');
      if (result.status === 'correct') { setTyped(proposed); setAcceptedChars((value)=>value+1); if (result.done) finishLine(); }
      else setMisses((value) => value + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, typed, finishLine, finished, startedAt]);

  useEffect(() => {
    if (!finished || !map || !loggedIn) return;
    const elapsed = startedAt ? Math.max((Date.now() - startedAt) / 1000 / 60, 1/60) : 1/60;
    const kpm = Math.round(acceptedChars / elapsed);
    const accuracy = Math.round((acceptedChars / Math.max(acceptedChars + misses, 1)) * 100);
    recordPlay(map.id, accuracy, misses, kpm);
  }, [finished, map, loggedIn, startedAt, acceptedChars, misses]);

  const reset = () => { setYtTime(0); setTyped(''); setMisses(0); setAcceptedChars(0); setStartedAt(null); setFinished(false); setActiveIndex(0); setLastKeyOk(null); };
  const handleFavorite = async () => { const result = await toggleFavorite(map?.id ?? ''); if (result.ok) setFavorite(result.favorite); else if (!loggedIn) window.alert('お気に入りにはログインが必要です。'); };
  const handleReport = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!map) return; const form = new FormData(event.currentTarget); const result = await submitReport(map.id, String(form.get('reason') ?? ''), String(form.get('details') ?? '')); setReportMessage(result.ok ? '通報を受け付けました。' : (result.error ?? '通報に失敗しました。')); if (result.ok) event.currentTarget.reset(); };

  if (!map) return <main className="container section"><div className="empty"><h2>譜面が見つかりません</h2><p>公開譜面はSupabaseから読み込みます。ローカル譜面は作成したブラウザから開いてください。</p><Link className="btn" href="/">トップへ戻る</Link></div></main>;
  const elapsed = startedAt ? Math.max((Date.now() - startedAt) / 1000 / 60, 1/60) : 0;
  const kpm = elapsed ? Math.round(acceptedChars / elapsed) : 0;
  const accuracy = Math.round((acceptedChars / Math.max(acceptedChars + misses, 1)) * 100);

  return <>
    <header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link><nav className="nav"><Link href="/create">譜面を作る</Link><Link href="/">終了</Link></nav></header>
    <main className="container section"><div className="toolbar"><div><h1 style={{margin:'0 0 5px'}}>{map.title}</h1><span className="muted">{finished ? lines.length : activeIndex + 1} / {lines.length}</span></div><span className="spacer"/><button className="btn" onClick={handleFavorite}>{favorite ? '★ お気に入り済み' : '☆ お気に入り'}</button><button className="btn" onClick={()=>setReportOpen(v=>!v)}>通報</button></div>
      <div className="play-layout" style={{marginTop:14}}>
        <section><YouTubePlayer videoId={map.youtubeVideoId} onTime={setYtTime} compact /><div className="progress" style={{marginTop:10}}><div style={{width:`${Math.min(progress,100)}%`}}/></div><div className="meta"><span>動画 {ytTime.toFixed(2)}s</span><span>•</span><span>ミス {misses}</span><span>•</span><span>KPM {kpm}</span></div></section>
        <section className="play-stage"><div className="muted">タイピングする文章</div>{finished ? <><div className="play-text">COMPLETE!</div><p className="muted">おつかれさまでした。</p><div className="result"><div className="stat"><b>{misses}</b><span>ミス</span></div><div className="stat"><b>{kpm}</b><span>KPM</span></div><div className="stat"><b>{accuracy}%</b><span>精度</span></div><div className="stat"><b>{lines.length}</b><span>行数</span></div></div><button className="btn primary" onClick={reset}>もう一度</button></> : <><div className="play-text">{current?.text || '—'}</div><div className="play-reading">{current?.reading || ''}</div><div className="play-input" aria-live="polite">{typed || 'キーボードで入力…'}</div><div style={{minHeight:22}}>{lastKeyOk === false && <span className="error">入力が違います</span>}{lastKeyOk === true && <span className="muted">入力OK</span>}</div></>}</section>
      </div>
      {reportOpen && <section className="card" style={{marginTop:16}}><h2>譜面を通報</h2><form className="form" onSubmit={handleReport}><div className="field"><label>理由</label><select name="reason" required><option value="copyright">権利・著作権に関する問題</option><option value="inappropriate">不適切な内容</option><option value="spam">スパム</option><option value="other">その他</option></select></div><div className="field"><label>詳細</label><textarea name="details" maxLength={5000} placeholder="問題の内容を入力してください" /></div><button className="btn primary" disabled={!loggedIn}>通報を送信</button>{!loggedIn && <p className="muted">通報にはログインが必要です。</p>}{reportMessage && <p className="notice">{reportMessage}</p>}</form></section>}
    </main>
  </>;
}
