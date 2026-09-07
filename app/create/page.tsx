'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { YouTubePlayer } from '@/components/youtube-player';
import { exportMap, findMap, makeId, saveMap } from '@/lib/storage';
import { getMap, upsertMap } from '@/lib/cloud';
import { getSupabase } from '@/lib/supabase/client';
import type { MapLine, TypingMap } from '@/lib/types';

function videoIdFromUrl(value: string): string {
  try { const url = new URL(value); if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0]; return url.searchParams.get('v') || url.pathname.split('/').pop() || ''; }
  catch { return value.trim(); }
}
const blank = (): TypingMap => ({ id: makeId(), authorId: 'local', title: '', description: '', youtubeVideoId: '', tags: [], visibility: 'private', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lines: [] });

function isValidImportedMap(value: unknown): value is TypingMap {
  if (!value || typeof value !== 'object') return false;
  const map = value as Partial<TypingMap>;
  if (typeof map.title !== 'string' || !map.title.trim()) return false;
  if (typeof map.youtubeVideoId !== 'string' || !map.youtubeVideoId.trim()) return false;
  if (!Array.isArray(map.lines)) return false;
  return map.lines.every((line) => {
    if (!line || typeof line !== 'object') return false;
    const item = line as Partial<MapLine>;
    return typeof item.text === 'string' && !!item.text.trim() && typeof item.reading === 'string' && !!item.reading.trim() && Number.isFinite(Number(item.startTime)) && Number(item.startTime) >= 0 && (item.endTime == null || (Number.isFinite(Number(item.endTime)) && Number(item.endTime) >= 0));
  });
}

export default function CreatePage() {
  const [map, setMap] = useState<TypingMap>(blank);
  const [time, setTime] = useState(0);
  const [text, setText] = useState('');
  const [reading, setReading] = useState('');
  const [saved, setSaved] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabase();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const id = new URLSearchParams(window.location.search).get('edit');
      if (!id) return;
      if (alive) setLoadingEdit(true);

      const local = findMap(id);
      if (local && alive) {
        setMap(local);
        setCanEdit(local.authorId === 'local');
      }

      const cloud = await getMap(id);
      if (cloud && alive) setMap(cloud);
      if (alive) setLoadingEdit(false);
    };

    const loadAuth = async () => {
      if (!supabase) {
        await load();
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (alive) {
        setLoggedIn(!!data.user);
        setUserId(data.user?.id ?? null);
      }
      await load();
    };

    loadAuth();
    return () => { alive = false; };
  }, [supabase]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('edit');
    if (!id) {
      setCanEdit(true);
      return;
    }
    if (map.authorId === 'local') {
      setCanEdit(true);
    } else {
      setCanEdit(!!userId && map.authorId === userId);
    }
  }, [map.authorId, userId]);

  const ready = map.youtubeVideoId.length > 0;
  const sorted = useMemo(() => [...map.lines].sort((a,b) => a.startTime - b.startTime), [map.lines]);
  const update = (patch: Partial<TypingMap>) => {
    if (!canEdit) return;
    setMap((m) => ({ ...m, ...patch, updatedAt: new Date().toISOString() }));
    setSaved('');
  };
  const addLine = () => {
    if (!canEdit || !text.trim() || !reading.trim()) return;
    const startTime = Number(time.toFixed(2));
    if (map.lines.some((line) => Math.abs(line.startTime - startTime) < 0.005)) {
      setSaved('同じ時刻の行は登録できません。少し時間をずらしてください。');
      return;
    }
    const line: MapLine = { id: makeId(), text: text.trim(), reading: reading.trim(), startTime };
    setMap((m) => ({ ...m, lines: [...m.lines, line], updatedAt: new Date().toISOString() }));
    setText(''); setReading(''); setSaved('');
  };
  const updateLine = (id: string, patch: Partial<MapLine>) => {
    if (!canEdit) return;
    if (patch.startTime != null) {
      const nextTime = Number(Math.max(0, Number(patch.startTime)).toFixed(2));
      if (!Number.isFinite(nextTime)) return;
      if (map.lines.some((line) => line.id !== id && Math.abs(line.startTime - nextTime) < 0.005)) {
        setSaved('同じ時刻の行は設定できません。少し時間をずらしてください。');
        return;
      }
      patch = { ...patch, startTime: nextTime };
    }
    setMap((m) => ({ ...m, lines: m.lines.map((line) => line.id === id ? { ...line, ...patch } : line), updatedAt: new Date().toISOString() }));
    setSaved('');
  };
  const removeLine = (id: string) => {
    if (!canEdit) return;
    setMap((m) => ({ ...m, lines: m.lines.filter((line) => line.id !== id), updatedAt: new Date().toISOString() }));
    setSaved('');
  };
  const save = async () => {
    if (!canEdit) { setSaved('この譜面は作者のみ編集できます。'); return; }
    if (!map.title.trim() || !ready || !map.lines.length) { setSaved('タイトル・動画・1行以上の譜面が必要です。'); return; }
    const saveTarget = !loggedIn && map.visibility !== 'private' ? { ...map, visibility: 'private' as const } : map;
    saveMap(saveTarget);
    if (loggedIn) {
      const result = await upsertMap(map);
      setSaved(result.ok ? '保存しました。公開設定に応じて共有できます。' : `ローカルには保存しました：${result.error ?? '保存に失敗しました。'}`);
    } else if (map.visibility !== 'private') {
      setMap(saveTarget);
      setSaved('ゲストとして保存できるのは非公開のみです。ローカルには非公開で保存しました。');
    } else setSaved('このブラウザに保存しました。');
  };
  const importJson = (file?: File) => {
    if (!canEdit || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as unknown;
        if (!isValidImportedMap(imported)) throw new Error('invalid');
        const normalizedLines = imported.lines.map((line) => ({
          ...line,
          id: line.id || makeId(),
          text: line.text.trim(),
          reading: line.reading.trim(),
          startTime: Number(Number(line.startTime).toFixed(2)),
          ...(line.endTime == null ? {} : { endTime: Number(Number(line.endTime).toFixed(2)) }),
        }));
        const uniqueTimes = new Set(normalizedLines.map((line) => line.startTime.toFixed(2)));
        if (uniqueTimes.size !== normalizedLines.length) throw new Error('duplicate-time');
        setMap({ ...imported, id: makeId(), authorId: loggedIn && userId ? userId : 'local', visibility: loggedIn ? imported.visibility : 'private', lines: normalizedLines, updatedAt: new Date().toISOString() });
        setSaved('');
      } catch (error) { window.alert(error instanceof Error && error.message === 'duplicate-time' ? '同じ開始時刻の行が含まれているため読み込めません。' : '有効な譜面JSONではありません。'); }
    };
    reader.readAsText(file);
  };

  return <>
    <header className="site-header"><div className="container header-inner"><Link className="brand" href="/"><span className="brand-mark">YT</span><span>YouTube <b>Typing</b></span></Link><nav className="nav"><Link href="/search">探す</Link><Link href="/">トップ</Link>{loggedIn ? <Link href="/profile?id=me">プロフィール</Link> : <Link className="nav-accent" href="/login">ログイン</Link>}</nav></div></header>
    <main className="container section create-page">
      <div className="page-head"><div><p className="eyebrow">MAP EDITOR</p><h1 className="page-title">譜面を作る</h1><p className="muted">動画を再生して「今！」の瞬間を登録します。</p></div><div className="cta-row"><button className="btn" onClick={() => fileRef.current?.click()} disabled={!canEdit}>JSON読み込み</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e)=>importJson(e.target.files?.[0])}/><button className="btn" onClick={() => exportMap(map)}>JSON書き出し</button><button className="btn primary" onClick={save} disabled={!canEdit}>保存する</button></div></div>
      {loadingEdit && <p className="notice">譜面を確認しています…</p>}
      {!loadingEdit && !canEdit && <div className="notice"><b>この譜面は作者のみ編集できます。</b><span style={{display:'block',fontSize:12,marginTop:4,color:'var(--muted)'}}>内容を変更せずにプレイすることはできます。</span><div className="cta-row" style={{marginTop:10}}><Link className="btn primary" href={`/play?id=${encodeURIComponent(map.id)}`}>プレイする</Link><Link className="btn" href="/search">譜面を探す</Link></div></div>}
      {saved && <p className="notice">{saved}</p>}
      {canEdit && <>
        <div className="editor-intro"><span>1</span><div><b>基本情報を設定</b><small>タイトル、YouTube動画、公開範囲を決めます。</small></div><span>2</span><div><b>タイミングを登録</b><small>動画を再生して文章と読みを「今！」で追加。</small></div></div>
        <div className="form" style={{marginTop:18}}>
          <div className="form-row"><div className="field"><label>タイトル</label><input value={map.title} onChange={(e)=>update({title:e.target.value})} placeholder="例：好きな曲タイピング" /></div><div className="field"><label>公開状態</label><select value={map.visibility} onChange={(e)=>update({visibility:e.target.value as TypingMap['visibility']})}><option value="private">非公開 — 自分だけ</option><option value="unlisted">共有 — URLを知っている人向け</option><option value="public">公開 — 検索に表示</option></select></div></div>
          <div className="form-row"><div className="field"><label>YouTube URL / 動画ID</label><input value={map.youtubeVideoId} onChange={(e)=>update({youtubeVideoId:videoIdFromUrl(e.target.value)})} placeholder="https://www.youtube.com/watch?v=..." /></div><div className="field"><label>タグ（カンマ区切り）</label><input value={map.tags.join(', ')} onChange={(e)=>update({tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="J-POP, 歌詞, 練習" /></div></div>
          <div className="field"><label>説明</label><textarea value={map.description} onChange={(e)=>update({description:e.target.value})} placeholder="この譜面の特徴や難易度など" maxLength={1000} /></div>
        </div>
        <div className="editor-grid" style={{marginTop:18}}>
          <section className="card"><div className="card-topline"><div><p className="eyebrow">VIDEO</p><h2 style={{margin:0}}>タイミング登録</h2></div><span className="timecode">{time.toFixed(2)}s</span></div>{ready ? <YouTubePlayer videoId={map.youtubeVideoId} onTime={setTime} /> : <div className="empty">YouTube URLを入力すると、ここに動画が表示されます。</div>}<div className="notice" style={{marginTop:12}}><b>現在時刻 {time.toFixed(2)}秒</b><span style={{display:'block',fontSize:12,marginTop:4,color:'var(--muted)'}}>動画を止めずに文章と読みを入力して、その瞬間で登録できます。</span></div><div className="form" style={{marginTop:12}}><div className="field"><label>表示する文章</label><input value={text} onChange={(e)=>setText(e.target.value)} placeholder="今日も一日頑張ろう" /></div><div className="field"><label>読み（ひらがな推奨）</label><input value={reading} onChange={(e)=>setReading(e.target.value)} placeholder="きょうもいちにちがんばろう" /></div><button className="btn primary" type="button" onClick={addLine} disabled={!ready || !text.trim() || !reading.trim()}>＋ 現在時刻を登録</button></div></section>
          <section className="card"><div className="toolbar"><div><p className="eyebrow">TIMELINE</p><h2 style={{margin:0}}>登録済み</h2></div><span className="spacer"/><span className="muted">{sorted.length} 行</span></div><div className="line-list" style={{marginTop:10}}>{sorted.map((line, idx)=><div className="line-item" key={line.id}><div className="line-num">{String(idx+1).padStart(2,'0')}</div><div className="line-main"><strong>{line.text}</strong><small>{line.reading}</small><div className="meta"><button className="icon-btn" onClick={()=>updateLine(line.id,{startTime:Number(Math.max(0,line.startTime-0.1).toFixed(2))})}>−0.1</button><button className="icon-btn" onClick={()=>updateLine(line.id,{startTime:Number((line.startTime+0.1).toFixed(2))}>＋0.1</button><input aria-label="開始時間" type="number" min="0" step="0.01" value={line.startTime} onChange={(e)=>updateLine(line.id,{startTime:Math.max(0,Number(e.target.value))})} style={{width:92,background:'#0b0f15',border:'1px solid var(--line)',borderRadius:7,color:'var(--text)',padding:'5px 7px'}} /></div></div><div className="line-actions"><span className="line-time">{line.startTime.toFixed(2)}s</span><button className="icon-btn" onClick={()=>removeLine(line.id)}>削除</button></div></div>)}{!sorted.length && <div className="empty">まだ行がありません。動画を再生しながら右側へ追加していきます。</div>}</div></section>
        </div>
      </>}
    </main>
  </>;
}
