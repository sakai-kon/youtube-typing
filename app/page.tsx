'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { MapCard } from '@/components/map-card';
import type { TypingMap } from '@/lib/types';
import { loadMaps } from '@/lib/storage';
import { getPublicMaps } from '@/lib/cloud';

export default function Home() {
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const local = loadMaps();
    setMaps(local);
    getPublicMaps()
      .then((cloud) => { if (alive) setMaps([...cloud, ...local.filter((m) => !cloud.some((c) => c.id === m.id))]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return maps.filter((m) => !q || `${m.title} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(q));
  }, [maps, query]);

  return <>
    <SiteHeader />
    <main className="container">
      <section className="hero">
        <h1>YouTube Typing</h1>
        <p>YouTube動画に合わせて、自分で作った譜面をローマ字でタイピングするゲームです。</p>
        <div className="cta-row">
          <Link className="btn primary" href="/search/">譜面を探す</Link>
          <Link className="btn" href="/create/">譜面を作る</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>譜面</h2>
          <Link className="text-link" href="/search/">すべて見る →</Link>
        </div>
        <div className="search-bar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="タイトル・タグで検索" aria-label="譜面を検索" />
        </div>
        {loading && !maps.length ? <div className="empty">読み込んでいます…</div>
          : visible.length ? <div className="grid">{visible.slice(0, 6).map((map) => <MapCard key={map.id} map={map} editable={map.authorId === 'local'} />)}</div>
          : <div className="empty"><p>譜面がありません。</p><Link className="btn primary" href="/create/">最初の譜面を作る</Link></div>}
      </section>
    </main>
    <footer className="footer">
      <div className="container footer-inner">
        <span>YouTube Typing</span>
        <Link className="text-link" href="/copyright/">権利・著作権の申立て</Link>
      </div>
    </footer>
  </>;
}
