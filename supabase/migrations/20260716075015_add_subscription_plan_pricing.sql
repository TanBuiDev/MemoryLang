create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_type text not null check (plan_type in ('free', 'pro')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  display_name text not null,
  amount integer not null check (amount >= 0),
  currency text not null default 'VND',
  features text[] not null default '{}',
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_type, billing_cycle)
);

alter table public.subscription_plans enable row level security;

drop policy if exists "anyone can view active subscription plans" on public.subscription_plans;
create policy "anyone can view active subscription plans"
on public.subscription_plans
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admins manage subscription plans" on public.subscription_plans;
create policy "admins manage subscription plans"
on public.subscription_plans
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.subscription_plans (plan_type, billing_cycle, display_name, amount, currency, features, is_active)
values
  ('free', 'monthly', 'Free', 0, 'VND', array[
    'Tối đa 100 từ vựng',
    'Tối đa 5 bộ thẻ',
    'Flashcard & Quiz không giới hạn',
    'Ôn tập SRS đầy đủ',
    'Nội dung Listening & Grammar cơ bản'
  ], true),
  ('free', 'yearly', 'Free', 0, 'VND', array[
    'Tối đa 100 từ vựng',
    'Tối đa 5 bộ thẻ',
    'Flashcard & Quiz không giới hạn',
    'Ôn tập SRS đầy đủ',
    'Nội dung Listening & Grammar cơ bản'
  ], true),
  ('pro', 'monthly', 'Pro', 49000, 'VND', array[
    'Từ vựng không giới hạn',
    'Bộ thẻ không giới hạn',
    'Toàn bộ Listening & Grammar',
    'Xuất dữ liệu (CSV/JSON)',
    'Ưu tiên hỗ trợ',
    'Badge Pro trên profile'
  ], true),
  ('pro', 'yearly', 'Pro', 430000, 'VND', array[
    'Từ vựng không giới hạn',
    'Bộ thẻ không giới hạn',
    'Toàn bộ Listening & Grammar',
    'Xuất dữ liệu (CSV/JSON)',
    'Ưu tiên hỗ trợ',
    'Badge Pro trên profile'
  ], true)
on conflict (plan_type, billing_cycle) do update
set
  display_name = excluded.display_name,
  amount = excluded.amount,
  currency = excluded.currency,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = now();
