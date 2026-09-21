-- ════════════════════════════════════════════════════════════════
-- One Thing — database
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to run again: every statement is guarded.
--
-- One row per person, holding their whole state as JSON. That is a
-- deliberate choice for a beta: sync is a single read and a single
-- write, there is no schema to migrate when the app changes shape, and
-- the merge rules live in one readable place (sync.js) instead of
-- being smeared across eight tables. The relational schema in
-- ARCHITECTURE.md is where this goes when the beta is over.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  doc        jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Four policies, one per operation, each saying the same thing: this row
-- is yours or it does not exist as far as you are concerned. The anon key
-- in config.js can do nothing beyond what these allow.
drop policy if exists app_state_select on public.app_state;
create policy app_state_select on public.app_state
  for select using (auth.uid() = user_id);

drop policy if exists app_state_insert on public.app_state;
create policy app_state_insert on public.app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists app_state_update on public.app_state;
create policy app_state_update on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists app_state_delete on public.app_state;
create policy app_state_delete on public.app_state
  for delete using (auth.uid() = user_id);

-- updated_at is maintained here rather than trusted from the client.
create or replace function public.app_state_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch
  before insert or update on public.app_state
  for each row execute function public.app_state_touch();

-- A person's row should exist from the moment they sign up, so the first
-- sync is an update rather than a race between two devices inserting.
create or replace function public.app_state_seed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_state (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_app_state on auth.users;
create trigger on_auth_user_created_app_state
  after insert on auth.users
  for each row execute function public.app_state_seed();

-- Lets a signed-in device hear about another device's change the moment it
-- lands, instead of waiting out the poll in sync.js. Row Level Security
-- still applies — a client only ever receives change notifications for
-- rows it could have read anyway. Guarded because, unlike the statements
-- above, "alter publication ... add table" errors on a second run rather
-- than quietly doing nothing.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;
