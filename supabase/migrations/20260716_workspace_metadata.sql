-- SiteFlow workspace metadata foundation.
-- Additive only: existing role and access_scope behavior remains valid.

alter table public.memberships
  add column if not exists workspace_type text,
  add column if not exists portal_role text;

update public.memberships
set workspace_type = case
  when lower(trim(coalesce(role, ''))) in (
    'consultant',
    'architect',
    'architectural_consultant',
    'structural_consultant',
    'mep_consultant',
    'quantity_surveyor',
    'external_project_manager'
  ) then 'consultant'
  when lower(trim(coalesce(role, ''))) in (
    'contractor',
    'subcontractor'
  ) then 'contractor'
  when lower(trim(coalesce(role, ''))) in (
    'vendor',
    'supplier'
  ) then 'vendor'
  else 'internal'
end
where workspace_type is null;

update public.memberships
set portal_role = role
where portal_role is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_workspace_type_check'
  ) then
    alter table public.memberships
      add constraint memberships_workspace_type_check
      check (
        workspace_type is null or
        workspace_type in ('internal', 'consultant', 'contractor', 'vendor')
      );
  end if;
end $$;

create index if not exists memberships_workspace_type_idx
  on public.memberships (workspace_type);

comment on column public.memberships.workspace_type is
  'Top-level SiteFlow experience: internal, consultant, contractor, or vendor.';

comment on column public.memberships.portal_role is
  'Workspace-specific role label, retained separately from the legacy role field.';
