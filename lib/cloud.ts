import type { MapLine, TypingMap } from './types';
import { getSupabase } from './supabase/client';
import type { Database } from './supabase/database.types';

type MapRow = { id: string; author_id: string; title: string; description: string; youtube_video_id: string; tags: string[]; visibility: string; lines: unknown; play_count: number; favorite_count: number; created_at: string; updated_at: string };

type CopyrightRequestRow = {
  id: number;
  map_id: string | null;
  map_url: string;
  reason: string;
  details: string;
  contact: string | null;
  requester_id: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

function normalizeLines(value: unknown): MapLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((line): line is Record<string, unknown> => !!line && typeof line === 'object')
    .map((line) => {
      const startTime = Number(line.startTime ?? 0);
      const endTime = line.endTime == null ? null : Number(line.endTime);
      return {
        id: String(line.id ?? crypto.randomUUID()),
        text: String(line.text ?? ''),
        reading: String(line.reading ?? ''),
        startTime: Number.isFinite(startTime) ? Math.max(0, startTime) : 0,
        ...(endTime == null ? {} : { endTime: Number.isFinite(endTime) ? Math.max(0, endTime) : 0 }),
      };
    })
    .filter((line) => !!line.text && !!line.reading);
}

export function rowToMap(row: MapRow): TypingMap {
  return { id: row.id, authorId: row.author_id, title: row.title, description: row.description, youtubeVideoId: row.youtube_video_id, tags: row.tags ?? [], visibility: row.visibility as TypingMap['visibility'], createdAt: row.created_at, updatedAt: row.updated_at, playCount: Number.isFinite(Number(row.play_count)) ? Number(row.play_count) : 0, lines: normalizeLines(row.lines) };
}

export function mapToRow(map: TypingMap, authorId: string) {
  return { id: map.id, author_id: authorId, title: map.title.trim(), description: map.description.trim(), youtube_video_id: map.youtubeVideoId, tags: map.tags, visibility: map.visibility, lines: map.lines };
}

export async function getPublicMaps(query = ''): Promise<TypingMap[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from('maps').select('*').eq('visibility', 'public').order('updated_at', { ascending: false }).limit(1000);
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

export async function submitCopyrightRequest(input: {
  mapUrl: string;
  mapId?: string | null;
  reason: string;
  details: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: '現在は申立てを送信できません。Supabaseが設定されていません。' };
  const { data: { user } } = await supabase.auth.getUser();
  const payload: Database['public']['Tables']['copyright_requests']['Insert'] = {
    map_url: input.mapUrl.trim(),
    map_id: input.mapId?.trim() || null,
    reason: input.reason.trim(),
    details: input.details.trim(),
    requester_id: user?.id ?? null,
  };
  const { error } = await supabase.from('copyright_requests').insert(payload);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export type CopyrightRequest = CopyrightRequestRow;

export async function getCopyrightRequests(): Promise<CopyrightRequest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from('copyright_requests').select('*').order('created_at', { ascending: false }).limit(200);
  return error || !data ? [] : data as CopyrightRequest[];
}

export async function updateCopyrightRequest(id: number, status: 'pending' | 'reviewing' | 'resolved' | 'rejected'): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabaseが設定されていません。' };
  const { error } = await supabase.from('copyright_requests').update({ status, resolved_at: status === 'resolved' || status === 'rejected' ? new Date().toISOString() : null }).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
