-- Phase 8/9: auditable administration and manual inventory adjustments.
create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  previous_quantity integer not null check (previous_quantity >= 0),
  new_quantity integer not null check (new_quantity >= 0),
  reason text not null,
  admin_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint inventory_adjustment_target check ((product_id is null) <> (variant_id is null))
);

create index admin_activity_logs_created_idx on public.admin_activity_logs(created_at desc);
create index admin_activity_logs_entity_idx on public.admin_activity_logs(entity_type, entity_id);
create index inventory_adjustments_product_idx on public.inventory_adjustments(product_id, created_at desc);
create index inventory_adjustments_variant_idx on public.inventory_adjustments(variant_id, created_at desc);

alter table public.admin_activity_logs enable row level security;
alter table public.inventory_adjustments enable row level security;

create policy "Staff can view activity logs"
on public.admin_activity_logs for select to authenticated
using (public.is_staff());

create policy "Staff can view inventory adjustments"
on public.inventory_adjustments for select to authenticated
using (public.is_staff());
