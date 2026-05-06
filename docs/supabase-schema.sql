-- Run this in Supabase SQL Editor (once)
-- Dashboard → SQL Editor → New query → paste → Run

-- ──────────────────────────────────────────────
-- Tables
-- ──────────────────────────────────────────────

create table if not exists books (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  drive_folder_id text not null,
  title           text not null,
  cover_url       text,
  created_at      timestamptz not null default now(),
  last_played_at  timestamptz,
  unique (user_id, drive_folder_id)
);

create index if not exists books_user_last_played_idx
  on books (user_id, last_played_at desc nulls last);

create table if not exists playback_positions (
  book_id          uuid not null references books(id) on delete cascade,
  drive_file_id    text not null,
  position_seconds double precision not null default 0,
  duration_seconds double precision,
  updated_at       timestamptz not null default now(),
  primary key (book_id, drive_file_id)
);

create table if not exists current_session (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  book_id       uuid references books(id) on delete set null,
  drive_file_id text,
  updated_at    timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- Row-Level Security
-- ──────────────────────────────────────────────

alter table books enable row level security;
drop policy if exists books_owner on books;
create policy books_owner on books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table current_session enable row level security;
drop policy if exists session_owner on current_session;
create policy session_owner on current_session
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table playback_positions enable row level security;
drop policy if exists positions_owner on playback_positions;
create policy positions_owner on playback_positions
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );
