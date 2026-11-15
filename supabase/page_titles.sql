-- ================================================================
-- 관리자가 수정할 수 있는 페이지 이름
-- 사용법: Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- ================================================================

create table if not exists public.page_titles (
  key        text primary key,
  title      text not null,
  updated_at timestamptz not null default now()
);

alter table public.page_titles enable row level security;

drop policy if exists "page_titles_select_approved" on public.page_titles;
create policy "page_titles_select_approved" on public.page_titles
  for select using (public.is_approved());

drop policy if exists "page_titles_admin_insert" on public.page_titles;
create policy "page_titles_admin_insert" on public.page_titles
  for insert with check (public.is_admin());

drop policy if exists "page_titles_admin_update" on public.page_titles;
create policy "page_titles_admin_update" on public.page_titles
  for update using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.page_titles;
