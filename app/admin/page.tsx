import Link from 'next/link';

export default function AdminPage() {
  return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link></header><main className="container section"><div className="card"><p className="muted">管理者</p><h1>管理画面</h1><p className="muted">通報・非公開化・削除・ユーザー管理はSupabase接続後にサーバー側権限とともに有効化します。</p><div className="notice">管理者権限はクライアント状態では判定しません。実装時はSupabaseの安全なサーバー側認可を使用してください。</div><div className="cta-row"><Link className="btn" href="/">トップへ戻る</Link></div></div></main></>;
}
