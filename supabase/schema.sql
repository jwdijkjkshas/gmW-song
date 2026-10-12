-- Run once in Supabase → SQL Editor.
create table if not exists public.liked_tracks (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  track_id   text not null,
  track      jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table if not exists public.playlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  tracks     jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.liked_tracks enable row level security;
alter table public.playlists    enable row level security;

create policy "own likes" on public.liked_tracks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own playlists" on public.playlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
