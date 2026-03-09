-- ============================================================
-- statfordegree-hub Supabase Schema
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요
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
-- RLS (Row Level Security) 정책
-- 모든 테이블에 익명 접근 허용 (읽기/쓰기)
-- ============================================================

alter table pages               enable row level security;
alter table tasks               enable row level security;
alter table customers           enable row level security;
alter table customer_statuses   enable row level security;
alter table manual_nodes        enable row level security;
alter table manual_page_roots   enable row level security;
alter table workspace_config    enable row level security;

-- 기존 정책 삭제 후 재생성
drop policy if exists "allow_all" on pages;
drop policy if exists "allow_all" on tasks;
drop policy if exists "allow_all" on customers;
drop policy if exists "allow_all" on customer_statuses;
drop policy if exists "allow_all" on manual_nodes;
drop policy if exists "allow_all" on manual_page_roots;
drop policy if exists "allow_all" on workspace_config;

create policy "allow_all" on pages               for all using (true) with check (true);
create policy "allow_all" on tasks               for all using (true) with check (true);
create policy "allow_all" on customers           for all using (true) with check (true);
create policy "allow_all" on customer_statuses   for all using (true) with check (true);
create policy "allow_all" on manual_nodes        for all using (true) with check (true);
create policy "allow_all" on manual_page_roots   for all using (true) with check (true);
create policy "allow_all" on workspace_config    for all using (true) with check (true);
