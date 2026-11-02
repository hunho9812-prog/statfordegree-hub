-- ================================================================
-- 스탯포디그리 — 콘텐츠 관리 장부 (기존 회계 장부 `ledger`와 완전히 분리된 신규 테이블)
-- 사용법: Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- 주의: 추가형(additive) 마이그레이션만 포함 — 기존 테이블은 전혀 건드리지 않음
-- ================================================================

create table if not exists public.content_ledger_entries (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  type       text not null check (type in ('income', 'expense')),
  item       text not null default '',
  channel    text not null default '',
  amount     bigint not null default 0,
  memo       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_ledger_entries enable row level security;

drop policy if exists "content_ledger_entries_approved" on public.content_ledger_entries;
create policy "content_ledger_entries_approved" on public.content_ledger_entries
  for all using (public.is_approved());

alter publication supabase_realtime add table public.content_ledger_entries;
