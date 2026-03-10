-- ============================================================
-- Statfordegree Hub — Supabase SQL 스키마
-- Supabase Dashboard > SQL Editor 에서 전체 복사·붙여넣기 후 실행
-- ============================================================

-- 1. public.users 테이블 생성
--    auth.users(id)를 FK로 참조하여 계정 삭제 시 CASCADE 삭제
create table if not exists public.users (
  id           uuid        primary key references auth.users(id) on delete cascade,
  email        text        not null unique,
  name         text        not null default '',
  role         text        not null default 'member' check (role in ('admin', 'member')),
  created_at   timestamptz not null default now()
);

-- 2. RLS 활성화
alter table public.users enable row level security;

-- 기존 정책 제거 (재실행 시 오류 방지)
drop policy if exists "users_select_self"   on public.users;
drop policy if exists "users_select_team"   on public.users;
drop policy if exists "users_insert_self"   on public.users;
drop policy if exists "users_update_self"   on public.users;

-- 3. RLS 정책 설정
--    로그인한 사용자 본인 레코드 조회 허용
create policy "users_select_self" on public.users
  for select using (auth.uid() = id);

--    팀원이면 전체 팀원 목록 조회 허용 (사이드바 이름 표시 등)
create policy "users_select_team" on public.users
  for select using (
    auth.uid() in (select id from public.users)
  );

--    자신의 레코드 삽입 허용 (초대 수락 시 자동 생성)
create policy "users_insert_self" on public.users
  for insert with check (auth.uid() = id);

--    자신의 레코드 수정 허용 (이름 변경 등)
create policy "users_update_self" on public.users
  for update using (auth.uid() = id);

-- 4. 신규 auth.users 생성 시 public.users 자동 삽입 트리거
--    초대 메일 수락 → auth.users INSERT → 이 트리거로 public.users에도 자동 등록
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  )
  on conflict (id) do nothing;   -- 이미 존재하면 스킵 (invite API에서 미리 삽입한 경우)
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();


-- ============================================================
-- 관리자 계정 수동 등록 (최초 1회, 이미 존재하면 UPDATE)
-- rlagusgh1214@naver.com 으로 Supabase에 먼저 로그인한 뒤 실행하세요.
-- auth.users에 해당 이메일이 있어야 합니다.
-- ============================================================
insert into public.users (id, email, name, role)
select id, email, '', 'admin'
from   auth.users
where  email = 'rlagusgh1214@naver.com'
on conflict (id) do update set role = 'admin';


-- ============================================================
-- 관리자 승인 시스템 마이그레이션
-- 기존 invite 기반에서 admin 승인 기반으로 전환
-- ============================================================

-- 1. status 컬럼 추가 (pending / approved / rejected)
alter table public.users
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

-- 2. 기존 사용자는 모두 approved 처리 (기존에 활성화된 계정)
update public.users set status = 'approved' where status = 'pending';

-- 3. 관리자 계정 approved + admin 보장
update public.users
  set status = 'approved', role = 'admin'
  where email = 'rlagusgh1214@naver.com';

-- 4. 관리자가 다른 사용자의 status/role 업데이트 가능하도록 RLS 정책 추가
drop policy if exists "users_update_admin" on public.users;
create policy "users_update_admin" on public.users
  for update using (
    auth.uid() in (select id from public.users where role = 'admin')
  );

-- 5. 트리거 업데이트: 신규 가입자는 status='pending', 관리자 이메일은 'approved'
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    case when new.email = 'rlagusgh1214@naver.com' then 'admin'
         else coalesce(new.raw_user_meta_data->>'role', 'member')
    end,
    case when new.email = 'rlagusgh1214@naver.com' then 'approved'
         else 'pending'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
