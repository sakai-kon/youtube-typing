'use client';

import { useEffect, useRef, useState } from 'react';

type PlayerState = 'unstarted' | 'playing' | 'paused' | 'ended' | 'buffering' | 'cued';
type Props = { videoId: string; onTime?: (time: number) => void; onState?: (state: PlayerState) => void; compact?: boolean };
type YTPlayer = { getCurrentTime: () => number; playVideo: () => void; pauseVideo: () => void; seekTo: (seconds: number, allowSeekAhead: boolean) => void; destroy: () => void };
type YTGlobal = { Player: new (element: HTMLElement, options: { videoId: string; playerVars?: Record<string, number | string>; events?: { onStateChange?: (event: { data: number }) => void } }) => YTPlayer };

declare global { interface Window { YT?: YTGlobal } }
const stateNames: Record<number, PlayerState> = { [-1]: 'unstarted', [0]: 'ended', [1]: 'playing', [2]: 'paused', [3]: 'buffering', [5]: 'cued' };
let apiPromise: Promise<YTGlobal> | null = null;

function loadYouTubeApi(): Promise<YTGlobal> {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
  if (window.YT) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!script) { const next = document.createElement('script'); next.src = 'https://www.youtube.com/iframe_api'; next.async = true; document.head.appendChild(next); }
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.YT) { window.clearInterval(timer); resolve(window.YT); }
      else if (Date.now() - started > 15000) { window.clearInterval(timer); apiPromise = null; reject(new Error('YouTube IFrame API timed out')); }
    }, 50);
  });
  return apiPromise;
}

export function YouTubePlayer({ videoId, onTime, onState, compact = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null); const playerRef = useRef<YTPlayer | null>(null);
  const [time, setTime] = useState(0); const [state, setState] = useState<PlayerState>('unstarted');
  useEffect(() => {
    let alive = true;
    loadYouTubeApi().then((YT) => { if (!alive || !hostRef.current) return; playerRef.current?.destroy(); playerRef.current = new YT.Player(hostRef.current, { videoId, playerVars: { playsinline: 1, rel: 0, modestbranding: 1 }, events: { onStateChange: (event) => { const next = stateNames[event.data] ?? 'unstarted'; setState(next); onState?.(next); } } }); }).catch(() => { if (alive) setState('unstarted'); });
    return () => { alive = false; playerRef.current?.destroy(); playerRef.current = null; };
  }, [videoId, onState]);
  useEffect(() => { const timer = window.setInterval(() => { const current = playerRef.current?.getCurrentTime?.(); if (typeof current === 'number' && Number.isFinite(current)) { setTime(current); onTime?.(current); } }, 100); return () => window.clearInterval(timer); }, [onTime]);
  const jump = (delta: number) => playerRef.current?.seekTo(Math.max(0, time + delta), true);
  return <div className="yt-wrap"><div className={compact ? 'yt-frame compact' : 'yt-frame'} ref={hostRef} /><div className="yt-controls"><span className="timecode">{time.toFixed(2)}s</span><button onClick={() => playerRef.current?.playVideo()} type="button">▶ 再生</button><button onClick={() => playerRef.current?.pauseVideo()} type="button">⏸ 一時停止</button><button onClick={() => jump(-0.1)} type="button">−0.1s</button><button onClick={() => jump(0.1)} type="button">＋0.1s</button><span className="player-state">{state}</span></div></div>;
}
