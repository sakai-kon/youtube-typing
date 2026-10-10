'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { YouTubePlayer, type PlayerControl, type PlayerState } from '@/components/youtube-player';
import { findMap } from '@/lib/storage';
import { getMap, isFavorite, recordPlay, submitReport, toggleFavorite } from '@/lib/cloud';
import { nextInputState, suggestRomaji } from '@/lib/romaji';
import { getSupabase } from '@/lib/supabase/client';
import type { MapLine, TypingMap } from '@/lib/types';

type LoadState = 'loading' | 'ready' | 'missing';

/** 動画時刻に対応する行番号。tolerance は「少し手前にシークされた」場合の許容秒数。 */
function indexAtTime(lines: MapLine[], time: number, tolerance = 0): number {
  let index = 0;
  while (index + 1 < lines.length && time + tolerance >= lines[index + 1].startTime) index += 1;
  return index;
}

export default function PlayPage() {
  const [map, setMap] = useState<TypingMap | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [mapId, setMapId] = useState<string | null>(null);
  const [ytTime, setYtTime] = useState(0);
  const [typed, setTyped] = useState('');
  const [misses, setMisses] = useState(0);
  const [acceptedChars, setAcceptedChars] = useState(0);
  const [combo, setCombo] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastKeyOk, setLastKeyOk] = useState<boolean | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [paused, setPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(100);

  const playerRef = useRef<PlayerControl | null>(null);
  const recordedRef = useRef(false);
  const typedRef = useRef('');
  const startedAtRef = useRef<number | null>(null);
  const lineCompleteRef = useRef(false);
  const prevTimeRef = useRef(0);
  const playbackRateRef = useRef(1);
  const volumeRef = useRef(100);

  const finished = finishedAt !== null;
  const lines = useMemo(() => (map ? [...map.lines].sort((a, b) => a.startTime - b.startTime) : []), [map]);
  const current: MapLine | undefined = lines[activeIndex];
  const nextLine: MapLine | undefined = lines[activeIndex + 1];

  // キーボードハンドラから最新値を読むための参照
  const linesRef = useRef(lines);
  const activeIndexRef = useRef(activeIndex);
  const currentRef = useRef(current);
  const pausedRef = useRef(paused);
  const finishedRef = useRef(finished);
  linesRef.current = lines;
  activeIndexRef.current = activeIndex;
  currentRef.current = current;
  pausedRef.current = paused;
  finishedRef.current = finished;

  useEffect(() => { setMapId(new URLSearchParams(window.location.search).get('id') ?? ''); }, []);

  useEffect(() => {
    if (mapId === null) return;
    if (!mapId) { setLoadState('missing'); return; }
    let alive = true;
    const load = async () => {
      const local = findMap(mapId);
      if (local && alive) { setMap(local); setLoadState('ready'); }
      const cloud = await getMap(mapId);
      if (cloud && alive) { setMap(cloud); setLoadState('ready'); }
      if (!local && !cloud && alive) setLoadState('missing');
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (alive) setLoggedIn(!!user);
        if (user && alive) setFavorite(await isFavorite(mapId));
      }
    };
    void load();
    return () => { alive = false; };
  }, [mapId]);

  const finishGame = useCallback(() => {
    typedRef.current = '';
    setTyped('');
    setFinishedAt(Date.now());
  }, []);

  // 動画時刻と表示行を同期する
  useEffect(() => {
    const prev = prevTimeRef.current;
    prevTimeRef.current = ytTime;
    if (!lines.length || finished) return;

    // 巻き戻しシーク（YouTube のシークバー操作など）: 入力中の行を捨てて時刻から行を決め直す
    if (ytTime < prev - 0.75) {
      lineCompleteRef.current = false;
      typedRef.current = '';
      setTyped('');
      setLastKeyOk(null);
      setActiveIndex(indexAtTime(lines, ytTime, 0.3));
      return;
    }
    if (paused) return;

    // 打ち終えた行は、動画が次の行の開始時刻に達するまで表示し続ける
    if (lineCompleteRef.current) {
      if (!nextLine) { finishGame(); return; }
      if (ytTime < nextLine.startTime) return;
      lineCompleteRef.current = false;
      setActiveIndex(activeIndex + 1);
      setLastKeyOk(null);
      return;
    }

    // 入力が始まるまでは、動画時刻に合わせて行を進める
    if (typedRef.current) return;
    let index = activeIndex;
    while (index + 1 < lines.length && ytTime >= lines[index + 1].startTime) index += 1;
    if (index !== activeIndex) {
      setActiveIndex(index);
      setLastKeyOk(null);
    }
  }, [ytTime, lines, activeIndex, nextLine, finished, paused, finishGame]);

  const finishLine = useCallback(() => {
    typedRef.current = '';
    setTyped('');
    setLastKeyOk(null);
    if (activeIndexRef.current >= linesRef.current.length - 1) { finishGame(); return; }
    // 次の行へ進むタイミングは動画時刻が決める
    lineCompleteRef.current = true;
  }, [finishGame]);

  const togglePause = useCallback(() => {
    const nextPaused = playerRef.current?.togglePause();
    if (typeof nextPaused === 'boolean') setPaused(nextPaused);
  }, []);

  const changeSpeed = useCallback((delta: number) => {
    const next = Math.max(0.25, Math.min(2, Number((playbackRateRef.current + delta).toFixed(2))));
    playbackRateRef.current = next;
    setPlaybackRate(next);
    playerRef.current?.setPlaybackRate(next);
  }, []);

  const changeVolume = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(100, volumeRef.current + delta));
    volumeRef.current = next;
    setVolume(next);
    playerRef.current?.setVolume(next);
  }, []);

  const changeLine = useCallback((delta: number) => {
    const all = linesRef.current;
    if (!all.length) return;
    const next = Math.max(0, Math.min(all.length - 1, activeIndexRef.current + delta));
    typedRef.current = '';
    lineCompleteRef.current = false;
    activeIndexRef.current = next;
    setTyped('');
    setLastKeyOk(null);
    setActiveIndex(next);
    playerRef.current?.seek(all[next].startTime);
  }, []);

  const resetGame = useCallback(() => {
    recordedRef.current = false;
    typedRef.current = '';
    lineCompleteRef.current = false;
    startedAtRef.current = null;
    prevTimeRef.current = 0;
    playbackRateRef.current = 1;
    volumeRef.current = 100;
    setYtTime(0); setTyped(''); setMisses(0); setAcceptedChars(0); setCombo(0);
    setStartedAt(null); setFinishedAt(null); setActiveIndex(0); setLastKeyOk(null); setPaused(false);
    setPlaybackRate(1); setVolume(100);
    playerRef.current?.setPlaybackRate(1);
    playerRef.current?.setVolume(100);
    playerRef.current?.seek(0);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // フォーム入力中（通報フォームなど）はゲーム操作として扱わない
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.isComposing) return;

      if (event.key === 'Escape' || event.key === 'F7') { event.preventDefault(); togglePause(); return; }
      if (event.key === 'F4') { event.preventDefault(); resetGame(); return; }
      if (event.key === 'F10') { event.preventDefault(); changeSpeed(0.25); return; }
      if (event.key === 'F9') { event.preventDefault(); changeSpeed(-0.25); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); changeVolume(5); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); changeVolume(-5); return; }
      if (event.ctrlKey && event.key === 'ArrowLeft') { event.preventDefault(); changeLine(-1); return; }
      if (event.ctrlKey && event.key === 'ArrowRight') { event.preventDefault(); changeLine(1); return; }
      if (event.key === ' ') { event.preventDefault(); return; }

      const line = currentRef.current;
      if (pausedRef.current || finishedRef.current || lineCompleteRef.current || !line) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== 'Backspace' && event.key.length !== 1) return;
      event.preventDefault();

      if (event.key === 'Backspace') {
        typedRef.current = typedRef.current.slice(0, -1);
        setTyped(typedRef.current);
        return;
      }

      if (startedAtRef.current === null) {
        const now = Date.now();
        startedAtRef.current = now;
        setStartedAt(now);
      }
      const proposed = typedRef.current + event.key.toLowerCase();
      const result = nextInputState(line.reading, proposed);
      setLastKeyOk(result.status === 'correct');

      if (result.status === 'correct') {
        typedRef.current = proposed;
        setTyped(proposed);
        setAcceptedChars((value) => value + 1);
        setCombo((value) => value + 1);
        if (result.done) finishLine();
      } else {
        setMisses((value) => value + 1);
        setCombo(0);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [changeLine, changeSpeed, changeVolume, finishLine, resetGame, togglePause]);

  const elapsedMinutes = startedAt ? Math.max(((finishedAt ?? Date.now()) - startedAt) / 60000, 1 / 60) : 0;
  const kpm = elapsedMinutes ? Math.round(acceptedChars / elapsedMinutes) : 0;
  const accuracy = Math.round((acceptedChars / Math.max(acceptedChars + misses, 1)) * 100);

  useEffect(() => {
    if (!finished || !map || !loggedIn || recordedRef.current) return;
    recordedRef.current = true;
    void recordPlay(map.id, accuracy, misses, kpm);
  }, [finished, map, loggedIn, accuracy, misses, kpm]);

  const handlePlayerState = useCallback((state: PlayerState) => {
    if (state === 'paused') setPaused(true);
    if (state === 'playing') setPaused(false);
  }, []);

  const romaji = current ? suggestRomaji(current.reading, typed) : '';
  const romajiDone = romaji.slice(0, typed.length);
  const romajiRest = romaji.slice(typed.length);
  const remaining = nextLine ? Math.max(0, nextLine.startTime - ytTime) : 0;
  const lineProgress = romaji ? Math.min(100, (typed.length / romaji.length) * 100) : 0;

  const handleFavorite = async () => {
    if (!map) return;
    if (!loggedIn) { window.alert('お気に入りにはログインが必要です。'); return; }
    const result = await toggleFavorite(map.id);
    if (result.ok) setFavorite(result.favorite);
  };

  const handleReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!map) return;
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const result = await submitReport(map.id, String(form.get('reason') ?? ''), String(form.get('details') ?? ''));
    setReportMessage(result.ok ? '通報を受け付けました。' : (result.error ?? '通報に失敗しました。'));
    if (result.ok) formEl.reset();
  };

  if (loadState === 'missing') {
    return <>
      <SiteHeader />
      <main className="container section">
        <div className="empty">
          <h3>譜面が見つかりません</h3>
          <p>URLが正しくないか、非公開の譜面です。</p>
          <Link className="btn primary" href="/search/">譜面を探す</Link>
        </div>
      </main>
    </>;
  }

  return (
    <>
      <SiteHeader />
      <main className="container section play-page">
        <div className="page-head">
          <div>
            <h1 className="page-title">{map?.title ?? '読み込み中…'}</h1>
            {map && <p className="muted">{finished ? lines.length : Math.min(activeIndex + 1, lines.length)} / {lines.length} 行</p>}
          </div>
          {map && <div className="cta-row">
            <button className={`btn ${favorite ? 'active' : ''}`} onClick={handleFavorite} aria-label="お気に入り">{favorite ? '★ お気に入り' : '☆ お気に入り'}</button>
            <button className="btn" onClick={() => setReportOpen((v) => !v)}>通報</button>
          </div>}
        </div>

        {map ? <YouTubePlayer videoId={map.youtubeVideoId} onTime={setYtTime} onState={handlePlayerState} controllerRef={playerRef} /> : <div className="empty">譜面を読み込んでいます…</div>}

        {map && <section className="card play-panel">
          {current ? <>
            <div className="play-stats">
              <span><b>{combo}</b> コンボ</span>
              <span><b>{kpm}</b> KPM</span>
              <span><b>{accuracy}%</b> 精度</span>
              <span><b>{nextLine ? `${remaining.toFixed(1)}s` : '—'}</b> 次の行まで</span>
            </div>
            <div className="play-text">{current.text}</div>
            <div className="play-reading">{current.reading}</div>
            <div className={`play-romaji ${lastKeyOk === false ? 'miss' : ''}`} aria-live="polite">
              <span className="typed">{romajiDone}</span><span className="rest">{romajiRest}</span>
            </div>
            <div className="progress"><div style={{ width: `${lineProgress}%` }} /></div>
            <div className="play-next"><span>NEXT</span>{nextLine?.text ?? '—'}</div>
          </> : <div className="muted">この譜面にはまだ行がありません。</div>}

          <div className="play-controls">
            <button className="btn" onClick={() => changeLine(-1)} title="Ctrl+←">前の行</button>
            <button className="btn" onClick={togglePause} title="Esc">{paused ? '再開' : '一時停止'}</button>
            <button className="btn" onClick={() => changeLine(1)} title="Ctrl+→">次の行</button>
            <button className="btn" onClick={() => changeSpeed(-0.25)} title="F9">速度 −</button>
            <span className="muted">{playbackRate.toFixed(2)}x</span>
            <button className="btn" onClick={() => changeSpeed(0.25)} title="F10">＋</button>
            <button className="btn" onClick={() => changeVolume(-5)} title="↓">音量 −</button>
            <span className="muted">{volume}%</span>
            <button className="btn" onClick={() => changeVolume(5)} title="↑">＋</button>
            <button className="btn" onClick={resetGame} title="F4">やり直し</button>
          </div>
          <p className="muted play-hint">Esc 一時停止 / Ctrl+←→ 行移動 / F9・F10 速度 / ↑↓ 音量 / F4 やり直し / Backspace 1文字戻す</p>
          {paused && !finished && <div className="notice">一時停止中 — Esc で再開</div>}
        </section>}

        {finished && <div className="overlay" role="dialog" aria-modal="true" aria-label="プレイ結果">
          <div className="card result-card">
            <h2>おつかれさまでした</h2>
            <div className="result">
              <div className="stat"><b>{kpm}</b><span>KPM</span></div>
              <div className="stat"><b>{accuracy}%</b><span>精度</span></div>
              <div className="stat"><b>{misses}</b><span>ミス</span></div>
              <div className="stat"><b>{lines.length}</b><span>行数</span></div>
            </div>
            {!loggedIn && <p className="muted">ログインすると記録が保存されます。</p>}
            <div className="cta-row">
              <button className="btn primary" onClick={resetGame}>もう一度</button>
              <Link className="btn" href="/">トップへ</Link>
            </div>
          </div>
        </div>}

        {reportOpen && map && <section className="card" style={{ marginTop: 16 }}>
          <h2>譜面を通報</h2>
          <form className="form" onSubmit={handleReport}>
            <div className="field"><label htmlFor="reason">理由</label>
              <select id="reason" name="reason" required>
                <option value="copyright">権利・著作権に関する問題</option>
                <option value="inappropriate">不適切な内容</option>
                <option value="spam">スパム</option>
                <option value="other">その他</option>
              </select></div>
            <div className="field"><label htmlFor="details">詳細</label><textarea id="details" name="details" maxLength={5000} placeholder="問題の内容を入力してください" /></div>
            <button className="btn primary" disabled={!loggedIn}>通報を送信</button>
            {!loggedIn && <p className="muted">通報にはログインが必要です。</p>}
            {reportMessage && <p className="notice">{reportMessage}</p>}
          </form>
        </section>}
      </main>
    </>
  );
}
