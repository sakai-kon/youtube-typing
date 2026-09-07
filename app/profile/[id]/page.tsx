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
  const [profile, setProfile] = useState<{ username: string | null; display_name: string | null; avatar_url: string | null }>({ username: null, display_name: null, avatar_url: null });
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [message, setMessage] = useState('');
  const [mine, setMine] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    if (!supabase) { setMessage('Supabaseが設定されていません。'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const targetId = params.id === 'me' ? user?.id : params.id;
    if (!targetId) { setMessage('ログインが必要です。'); return; }
    setProfileId(targetId); setMine(user?.id === targetId);
    const { data, error } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('id', targetId).maybeSingle();
    if (error) setMessage(error.message); else if (data) setProfile(data);
    if (user?.id === targetId) setMaps(await getMyMaps());
    else {
      const { data: publicMaps } = await supabase.from('maps').select('*').eq('author_id', targetId).in('visibility', ['public', 'unlisted']).order('updated_at', { ascending: false });
      if (publicMaps) setMaps(publicMaps.map((row) => ({ id: row.id, authorId: row.author_id, title: row.title, description: row.description, youtubeVideoId: row.youtube_video_id, tags: row.tags, visibility: row.visibility as TypingMap['visibility'], createdAt: row.created_at, updatedAt: row.updated_at, lines: Array.isArray(row.lines) ? row.lines as TypingMap['lines'] : [] })));
    }
  };

  useEffect(() => { let alive = true; load().catch((error) => { if (alive) setMessage(error instanceof Error ? error.message : '読み込みに失敗しました。'); }); return () => { alive = false; }; }, [params.id]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !mine) return;
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username') ?? '').trim() || null;
    const display_name = String(form.get('display_name') ?? '').trim() || null;
    const { error } = await supabase.from('profiles').update({ username, display_name }).eq('id', profileId);
    if (error) setMessage(error.message); else { setMessage('プロフィールを更新しました。'); setProfile({ ...profile, username, display_name }); setEditing(false); }
  };
  const signOut = async () => { if (supabase) { await supabase.auth.signOut(); window.location.assign('/'); } };

  return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link><nav className="nav"><Link href="/create">譜面を作る</Link>{mine && <button className="btn" onClick={signOut}>ログアウト</button>}</nav></header><main className="container section"><div className="card"><p className="muted">プロフィール</p>{editing ? <form className="form" onSubmit={saveProfile}><div className="field"><label htmlFor="display_name">表示名</label><input id="display_name" name="display_name" defaultValue={profile.display_name ?? ''} maxLength={80} /></div><div className="field"><label htmlFor="username">ユーザー名</label><input id="username" name="username" defaultValue={profile.username ?? ''} minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" /></div><div className="cta-row"><button className="btn primary">保存</button><button type="button" className="btn" onClick={()=>setEditing(false)}>キャンセル</button></div></form> : <><h1>{profile.display_name || profile.username || 'ユーザー'}</h1><p className="muted">{profile.username ? `@${profile.username}` : profileId}</p>{mine && <button className="btn" onClick={()=>setEditing(true)}>プロフィールを編集</button>}</>}{message && <div className="notice" style={{marginTop:12}}>{message}</div>}</div><section className="section"><h2>{mine ? '自分の譜面' : '公開譜面'}</h2>{maps.length ? <div className="grid">{maps.map((map)=><article className="card" key={map.id}><h3>{map.title}</h3><p className="muted">{map.description || '説明なし'}</p><div className="meta"><span>{map.lines.length}行</span><span>•</span><span>{map.visibility}</span></div><div className="cta-row"><Link className="btn primary" href={`/play/${map.id}`}>プレイ</Link>{mine && <Link className="btn" href={`/edit/${map.id}`}>編集</Link>}</div></article>)}</div> : <div className="empty">まだ公開譜面はありません。</div>}</section></main></>;
}
