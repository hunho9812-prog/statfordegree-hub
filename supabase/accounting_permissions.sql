-- Add accounting_access column to team_members table
alter table public.team_members add column if not exists accounting_access boolean not null default false;

-- Admin always has access (handled in code), this is for granting non-admin members access
