-- Add manual_access and crm_access columns to team_members table
alter table public.team_members add column if not exists manual_access boolean not null default false;
alter table public.team_members add column if not exists crm_access boolean not null default false;

-- Admin always has access (handled in code), these are for granting non-admin members access
