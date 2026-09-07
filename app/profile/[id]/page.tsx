import Link from 'next/link';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><header className="site-header"><Link className="brand" href="/">YouTube <span>Typing</span></Link></header><main className="container section"><div className="card"><p className="muted">プロフィール</p><h1>{id}</h1><div className="notice">クラウドプロフィールはSupabase Auth接続後に表示されます。</div></div></main></>;
}
