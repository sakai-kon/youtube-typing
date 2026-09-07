import Link from 'next/link';

export default function LoginPage() {
  return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link></header><main className="container section"><div className="card" style={{maxWidth:520,margin:'50px auto'}}><h1>ログイン</h1><p className="muted">認証機能はSupabase接続フェーズで有効化します。現在もログインなしで譜面作成・保存・プレイは利用できます。</p><div className="notice">次の実装段階：Supabase Auth、プロフィール、公開譜面管理。</div><div className="cta-row"><Link className="btn primary" href="/create">ログインせず作る</Link><Link className="btn" href="/">戻る</Link></div></div></main></>;
}
