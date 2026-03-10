-- ============================================================
-- statfordegree-hub Supabase Schema
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요
-- ============================================================

-- ============================================================
-- 1단계: users 테이블 (팀원 관리)
-- ============================================================

create table if not exists users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now()
);

-- users 테이블 RLS
alter table users enable row level security;
drop policy if exists "users_authenticated_select" on users;
drop policy if exists "users_self_insert"          on users;

-- 인증된 사용자는 모든 팀원 목록 조회 가능
create policy "users_authenticated_select" on users
  for select using (auth.role() = 'authenticated');

-- 어드민 이메일은 본인 행을 직접 insert 가능 (최초 로그인 시 자동 등록용)
create policy "users_self_insert" on users
  for insert with check (auth.uid() = id);

-- ============================================================
-- 2단계: 신규 auth 사용자 가입 시 users 테이블 자동 등록 트리거
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    case when new.email = 'rlagusgh1214@naver.com' then 'admin' else 'member' end
  )
  on conflict (id) do nothing; -- 이미 등록된 경우 무시
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================

-- Pages
create table if not exists pages (
  id          text primary key,
  title       text not null default '',
  emoji       text not null default '',
  content     text not null default '',
  parent_id   text,
  children    text[] not null default '{}',
  is_expanded boolean not null default false,
  created_at  text not null,
  updated_at  text not null
);

-- Tasks
create table if not exists tasks (
  id          text primary key,
  title       text not null default '',
  description text not null default '',
  status      text not null default 'todo',
  priority    text not null default 'medium',
  assignee    text not null default '',
  due_date    text,
  tags        text[] not null default '{}',
  created_at  text not null,
  updated_at  text not null
);

-- Customers
create table if not exists customers (
  id                text primary key,
  name              text not null default '',
  assignee          text not null default '',
  route             text not null default '',
  settlement_amount numeric,
  alba              text not null default '',
  total_amount      numeric,
  balance           numeric,
  review_proposed   boolean not null default false,
  balance_received  boolean not null default false,
  kmong_review      boolean not null default false,
  kakao_review      boolean not null default false,
  submit_date       text,
  status            text not null default '',
  memo              text not null default '',
  month_page_id     text,
  created_at        text not null,
  updated_at        text not null
);

-- Customer Statuses
create table if not exists customer_statuses (
  id         text primary key,
  label      text not null,
  color      text not null,
  text_color text not null,
  category   text not null
);

-- Manual Nodes (트리 구조)
create table if not exists manual_nodes (
  id          text primary key,
  page_id     text not null,
  text        text not null default '',
  children    text[] not null default '{}',
  parent_id   text,
  is_expanded boolean not null default false,
  is_pinned   boolean not null default false
);

-- Manual Page Roots
create table if not exists manual_page_roots (
  page_id    text primary key,
  root_items text[] not null default '{}'
);

-- Workspace Config
create table if not exists workspace_config (
  key   text primary key,
  value jsonb
);

-- ============================================================
-- 3단계: 데이터 테이블 RLS — 로그인한 팀원만 접근 가능
-- ============================================================

alter table pages               enable row level security;
alter table tasks               enable row level security;
alter table customers           enable row level security;
alter table customer_statuses   enable row level security;
alter table manual_nodes        enable row level security;
alter table manual_page_roots   enable row level security;
alter table workspace_config    enable row level security;

-- 기존 정책 삭제
drop policy if exists "allow_all"          on pages;
drop policy if exists "allow_all"          on tasks;
drop policy if exists "allow_all"          on customers;
drop policy if exists "allow_all"          on customer_statuses;
drop policy if exists "allow_all"          on manual_nodes;
drop policy if exists "allow_all"          on manual_page_roots;
drop policy if exists "allow_all"          on workspace_config;
drop policy if exists "team_members_only"  on pages;
drop policy if exists "team_members_only"  on tasks;
drop policy if exists "team_members_only"  on customers;
drop policy if exists "team_members_only"  on customer_statuses;
drop policy if exists "team_members_only"  on manual_nodes;
drop policy if exists "team_members_only"  on manual_page_roots;
drop policy if exists "team_members_only"  on workspace_config;

-- 로그인한 팀원(users 테이블에 등록된 사용자)만 CRUD 허용
create policy "team_members_only" on pages
  for all using (auth.uid() in (select id from users)) with check (auth.uid() in (select id from users));

create policy "team_members_only" on tasks
  for all using (auth.uid() in (select id from users)) with check (auth.uid() in (select id from users));

create policy "team_members_only" on customers
  for all using (auth.uid() in (select id from users)) with check (auth.uid() in (select id from users));

create policy "team_members_only" on customer_statuses
  for all using (auth.uid() in (select id from users)) with check (auth.uid() in (select id from users));

create policy "team_members_only" on manual_nodes
  for all using (auth.uid() in (select id from users)) with check (auth.uid() in (select id from users));

create policy "team_members_only" on manual_page_roots
  for all using (auth.uid() in (select id from users)) with check (auth.uid() in (select id from users));

create policy "team_members_only" on workspace_config
  for all using (auth.uid() in (select id from users)) with check (auth.uid() in (select id from users));
