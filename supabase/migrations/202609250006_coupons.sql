-- Phase 5: coupons, targeting, usage limits, and server-side validation.
create type public.coupon_discount_type as enum ('percentage', 'fixed');

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type public.coupon_discount_type not null,
  discount_value numeric(12, 2) not null check (discount_value > 0),
  max_discount_amount numeric(12, 2) check (max_discount_amount is null or max_discount_amount > 0),
  minimum_order_amount numeric(12, 2) not null default 0 check (minimum_order_amount >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  first_order_only boolean not null default false,
  free_shipping boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coupons_code_upper check (code = upper(code)),
  constraint coupons_percentage_range check (discount_type <> 'percentage' or discount_value <= 100),
  constraint coupons_dates_valid check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table public.coupon_products (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

create table public.coupon_categories (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (coupon_id, category_id)
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  discount_amount numeric(12, 2) not null check (discount_amount >= 0),
  redeemed_at timestamptz not null default timezone('utc', now())
);

create index coupons_active_code_idx on public.coupons(code, is_active);
create index coupon_products_product_idx on public.coupon_products(product_id);
create index coupon_categories_category_idx on public.coupon_categories(category_id);
create index coupon_redemptions_customer_idx on public.coupon_redemptions(coupon_id, customer_id);

create trigger coupons_set_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

alter table public.coupons enable row level security;
alter table public.coupon_products enable row level security;
alter table public.coupon_categories enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "Customers can view active coupons"
on public.coupons for select
to authenticated
using (is_active = true);

create policy "Customers can view coupon product targets"
on public.coupon_products for select
to authenticated
using (exists (select 1 from public.coupons where id = coupon_id and is_active = true));

create policy "Customers can view coupon category targets"
on public.coupon_categories for select
to authenticated
using (exists (select 1 from public.coupons where id = coupon_id and is_active = true));

create policy "Customers can view their coupon redemptions"
on public.coupon_redemptions for select
to authenticated
using (customer_id = auth.uid());

create policy "Customers can create their own coupon redemptions"
on public.coupon_redemptions for insert
to authenticated
with check (customer_id = auth.uid() and exists (
  select 1 from public.orders
  where orders.id = order_id and orders.customer_id = auth.uid()
));

create or replace function public.validate_coupon(order_items_input jsonb, coupon_code_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := upper(trim(coalesce(coupon_code_input, '')));
  coupon_row public.coupons%rowtype;
  item jsonb;
  product_row public.products%rowtype;
  item_product_id uuid;
  item_variant_id uuid;
  item_quantity integer;
  item_price numeric(12, 2);
  calculated_subtotal numeric(12, 2) := 0;
  eligible_subtotal numeric(12, 2) := 0;
  discount numeric(12, 2) := 0;
  total_redemptions integer;
  customer_redemptions integer;
  has_product_targets boolean;
  has_category_targets boolean;
  matches_target boolean;
begin
  if current_user_id is null then
    return jsonb_build_object('valid', false, 'message', 'Authentication is required.');
  end if;
  if normalized_code = '' then
    return jsonb_build_object('valid', true, 'code', null, 'discount', 0, 'free_shipping', false);
  end if;

  select * into coupon_row from public.coupons where code = normalized_code and is_active = true;
  if coupon_row.id is null then
    return jsonb_build_object('valid', false, 'message', 'This coupon code is not valid.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(coupon_row.id::text, 0));
  if coupon_row.starts_at is not null and timezone('utc', now()) < coupon_row.starts_at then
    return jsonb_build_object('valid', false, 'message', 'This coupon is not active yet.');
  end if;
  if coupon_row.expires_at is not null and timezone('utc', now()) >= coupon_row.expires_at then
    return jsonb_build_object('valid', false, 'message', 'This coupon has expired.');
  end if;

  select count(*) into total_redemptions from public.coupon_redemptions where coupon_id = coupon_row.id;
  if coupon_row.usage_limit is not null and total_redemptions >= coupon_row.usage_limit then
    return jsonb_build_object('valid', false, 'message', 'This coupon has reached its usage limit.');
  end if;
  select count(*) into customer_redemptions from public.coupon_redemptions where coupon_id = coupon_row.id and customer_id = current_user_id;
  if coupon_row.per_customer_limit is not null and customer_redemptions >= coupon_row.per_customer_limit then
    return jsonb_build_object('valid', false, 'message', 'You have already used this coupon the maximum number of times.');
  end if;
  if coupon_row.first_order_only and exists (select 1 from public.orders where customer_id = current_user_id and payment_status in ('paid', 'pending')) then
    return jsonb_build_object('valid', false, 'message', 'This coupon is available for first orders only.');
  end if;

  select exists (select 1 from public.coupon_products where coupon_id = coupon_row.id),
         exists (select 1 from public.coupon_categories where coupon_id = coupon_row.id)
    into has_product_targets, has_category_targets;

  for item in select value from jsonb_array_elements(order_items_input)
  loop
    item_product_id := (item ->> 'productId')::uuid;
    item_variant_id := nullif(item ->> 'variantId', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    select * into product_row from public.products where id = item_product_id and is_active = true;
    if product_row.id is null then
      return jsonb_build_object('valid', false, 'message', 'A product in your cart is no longer available.');
    end if;
    if item_variant_id is null then
      item_price := product_row.base_price;
    else
      select price into item_price from public.product_variants where id = item_variant_id and product_id = item_product_id and is_active = true;
      if item_price is null then
        return jsonb_build_object('valid', false, 'message', 'A selected product variant is no longer available.');
      end if;
    end if;
    calculated_subtotal := calculated_subtotal + item_price * item_quantity;
    matches_target := not has_product_targets and not has_category_targets;
    if has_product_targets then
      matches_target := exists (select 1 from public.coupon_products where coupon_id = coupon_row.id and product_id = item_product_id);
    end if;
    if has_category_targets then
      matches_target := matches_target or exists (select 1 from public.coupon_categories where coupon_id = coupon_row.id and category_id = product_row.category_id);
    end if;
    if matches_target then eligible_subtotal := eligible_subtotal + item_price * item_quantity; end if;
  end loop;

  if calculated_subtotal < coupon_row.minimum_order_amount then
    return jsonb_build_object('valid', false, 'message', format('This coupon requires a minimum order of %s MDL.', coupon_row.minimum_order_amount));
  end if;
  if eligible_subtotal <= 0 then
    return jsonb_build_object('valid', false, 'message', 'This coupon does not apply to the products in your cart.');
  end if;
  if coupon_row.discount_type = 'percentage' then
    discount := round(eligible_subtotal * coupon_row.discount_value / 100, 2);
  else
    discount := least(coupon_row.discount_value, eligible_subtotal);
  end if;
  if coupon_row.max_discount_amount is not null then discount := least(discount, coupon_row.max_discount_amount); end if;

  return jsonb_build_object('valid', true, 'code', coupon_row.code, 'discount', discount, 'free_shipping', coupon_row.free_shipping);
end;
$$;

revoke all on function public.validate_coupon(jsonb, text) from public, anon;
grant execute on function public.validate_coupon(jsonb, text) to authenticated;

drop function if exists public.create_pending_order(jsonb, jsonb);

create or replace function public.create_pending_order(order_items_input jsonb, shipping_input jsonb, coupon_code_input text default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  profile_active boolean;
  new_order_id uuid;
  item jsonb;
  product_row public.products%rowtype;
  variant_row public.product_variants%rowtype;
  item_product_id uuid;
  item_variant_id uuid;
  item_quantity integer;
  item_price numeric(12, 2);
  item_name text;
  item_sku text;
  calculated_subtotal numeric(12, 2) := 0;
  coupon_result jsonb;
  applied_code text;
  discount numeric(12, 2) := 0;
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  select email, is_active into current_email, profile_active from public.profiles where id = current_user_id;
  if current_email is null then raise exception 'Active customer profile was not found'; end if;
  if not profile_active then raise exception 'Your customer profile is inactive'; end if;
  if jsonb_typeof(order_items_input) <> 'array' or jsonb_array_length(order_items_input) = 0 then raise exception 'Your cart is empty'; end if;

  for item in select value from jsonb_array_elements(order_items_input)
  loop
    item_product_id := (item ->> 'productId')::uuid;
    item_variant_id := nullif(item ->> 'variantId', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    if item_quantity is null or item_quantity < 1 or item_quantity > 99 then raise exception 'Invalid item quantity'; end if;
    select * into product_row from public.products where id = item_product_id and is_active = true;
    if product_row.id is null then raise exception 'A product in your cart is no longer available'; end if;
    if item_variant_id is null then
      if product_row.stock_quantity < item_quantity then raise exception 'Not enough stock for %', product_row.name; end if;
      item_price := product_row.base_price;
    else
      select * into variant_row from public.product_variants where id = item_variant_id and product_id = item_product_id and is_active = true;
      if variant_row.id is null then raise exception 'A selected product variant is no longer available'; end if;
      if variant_row.stock_quantity < item_quantity then raise exception 'Not enough stock for %', product_row.name; end if;
      item_price := variant_row.price;
    end if;
    calculated_subtotal := calculated_subtotal + item_price * item_quantity;
  end loop;

  coupon_result := public.validate_coupon(order_items_input, coupon_code_input);
  if not coalesce((coupon_result ->> 'valid')::boolean, false) then raise exception '%', coupon_result ->> 'message'; end if;
  applied_code := nullif(coupon_result ->> 'code', '');
  discount := coalesce((coupon_result ->> 'discount')::numeric, 0);

  insert into public.orders (customer_id, email_snapshot, subtotal, discount_amount, total, coupon_code, shipping_details)
  values (current_user_id, current_email, calculated_subtotal, discount, greatest(calculated_subtotal - discount, 0), applied_code, shipping_input)
  returning id into new_order_id;

  for item in select value from jsonb_array_elements(order_items_input)
  loop
    item_product_id := (item ->> 'productId')::uuid;
    item_variant_id := nullif(item ->> 'variantId', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    select name, sku, base_price into product_row.name, product_row.sku, product_row.base_price from public.products where id = item_product_id;
    if item_variant_id is null then item_price := product_row.base_price; item_name := product_row.name; item_sku := product_row.sku;
    else select name, sku, price into variant_row.name, variant_row.sku, variant_row.price from public.product_variants where id = item_variant_id; item_price := variant_row.price; item_name := product_row.name || ' - ' || variant_row.name; item_sku := variant_row.sku; end if;
    insert into public.order_items (order_id, product_id, variant_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total)
    values (new_order_id, item_product_id, item_variant_id, item_name, item_sku, item_price, item_quantity, item_price * item_quantity);
  end loop;
  if applied_code is not null then
    insert into public.coupon_redemptions (coupon_id, customer_id, order_id, discount_amount)
    select id, current_user_id, new_order_id, discount from public.coupons where code = applied_code;
  end if;
  return new_order_id;
end;
$$;

grant execute on function public.create_pending_order(jsonb, jsonb, text) to authenticated;
