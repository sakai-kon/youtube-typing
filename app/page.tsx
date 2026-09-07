'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { TypingMap } from '@/lib/types';
import { loadMaps, saveMap } from '@/lib/storage';
import { demoMap } from '@/lib/demo';

export default function Home() {
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [query, setQuery] = useState('');
  useEffect(() => setMaps(loadMaps()), []);
  const all = useMemo(() => [demoMap, ...maps.filter((m) => m.id !== demoMap.id)], [maps]);
  const visible = all.filter((m) => `${m.title} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const seed = () => { saveMap(demoMap); setMaps(loadMaps()); };

  return <>
    <header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link><nav className="nav"><Link href="/search">検索</Link><Link href="/create">譜面を作る</Link><Link href="/login">ログイン</Link></nav></header>
    <main className="container">
      <section className="hero"><p className="muted">MVP / v0.1</p><h1>動画に合わせて、<br/>自分の譜面を打つ。</h1><p>YouTubeを再生しながらタイミングを登録。文章と読みから複数のローマ字入力ルートを自動生成し、ブラウザだけでリアルタイム判定します。</p><div className="cta-row"><Link className="btn primary" href="/create">譜面を作成する</Link><Link className="btn" href="/search">公開譜面を探す</Link></div></section>
      <section className="section"><div className="toolbar"><h2>譜面</h2><span className="spacer"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="タイトル・タグを検索" aria-label="譜面を検索" className="search-input"/></div>
        <div className="grid">{visible.map((map) => <article className="card" key={map.id}><h3>{map.title}</h3><p className="muted">{map.description || '説明なし'}</p><div>{map.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div><div className="meta"><span>{map.lines.length}行</span><span>•</span><span>{map.visibility}</span></div><div className="cta-row"><Link className="btn primary" href={`/play/${map.id}`}>プレイ</Link>{map.id !== demoMap.id && <Link className="btn" href={`/edit/${map.id}`}>編集</Link>}</div></article>)}</div>
        {!visible.length && <div className="empty">該当する譜面がありません。</div>}
      </section>
      <section className="section"><div className="notice">現在はローカル保存が完全動作します。Supabaseを接続した段階で、ログイン・公開・お気に入り・履歴をこのデータモデルへ拡張できます。</div><button className="btn" style={{ marginTop: 10 }} onClick={seed}>サンプル譜面をローカルに保存</button></section>
    </main><footer className="footer container">YouTube Typing — user-created typing maps</footer>
  </>;
}
