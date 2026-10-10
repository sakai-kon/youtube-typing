'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { MapCard } from '@/components/map-card';
import { loadMaps } from '@/lib/storage';
import { getPublicMaps } from '@/lib/cloud';
import type { TypingMap } from '@/lib/types';

export default function SearchPage() {
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const local = loadMaps().filter((m) => m.visibility !== 'private');
    setMaps(local);
    getPublicMaps()
      .then((cloud) => { if (alive) setMaps([...cloud, ...local.filter((m) => !cloud.some((c) => c.id === m.id))]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = maps.filter((m) => !q || `${m.title} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(q));
    return [...filtered].sort((a, b) => sort === 'new'
      ? b.updatedAt.localeCompare(a.updatedAt)
      : (b.playCount ?? 0) - (a.playCount ?? 0) || b.updatedAt.localeCompare(a.updatedAt));
  }, [maps, query, sort]);

  return <>
    <SiteHeader />
    <main className="container section">
      <div className="page-head">
        <div><h1 className="page-title">譜面を探す</h1><p className="muted">公開・共有の譜面と、このブラウザに保存した譜面を検索できます。</p></div>
        <Link className="btn primary" href="/create/">譜面を作る</Link>
      </div>
      <div className="search-bar">
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="曲名・説明・タグで検索" aria-label="検索" />
        <select value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'popular')} aria-label="並び替え"><option value="new">新着順</option><option value="popular">人気順</option></select>
      </div>
      <p className="muted search-meta">{loading ? '読み込み中…' : `${results.length}件`}</p>
      {results.length ? <div className="grid">{results.map((map) => <MapCard key={map.id} map={map} editable={map.authorId === 'local'} />)}</div>
        : !loading && <div className="empty"><p>譜面が見つかりません。</p></div>}
    </main>
  </>;
}
