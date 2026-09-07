'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { YouTubePlayer } from '@/components/youtube-player';
import { exportMap, findMap, makeId, saveMap } from '@/lib/storage';
import type { MapLine, TypingMap } from '@/lib/types';

function videoIdFromUrl(value: string): string {
  try { const url = new URL(value); if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0]; return url.searchParams.get('v') || url.pathname.split('/').pop() || ''; }
  catch { return value.trim(); }
}
const blank = (): TypingMap => ({ id: makeId(), authorId: 'local', title: '', description: '', youtubeVideoId: '', tags: [], visibility: 'private', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lines: [] });

export default function CreatePage() {
  const [map, setMap] = useState<TypingMap>(blank);
  const [time, setTime] = useState(0);
  const [text, setText] = useState('');
  const [reading, setReading] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('edit'); if (id) { const existing = findMap(id); if (existing) setMap(existing); } }, []);
  const ready = map.youtubeVideoId.length > 0;
  const sorted = useMemo(() => [...map.lines].sort((a,b) => a.startTime - b.startTime), [map.lines]);
  const update = (patch: Partial<TypingMap>) => { setMap((m) => ({ ...m, ...patch, updatedAt: new Date().toISOString() })); setSaved(false); };
  const addLine = () => { if (!text.trim() || !reading.trim()) return; const line: MapLine = { id: makeId(), text: text.trim(), reading: reading.trim(), startTime: Number(time.toFixed(2)) }; setMap((m) => ({ ...m, lines: [...m.lines, line], updatedAt: new Date().toISOString() })); setText(''); setReading(''); setSaved(false); };
  const updateLine = (id: string, patch: Partial<MapLine>) => { setMap((m) => ({ ...m, lines: m.lines.map((line) => line.id === id ? { ...line, ...patch } : line), updatedAt: new Date().toISOString() })); setSaved(false); };
  const removeLine = (id: string) => { setMap((m) => ({ ...m, lines: m.lines.filter((line) => line.id !== id), updatedAt: new Date().toISOString() })); setSaved(false); };
  const save = () => { if (!map.title.trim() || !ready || !map.lines.length) return; saveMap(map); setSaved(true); };
  const importJson = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(String(reader.result)) as TypingMap; if (!imported.title || !imported.youtubeVideoId || !Array.isArray(imported.lines)) throw new Error('invalid'); setMap({ ...imported, id: makeId(), updatedAt: new Date().toISOString() }); setSaved(false); } catch { window.alert('有効な譜面JSONではありません。'); } }; reader.readAsText(file); };

  return <>
    <header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link><nav className="nav"><Link href="/search">検索</Link><Link href="/">トップ</Link></nav></header>
    <main className="container section"><div className="toolbar"><div><h1 style={{margin:'0 0 6px'}}>譜面エディタ</h1><p className="muted" style={{margin:0}}>動画を再生して「今！」の瞬間を登録します。</p></div><span className="spacer"/><button className="btn" onClick={() => fileRef.current?.click()}>JSON読み込み</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e)=>importJson(e.target.files?.[0])}/><button className="btn" onClick={() => exportMap(map)}>JSON書き出し</button><button className="btn primary" onClick={save}>保存</button></div>
      {saved && <p className="notice">保存しました。プレイ画面から同期テストできます。</p>}
      <div className="form" style={{marginTop:16}}>
        <div className="form-row"><div className="field"><label>タイトル</label><input value={map.title} onChange={(e)=>update({title:e.target.value})} placeholder="例：好きな曲タイピング" /></div><div className="field"><label>公開状態</label><select value={map.visibility} onChange={(e)=>update({visibility:e.target.value as TypingMap['visibility']})}><option value="private">private</option><option value="unlisted">unlisted</option><option value="public">public</option></select></div></div>
        <div className="form-row"><div className="field"><label>YouTube URL / 動画ID</label><input value={map.youtubeVideoId} onChange={(e)=>update({youtubeVideoId:videoIdFromUrl(e.target.value)})} placeholder="https://www.youtube.com/watch?v=..." /></div><div className="field"><label>タグ（カンマ区切り）</label><input value={map.tags.join(', ')} onChange={(e)=>update({tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="J-POP, 歌詞, 練習" /></div></div>
        <div className="field"><label>説明</label><textarea value={map.description} onChange={(e)=>update({description:e.target.value})} placeholder="譜面の説明" /></div>
      </div>
      <div className="editor-grid" style={{marginTop:18}}>
        <section className="card"><h2 style={{marginTop:0}}>動画</h2>{ready ? <YouTubePlayer videoId={map.youtubeVideoId} onTime={setTime} /> : <div className="empty">先にYouTube URLを入力してください。</div>}<div className="notice" style={{marginTop:12}}>現在時刻 <b>{time.toFixed(2)}秒</b> — 文章と読みを入力して登録します。</div><div className="form" style={{marginTop:12}}><div className="field"><label>文章</label><input value={text} onChange={(e)=>setText(e.target.value)} placeholder="今日も一日頑張ろう" /></div><div className="field"><label>読み（ひらがな推奨）</label><input value={reading} onChange={(e)=>setReading(e.target.value)} placeholder="きょうもいちにちがんばろう" /></div><button className="btn primary" type="button" onClick={addLine}>現在時刻を登録</button></div></section>
        <section className="card"><div className="toolbar"><h2 style={{margin:0}}>登録済み ({sorted.length})</h2><span className="spacer"/></div><div className="line-list" style={{marginTop:10}}>{sorted.map((line, idx)=><div className="line-item" key={line.id}><div className="line-num">{String(idx+1).padStart(2,'0')}</div><div className="line-main"><strong>{line.text}</strong><small>{line.reading}</small><div className="meta"><button className="icon-btn" onClick={()=>updateLine(line.id,{startTime:Number((line.startTime-0.1).toFixed(2))})}>−0.1</button><button className="icon-btn" onClick={()=>updateLine(line.id,{startTime:Number((line.startTime+0.1).toFixed(2))})}>＋0.1</button><input aria-label="開始時間" type="number" min="0" step="0.01" value={line.startTime} onChange={(e)=>updateLine(line.id,{startTime:Math.max(0,Number(e.target.value))})} style={{width:92,background:'#0b0f15',border:'1px solid var(--line)',borderRadius:7,color:'var(--text)',padding:'5px 7px'}} /></div></div><div className="line-actions"><span className="line-time">{line.startTime.toFixed(2)}s</span><button className="icon-btn" onClick={()=>removeLine(line.id)}>削除</button></div></div>)}{!sorted.length && <div className="empty">まだ行がありません。動画を再生しながら登録してください。</div>}</div></section>
      </div>
    </main>
  </>;
}
