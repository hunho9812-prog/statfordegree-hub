-- ================================================================
-- Migration v3 — 고객관리양식 체크박스 컬럼 동적 컬럼 시스템 전환
-- 적용 완료: stathub 프로젝트(ltuqoeupydlkoxbpwbwz), 2026-07-17
-- ================================================================
-- 하드코딩되어 있던 review_proposed / balance_received / kmong_review /
-- kakao_review / cash_receipt 5개 boolean 컬럼을 customers.custom_fields
-- (jsonb)로 이전하고, 컬럼 메타데이터(이름/순서/타입)를 별도 테이블
-- table_columns 로 분리합니다. 실행 전 반드시 customers 테이블을 백업하세요.

-- ── [1] 백업 (필수) ────────────────────────────────────────────────
create table if not exists public.customers_backup_20260717 as
  select * from public.customers;

-- ── [2] custom_fields 컬럼 추가 + 기존 값 백필 ─────────────────────
alter table public.customers
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

update public.customers
set custom_fields = jsonb_build_object(
  'review_proposed', coalesce(review_proposed, false),
  'balance_received', coalesce(balance_received, false),
  'kmong_review', coalesce(kmong_review, false),
  'kakao_review', coalesce(kakao_review, false),
  'cash_receipt', coalesce(cash_receipt, false)
)
where custom_fields = '{}'::jsonb;

-- ── [3] 백필 검증 (0건이어야 다음 단계로 진행 가능) ─────────────────
-- select count(*) as mismatches from public.customers
-- where (custom_fields->>'review_proposed')::boolean is distinct from review_proposed
--    or (custom_fields->>'balance_received')::boolean is distinct from balance_received
--    or (custom_fields->>'kmong_review')::boolean is distinct from kmong_review
--    or (custom_fields->>'kakao_review')::boolean is distinct from kakao_review
--    or (custom_fields->>'cash_receipt')::boolean is distinct from cash_receipt;

-- ── [4] 검증 통과 후 기존 고정 컬럼 제거 ────────────────────────────
alter table public.customers
  drop column if exists review_proposed,
  drop column if exists balance_received,
  drop column if exists kmong_review,
  drop column if exists kakao_review,
  drop column if exists cash_receipt;

-- ── [5] 컬럼 메타데이터 테이블 생성 + RLS + realtime ────────────────
create table if not exists public.table_columns (
  id         text primary key,
  label      text not null default '',
  type       text not null default 'checkbox' check (type in ('checkbox')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.table_columns enable row level security;

drop policy if exists "table_columns_approved" on public.table_columns;
create policy "table_columns_approved" on public.table_columns
  for all using (public.is_approved());

alter publication supabase_realtime add table public.table_columns;

-- ── [6] 기존 5개 컬럼 메타데이터 시드 ────────────────────────────────
insert into public.table_columns (id, label, type, sort_order) values
  ('review_proposed', '후기제안', 'checkbox', 0),
  ('balance_received', '잔금받음?', 'checkbox', 1),
  ('kmong_review', '크몽후기', 'checkbox', 2),
  ('kakao_review', '카톡후기', 'checkbox', 3),
  ('cash_receipt', '현금영수증', 'checkbox', 4)
on conflict (id) do nothing;

-- ── [7] 백업 테이블 정리 ─────────────────────────────────────────────
-- 마이그레이션 결과를 충분히 확인한 뒤 아래 주석을 해제해 백업을 정리하세요.
-- drop table if exists public.customers_backup_20260717;
