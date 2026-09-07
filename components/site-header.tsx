'use client';

import Link from 'next/link';

interface SiteHeaderProps {
  loggedIn: boolean;
  compact?: boolean;
}

export function SiteHeader({ loggedIn, compact = false }: SiteHeaderProps) {
  return (
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
          {!compact && <nav className="unified-nav"><Link href="/search">探す</Link><Link href="/create">譜面を作る</Link></nav>}
          <button className="unified-header-control" type="button">日本語</button>
          <button className="unified-icon-btn" type="button" aria-label="テーマ切り替え">◐</button>
          <button className="unified-icon-btn" type="button" aria-label="通知">♢</button>
          <Link className="unified-avatar" href={loggedIn ? '/profile?id=me' : '/login'} aria-label="プロフィール">
            {loggedIn ? 'K' : '◌'}
          </Link>
        </div>
      </div>
    </header>
  );
}
