'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { getSupabase } from '@/lib/supabase/client';
import { sitePath } from '@/lib/site';

export default function LoginPage() {
  const supabase = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState(supabase ? '' : 'Supabaseが設定されていません。ローカル機能はそのまま使えます。');
  const [loading, setLoading] = useState(false);

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
    <main className="container section">
      <div className="card auth-card">
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setMessage(''); }}>ログイン</button>
          <button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setMessage(''); }}>新規登録</button>
        </div>
        <form className="form" onSubmit={submit}>
          <div className="field"><label htmlFor="email">メールアドレス</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">パスワード</label><input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
          {message && <div className="notice">{message}</div>}
          <button className="btn primary" disabled={loading || !supabase}>{loading ? '処理中…' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}</button>
        </form>
        <p><Link className="text-link" href="/">← トップへ戻る</Link></p>
      </div>
    </main>
  </>;
}
