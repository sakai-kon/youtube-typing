'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import type { TypingMap } from '@/lib/types';
import { loadMaps } from '@/lib/storage';
import { getPublicMaps } from '@/lib/cloud';
import { getSupabase } from '@/lib/supabase/client';

export default function Home() {
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [query, setQuery] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const local = loadMaps();
    setMaps(local);
    getPublicMaps().then((cloud) => { if (alive) setMaps([...cloud, ...local.filter((m) => !cloud.some((c) => c.id === m.id))]); }).finally(() => alive && setLoading(false));
    const supabase = getSupabase();
    if (supabase) supabase.auth.getUser().then(({ data }) => { if (alive) setLoggedIn(!!data.user); });
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => maps.filter((m) => `${m.title} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [maps, query]);
  const totalLines = maps.reduce((sum, map) => sum + map.lines.length, 0);

  return <>
    <SiteHeader loggedIn={loggedIn} />
    <main>
      <section className="hero container">
        <div className="hero-copy"><div className="eyebrow">YOUTUBE × TYPING</div><h1>動画の「今」を、<br/><span>打ち込むゲーム。</span></h1><p>YouTubeを再生しながら、自分で譜面を作る。あとはタイミングに合わせてローマ字で打つだけ。練習にも、遊びにも。</p><div className="cta-row hero-actions"><Link className="btn primary btn-large" href="/search">すぐ遊ぶ <span>→</span></Link><Link className="btn btn-large" href="/create">譜面を作る</Link></div><div className="hero-note"><span className="status-dot"/>ブラウザだけで動作　・　AI判定なし　・　入力コスト0</div></div>
        <div className="hero-visual"><div className="mock-window"><div className="mock-top"><span/><span/><span/><em>typing stage</em></div><div className="mock-video"><div className="mock-play">▶</div></div><div className="mock-stage"><small>NOW PLAYING</small><strong>今日も一日頑張ろう</strong><span>kyoumoichinichiganbarou</span><div className="mock-input">kyoumoichi<span>▍</span></div></div></div></div>
      </section>
      <section className="stats-bar container"><div><b>{maps.length}</b><span>公開・ローカル譜面</span></div><div><b>{totalLines}</b><span>登録済みの行</span></div><div><b>0</b><span>プレイ中のAIコスト</span></div></section>
      <section className="section container"><div className="section-heading"><div><p className="eyebrow">DISCOVER</p><h2>譜面を探す</h2></div><Link className="text-link" href="/search">すべて見る →</Link></div><div className="toolbar browse-toolbar"><div className="search-shell"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="タイトル・タグを検索" aria-label="譜面を検索"/></div><span className="muted">{visible.length}件</span></div>{loading ? <div className="empty">譜面を読み込んでいます…</div> : <div className="grid map-grid">{visible.slice(0,6).map((map) => <article className="card map-card" key={map.id}><div className="card-topline"><span className="card-kicker">{map.visibility === 'public' ? 'PUBLIC' : 'LOCAL'}</span><span className="muted">{map.lines.length}行</span></div><h3>{map.title}</h3><p className="muted">{map.description || '説明なし'}</p><div className="tag-row">{map.tags.slice(0,4).map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div><div className="cta-row"><Link className="btn primary" href={`/play/?id=${encodeURIComponent(map.id)}`}>プレイする</Link>{map.authorId === 'local' && <Link className="btn" href={`/create?edit=${encodeURIComponent(map.id)}`}>編集</Link>}</div></article>)}</div>}{!visible.length && !loading && <div className="empty"><h3>まだ譜面がありません</h3><p>「譜面を作る」から最初の譜面を登録してください。</p><Link className="btn primary" href="/create">譜面を作る</Link></div>}</section>
      <section className="section container feature-section"><div className="section-heading"><div><p className="eyebrow">HOW IT WORKS</p><h2>3ステップで遊べる</h2></div></div><div className="feature-grid"><article className="feature-card"><span>01</span><h3>動画を選ぶ</h3><p>YouTube URLを貼り付けて、プレイしたい動画をセット。</p></article><article className="feature-card"><span>02</span><h3>譜面を登録</h3><p>動画を再生して文章・読みを入力。「今！」を押すだけ。</p></article><article className="feature-card"><span>03</span><h3>タイピング</h3><p>動画の進行に合わせて、何通りものローマ字入力に対応。</p></article></div></section>
    </main>
    <footer className="footer"><div className="container footer-inner"><span>YouTube Typing</span><span>user-created typing maps</span><Link className="text-link" href="/copyright">権利・著作権の申立て</Link></div></footer>
  </>;
}
