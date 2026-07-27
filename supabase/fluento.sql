-- ================================================================
-- 플루엔토(Fluento) — 손익분기점 페이지용 테이블
-- 사용법: Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- ================================================================

-- ================================================================
-- [1] fluento_cost_entries (투자비용 내역)
-- ================================================================
create table if not exists public.fluento_cost_entries (
  id         uuid primary key default gen_random_uuid(),
  year       int  not null,
  month      int  not null,
  desc_text  text not null default '',
  amount     bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.fluento_cost_entries enable row level security;

drop policy if exists "fluento_cost_entries_approved" on public.fluento_cost_entries;
create policy "fluento_cost_entries_approved" on public.fluento_cost_entries
  for all using (public.is_approved());

alter publication supabase_realtime add table public.fluento_cost_entries;

-- ================================================================
-- [2] fluento_ledger (월별 매출/비용 장부)
-- ================================================================
create table if not exists public.fluento_ledger (
  id            uuid primary key default gen_random_uuid(),
  year          int  not null,
  month         int  not null,
  sales         bigint not null default 0,
  labor_cost    bigint not null default 0,
  business_cost bigint not null default 0,
  profit        bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(year, month)
);

alter table public.fluento_ledger enable row level security;

drop policy if exists "fluento_ledger_approved" on public.fluento_ledger;
create policy "fluento_ledger_approved" on public.fluento_ledger
  for all using (public.is_approved());

alter publication supabase_realtime add table public.fluento_ledger;
