-- ============================================================
-- Statfordegree Hub — 완전한 Supabase SQL 스키마
-- Supabase Dashboard > SQL Editor 에서 전체 복사·붙여넣기 후 실행
-- ============================================================


-- ============================================================
-- 1. users 테이블
-- ============================================================
create table if not exists public.users (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null unique,
  name       text        not null default '',
  role       text        not null default 'member' check (role in ('admin', 'member')),
  status     text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_select_self"   on public.users;
drop policy if exists "users_select_team"   on public.users;
drop policy if exists "users_insert_self"   on public.users;
drop policy if exists "users_update_self"   on public.users;
drop policy if exists "users_update_admin"  on public.users;

create policy "users_select_self" on public.users
  for select using (auth.uid() = id);

create policy "users_select_team" on public.users
  for select using (auth.uid() in (select id from public.users));

create policy "users_insert_self" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_self" on public.users
  for update using (auth.uid() = id);

create policy "users_update_admin" on public.users
  for update using (
    auth.uid() in (select id from public.users where role = 'admin')
  );

-- 신규 가입 시 public.users 자동 생성 트리거
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 관리자 계정 등록 (auth.users에 이미 존재해야 함)
insert into public.users (id, email, name, role, status)
select id, email, '', 'admin', 'approved'
from   auth.users
where  email = 'rlagusgh1214@naver.com'
on conflict (id) do update set role = 'admin', status = 'approved';


-- ============================================================
-- 2. pages 테이블
-- ============================================================
create table if not exists public.pages (
  id          text        primary key,
  title       text        not null default '',
  emoji       text        not null default '📄',
  content     text        not null default '',
  parent_id   text        references public.pages(id) on delete cascade,
  children    text[]      not null default '{}',
  is_expanded boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.pages enable row level security;

drop policy if exists "pages_all_approved" on public.pages;
create policy "pages_all_approved" on public.pages
  for all using (
    auth.uid() in (select id from public.users where status = 'approved')
  );

-- Realtime 활성화
alter publication supabase_realtime add table public.pages;


-- ============================================================
-- 3. tasks 테이블
-- ============================================================
create table if not exists public.tasks (
  id          text        primary key,
  title       text        not null default '',
  description text        not null default '',
  status      text        not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  priority    text        not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee    text        not null default '',
  due_date    text,
  tags        text[]      not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists "tasks_all_approved" on public.tasks;
create policy "tasks_all_approved" on public.tasks
  for all using (
    auth.uid() in (select id from public.users where status = 'approved')
  );

alter publication supabase_realtime add table public.tasks;


-- ============================================================
-- 4. customers 테이블
-- ============================================================
create table if not exists public.customers (
  id                 text        primary key,
  name               text        not null default '',
  assignee           text        not null default '',
  route              text        not null default '' check (route in ('크몽', '메일', '')),
  settlement_amount  numeric,
  alba               text        not null default '',
  total_amount       numeric,
  balance            numeric,
  review_proposed    boolean     not null default false,
  balance_received   boolean     not null default false,
  kmong_review       boolean     not null default false,
  kakao_review       boolean     not null default false,
  submit_date        text        not null default '',
  status             text        not null default '',
  memo               text        not null default '',
  month_page_id      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists "customers_all_approved" on public.customers;
create policy "customers_all_approved" on public.customers
  for all using (
    auth.uid() in (select id from public.users where status = 'approved')
  );

alter publication supabase_realtime add table public.customers;


-- ============================================================
-- 5. customer_statuses 테이블
-- ============================================================
create table if not exists public.customer_statuses (
  id         text primary key,
  label      text not null default '',
  color      text not null default '#f3f0ff',
  text_color text not null default '#7c3aed',
  category   text not null default '할 일' check (category in ('할 일', '진행 중', '완료'))
);

alter table public.customer_statuses enable row level security;

drop policy if exists "customer_statuses_all_approved" on public.customer_statuses;
create policy "customer_statuses_all_approved" on public.customer_statuses
  for all using (
    auth.uid() in (select id from public.users where status = 'approved')
  );

alter publication supabase_realtime add table public.customer_statuses;


-- ============================================================
-- 6. manual_nodes 테이블 (아웃라이너 노드)
-- ============================================================
create table if not exists public.manual_nodes (
  id          text    primary key,
  page_id     text    not null references public.pages(id) on delete cascade,
  text        text    not null default '',
  children    text[]  not null default '{}',
  parent_id   text,
  is_expanded boolean not null default true,
  is_pinned   boolean not null default false
);

alter table public.manual_nodes enable row level security;

drop policy if exists "manual_nodes_all_approved" on public.manual_nodes;
create policy "manual_nodes_all_approved" on public.manual_nodes
  for all using (
    auth.uid() in (select id from public.users where status = 'approved')
  );

alter publication supabase_realtime add table public.manual_nodes;


-- ============================================================
-- 7. manual_page_roots 테이블 (아웃라이너 루트 순서)
-- ============================================================
create table if not exists public.manual_page_roots (
  page_id    text    primary key references public.pages(id) on delete cascade,
  root_items text[]  not null default '{}'
);

alter table public.manual_page_roots enable row level security;

drop policy if exists "manual_page_roots_all_approved" on public.manual_page_roots;
create policy "manual_page_roots_all_approved" on public.manual_page_roots
  for all using (
    auth.uid() in (select id from public.users where status = 'approved')
  );

alter publication supabase_realtime add table public.manual_page_roots;


-- ============================================================
-- 8. workspace_config 테이블 (rootPageIds 등 전역 설정)
-- ============================================================
create table if not exists public.workspace_config (
  key   text primary key,
  value jsonb not null default 'null'
);

alter table public.workspace_config enable row level security;

drop policy if exists "workspace_config_all_approved" on public.workspace_config;
create policy "workspace_config_all_approved" on public.workspace_config
  for all using (
    auth.uid() in (select id from public.users where status = 'approved')
  );

alter publication supabase_realtime add table public.workspace_config;
