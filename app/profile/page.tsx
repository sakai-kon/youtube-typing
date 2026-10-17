'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { MapCard } from '@/components/map-card';
import { getMyMaps, rowToMap } from '@/lib/cloud';
import { getSupabase } from '@/lib/supabase/client';
import { sitePath } from '@/lib/site';
import type { TypingMap } from '@/lib/types';

type ProfileData = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export default function ProfilePage() {
  const supabase = getSupabase();
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState('');
  const [profile, setProfile] = useState<ProfileData>({
    username: null,
    display_name: null,
    avatar_url: null,
    role: null,
  });
  const [maps, setMaps] = useState<TypingMap[]>([]);
  const [message, setMessage] = useState('');
  const [mine, setMine] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setRequestedId(new URLSearchParams(window.location.search).get('id') ?? 'me'); }, []);

  useEffect(() => {
    if (requestedId === null) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      if (!supabase) { setMessage('Supabaseが設定されていません。'); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = requestedId === 'me' ? user?.id : requestedId;
      if (!targetId) { setMessage('ログインが必要です。'); setLoading(false); return; }
      if (!alive) return;
      setOwnerId(targetId);
      setMine(user?.id === targetId);

      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, role')
        .eq('id', targetId)
        .maybeSingle();
      if (error) setMessage(error.message);
      else if (data && alive) setProfile(data);

      if (user?.id === targetId) {
        const own = await getMyMaps();
        if (alive) setMaps(own);
      } else {
        const { data: rows } = await supabase
          .from('maps')
          .select('*')
          .eq('author_id', targetId)
          .in('visibility', ['public', 'unlisted'])
          .order('updated_at', { ascending: false });
        if (rows && alive) setMaps(rows.map((row) => rowToMap(row as Parameters<typeof rowToMap>[0])));
      }
      if (alive) setLoading(false);
    };
    load().catch((error) => {
      if (alive) {
        setMessage(error instanceof Error ? error.message : '読み込みに失敗しました。');
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, [requestedId, supabase]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !mine) return;
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username') ?? '').trim() || null;
    const display_name = String(form.get('display_name') ?? '').trim() || null;
    const { error } = await supabase.from('profiles').update({ username, display_name }).eq('id', ownerId);
    if (error) { setMessage(error.message); return; }
    setMessage('プロフィールを更新しました。');
    setProfile({ ...profile, username, display_name });
    setEditing(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.assign(sitePath('/'));
  };

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <div className="page-head">
          <div>
            <h1 className="page-title">{profile.display_name || profile.username || 'ユーザー'}</h1>
            <p className="muted">{profile.username ? \`@\${profile.username}\` : ''}</p>
            {mine && profile.role === 'admin' && (
              <div className="profile-admin-note">
                <span className="profile-admin-dot" aria-hidden="true" />
                管理者アカウント
              </div>
            )}
          </div>
          {mine && (
            <div className="cta-row profile-actions">
              {profile.role === 'admin' && (
                <Link className="btn primary profile-admin-link" href="/admin/">
                  <span aria-hidden="true">⌘</span>
                  管理者画面を開く
                  <span aria-hidden="true">↗</span>
                </Link>
              )}
              <button className="btn" onClick={() => setEditing((value) => !value)}>プロフィールを編集</button>
              <button className="btn" onClick={signOut}>ログアウト</button>
            </div>
          )}
        </div>

        {editing && (
          <section className="card profile-edit-card">
            <div className="section-heading">
              <div>
                <h2>プロフィールを編集</h2>
                <p className="muted">表示名とユーザー名を変更できます。</p>
              </div>
            </div>
            <form className="form" onSubmit={saveProfile}>
              <div className="field">
                <label htmlFor="display_name">表示名</label>
                <input id="display_name" name="display_name" defaultValue={profile.display_name ?? ''} maxLength={80} />
              </div>
              <div className="field">
                <label htmlFor="username">ユーザー名（英数字・_・-）</label>
                <input id="username" name="username" defaultValue={profile.username ?? ''} minLength={3} maxLength={32} pattern="[A-Za-z0-9_\\-]+" />
              </div>
              <div className="cta-row">
                <button className="btn primary">保存</button>
                <button type="button" className="btn" onClick={() => setEditing(false)}>キャンセル</button>
              </div>
            </form>
          </section>
        )}

        {message && <div className="notice profile-message" role="status">{message}</div>}

        <section className="section">
          <div className="section-heading">
            <h2>{mine ? '自分の譜面' : '公開譜面'}</h2>
            <span className="muted">{maps.length}件</span>
          </div>
          {loading ? <div className="empty">読み込み中…</div>
            : maps.length ? <div className="grid">{maps.map((map) => <MapCard key={map.id} map={map} editable={mine} />)}</div>
            : <div className="empty">まだ譜面がありません。</div>}
        </section>
      </main>
    </>
  );
}
