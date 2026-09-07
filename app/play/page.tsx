'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { YouTubePlayer } from '@/components/youtube-player';
import { findMap } from '@/lib/storage';
import { getMap, isFavorite, recordPlay, submitReport, toggleFavorite } from '@/lib/cloud';
import { nextInputState } from '@/lib/romaji';
import { getSupabase } from '@/lib/supabase/client';
import type { TypingMap } from '@/lib/types';

export default function PlayPage() {
  const [map, setMap] = useState<TypingMap | null>(null);
  const [mapId, setMapId] = useState('');
  const [ytTime, setYtTime] = useState(0);
  const [typed, setTyped] = useState('');
  const [misses, setMisses] = useState(0);
  const [acceptedChars, setAcceptedChars] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastKeyOk, setLastKeyOk] = useState<boolean | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const recordedRef = useRef(false);

  useEffect(() => {
    setMapId(new URLSearchParams(window.location.search).get('id') ?? '');
  }, []);

  useEffect(() => {
    if (!mapId) return;
    let alive = true;
    const load = async () => {
      const local = findMap(mapId);
      if (local && alive) setMap(local);
      const cloud = await getMap(mapId);
      if (cloud && alive) setMap(cloud);
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (alive) setLoggedIn(!!user);
        if (user && alive) setFavorite(await isFavorite(mapId));
      }
    };
    load();
    return () => { alive = false; };
  }, [mapId]);

  const lines = useMemo(() => map ? [...map.lines].sort((a, b) => a.startTime - b.startTime) : [], [map]);
  const current = lines[activeIndex];
  const progress = lines.length ? (activeIndex / lines.length) * 100 : 0;

  useEffect(() => {
    if (!lines.length || finished) return;
    let index = activeIndex;
    while (index + 1 < lines.length && ytTime >= lines[index + 1].startTime) index += 1;
    if (index !== activeIndex) {
      setActiveIndex(index);
      setTyped('');
      setLastKeyOk(null);
    }
  }, [ytTime, lines, activeIndex, finished]);

  const finishLine = useCallback(() => {
    if (activeIndex >= lines.length - 1) setFinished(true);
    else {
      setActiveIndex((i) => i + 1);
      setTyped('');
      setLastKeyOk(null);
    }
  }, [activeIndex, lines.length]);

  useEffect(() => {
    if (!current || finished) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key.length !== 1 && event.key !== 'Backspace') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (event.key === 'Backspace') {
        setTyped((value) => value.slice(0, -1));
        return;
      }
      if (startedAt === null) setStartedAt(Date.now());
      const proposed = typed + event.key.toLowerCase();
      const result = nextInputState(current.reading, proposed);
      setLastKeyOk(result.status === 'correct');
      if (result.status === 'correct') {
        setTyped(proposed);
        setAcceptedChars((value) => value + 1);
        if (result.done) finishLine();
      } else {
        setMisses((value) => value + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, typed, finishLine, finished, startedAt]);

  useEffect(() => {
    if (!finished || !map || !loggedIn || recordedRef.current) return;
    recordedRef.current = true;
    const elapsed = startedAt ? Math.max((Date.now() - startedAt) / 1000 / 60, 1 / 60) : 1 / 60;
    const kpm = Math.round(acceptedChars / elapsed);
    const accuracy = Math.round((acceptedChars / Math.max(acceptedChars + misses, 1)) * 100);
    void recordPlay(map.id, accuracy, misses, kpm);
  }, [finished, map, loggedIn, startedAt, acceptedChars, misses]);

  const reset = () => {
    recordedRef.current = false;
    setYtTime(0);
    setTyped('');
    setMisses(0);
    setAcceptedChars(0);
    setStartedAt(null);
    setFinished(false);
    setActiveIndex(0);
    setLastKeyOk(null);
  };

  const handleFavorite = async () => {
    const result = await toggleFavorite(map?.id ?? '');
    if (result.ok) setFavorite(result.favorite);
    else if (!loggedIn) window.alert('お気に入りにはログインが必要です。');
  };

  const handleReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!map) return;
    const form = new FormData(event.currentTarget);
    const result = await submitReport(map.id, String(form.get('reason') ?? ''), String(form.get('details') ?? ''));
    setReportMessage(result.ok ? '通報を受け付けました。' : (result.error ?? '通報に失敗しました。'));
    if (result.ok) event.currentTarget.reset();
  };

  const elapsed = startedAt ? Math.max((Date.now() - startedAt) / 1000 / 60, 1 / 60) : 0;
  const kpm = elapsed ? Math.round(acceptedChars / elapsed) : 0;
  const accuracy = Math.round((acceptedChars / Math.max(acceptedChars + misses, 1)) * 100);
  const title = map?.title ?? 'プレイ';
  const count = map ? `${finished ? lines.length : activeIndex + 1} / ${lines.length} 行` : '譜面を読み込み中…';
  const loading = !map;

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/"><span className="brand-mark">YT</span><span>YouTube <b>Typing</b></span></Link>
          <nav className="nav"><Link href="/search">探す</Link><Link href="/play">プレイ画面</Link><Link href="/create">譜面を作る</Link><Link href="/">終了</Link></nav>
        </div>
      </header>
      <main className="container section play-page">
        <div className="toolbar play-toolbar">
          <div><p className="eyebrow">NOW PLAYING</p><h1 className="page-title">{title}</h1><span className="muted">{count}</span></div>
          <span className="spacer" />
          {map && <><button className={`btn ${favorite ? 'favorite-active' : ''}`} onClick={handleFavorite}>{favorite ? '★ お気に入り済み' : '☆ お気に入り'}</button><button className="btn" onClick={() => setReportOpen((v) => !v)}>通報</button></>}
        </div>

        <div className="play-layout" style={{ marginTop: 14 }}>
          <section>
            {map ? <><YouTubePlayer videoId={map.youtubeVideoId} onTime={setYtTime} compact /><div className="progress" style={{ marginTop: 10 }}><div style={{ width: `${Math.min(progress, 100)}%` }} /></div></> : <div className="play-stage"><div className="stage-top"><span className="live-dot" /> LIVE TYPING <span className="stage-hotkey">入力はページ内どこでもOK</span></div><div className="play-text">{mapId ? '譜面を読み込んでいます…' : 'プレイする譜面を選択してください'}</div><div className="play-reading"> </div><div className="play-input">まもなく開始します…</div></div>}
            <div className="play-metrics"><span>動画 {ytTime.toFixed(2)}s</span><span>ミス {misses}</span><span>KPM {kpm}</span><span>精度 {accuracy}%</span></div>
          </section>

          <section className="play-stage">
            <div className="stage-top"><span className="live-dot" /> LIVE TYPING <span className="stage-hotkey">入力はページ内どこでもOK</span></div>
            {loading ? (
              <><div className="line-progress">READY</div><div className="play-text">{mapId ? '譜面を読み込んでいます…' : 'プレイする譜面を選択してください'}</div><div className="play-reading"> </div><div className="play-input">{mapId ? 'まもなく開始します…' : '譜面を選択してプレイ開始'}</div></>
            ) : finished ? (
              <><div className="complete-badge">COMPLETE</div><div className="play-text">おつかれさまでした！</div><p className="muted">今回のプレイ結果</p><div className="result"><div className="stat"><b>{misses}</b><span>ミス</span></div><div className="stat"><b>{kpm}</b><span>KPM</span></div><div className="stat"><b>{accuracy}%</b><span>精度</span></div><div className="stat"><b>{lines.length}</b><span>行数</span></div></div><div className="cta-row"><button className="btn primary" onClick={reset}>もう一度プレイ</button><Link className="btn" href="/">トップへ</Link></div></>
            ) : (
              <><div className="line-progress">LINE {String(activeIndex + 1).padStart(2, '0')} / {String(lines.length).padStart(2, '0')}</div><div className="play-text">{current?.text || '—'}</div><div className="play-reading">{current?.reading || ''}</div><div className={`play-input ${lastKeyOk === false ? 'input-error' : lastKeyOk === true ? 'input-ok' : ''}`} aria-live="polite">{typed || 'キーボードで入力…'}</div><div style={{ minHeight: 22 }}>{lastKeyOk === false ? <span className="error-inline">入力が違います</span> : lastKeyOk === true ? <span className="ok-inline">✓ 入力OK</span> : <span className="muted">Backspaceで1文字戻せます</span>}</div></>
            )}
          </section>
        </div>

        {reportOpen && map && <section className="card report-panel" style={{ marginTop: 16 }}><h2>譜面を通報</h2><form className="form" onSubmit={handleReport}><div className="field"><label>理由</label><select name="reason" required><option value="copyright">権利・著作権に関する問題</option><option value="inappropriate">不適切な内容</option><option value="spam">スパム</option><option value="other">その他</option></select></div><div className="field"><label>詳細</label><textarea name="details" maxLength={5000} placeholder="問題の内容を入力してください" /></div><button className="btn primary" disabled={!loggedIn}>通報を送信</button>{!loggedIn && <p className="muted">通報にはログインが必要です。</p>}{reportMessage && <p className="notice">{reportMessage}</p>}</form></section>}
      </main>
    </>
  );
}
