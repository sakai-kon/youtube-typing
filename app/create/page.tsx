'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { YouTubePlayer } from '@/components/youtube-player';
import { exportMap, findMap, makeId, saveMap } from '@/lib/storage';
import { getMap, upsertMap } from '@/lib/cloud';
import { getSupabase } from '@/lib/supabase/client';
import type { MapLine, TypingMap } from '@/lib/types';

const VIDEO_ID = /^[\w-]{11}$/;

/** URL（watch / youtu.be / embed / shorts / live）または 11 文字の動画IDから動画IDを取り出す。取れなければ空文字。 */
function extractVideoId(value: string): string {
  const input = value.trim();
  if (VIDEO_ID.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? '';
    else if (host.endsWith('youtube.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      id = url.searchParams.get('v') || (['embed', 'shorts', 'live', 'v'].includes(parts[0]) ? parts[1] ?? '' : '');
    }
    return VIDEO_ID.test(id) ? id : '';
  } catch {
    return '';
  }
}

const blank = (): TypingMap => ({ id: makeId(), authorId: 'local', title: '', description: '', youtubeVideoId: '', tags: [], visibility: 'private', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lines: [] });

function isValidImportedMap(value: unknown): value is TypingMap {
  if (!value || typeof value !== 'object') return false;
  const map = value as Partial<TypingMap>;
  if (typeof map.title !== 'string' || !map.title.trim()) return false;
  if (typeof map.youtubeVideoId !== 'string' || !map.youtubeVideoId.trim()) return false;
  if (!Array.isArray(map.lines)) return false;
  return map.lines.every((line) => {
    if (!line || typeof line !== 'object') return false;
    const item = line as Partial<MapLine>;
    return typeof item.text === 'string' && !!item.text.trim() && typeof item.reading === 'string' && !!item.reading.trim() && Number.isFinite(Number(item.startTime)) && Number(item.startTime) >= 0 && (item.endTime == null || (Number.isFinite(Number(item.endTime)) && Number(item.endTime) >= 0));
  });
}

export default function CreatePage() {
  const [map, setMap] = useState<TypingMap>(blank);
  const [videoInput, setVideoInput] = useState('');
  const [time, setTime] = useState(0);
  const [text, setText] = useState('');
  const [reading, setReading] = useState('');
  const [saved, setSaved] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    const id = new URLSearchParams(window.location.search).get('edit');
    setEditId(id);
    const run = async () => {
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (alive) { setLoggedIn(!!data.user); setUserId(data.user?.id ?? null); }
      }
      if (!id) return;
      if (alive) setLoadingEdit(true);
      const local = findMap(id);
      if (local && alive) { setMap(local); setVideoInput(local.youtubeVideoId); }
      const cloud = await getMap(id);
      if (cloud && alive) { setMap(cloud); setVideoInput(cloud.youtubeVideoId); }
      if (alive) setLoadingEdit(false);
    };
    void run();
    return () => { alive = false; };
  }, []);

  // 新規作成、またはローカル譜面、または自分がクラウド上の作者である場合のみ編集できる
  const canEdit = !editId || map.authorId === 'local' || (!!userId && map.authorId === userId);
  const ready = VIDEO_ID.test(map.youtubeVideoId);
  const sorted = useMemo(() => [...map.lines].sort((a, b) => a.startTime - b.startTime), [map.lines]);
  const touch = () => new Date().toISOString();

  const update = (patch: Partial<TypingMap>) => {
    if (!canEdit) return;
    setMap((m) => ({ ...m, ...patch, updatedAt: touch() }));
    setSaved('');
  };

  const changeVideo = (value: string) => {
    setVideoInput(value);
    update({ youtubeVideoId: extractVideoId(value) });
  };

  const addLine = () => {
    if (!canEdit || !text.trim() || !reading.trim()) return;
    const startTime = Number(time.toFixed(2));
    if (map.lines.some((line) => Math.abs(line.startTime - startTime) < 0.005)) {
      setSaved('同じ時刻の行は登録できません。少し時間をずらしてください。');
      return;
    }
    const line: MapLine = { id: makeId(), text: text.trim(), reading: reading.trim(), startTime };
    setMap((m) => ({ ...m, lines: [...m.lines, line], updatedAt: touch() }));
    setText(''); setReading(''); setSaved('');
  };

  const updateLine = (id: string, patch: Partial<MapLine>) => {
    if (!canEdit) return;
    if (patch.startTime != null) {
      const numeric = Number(patch.startTime);
      if (!Number.isFinite(numeric) || numeric < 0) return;
      const nextTime = Number(numeric.toFixed(2));
      if (map.lines.some((line) => line.id !== id && Math.abs(line.startTime - nextTime) < 0.005)) {
        setSaved('同じ時刻の行は設定できません。少し時間をずらしてください。');
        return;
      }
      patch = { ...patch, startTime: nextTime };
    }
    setMap((m) => ({ ...m, lines: m.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)), updatedAt: touch() }));
    setSaved('');
  };

  const removeLine = (id: string) => {
    if (!canEdit) return;
    setMap((m) => ({ ...m, lines: m.lines.filter((line) => line.id !== id), updatedAt: touch() }));
    setSaved('');
  };

  const save = async () => {
    if (!canEdit) { setSaved('この譜面は作者のみ編集できます。'); return; }
    if (!map.title.trim() || !ready || !map.lines.length) { setSaved('タイトル・動画・1行以上の譜面が必要です。'); return; }
    // ログインしていない場合は非公開でしか保存できない
    const target: TypingMap = !loggedIn && map.visibility !== 'private' ? { ...map, visibility: 'private' } : map;
    saveMap(target);
    if (loggedIn) {
      const result = await upsertMap(map);
      setSaved(result.ok ? '保存しました。' : `このブラウザには保存しました（クラウド保存に失敗: ${result.error ?? '不明なエラー'}）`);
    } else if (map.visibility !== 'private') {
      setMap(target);
      setSaved('ログインしていないため、非公開として保存しました。');
    } else {
      setSaved('このブラウザに保存しました。');
    }
  };

  const importJson = (file?: File) => {
    if (!canEdit || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as unknown;
        if (!isValidImportedMap(imported)) throw new Error('invalid');
        const lines: MapLine[] = imported.lines.map((line) => ({
          ...line,
          id: line.id || makeId(),
          text: line.text.trim(),
          reading: line.reading.trim(),
          startTime: Number(Number(line.startTime).toFixed(2)),
          ...(line.endTime == null ? {} : { endTime: Number(Number(line.endTime).toFixed(2)) }),
        }));
        if (new Set(lines.map((line) => line.startTime.toFixed(2))).size !== lines.length) throw new Error('duplicate-time');
        const now = touch();
        setMap({
          id: makeId(),
          authorId: loggedIn && userId ? userId : 'local',
          title: imported.title.trim(),
          description: typeof imported.description === 'string' ? imported.description : '',
          youtubeVideoId: extractVideoId(imported.youtubeVideoId),
          tags: Array.isArray(imported.tags) ? imported.tags.filter((t): t is string => typeof t === 'string') : [],
          visibility: loggedIn && ['private', 'unlisted', 'public'].includes(imported.visibility) ? imported.visibility : 'private',
          createdAt: now,
          updatedAt: now,
          lines,
        });
        setVideoInput(imported.youtubeVideoId);
        setSaved('');
      } catch (error) {
        window.alert(error instanceof Error && error.message === 'duplicate-time' ? '同じ開始時刻の行が含まれているため読み込めません。' : '有効な譜面JSONではありません。');
      }
    };
    reader.readAsText(file);
  };

  return <>
    <SiteHeader />
    <main className="container section">
      <div className="page-head">
        <div><h1 className="page-title">譜面を作る</h1><p className="muted">動画を再生しながら、歌詞が始まる瞬間に行を登録します。</p></div>
        <div className="cta-row">
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={!canEdit}>JSON読み込み</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = ''; }} />
          <button className="btn" onClick={() => exportMap(map)}>JSON書き出し</button>
          <button className="btn primary" onClick={save} disabled={!canEdit}>保存</button>
        </div>
      </div>

      {loadingEdit && <p className="notice">譜面を確認しています…</p>}
      {!loadingEdit && !canEdit && <div className="notice">
        <b>この譜面は作者のみ編集できます。</b>
        <div className="cta-row"><Link className="btn primary" href={`/play/?id=${encodeURIComponent(map.id)}`}>プレイする</Link><Link className="btn" href="/search/">譜面を探す</Link></div>
      </div>}
      {saved && <p className="notice">{saved}</p>}

      {canEdit && <>
        <div className="form">
          <div className="form-row">
            <div className="field"><label htmlFor="title">タイトル</label><input id="title" value={map.title} onChange={(e) => update({ title: e.target.value })} placeholder="例：好きな曲タイピング" /></div>
            <div className="field"><label htmlFor="visibility">公開範囲</label>
              <select id="visibility" value={map.visibility} onChange={(e) => update({ visibility: e.target.value as TypingMap['visibility'] })}>
                <option value="private">非公開（自分だけ）</option>
                <option value="unlisted">共有（URLを知っている人）</option>
                <option value="public">公開（検索に表示）</option>
              </select></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="video">YouTube URL / 動画ID</label>
              <input id="video" value={videoInput} onChange={(e) => changeVideo(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
              {videoInput && !ready && <small className="error-inline">動画URLまたは11文字の動画IDを入力してください。</small>}</div>
            <div className="field"><label htmlFor="tags">タグ（カンマ区切り）</label><input id="tags" value={map.tags.join(', ')} onChange={(e) => update({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="J-POP, 練習" /></div>
          </div>
          <div className="field"><label htmlFor="description">説明</label><textarea id="description" value={map.description} onChange={(e) => update({ description: e.target.value })} placeholder="譜面の特徴や難易度など" maxLength={1000} /></div>
        </div>

        <div className="editor-grid">
          <section className="card">
            <h2>タイミング登録</h2>
            {ready ? <YouTubePlayer videoId={map.youtubeVideoId} onTime={setTime} nudge /> : <div className="empty">YouTube URLを入力すると動画が表示されます。</div>}
            <div className="form" style={{ marginTop: 14 }}>
              <div className="field"><label htmlFor="line-text">表示する文章</label><input id="line-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="今日も一日頑張ろう" /></div>
              <div className="field"><label htmlFor="line-reading">読み（ひらがな）</label><input id="line-reading" value={reading} onChange={(e) => setReading(e.target.value)} placeholder="きょうもいちにちがんばろう" /></div>
              <button className="btn primary" type="button" onClick={addLine} disabled={!ready || !text.trim() || !reading.trim()}>現在時刻（{time.toFixed(2)}s）で登録</button>
            </div>
          </section>

          <section className="card">
            <div className="toolbar"><h2>登録済み</h2><span className="spacer" /><span className="muted">{sorted.length}行</span></div>
            <div className="line-list">
              {sorted.map((line, idx) => <div className="line-item" key={line.id}>
                <div className="line-num">{String(idx + 1).padStart(2, '0')}</div>
                <div className="line-main">
                  <strong>{line.text}</strong><small>{line.reading}</small>
                  <div className="meta">
                    <button className="icon-btn" onClick={() => updateLine(line.id, { startTime: Math.max(0, line.startTime - 0.1) })}>−0.1</button>
                    <button className="icon-btn" onClick={() => updateLine(line.id, { startTime: line.startTime + 0.1 })}>+0.1</button>
                    <input className="time-input" aria-label="開始時間" type="number" min="0" step="0.01" value={line.startTime} onChange={(e) => updateLine(line.id, { startTime: Math.max(0, Number(e.target.value)) })} />
                  </div>
                </div>
                <div className="line-actions"><span className="line-time">{line.startTime.toFixed(2)}s</span><button className="icon-btn" onClick={() => removeLine(line.id)}>削除</button></div>
              </div>)}
              {!sorted.length && <div className="empty">まだ行がありません。</div>}
            </div>
          </section>
        </div>
      </>}
    </main>
  </>;
}
