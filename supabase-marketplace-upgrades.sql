-- Run this in the Supabase SQL Editor for the ticket marketplace upgrades.
-- It adds quantity, sold status, and reporting support.

alter table public.listings
  add column if not exists quantity integer not null default 1 check (quantity > 0),
  add column if not exists status text not null default 'available'
    check (status in ('available', 'sold', 'reported'));

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id text,
  reporter_email text not null,
  listing_event text,
  listing_seller text,
  reason text not null default 'No reason provided.',
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "Students can create reports" on public.reports;
create policy "Students can create reports"
  on public.reports
  for insert
  to authenticated
  with check (reporter_email = auth.jwt() ->> 'email');

drop policy if exists "Students can see their reports" on public.reports;
create policy "Students can see their reports"
  on public.reports
  for select
  to authenticated
  using (reporter_email = auth.jwt() ->> 'email');
