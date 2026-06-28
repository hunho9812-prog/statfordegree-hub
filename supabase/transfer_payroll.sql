-- ================================================================
-- 자동이체(debit_items) + 인건비(labor_items) 테이블 생성
-- 장부(ledger) RLS + 스키마 변경 (팀 전체 공유)
-- Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- ================================================================

-- ================================================================
-- [1] 자동이체
-- ================================================================
create table if not exists public.debit_items (
  id         text    primary key,
  vendor     text    not null default '',
  day        int     not null check (day between 1 and 31),
  amount     numeric not null default 0,
  currency   text    not null default 'KRW' check (currency in ('KRW','USD')),
  created_at timestamptz not null default now()
);

alter table public.debit_items enable row level security;

drop policy if exists "debit_items_approved" on public.debit_items;
create policy "debit_items_approved" on public.debit_items
  for all using (public.is_approved());

alter publication supabase_realtime add table public.debit_items;


-- ================================================================
-- [2] 인건비
-- ================================================================
create table if not exists public.labor_items (
  id         text    primary key,
  month      text    not null default '',
  name       text    not null default '',
  ssn        text    not null default '',
  account    text    not null default '',
  pay        numeric not null default 0,
  tax33      numeric not null default 0,
  tax3       numeric not null default 0,
  local      numeric not null default 0,
  net        numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.labor_items enable row level security;

drop policy if exists "labor_items_approved" on public.labor_items;
create policy "labor_items_approved" on public.labor_items
  for all using (public.is_approved());

alter publication supabase_realtime add table public.labor_items;


-- ================================================================
-- [3] 장부 RLS → 팀 전체 공유 + 스키마 변경
-- ================================================================

-- 기존 RLS 정책 제거
drop policy if exists "Users can manage their own ledger" on public.ledger;
drop policy if exists "ledger_approved" on public.ledger;

-- user_id 기반 unique 제약 제거 후 (year, month)으로 재생성
alter table public.ledger drop constraint if exists ledger_user_id_year_month_key;
alter table public.ledger add constraint ledger_year_month_key unique (year, month);

-- user_id 컬럼 제거 (팀 공유이므로 불필요)
alter table public.ledger drop column if exists user_id;

-- 팀 전체 공유 정책 추가
create policy "ledger_approved" on public.ledger
  for all using (public.is_approved());
