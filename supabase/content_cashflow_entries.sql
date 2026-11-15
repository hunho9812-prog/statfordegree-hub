-- ================================================================
-- 콘텐츠 관리 — 현금흐름표 (수입/지출을 건별로 기록, 거래 기록과는 별도 독립 테이블)
-- 사용법: Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- ================================================================

create table if not exists public.content_cashflow_entries (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('income', 'expense')),
  amount      bigint not null check (amount > 0),
  occurred_on date not null,
  memo        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists content_cashflow_entries_occurred_on_idx
  on public.content_cashflow_entries (occurred_on desc);

alter table public.content_cashflow_entries enable row level security;

drop policy if exists "content_cashflow_entries_approved" on public.content_cashflow_entries;
create policy "content_cashflow_entries_approved" on public.content_cashflow_entries
  for all using (public.is_approved());

alter publication supabase_realtime add table public.content_cashflow_entries;

-- ================================================================
-- 참고: 기존 content_ledger 테이블(월별 매출/비용 요약 장부)은 더 이상
-- "현금흐름표" 화면에서 쓰이지 않습니다. 데이터가 필요 없다면 Supabase
-- Dashboard에서 직접 삭제해도 되고, 그냥 비워둔 채 두셔도 서비스에는
-- 영향 없습니다.
-- ================================================================
