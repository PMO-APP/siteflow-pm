create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  portfolio_id uuid null,
  project_id uuid null,
  event_type text not null,
  module text not null,
  title text not null,
  description text null,
  entity_type text null,
  entity_id text null,
  route text null,
  severity text not null default 'info'
    check (severity in ('info', 'success', 'warning', 'critical')),
  actor_id uuid null,
  actor_name text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_project_created_idx
  on public.activity_log (project_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "authenticated users can read activity log"
on public.activity_log;

create policy "authenticated users can read activity log"
on public.activity_log for select to authenticated using (true);

drop policy if exists "authenticated users can insert activity log"
on public.activity_log;

create policy "authenticated users can insert activity log"
on public.activity_log for insert to authenticated with check (true);
