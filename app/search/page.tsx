'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { loadMaps } from '@/lib/storage';
import { getPublicMaps } from '@/lib/cloud';
import type { TypingMap } from '@/lib/types';

export default function SearchPage() {
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'new'|'popular'>('new');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const local = loadMaps().filter((m) => m.visibility !== 'private');
    setMaps(local);
    getPublicMaps().then((cloud) => { if (alive) setMaps([...cloud, ...local.filter((m) => !cloud.some((c) => c.id === m.id))]); }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const results = useMemo(() => {
    const filtered = maps.filter((m) => `${m.title} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim()));
    return [...filtered].sort((a,b) => sort === 'new' ? b.updatedAt.localeCompare(a.updatedAt) : 0);
  }, [maps, query, sort]);

  return <>
    <header className="site-header"><div className="container header-inner"><Link className="brand" href="/"><span className="brand-mark">YT</span><span>YouTube <b>Typing</b></span></Link><nav className="nav"><Link className="active" href="/search">探す</Link><Link href="/create">譜面を作る</Link><Link className="nav-accent" href="/login">ログイン</Link></nav></div></header>
    <main className="container section search-page">
      <div className="page-head"><div><p className="eyebrow">DISCOVER MAPS</p><h1 className="page-title">譜面を探す</h1><p className="muted">公開・共有譜面と、このブラウザのローカル譜面を検索できます。</p></div><Link className="btn primary" href="/create">＋ 譜面を作る</Link></div>
      <div className="search-panel card"><div className="search-shell large"><span>⌕</span><input autoFocus className="search-input-plain" value={query} onChange={e=>setQuery(e.target.value)} placeholder="曲名、説明、タグで検索…" aria-label="検索"/></div><select value={sort} onChange={e=>setSort(e.target.value as 'new'|'popular')}><option value="new">新着順</option><option value="popular">人気順</option></select></div>
      <div className="search-meta"><span>{loading ? '読み込み中…' : `${results.length}件の譜面`}</span>{query && <button className="text-link button-link" onClick={()=>setQuery('')}>検索をクリア</button>}</div>
      {loading ? <div className="empty">公開譜面を読み込んでいます…</div> : <div className="grid map-grid">{results.map(map=><article className="card map-card" key={map.id}><div className="card-topline"><span className="card-kicker">{map.visibility === 'public' ? 'PUBLIC' : 'SHARED'}</span><span className="muted">{map.lines.length}行</span></div><h3>{map.title}</h3><p className="muted">{map.description || '説明なし'}</p><div className="tag-row">{map.tags.slice(0,5).map(tag=><span className="tag" key={tag}>#{tag}</span>)}</div><div className="cta-row"><Link className="btn primary" href={`/play?id=${encodeURIComponent(map.id)}`}>プレイする</Link></div></article>)}</div>}
      {!loading && !results.length&&<div className="empty"><div className="empty-icon">⌕</div><h3>譜面が見つかりません</h3><p>キーワードを変えてもう一度検索してみてください。</p></div>}
    </main>
  </>;
}
