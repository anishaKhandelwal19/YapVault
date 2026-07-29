-- Tech Knowledge Vault — Supabase schema for local→cloud card sync
-- Run in: Supabase → SQL Editor
-- Columns match saveCard / syncLocalCardsToCloud / parseSyncedCard in src/utils/storage.ts

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  definition text not null default '',
  how_it_works text not null default '',
  use_cases jsonb not null default '[]'::jsonb,
  interview_questions jsonb not null default '[]'::jsonb,
  common_mistakes jsonb default '[]'::jsonb,
  related_concepts jsonb not null default '[]'::jsonb,
  ai_chat_summary text,
  ai_chat_detail text,
  created_at timestamptz not null default now(),
  last_revised_at timestamptz
);

create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_created_at_idx on public.cards (created_at desc);

alter table public.cards enable row level security;

drop policy if exists "Users can manage their own cards" on public.cards;
create policy "Users can manage their own cards"
  on public.cards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_profiles (streak)
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  streak int not null default 0,
  last_revised_date date
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile"
  on public.user_profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- If you previously created a wrong cards table with (question, answer) only:
--   drop table public.cards cascade;
-- then re-run this file.
-- ---------------------------------------------------------------------------
