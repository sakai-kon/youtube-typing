'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMyMaps } from '@/lib/cloud';
import { getSupabase } from '@/lib/supabase/client';
import { sitePath } from '@/lib/site';
import type { TypingMap } from '@/lib/types';

type ProfileData = { username: string | null; display_name: string | null; avatar_url: string | null };

export default function ProfilePage() {
  const supabase = getSupabase();
  const [profileId, setProfileId] = useState('');
  const [profile, setProfile] = useState<ProfileData>({ username: null, display_name: null, avatar_url: null });
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [message, setMessage] = useState('');
  const [mine, setMine] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProfileId(new URLSearchParams(window.location.search).get('id') ?? 'me');
  }, []);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      if (!supabase) { setMessage('Supabaseが設定されていません。'); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = profileId === 'me' ? user?.id : profileId;
      if (!targetId) { setMessage('ログインが必要です。'); setLoading(false); return; }
      if (alive) { setProfileId(targetId); setMine(user?.id === targetId); }
      const { data, error } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('id', targetId).maybeSingle();
      if (error) setMessage(error.message);
      else if (data && alive) setProfile(data);
      if (user?.id === targetId) {
        const ownMaps = await getMyMaps();
        if (alive) setMaps(ownMaps);
      } else {
        const { data: publicMaps } = await supabase.from('maps').select('*').eq('author_id', targetId).in('visibility', ['public', 'unlisted']).order('updated_at', { ascending: false });
        if (publicMaps && alive) setMaps(publicMaps.map((row) => ({ id: row.id, authorId: row.author_id, title: row.title, description: row.description, youtubeVideoId: row.youtube_video_id, tags: row.tags, visibility: row.visibility as TypingMap['visibility'], createdAt: row.created_at, updatedAt: row.updated_at, lines: Array.isArray(row.lines) ? row.lines as TypingMap['lines'] : [] })));
      }
      setLoading(false);
    };
    load().catch((error) => { if (alive) { setMessage(error instanceof Error ? error.message : '読み込みに失敗しました。'); setLoading(false); } });
    return () => { alive = false; };
  }, [profileId, supabase]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !mine) return;
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username') ?? '').trim() || null;
    const display_name = String(form.get('display_name') ?? '').trim() || null;
    const { error } = await supabase.from('profiles').update({ username, display_name }).eq('id', profileId);
    if (error) setMessage(error.message);
    else { setMessage('プロフィールを更新しました。'); setProfile({ ...profile, username, display_name }); setEditing(false); }
  };
  const signOut = async () => { if (supabase) { await supabase.auth.signOut(); window.location.assign(sitePath('/')); } };

  return <>
    <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">YT</span> YouTube <span>Typing</span></Link><nav className="nav"><Link href="/create">譜面を作る</Link>{mine && <button className="btn" onClick={signOut}>ログアウト</button>}</nav></header>
    <main className="container section profile-page">
      <div className="profile-hero">
        <div className="profile-avatar">{(profile.display_name || profile.username || 'Y').slice(0,1).toUpperCase()}</div>
        <div className="profile-copy"><p className="eyebrow">PROFILE</p><h1 className="page-title">{profile.display_name || profile.username || 'ユーザー'}</h1><p className="muted">{profile.username ? `@${profile.username}` : profileId}</p></div>
        <div className="spacer"/>{mine && <button className="btn" onClick={()=>setEditing(true)}>プロフィールを編集</button>}
      </div>
      {editing && <section className="card profile-editor"><form className="form" onSubmit={saveProfile}><div className="field"><label htmlFor="display_name">表示名</label><input id="display_name" name="display_name" defaultValue={profile.display_name ?? ''} maxLength={80} /></div><div className="field"><label htmlFor="username">ユーザー名</label><input id="username" name="username" defaultValue={profile.username ?? ''} minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" /></div><div className="cta-row"><button className="btn primary">保存</button><button type="button" className="btn" onClick={()=>setEditing(false)}>キャンセル</button></div></form></section>}
      {message && <div className="notice" style={{marginTop:16}}>{message}</div>}
      <section className="section"><div className="toolbar"><div><p className="eyebrow">MAPS</p><h2 style={{margin:0}}>{mine ? '自分の譜面' : '公開譜面'}</h2></div><span className="spacer"/><span className="muted">{maps.length}譜面</span></div>{loading ? <div className="empty">読み込み中…</div> : maps.length ? <div className="grid" style={{marginTop:16}}>{maps.map((map)=><article className="card map-card" key={map.id}><div className="card-kicker">{map.visibility.toUpperCase()}</div><h3>{map.title}</h3><p className="muted">{map.description || '説明なし'}</p><div>{map.tags.slice(0,4).map(tag=><span className="tag" key={tag}>#{tag}</span>)}</div><div className="meta"><span>{map.lines.length}行</span></div><div className="cta-row"><Link className="btn primary" href={`/play?id=${encodeURIComponent(map.id)}`}>プレイ</Link>{mine && <Link className="btn" href={`/create?edit=${encodeURIComponent(map.id)}`}>編集</Link>}</div></article>)}</div> : <div className="empty">まだ譜面がありません。</div>}</section>
    </main>
  </>;
}
