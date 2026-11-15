-- ================================================================
-- 콘텐츠 관리 — 거래 기록 장부 (수입/지출을 건별로 기록)
-- 사용법: Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- ================================================================

create table if not exists public.content_transactions (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('income', 'expense')),
  amount      bigint not null check (amount > 0),
  occurred_on date not null,
  memo        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists content_transactions_occurred_on_idx
  on public.content_transactions (occurred_on desc);

alter table public.content_transactions enable row level security;

drop policy if exists "content_transactions_approved" on public.content_transactions;
create policy "content_transactions_approved" on public.content_transactions
  for all using (public.is_approved());

alter publication supabase_realtime add table public.content_transactions;
