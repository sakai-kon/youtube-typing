'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMyMaps } from '@/lib/cloud';
import { getSupabase } from '@/lib/supabase/client';
import type { TypingMap } from '@/lib/types';

export default function ProfilePage() {
  const supabase = getSupabase();
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<{ username: string | null; display_name: string | null; avatar_url: string | null } | null>(null);
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!supabase) { setMessage('Supabaseが設定されていません。'); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMessage('プロフィールを見るにはログインしてください。'); return; }
      if (alive) setUserId(user.id);
      const { data, error } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('id', user.id).maybeSingle();
      if (alive) {
        if (error) setMessage(error.message);
        else setProfile(data);
      }
      const mine = await getMyMaps();
      if (alive) setMaps(mine);
    };
    load();
    return () => { alive = false; };
  }, [supabase]);

  const signOut = async () => { if (supabase) { await supabase.auth.signOut(); window.location.assign('/'); } };

  return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link><nav className="nav"><Link href="/create">譜面を作る</Link><button className="btn" onClick={signOut}>ログアウト</button></nav></header><main className="container section"><div className="card"><p className="muted">プロフィール</p><h1>{profile?.display_name || profile?.username || 'ユーザー'}</h1><p className="muted">{profile?.username ? `@${profile.username}` : userId ? 'ユーザー名未設定' : ''}</p>{message && <div className="notice">{message}</div>}</div>{maps.length > 0 && <section className="section"><h2>自分の譜面</h2><div className="grid">{maps.map((map)=><article className="card" key={map.id}><h3>{map.title}</h3><p className="muted">{map.description || '説明なし'}</p><div className="meta"><span>{map.lines.length}行</span><span>•</span><span>{map.visibility}</span></div><div className="cta-row"><Link className="btn primary" href={`/play/${map.id}`}>プレイ</Link><Link className="btn" href={`/edit/${map.id}`}>編集</Link></div></article>)}</div></section>}</main></>;
}
