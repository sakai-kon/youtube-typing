-- Canonical schema for the YouTube Typing Supabase project.
-- This file mirrors the production migration applied to project kfoaphvuwhksdpclfzna.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maps (
  id text primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  lines jsonb not null default '[]'::jsonb,
  play_count bigint not null default 0 check (play_count >= 0),
  favorite_count bigint not null default 0 check (favorite_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maps_lines_is_array check (jsonb_typeof(lines) = 'array')
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  map_id text not null references public.maps(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, map_id)
);

create table public.play_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  map_id text not null references public.maps(id) on delete cascade,
  accuracy numeric(5,2) check (accuracy is null or (accuracy >= 0 and accuracy <= 100)),
  miss_count integer not null default 0 check (miss_count >= 0),
  kpm numeric(10,2) check (kpm is null or kpm >= 0),
  played_at timestamptz not null default now()
);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  map_id text not null references public.maps(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 1 and 100),
  details text not null default '' check (char_length(details) <= 5000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index maps_visibility_updated_at_idx on public.maps(visibility, updated_at desc);
create index maps_author_idx on public.maps(author_id);
create index maps_tags_gin_idx on public.maps using gin(tags);
create index favorites_map_idx on public.favorites(map_id);
create index play_history_user_played_at_idx on public.play_history(user_id, played_at desc);
create index play_history_map_played_at_idx on public.play_history(map_id, played_at desc);
create index reports_status_created_at_idx on public.reports(status, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger maps_set_updated_at before update on public.maps for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, display_name) values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))) on conflict (id) do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'); $$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.record_play(p_map_id text, p_accuracy numeric default null, p_miss_count integer default 0, p_kpm numeric default null) returns bigint language plpgsql security definer set search_path = public as $$ declare actor uuid := auth.uid(); history_id bigint; begin if actor is null then raise exception 'not authenticated' using errcode = '28000'; end if; if not exists (select 1 from public.maps where id = p_map_id and (visibility in ('public','unlisted') or author_id = actor)) then raise exception 'map not accessible' using errcode = '42501'; end if; insert into public.play_history (user_id, map_id, accuracy, miss_count, kpm) values (actor, p_map_id, p_accuracy, greatest(coalesce(p_miss_count, 0), 0), p_kpm) returning id into history_id; update public.maps set play_count = play_count + 1 where id = p_map_id; return history_id; end; $$;
grant execute on function public.record_play(text,numeric,integer,numeric) to authenticated;

create or replace function public.adjust_favorite_count() returns trigger language plpgsql security definer set search_path = public as $$ begin if tg_op = 'INSERT' then update public.maps set favorite_count = favorite_count + 1 where id = new.map_id; return new; elsif tg_op = 'DELETE' then update public.maps set favorite_count = greatest(favorite_count - 1, 0) where id = old.map_id; return old; end if; return null; end; $$;
create trigger favorites_adjust_count after insert or delete on public.favorites for each row execute function public.adjust_favorite_count();

revoke execute on function public.adjust_favorite_count() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.record_play(text,numeric,integer,numeric) from anon;

alter table public.profiles enable row level security;
alter table public.maps enable row level security;
alter table public.favorites enable row level security;
alter table public.play_history enable row level security;
alter table public.reports enable row level security;

create policy profiles_public_read on public.profiles for select using (true);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id and role = 'user');
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id or (select public.is_admin())) with check ((select public.is_admin()) or ((select auth.uid()) = id and role = 'user'));
create policy profiles_admin_delete on public.profiles for delete to authenticated using ((select public.is_admin()));

create policy maps_read_visible on public.maps for select using (visibility in ('public','unlisted') or (select auth.uid()) = author_id or (select public.is_admin()));
create policy maps_insert_own on public.maps for insert to authenticated with check ((select auth.uid()) = author_id);
create policy maps_update_owner_or_admin on public.maps for update to authenticated using ((select auth.uid()) = author_id or (select public.is_admin())) with check ((select auth.uid()) = author_id or (select public.is_admin()));
create policy maps_delete_owner_or_admin on public.maps for delete to authenticated using ((select auth.uid()) = author_id or (select public.is_admin()));

create policy favorites_own on public.favorites for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy history_own_read on public.play_history for select to authenticated using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy reports_insert_own on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy reports_read_own_or_admin on public.reports for select to authenticated using ((select auth.uid()) = reporter_id or (select public.is_admin()));
create policy reports_update_admin on public.reports for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy reports_delete_admin on public.reports for delete to authenticated using ((select public.is_admin()));

revoke insert on public.play_history from authenticated;
revoke insert, update, delete on public.reports from anon;
revoke insert, update, delete on public.maps from anon;
revoke insert, update, delete on public.favorites from anon;
