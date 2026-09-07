'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

interface SiteHeaderProps {
  loggedIn?: boolean;
}

export function SiteHeader({ loggedIn: loggedInProp }: SiteHeaderProps) {
  const supabase = getSupabase();
  const [loggedIn, setLoggedIn] = useState(loggedInProp ?? false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loggedInProp !== undefined) {
      setLoggedIn(loggedInProp);
      return;
    }
    if (!supabase) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) setLoggedIn(!!data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setLoggedIn(!!session?.user);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [loggedInProp, supabase]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <>
      <header className="site-header unified-header">
        <div className="unified-header-inner">
          <div className="unified-header-left">
            <div className="unified-menu-wrap" ref={menuRef}>
              <button className="unified-icon-btn" type="button" aria-label="メニュー" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>☰</button>
              {menuOpen && <div className="unified-menu" role="menu">
                <Link href="/" onClick={() => setMenuOpen(false)}>トップ</Link>
                <Link href="/search" onClick={() => setMenuOpen(false)}>譜面を探す</Link>
                <Link href="/create" onClick={() => setMenuOpen(false)}>譜面を作る</Link>
                {loggedIn && <Link href="/profile?id=me" onClick={() => setMenuOpen(false)}>プロフィール</Link>}
                {!loggedIn && <Link href="/login" onClick={() => setMenuOpen(false)}>ログイン</Link>}
              </div>}
            </div>
            <Link className="unified-search" href="/search" aria-label="曲名・アーティストで検索">
              <span className="unified-search-icon">⌕</span>
              <span className="unified-search-text">曲名・アーティストで検索...</span>
            </Link>
          </div>

          <div className="unified-header-right">
            <nav className="unified-nav"><Link href="/search">探す</Link><Link href="/create">譜面を作る</Link></nav>
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
        .unified-menu-wrap{position:relative;flex:0 0 auto}.unified-icon-btn{width:36px;height:36px;flex:0 0 auto;border:1px solid #ffffff12;border-radius:10px;background:#0c1118;color:#9ca8b9;display:grid;place-items:center;padding:0;font-size:14px;cursor:pointer}.unified-icon-btn:hover{background:#141b26;color:#fff}
        .unified-menu{position:absolute;top:44px;left:0;z-index:30;min-width:170px;padding:6px;border:1px solid #ffffff14;border-radius:12px;background:#0b1017;box-shadow:0 20px 45px #000b}.unified-menu a{display:block;padding:9px 11px;border-radius:8px;color:#aab4c4;font-size:12px;font-weight:700}.unified-menu a:hover{background:#ffffff08;color:#fff}
        .unified-search{height:36px;width:min(470px,46vw);display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #ffffff12;border-radius:10px;background:#0c1118;color:#697689;font-size:13px}.unified-search:hover{border-color:#ffffff1d;background:#101722}.unified-search-icon{font-size:19px;line-height:1;color:#8490a2}.unified-search-text{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .unified-nav{display:flex;align-items:center;gap:2px}.unified-nav a{padding:7px 9px;border-radius:9px;color:#7f8ba0;font-size:12px;font-weight:700}.unified-nav a:hover{background:#ffffff08;color:#eef3fa}
        .unified-avatar{width:36px;height:36px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;border:1px solid #32415a;background:linear-gradient(145deg,#1e2d46,#0e1420);color:#d9e5f8;font-size:12px;font-weight:800}
        @media(max-width:760px){.unified-header-inner{width:calc(100% - 18px);gap:7px}.unified-search{width:50vw}.unified-nav{display:none}.unified-icon-btn{width:34px;height:34px}.unified-avatar{width:34px;height:34px}}
      `}</style>
    </>
  );
}
