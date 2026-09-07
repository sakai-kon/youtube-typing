'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { loadMaps } from '@/lib/storage';
import type { TypingMap } from '@/lib/types';

export default function SearchPage() {
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'new'|'popular'>('new');
  useEffect(() => setMaps(loadMaps()), []);
  const results = useMemo(() => {
    const filtered = maps.filter((m) => m.visibility !== 'private' && `${m.title} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
    return [...filtered].sort((a,b) => sort === 'new' ? b.updatedAt.localeCompare(a.updatedAt) : b.lines.length-a.lines.length);
  }, [maps, query, sort]);
  return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link><nav className="nav"><Link href="/create">譜面を作る</Link><Link href="/">トップ</Link></nav></header><main className="container section"><div className="toolbar"><div><h1 style={{margin:'0 0 5px'}}>譜面検索</h1><p className="muted" style={{margin:0}}>タイトル・説明・タグから探します。</p></div><span className="spacer"/><input className="search-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="検索…" aria-label="検索"/><select value={sort} onChange={e=>setSort(e.target.value as 'new'|'popular')}><option value="new">新着</option><option value="popular">人気</option></select></div><div className="grid" style={{marginTop:16}}>{results.map(map=><article className="card" key={map.id}><h3>{map.title}</h3><p className="muted">{map.description || '説明なし'}</p><div>{map.tags.map(tag=><span className="tag" key={tag}>#{tag}</span>)}</div><div className="meta"><span>{map.lines.length}行</span><span>•</span><span>{map.visibility}</span></div><div className="cta-row"><Link className="btn primary" href={`/play/${map.id}`}>プレイ</Link></div></article>)}</div>{!results.length&&<div className="empty" style={{marginTop:16}}>公開・共有可能なローカル譜面がまだありません。</div>}</main></>;
}
