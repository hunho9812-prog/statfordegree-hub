-- ================================================================
-- 스탯포디그리 — 콘텐츠 관리 장부 (회계 장부 `ledger`/`fluento_ledger`와 동일한
-- 연/월 단위 요약 구조, 완전히 분리된 신규 테이블)
-- 사용법: Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- 주의: 추가형(additive) 마이그레이션만 포함 — 기존 테이블은 전혀 건드리지 않음
-- ================================================================

create table if not exists public.content_ledger (
  id                   uuid primary key default gen_random_uuid(),
  year                 int  not null,
  month                int  not null,
  sales                bigint not null default 0,
  labor_cost           bigint not null default 0,
  business_cost        bigint not null default 0,
  non_operating_income bigint not null default 0,
  profit               bigint not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(year, month)
);

alter table public.content_ledger enable row level security;

drop policy if exists "content_ledger_approved" on public.content_ledger;
create policy "content_ledger_approved" on public.content_ledger
  for all using (public.is_approved());

alter publication supabase_realtime add table public.content_ledger;

-- ================================================================
-- 참고: 이전에 만들었던 행 단위 테이블 `content_ledger_entries`는
-- 더 이상 사용하지 않습니다. 데이터가 없다면 Supabase Dashboard에서
-- 직접 삭제하셔도 되고, 그냥 비워둔 채 두셔도 서비스에는 영향 없습니다.
-- (안전 수칙상 이 마이그레이션에서 DROP은 실행하지 않습니다.)
-- ================================================================
