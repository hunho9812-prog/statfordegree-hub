-- 현금영수증 테이블
create table if not exists public.cash_receipts (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references public.customers(id) on delete set null,
  customer_name   text not null default '',
  assignee        text not null default '',
  phone           text not null default '',
  amount          integer not null default 0,
  issued          boolean not null default false,
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.cash_receipts enable row level security;

create policy "authenticated read cash_receipts"
  on public.cash_receipts for select to authenticated using (true);
create policy "authenticated insert cash_receipts"
  on public.cash_receipts for insert to authenticated with check (true);
create policy "authenticated update cash_receipts"
  on public.cash_receipts for update to authenticated using (true);
create policy "authenticated delete cash_receipts"
  on public.cash_receipts for delete to authenticated using (true);

alter publication supabase_realtime add table public.cash_receipts;
