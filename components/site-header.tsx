'use client';

import Link from 'next/link';

interface SiteHeaderProps {
  loggedIn: boolean;
  compact?: boolean;
}

export function SiteHeader({ loggedIn }: SiteHeaderProps) {
  return (
    <>
      <header className="site-header unified-header">
        <div className="unified-header-inner">
          <div className="unified-header-left">
            <button className="unified-icon-btn" type="button" aria-label="メニュー">☰</button>
            <Link className="unified-search" href="/search" aria-label="曲名・アーティストで検索">
              <span className="unified-search-icon">⌕</span>
              <span className="unified-search-text">曲名・アーティストで検索...</span>
              <kbd>/</kbd>
            </Link>
          </div>

          <div className="unified-header-right">
            <nav className="unified-nav"><Link href="/search">探す</Link><Link href="/play">プレイ</Link><Link href="/create">譜面を作る</Link></nav>
            <button className="unified-header-control" type="button">日本語</button>
            <button className="unified-icon-btn" type="button" aria-label="テーマ切り替え">◐</button>
            <button className="unified-icon-btn" type="button" aria-label="通知">♢</button>
            <Link className="unified-avatar" href={loggedIn ? '/profile?id=me' : '/login'} aria-label="プロフィール">
              {loggedIn ? 'K' : '◌'}
            </Link>
          </div>
        </div>
      </header>
      <style>{`
        .unified-header{height:62px;background:rgba(7,9,13,.88);backdrop-filter:blur(18px)}
        .unified-header-inner{height:100%;width:min(1400px,calc(100% - 28px));margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:18px}
        .unified-header-left,.unified-header-right{display:flex;align-items:center;gap:9px;min-width:0}.unified-header-right{justify-content:flex-end}
        .unified-icon-btn{width:36px;height:36px;flex:0 0 auto;border:1px solid #ffffff12;border-radius:10px;background:#0c1118;color:#9ca8b9;display:grid;place-items:center;padding:0;font-size:14px}.unified-icon-btn:hover{background:#141b26;color:#fff}
        .unified-search{height:36px;width:min(470px,46vw);display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #ffffff12;border-radius:10px;background:#0c1118;color:#697689;font-size:13px}.unified-search:hover{border-color:#ffffff1d;background:#101722}.unified-search-icon{font-size:19px;line-height:1;color:#8490a2}.unified-search-text{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.unified-search kbd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:#76849a;border:1px solid #ffffff12;border-radius:6px;padding:2px 6px;background:#080b10}
        .unified-nav{display:flex;align-items:center;gap:2px}.unified-nav a{padding:7px 9px;border-radius:9px;color:#7f8ba0;font-size:12px;font-weight:700}.unified-nav a:hover{background:#ffffff08;color:#eef3fa}
        .unified-header-control{height:36px;padding:0 10px;border:1px solid #ffffff12;border-radius:9px;background:#0c1118;color:#aab4c4;font-size:11px}
        .unified-avatar{width:36px;height:36px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;border:1px solid #32415a;background:linear-gradient(145deg,#1e2d46,#0e1420);color:#d9e5f8;font-size:12px;font-weight:800}
        @media(max-width:760px){.unified-header-inner{width:calc(100% - 18px);gap:7px}.unified-search{width:44vw}.unified-nav{display:none}.unified-header-control{display:none}.unified-icon-btn{width:34px;height:34px}.unified-avatar{width:34px;height:34px}}
      `}</style>
    </>
  );
}
