-- ================================================================
-- StatforDegree Hub — v2 Migration
-- signup_requests + team_members 테이블 추가 및 RLS 함수 업데이트
--
-- 실행 순서: Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- ================================================================


-- ================================================================
-- [1] signup_requests
-- 회원가입 신청 (auth 계정 생성 전 단계)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.signup_requests (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  name       text        NOT NULL DEFAULT '',
  password   text        NOT NULL DEFAULT '',  -- 승인 후 즉시 삭제
  created_at timestamptz NOT NULL DEFAULT now(),
  status     text        NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
-- 일반 사용자 접근 불가 (service_role 전용)


-- ================================================================
-- [2] team_members
-- 승인된 팀원 (auth 계정 생성 완료)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id        uuid        PRIMARY KEY,
  email     text        NOT NULL,
  name      text        NOT NULL DEFAULT '',
  role      text        NOT NULL DEFAULT 'member'
            CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_service" ON public.team_members;

CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members_service" ON public.team_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ================================================================
-- [3] RLS 헬퍼 함수 업데이트 (team_members 기반)
-- ================================================================
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members WHERE id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ================================================================
-- [4] 기존 users → team_members 데이터 마이그레이션
-- ================================================================
INSERT INTO public.team_members (id, email, name, role, joined_at)
SELECT id, email, COALESCE(name, ''), role, COALESCE(created_at, now())
FROM public.users
WHERE status = 'approved'
ON CONFLICT (id) DO NOTHING;
