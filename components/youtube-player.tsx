'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';

export type PlayerState = 'unstarted' | 'playing' | 'paused' | 'ended' | 'buffering' | 'cued';
export type PlayerControl = {
  play: () => void;
  pause: () => void;
  togglePause: () => boolean;
  seek: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
};

type Props = {
  videoId: string;
  onTime?: (time: number) => void;
  onState?: (state: PlayerState) => void;
  controllerRef?: MutableRefObject<PlayerControl | null>;
  /** 譜面エディタ用: ±0.1秒の微調整ボタンを表示する */
  nudge?: boolean;
};

type YTPlayer = {
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate?: (rate: number) => void;
  setVolume?: (volume: number) => void;
  destroy: () => void;
};
type YTGlobal = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: { onStateChange?: (event: { data: number }) => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: Partial<YTGlobal>;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const stateNames: Record<number, PlayerState> = { [-1]: 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' };
const API_SRC = 'https://www.youtube.com/iframe_api';
let apiPromise: Promise<YTGlobal> | null = null;

// window.YT は API の読み込み途中でも存在するため、YT.Player が使えるようになるまで待つ。
function loadYouTubeApi(): Promise<YTGlobal> {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
  if (window.YT?.Player) return Promise.resolve(window.YT as YTGlobal);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTGlobal>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT as YTGlobal);
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = API_SRC;
      script.async = true;
      script.onerror = () => { apiPromise = null; reject(new Error('YouTube IFrame API failed to load')); };
      document.head.appendChild(script);
    }
    // onYouTubeIframeAPIReady を取りこぼした場合の保険
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.YT?.Player) { window.clearInterval(timer); resolve(window.YT as YTGlobal); }
      else if (Date.now() - started > 15000) { window.clearInterval(timer); apiPromise = null; reject(new Error('YouTube IFrame API timed out')); }
    }, 100);
  });
  return apiPromise;
}

export function YouTubePlayer({ videoId, onTime, onState, controllerRef, nudge = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const stateRef = useRef<PlayerState>('unstarted');
  const countdownTimerRef = useRef<number | null>(null);
  const onStateRef = useRef(onState);
  const onTimeRef = useRef(onTime);
  const [time, setTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { onStateRef.current = onState; onTimeRef.current = onTime; });

  useEffect(() => {
    let alive = true;
    const host = hostRef.current;
    setFailed(false);

    loadYouTubeApi().then((YT) => {
      if (!alive || !host) return;
      // YT.Player は渡した要素を iframe に置き換えるため、毎回新しい要素を作る
      // （React 管理下の要素を直接渡すと、動画切り替えやアンマウントで壊れる）
      const mount = document.createElement('div');
      host.replaceChildren(mount);
      const player = new YT.Player(mount, {
        videoId,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (event) => {
            const next = stateNames[event.data] ?? 'unstarted';
            stateRef.current = next;
            onStateRef.current?.(next);
          },
        },
      });
      playerRef.current = player;
      if (controllerRef) {
        controllerRef.current = {
          play: () => player.playVideo(),
          pause: () => player.pauseVideo(),
          togglePause: () => {
            if (stateRef.current === 'playing') { player.pauseVideo(); return true; }
            player.playVideo();
            return false;
          },
          seek: (seconds) => player.seekTo(Math.max(0, seconds), true),
          setPlaybackRate: (rate) => player.setPlaybackRate?.(rate),
          setVolume: (volume) => player.setVolume?.(Math.max(0, Math.min(100, volume))),
        };
      }
    }).catch(() => { if (alive) setFailed(true); });

    return () => {
      alive = false;
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setCountdown(null);
      if (controllerRef) controllerRef.current = null;
      try { playerRef.current?.destroy(); } catch { /* 既に破棄済み */ }
      playerRef.current = null;
      stateRef.current = 'unstarted';
      host?.replaceChildren();
    };
  }, [videoId, controllerRef]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = playerRef.current?.getCurrentTime?.();
      if (typeof current === 'number' && Number.isFinite(current)) {
        setTime(current);
        onTimeRef.current?.(current);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  const startPlayback = () => {
    if (!playerRef.current || countdown !== null) return;
    let value = 3;
    setCountdown(value);
    countdownTimerRef.current = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        playerRef.current?.playVideo();
        return;
      }
      setCountdown(value);
    }, 1000);
  };

  const jump = (delta: number) => playerRef.current?.seekTo(Math.max(0, time + delta), true);

  return (
    <div className="yt-wrap">
      <div className="yt-frame">
        <div ref={hostRef} className="yt-host" />
        {failed && <div className="yt-error">YouTubeプレイヤーを読み込めませんでした。ページを再読み込みしてください。</div>}
        {countdown !== null && <div className="yt-countdown" aria-live="assertive">{countdown}</div>}
      </div>
      <div className="yt-controls">
        <button className="btn" onClick={startPlayback} type="button" disabled={countdown !== null}>▶ 3秒後に再生</button>
        <button className="btn" onClick={() => playerRef.current?.pauseVideo()} type="button">⏸ 停止</button>
        {nudge && <>
          <button className="btn" onClick={() => jump(-0.1)} type="button">−0.1s</button>
          <button className="btn" onClick={() => jump(0.1)} type="button">+0.1s</button>
        </>}
        <span className="timecode">{time.toFixed(2)}s</span>
      </div>
    </div>
  );
}
