-- keywords 테이블
create table if not exists public.keywords (
  id            uuid primary key default gen_random_uuid(),
  keyword       text not null,
  is_exposed    boolean not null default true,
  link          text not null default '',
  check_date    text not null default '',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS
alter table public.keywords enable row level security;

-- 인증된 사용자라면 누구나 읽기/쓰기 가능 (팀 공유)
create policy "authenticated read keywords"
  on public.keywords for select
  to authenticated using (true);

create policy "authenticated write keywords"
  on public.keywords for insert
  to authenticated with check (true);

create policy "authenticated update keywords"
  on public.keywords for update
  to authenticated using (true);

create policy "authenticated delete keywords"
  on public.keywords for delete
  to authenticated using (true);

-- Realtime 활성화
alter publication supabase_realtime add table public.keywords;
