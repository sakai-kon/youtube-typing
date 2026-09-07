'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { getSupabase } from '@/lib/supabase/client';
import { sitePath } from '@/lib/site';

export default function LoginPage() {
  const supabase = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) setMessage('Supabaseが設定されていません。ローカル機能はそのまま利用できます。');
  }, [supabase]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage('');
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: email.split('@')[0] }, emailRedirectTo: `${window.location.origin}${sitePath('/')}` } });
    setLoading(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === 'signup' && !result.data.session) { setMessage('確認メールを送信しました。メール内のリンクから認証してください。'); return; }
    window.location.assign(sitePath('/'));
  };

  return <>
    <SiteHeader />
    <main className="container section login-page">
      <div className="login-shell">
        <div className="login-art"><div className="eyebrow">WELCOME TO THE STAGE</div><h1>遊ぶ。<br/><span>作る。<br/>共有する。</span></h1><p>自分だけのYouTubeタイピング譜面を作って、タイミング勝負を楽しもう。</p></div>
        <div className="card login-card"><div className="mode-pill"><button type="button" className={mode === 'login' ? 'selected' : ''} onClick={()=>{setMode('login');setMessage('');}}>ログイン</button><button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={()=>{setMode('signup');setMessage('');}}>新規登録</button></div><h2>{mode === 'login' ? 'おかえりなさい' : 'アカウントを作成'}</h2><p className="muted">{mode === 'login' ? '譜面・お気に入り・プレイ履歴を続きから。' : '無料で譜面を公開・管理できます。'}</p><form className="form" onSubmit={submit}><div className="field"><label htmlFor="email">メールアドレス</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div><div className="field"><label htmlFor="password">パスワード</label><input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>{message && <div className="notice">{message}</div>}<button className="btn primary btn-large" disabled={loading || !supabase}>{loading ? '処理中…' : mode === 'login' ? 'ログインする' : 'アカウントを作る'}</button></form><div className="login-footer"><Link className="text-link" href="/">← トップへ戻る</Link></div></div>
      </div>
    </main>
  </>;
}