-- Run once in the EXISTING Productivity App Supabase project, before deploying the updated app-api.
-- Learning Tracker state is deliberately isolated from public.app_states.
create table if not exists public.learning_tracker_states (
  account_id uuid primary key references public.app_accounts(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now()
);
create index if not exists learning_tracker_states_updated_idx on public.learning_tracker_states(updated_at desc);
alter table public.learning_tracker_states enable row level security;
-- No anon/authenticated read/write policies; requests must pass the existing Edge Function session verifier.
revoke all on public.learning_tracker_states from anon, authenticated;
