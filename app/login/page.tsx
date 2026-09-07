'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) setMessage('Supabaseの環境変数が設定されていません。ローカル機能はそのまま利用できます。');
  }, [supabase]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage('');
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: email.split('@')[0] } } });
    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === 'signup' && !result.data.session) {
      setMessage('確認メールを送信しました。メール内のリンクから認証してください。');
      return;
    }
    window.location.assign('/');
  };

  return <>
    <header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link></header>
    <main className="container section">
      <div className="card" style={{ maxWidth: 520, margin: '50px auto' }}>
        <h1>{mode === 'login' ? 'ログイン' : 'アカウント作成'}</h1>
        <p className="muted">{mode === 'login' ? '公開譜面やお気に入り、プレイ履歴を利用できます。' : '無料でアカウントを作成して公開譜面を管理できます。'}</p>
        <form className="form" onSubmit={submit}>
          <div className="field"><label htmlFor="email">メールアドレス</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">パスワード</label><input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
          {message && <div className="notice">{message}</div>}
          <button className="btn primary" disabled={loading || !supabase}>{loading ? '処理中…' : mode === 'login' ? 'ログイン' : '登録する'}</button>
        </form>
        <div className="cta-row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? '新規登録はこちら' : 'ログインはこちら'}</button>
          <Link className="btn" href="/">戻る</Link>
        </div>
      </div>
    </main>
  </>;
}
