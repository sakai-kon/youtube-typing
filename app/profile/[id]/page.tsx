'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMyMaps } from '@/lib/cloud';
import { getSupabase } from '@/lib/supabase/client';
import type { TypingMap } from '@/lib/types';

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const supabase = getSupabase();
  const [profileId, setProfileId] = useState('');
  const [profile, setProfile] = useState<{ username: string | null; display_name: string | null; avatar_url: string | null } | null>(null);
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [message, setMessage] = useState('');
  const [mine, setMine] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!supabase) { setMessage('Supabaseが設定されていません。'); return; }
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = params.id === 'me' ? user?.id : params.id;
      if (!targetId) { setMessage('ログインが必要です。'); return; }
      if (alive) { setProfileId(targetId); setMine(user?.id === targetId); }
      const { data, error } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('id', targetId).maybeSingle();
      if (alive) { if (error) setMessage(error.message); else setProfile(data); }
      if (user?.id === targetId) {
        const owned = await getMyMaps();
        if (alive) setMaps(owned);
      } else {
        const { data: publicMaps } = await supabase.from('maps').select('*').eq('author_id', targetId).in('visibility', ['public', 'unlisted']).order('updated_at', { ascending: false });
        if (alive && publicMaps) setMaps(publicMaps.map((row) => ({ id: row.id, authorId: row.author_id, title: row.title, description: row.description, youtubeVideoId: row.youtube_video_id, tags: row.tags, visibility: row.visibility as TypingMap['visibility'], createdAt: row.created_at, updatedAt: row.updated_at, lines: Array.isArray(row.lines) ? row.lines as TypingMap['lines'] : [] })));
      }
    };
    load();
    return () => { alive = false; };
  }, [supabase, params.id]);

  const signOut = async () => { if (supabase) { await supabase.auth.signOut(); window.location.assign('/'); } };

  return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link><nav className="nav"><Link href="/create">譜面を作る</Link>{mine && <button className="btn" onClick={signOut}>ログアウト</button>}</nav></header><main className="container section"><div className="card"><p className="muted">プロフィール</p><h1>{profile?.display_name || profile?.username || 'ユーザー'}</h1><p className="muted">{profile?.username ? `@${profile.username}` : profileId}</p>{message && <div className="notice">{message}</div>}</div><section className="section"><h2>{mine ? '自分の譜面' : '公開譜面'}</h2>{maps.length ? <div className="grid">{maps.map((map)=><article className="card" key={map.id}><h3>{map.title}</h3><p className="muted">{map.description || '説明なし'}</p><div className="meta"><span>{map.lines.length}行</span><span>•</span><span>{map.visibility}</span></div><div className="cta-row"><Link className="btn primary" href={`/play/${map.id}`}>プレイ</Link>{mine && <Link className="btn" href={`/edit/${map.id}`}>編集</Link>}</div></article>)}</div> : <div className="empty">まだ公開譜面はありません。</div>}</section></main></>;
}
