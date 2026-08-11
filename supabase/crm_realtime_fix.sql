-- ================================================================
-- CRM 실시간 동기화 수정 마이그레이션
-- Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- ================================================================


-- ================================================================
-- [1] customers 테이블에 custom_fields 컬럼 추가 (없는 경우)
-- custom_fields: 동적으로 추가된 체크박스/텍스트 열 값을 저장하는 JSONB
-- ================================================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}';


-- ================================================================
-- [2] customers 테이블의 기존 boolean 열 제거 (custom_fields로 통합됨)
-- 기존 데이터가 있는 경우 custom_fields로 마이그레이션 후 제거
-- ================================================================
DO $$
BEGIN
  -- review_proposed → custom_fields에 포함됐으므로 제거
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='customers' AND column_name='review_proposed') THEN
    -- 기존 boolean 값을 custom_fields에 병합
    UPDATE public.customers
    SET custom_fields = custom_fields
      || jsonb_build_object('review_proposed', review_proposed)
      || jsonb_build_object('balance_received', balance_received)
      || jsonb_build_object('kmong_review', kmong_review)
      || jsonb_build_object('kakao_review', kakao_review)
    WHERE NOT (custom_fields ? 'review_proposed');

    ALTER TABLE public.customers DROP COLUMN IF EXISTS review_proposed;
    ALTER TABLE public.customers DROP COLUMN IF EXISTS balance_received;
    ALTER TABLE public.customers DROP COLUMN IF EXISTS kmong_review;
    ALTER TABLE public.customers DROP COLUMN IF EXISTS kakao_review;
  END IF;
END $$;


-- ================================================================
-- [3] table_columns 테이블 생성 (없는 경우)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.table_columns (
  id         text PRIMARY KEY,
  label      text NOT NULL DEFAULT '',
  type       text NOT NULL DEFAULT 'checkbox',
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.table_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "table_columns_approved" ON public.table_columns;
CREATE POLICY "table_columns_approved" ON public.table_columns
  FOR ALL USING (public.is_approved());


-- ================================================================
-- [4] Realtime 발행 등록 — 변경 시 다른 클라이언트에 즉시 전파
-- ================================================================
DO $$
BEGIN
  -- customers
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  END IF;

  -- customer_statuses
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'customer_statuses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_statuses;
  END IF;

  -- table_columns
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'table_columns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.table_columns;
  END IF;

  -- workspace_config
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'workspace_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_config;
  END IF;
END $$;


-- ================================================================
-- [5] type 컬럼 CHECK 제약 업데이트 (모든 열 유형 허용)
-- ================================================================
ALTER TABLE public.table_columns DROP CONSTRAINT IF EXISTS table_columns_type_check;
ALTER TABLE public.table_columns DROP CONSTRAINT IF EXISTS table_columns_type_valid;
ALTER TABLE public.table_columns ADD CONSTRAINT table_columns_type_valid
  CHECK (type IN ('checkbox', 'text', 'number', 'date', 'assignee', 'status'));


-- ================================================================
-- 결과 확인
-- ================================================================
SELECT
  'customers columns' AS check_target,
  string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers'

UNION ALL

SELECT
  'realtime tables' AS check_target,
  string_agg(tablename, ', ' ORDER BY tablename) AS columns
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('customers','customer_statuses','table_columns','workspace_config');
