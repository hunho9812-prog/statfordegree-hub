-- ledger 테이블 생성
create table if not exists ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  year int not null,
  month int not null,
  sales bigint not null default 0,
  labor_cost bigint not null default 0,
  business_cost bigint not null default 0,
  profit bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, year, month)
);

-- RLS 활성화
alter table ledger enable row level security;

-- 자신의 데이터만 읽기/쓰기 가능
create policy "Users can manage their own ledger"
  on ledger
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 실시간 구독 활성화 (Supabase Realtime)
alter publication supabase_realtime add table ledger;
