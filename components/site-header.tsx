'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

export function SiteHeader({ loggedIn: loggedInProp }: { loggedIn?: boolean }) {
  const [loggedIn, setLoggedIn] = useState(loggedInProp ?? false);

  useEffect(() => {
    if (loggedInProp !== undefined) { setLoggedIn(loggedInProp); return; }
    const supabase = getSupabase();
    if (!supabase) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) setLoggedIn(!!data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) setLoggedIn(!!session?.user); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [loggedInProp]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/">YouTube Typing</Link>
        <nav className="nav">
          <Link href="/search/">譜面を探す</Link>
          <Link href="/create/">譜面を作る</Link>
          {loggedIn ? <Link href="/profile/?id=me">プロフィール</Link> : <Link href="/login/">ログイン</Link>}
        </nav>
      </div>
    </header>
  );
}
