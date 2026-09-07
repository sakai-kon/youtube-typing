'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { YouTubePlayer } from '@/components/youtube-player';
import { findMap } from '@/lib/storage';
import { getMap, isFavorite, recordPlay, submitReport, toggleFavorite } from '@/lib/cloud';
import { nextInputState, romajiVariants } from '@/lib/romaji';
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
  const [paused, setPaused] = useState(false);
  const recordedRef = useRef(false);
  const typedRef = useRef('');

  useEffect(() => { setMapId(new URLSearchParams(window.location.search).get('id') ?? ''); }, []);

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
  const nextLine = lines[activeIndex + 1];
  const songProgress = lines.length ? (activeIndex / Math.max(lines.length - 1, 1)) * 100 : 0;
  const inputProgress = current ? (typed.length / Math.max(romajiVariants(current.reading, 1)[0]?.length || 1, 1)) * 100 : 0;
  const combo = Math.max(0, acceptedChars - misses);

  useEffect(() => {
    if (!lines.length || finished || paused) return;
    let index = activeIndex;
    while (index + 1 < lines.length && ytTime >= lines[index + 1].startTime) index += 1;
    if (index !== activeIndex) {
      setActiveIndex(index);
      typedRef.current = '';
      setTyped('');
      setLastKeyOk(null);
    }
  }, [ytTime, lines, activeIndex, finished, paused]);

  const finishLine = useCallback(() => {
    typedRef.current = '';
    if (activeIndex >= lines.length - 1) setFinished(true);
    else {
      setActiveIndex((i) => i + 1);
      setTyped('');
      setLastKeyOk(null);
    }
  }, [activeIndex, lines.length]);

  useEffect(() => {
    if (!current || finished || paused) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key.length !== 1 && event.key !== 'Backspace') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();

      if (event.key === 'Backspace') {
        typedRef.current = typedRef.current.slice(0, -1);
        setTyped(typedRef.current);
        return;
      }

      if (startedAt === null) setStartedAt(Date.now());
      const proposed = typedRef.current + event.key.toLowerCase();
      const result = nextInputState(current.reading, proposed);
      setLastKeyOk(result.status === 'correct');

      if (result.status === 'correct') {
        typedRef.current = proposed;
        setTyped(proposed);
        setAcceptedChars((value) => value + 1);
        if (result.done) finishLine();
      } else {
        setMisses((value) => value + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, finishLine, finished, paused, startedAt]);

  useEffect(() => {
    if (!finished || !map || !loggedIn || recordedRef.current) return;
    recordedRef.current = true;
    const elapsed = startedAt ? Math.max((Date.now() - startedAt) / 1000 / 60, 1 / 60) : 1 / 60;
    const kpm = Math.round(acceptedChars / elapsed);
    const accuracy = Math.round((acceptedChars / Math.max(acceptedChars + misses, 1)) * 100);
    void recordPlay(map.id, accuracy, misses, kpm);
  }, [finished, map, loggedIn, startedAt, acceptedChars, misses]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setPaused((value) => !value); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const reset = () => {
    recordedRef.current = false;
    typedRef.current = '';
    setYtTime(0); setTyped(''); setMisses(0); setAcceptedChars(0);
    setStartedAt(null); setFinished(false); setActiveIndex(0); setLastKeyOk(null); setPaused(false);
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
  const expectedRomaji = current ? (romajiVariants(current.reading, 1)[0] ?? '') : '';
  const remaining = nextLine ? Math.max(0, nextLine.startTime - ytTime) : 0;
  const title = map?.title ?? 'プレイ';
  const count = map ? `${finished ? lines.length : activeIndex + 1} / ${lines.length} 行` : '譜面を読み込んでいます…';
  const loading = !map;

  return (
    <>
      <SiteHeader loggedIn={loggedIn} compact />
      <main className="container section play-page play-game-page">
        <div className="play-game-topline">
          <div><p className="eyebrow">NOW PLAYING</p><h1 className="page-title">{title}</h1><span className="muted">{count}</span></div>
          <div className="play-top-actions">{map && <><button className={`btn ${favorite ? 'favorite-active' : ''}`} onClick={handleFavorite}>{favorite ? '★' : '☆'}</button><button className="btn" onClick={() => setReportOpen((v) => !v)}>⋯</button></>}</div>
        </div>

        <section className="game-video-card">
          {map ? <YouTubePlayer videoId={map.youtubeVideoId} onTime={setYtTime} compact /> : <div className="game-video-placeholder"><span>譜面を読み込んでいます…</span></div>}
        </section>

        <section className="gameplay-panel">
          <div className="game-status-row">
            <div><b>{combo}</b><span>combo</span></div>
            <div><b>{kpm ? (kpm / 60).toFixed(2) : '0.00'}</b><span>打/秒</span></div>
            <div><b>{remaining.toFixed(1)}s</b><span>次ラインまで</span></div>
          </div>

          <div className="typing-focus">
            <div className="typing-hiragana">{current?.reading || (loading ? '譜面を読み込んでいます…' : 'ことばはいつだってたんじゅんで')}</div>
            <div className="typing-romaji">{expectedRomaji || 'kotobahaitudattetanjunde'}</div>
            <div className={`typing-input ${lastKeyOk === false ? 'input-error' : lastKeyOk === true ? 'input-ok' : ''}`} aria-live="polite">{typed || '入力開始…'}</div>
          </div>

          <div className="next-line-preview">
            <span>NEXT</span>
            <strong>{nextLine?.text || '—'}</strong>
          </div>

          <div className="song-progress" aria-label="プレイ進行状況">
            <div className="song-progress-meta"><span>LINE {String(activeIndex + 1).padStart(2, '0')}</span><span>{map ? `${Math.round(songProgress)}%` : 'READY'}</span></div>
            <div className="song-progress-track"><div className="song-progress-song" style={{ width: `${Math.min(songProgress, 100)}%` }} /><div className="song-progress-input" style={{ width: `${Math.min(inputProgress, 100)}%` }} /></div>
          </div>

          <div className="game-keyboard">
            <button onClick={() => setPaused((v) => !v)}><span>一時停止</span><kbd>Esc</kbd></button>
            <button><span>速度: 1.00x</span><kbd>F10</kbd></button>
            <button><span>調整: +0.0</span><kbd>←→</kbd></button>
            <button><span>音量</span><kbd>↑↓</kbd></button>
            <button><span>自動スキップ</span><kbd>Shift+↑↓</kbd></button>
            <button onClick={reset}><span>やり直し</span><kbd>F4</kbd></button>
            <button><span>練習</span><kbd>F7</kbd></button>
            <button><span>速度↓</span><kbd>F9</kbd></button>
            <button><span>前/次ライン</span><kbd>Ctrl+←→</kbd></button>
            <button onClick={() => { typedRef.current = ''; setTyped(''); }}><span>戻る</span><kbd>BS</kbd></button>
            <button><span>Space でスキップ</span><kbd>Space</kbd></button>
          </div>
          {paused && <div className="pause-chip">PAUSED · Escで再開</div>}
        </section>

        <div className="play-metrics gameplay-metrics"><span>動画 {ytTime.toFixed(2)}s</span><span>ミス {misses}</span><span>KPM {kpm}</span><span>精度 {accuracy}%</span></div>

        {finished && <section className="play-stage result-stage"><div className="complete-badge">COMPLETE</div><div className="play-text">おつかれさまでした！</div><p className="muted">今回のプレイ結果</p><div className="result"><div className="stat"><b>{misses}</b><span>ミス</span></div><div className="stat"><b>{kpm}</b><span>KPM</span></div><div className="stat"><b>{accuracy}%</b><span>精度</span></div><div className="stat"><b>{lines.length}</b><span>行数</span></div></div><div className="cta-row"><button className="btn primary" onClick={reset}>もう一度プレイ</button><Link className="btn" href="/">トップへ</Link></div></section>}
        {reportOpen && map && <section className="card report-panel" style={{ marginTop: 16 }}><h2>譜面を通報</h2><form className="form" onSubmit={handleReport}><div className="field"><label>理由</label><select name="reason" required><option value="copyright">権利・著作権に関する問題</option><option value="inappropriate">不適切な内容</option><option value="spam">スパム</option><option value="other">その他</option></select></div><div className="field"><label>詳細</label><textarea name="details" maxLength={5000} placeholder="問題の内容を入力してください" /></div><button className="btn primary" disabled={!loggedIn}>通報を送信</button>{!loggedIn && <p className="muted">通報にはログインが必要です。</p>}{reportMessage && <p className="notice">{reportMessage}</p>}</form></section>}
      </main>

      <style>{`
        .play-game-page{max-width:1280px;padding-top:28px;padding-bottom:48px}
        .play-game-topline{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:15px}.play-game-topline .eyebrow{margin-bottom:7px}.play-game-topline .page-title{font-size:28px}.play-top-actions{display:flex;gap:8px}.play-top-actions .btn{min-width:42px;padding:9px 11px;text-align:center}
        .game-video-card{position:relative;border:1px solid #ffffff12;border-radius:20px;overflow:hidden;background:#05070b;box-shadow:0 18px 60px #0009}.game-video-card .yt-wrap{display:block}.game-video-card .yt-frame.compact{height:auto;aspect-ratio:16/9;border:0;border-radius:0}.game-video-card .yt-controls{padding:8px 10px;background:#090d13;border-top:1px solid #ffffff0a}.game-video-placeholder{aspect-ratio:16/9;display:grid;place-items:center;background:linear-gradient(135deg,#101827,#070b10 65%,#131e2b);color:#6f7e93;font-size:13px}
        .gameplay-panel{margin-top:14px;border:1px solid #ffffff12;border-radius:20px;background:linear-gradient(180deg,rgba(15,19,26,.96),rgba(8,11,16,.98));padding:20px 24px 18px;box-shadow:0 18px 55px #0008}
        .game-status-row{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;padding:0 2px 15px;border-bottom:1px solid #ffffff0b}.game-status-row>div{text-align:center}.game-status-row>div:first-child{text-align:left}.game-status-row>div:last-child{text-align:right}.game-status-row b{font-size:24px;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.game-status-row span{margin-left:7px;color:#758398;font-size:11px;font-weight:700;letter-spacing:.05em}
        .typing-focus{text-align:center;padding:26px 8px 20px}.typing-hiragana{font-size:clamp(27px,4vw,47px);line-height:1.2;font-weight:800;letter-spacing:-.035em}.typing-romaji{margin-top:8px;color:#77e0ad;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:clamp(16px,2vw,23px);letter-spacing:.035em;min-height:30px}.typing-input{margin:15px auto 0;width:min(760px,100%);min-height:52px;padding:12px 18px;border-radius:12px;border:1px solid #273142;background:#070a0e;color:#aab7c8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;letter-spacing:.08em}.typing-input.input-ok{border-color:#315f52;box-shadow:0 0 0 3px #72efbd08;color:#c8ffe4}.typing-input.input-error{border-color:#65333d;box-shadow:0 0 0 3px #ff8f9a08;color:#ffc4ca;animation:shake .16s linear}
        .next-line-preview{display:flex;align-items:baseline;gap:12px;padding:13px 2px;border-top:1px solid #ffffff0b;border-bottom:1px solid #ffffff0b}.next-line-preview span{font-size:9px;letter-spacing:.16em;font-weight:800;color:#718199}.next-line-preview strong{font-size:14px;color:#a8b3c4;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.song-progress{padding:13px 2px 9px}.song-progress-meta{display:flex;justify-content:space-between;margin-bottom:7px;color:#67758b;font-size:9px;letter-spacing:.13em;font-weight:800}.song-progress-track{position:relative;height:8px;border-radius:999px;background:#151b25;overflow:hidden;border:1px solid #202938;box-shadow:inset 0 1px 2px #0008}.song-progress-song{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#668fff,#7aa8ff);border-radius:999px}.song-progress-input{position:absolute;left:0;top:2px;bottom:2px;background:#f3c95d;border-radius:999px;box-shadow:0 0 8px #f3c95d55;transition:width .08s linear}
        .game-keyboard{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;padding-top:8px}.game-keyboard button{min-height:35px;padding:7px 9px;border:1px solid #202938;border-radius:8px;background:#0a0e14;color:#8591a4;display:flex;align-items:center;gap:8px;font-size:10px}.game-keyboard button:hover{background:#111823;color:#d5deea;border-color:#344155}.game-keyboard span{white-space:nowrap}.game-keyboard kbd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:#76849a;border:1px solid #ffffff12;border-bottom-color:#ffffff1b;border-radius:6px;padding:3px 6px;background:#080b10}.pause-chip{margin:11px auto 0;padding:6px 10px;border:1px solid #5e4a1a;background:#171308;color:#ffd77a;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em}.gameplay-metrics{justify-content:center;margin-top:9px;opacity:.72}.result-stage{margin-top:16px;min-height:300px}
        @media(max-width:760px){.play-game-page{padding-top:16px}.gameplay-panel{padding:17px 14px}.typing-focus{padding-top:21px}.game-status-row b{font-size:19px}.game-status-row span{display:block;margin:2px 0 0}.next-line-preview strong{font-size:13px}.game-keyboard{gap:5px}.game-keyboard button{padding:6px 7px}}
      `}</style>
    </>
  );
}
