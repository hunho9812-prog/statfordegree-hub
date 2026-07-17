-- ================================================================
-- Migration v4 — 레거시 체크박스 컬럼 호환성 복구 (긴급 수정)
-- 적용 완료: stathub 프로젝트(ltuqoeupydlkoxbpwbwz), 2026-07-17
-- ================================================================
-- 배경: migration_v3에서 review_proposed / balance_received / kmong_review /
-- kakao_review / cash_receipt 5개 컬럼을 삭제했으나, 같은 Supabase 프로젝트를
-- 공유하는 또 다른 브랜치(claude/wizardly-curie-cfhpib, 121 커밋 앞서 있으며
-- 실제 배포 중인 것으로 추정)의 프론트엔드 코드가 여전히 이 컬럼들을 그대로
-- 읽고 쓰고 있어, 고객 추가/수정이 전부 실패하는 심각한 회귀가 발생했습니다.
--
-- 이 마이그레이션은 해당 컬럼들을 다시 추가하고 custom_fields 값으로
-- 백필하여 두 브랜치가 당분간 함께 동작할 수 있게 합니다.
--
-- 주의: 이 시점부터 review_proposed 등 5개 컬럼과 custom_fields는 서로
-- 자동으로 동기화되지 않습니다 (각 브랜치가 자신의 스키마에만 씁니다).
-- 두 브랜치를 병합/정리한 뒤에는 반드시 하나로 통일하고 이 호환 컬럼을
-- 다시 정리해야 합니다.

alter table public.customers
  add column if not exists review_proposed boolean not null default false,
  add column if not exists balance_received boolean not null default false,
  add column if not exists kmong_review boolean not null default false,
  add column if not exists kakao_review boolean not null default false,
  add column if not exists cash_receipt boolean not null default false;

update public.customers
set
  review_proposed = coalesce((custom_fields->>'review_proposed')::boolean, false),
  balance_received = coalesce((custom_fields->>'balance_received')::boolean, false),
  kmong_review = coalesce((custom_fields->>'kmong_review')::boolean, false),
  kakao_review = coalesce((custom_fields->>'kakao_review')::boolean, false),
  cash_receipt = coalesce((custom_fields->>'cash_receipt')::boolean, false)
where custom_fields ? 'review_proposed'
   or custom_fields ? 'balance_received'
   or custom_fields ? 'kmong_review'
   or custom_fields ? 'kakao_review'
   or custom_fields ? 'cash_receipt';
