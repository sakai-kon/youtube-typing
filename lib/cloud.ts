import type { MapLine, TypingMap } from './types';
import { getSupabase } from './supabase/client';

type MapRow = { id: string; author_id: string; title: string; description: string; youtube_video_id: string; tags: string[]; visibility: string; lines: unknown; created_at: string; updated_at: string };

function normalizeLines(value: unknown): MapLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter((line): line is Record<string, unknown> => !!line && typeof line === 'object').map((line) => ({
    id: String(line.id ?? crypto.randomUUID()), text: String(line.text ?? ''), reading: String(line.reading ?? ''), startTime: Math.max(0, Number(line.startTime ?? 0)),
    ...(line.endTime == null ? {} : { endTime: Math.max(0, Number(line.endTime)) }),
  }));
}

export function rowToMap(row: MapRow): TypingMap {
  return { id: row.id, authorId: row.author_id, title: row.title, description: row.description, youtubeVideoId: row.youtube_video_id, tags: row.tags ?? [], visibility: row.visibility as TypingMap['visibility'], createdAt: row.created_at, updatedAt: row.updated_at, lines: normalizeLines(row.lines) };
}

export function mapToRow(map: TypingMap, authorId: string) {
  return { id: map.id, author_id: authorId, title: map.title.trim(), description: map.description.trim(), youtube_video_id: map.youtubeVideoId, tags: map.tags, visibility: map.visibility, lines: map.lines };
}

export async function getPublicMaps(query = ''): Promise<TypingMap[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from('maps').select('*').eq('visibility', 'public').order('updated_at', { ascending: false }).limit(100);
  if (error || !data) return [];
  const q = query.trim().toLowerCase();
  return (data as MapRow[]).map(rowToMap).filter((map) => !q || `${map.title} ${map.description} ${map.tags.join(' ')}`.toLowerCase().includes(q));
}

export async function getMap(id: string): Promise<TypingMap | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('maps').select('*').eq('id', id).maybeSingle();
  return error || !data ? null : rowToMap(data as MapRow);
}

export async function getMyMaps(): Promise<TypingMap[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('maps').select('*').eq('author_id', user.id).order('updated_at', { ascending: false });
  return error || !data ? [] : (data as MapRow[]).map(rowToMap);
}

export async function upsertMap(map: TypingMap): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabaseが設定されていません。' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '公開保存にはログインが必要です。' };
  const { error } = await supabase.from('maps').upsert(mapToRow(map, user.id));
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteCloudMap(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('maps').delete().eq('id', id);
  return !error;
}

export async function recordPlay(mapId: string, accuracy: number, missCount: number, kpm: number): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('play_history').insert({ user_id: user.id, map_id: mapId, accuracy, miss_count: missCount, kpm });
  return !error;
}

export async function toggleFavorite(mapId: string): Promise<{ ok: boolean; favorite: boolean }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, favorite: false };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, favorite: false };
  const { data: existing } = await supabase.from('favorites').select('map_id').eq('user_id', user.id).eq('map_id', mapId).maybeSingle();
  if (existing) { const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('map_id', mapId); return { ok: !error, favorite: false }; }
  const { error } = await supabase.from('favorites').insert({ user_id: user.id, map_id: mapId });
  return { ok: !error, favorite: true };
}

export async function isFavorite(mapId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('favorites').select('map_id').eq('user_id', user.id).eq('map_id', mapId).maybeSingle();
  return !!data;
}

export async function submitReport(mapId: string, reason: string, details: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabaseが設定されていません。' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '通報にはログインが必要です。' };
  const { error } = await supabase.from('reports').insert({ reporter_id: user.id, map_id: mapId, reason: reason.trim(), details: details.trim() });
  return error ? { ok: false, error: error.message } : { ok: true };
}
