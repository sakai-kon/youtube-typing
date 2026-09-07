-- Phase 4+ schema for Supabase/PostgreSQL.
-- Apply in the Supabase SQL editor or through the project's migration workflow.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.maps (
  id text primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  youtube_video_id text not null,
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  lines jsonb not null default '[]'::jsonb,
  play_count bigint not null default 0,
  favorite_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  map_id text not null references public.maps(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, map_id)
);

create table if not exists public.play_history (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  map_id text not null references public.maps(id) on delete cascade,
  accuracy numeric,
  miss_count integer not null default 0,
  kpm numeric,
  played_at timestamptz not null default now()
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  map_id text not null references public.maps(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.maps enable row level security;
alter table public.favorites enable row level security;
alter table public.play_history enable row level security;
alter table public.reports enable row level security;

create policy "public profiles are readable" on public.profiles for select using (true);
create policy "users create their profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "users update their profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "public maps are readable" on public.maps for select using (visibility = 'public' or (select auth.uid()) = author_id);
create policy "users create maps" on public.maps for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "owners update maps" on public.maps for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "owners delete maps" on public.maps for delete to authenticated using ((select auth.uid()) = author_id);

create policy "users manage favorites" on public.favorites for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users read own history" on public.play_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "users write own history" on public.play_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users create reports" on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy "users read own reports" on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);

create index if not exists maps_visibility_updated_at_idx on public.maps(visibility, updated_at desc);
create index if not exists maps_author_idx on public.maps(author_id);
create index if not exists reports_status_created_at_idx on public.reports(status, created_at desc);
