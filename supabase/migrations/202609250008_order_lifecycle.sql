-- Phase 6/7 hardening: expire abandoned payment attempts and release coupon usage.
alter table public.orders
  add column if not exists expires_at timestamptz;

update public.orders
set expires_at = created_at + interval '30 minutes'
where payment_status = 'pending' and expires_at is null;

create index if not exists orders_pending_expiry_idx
on public.orders(expires_at)
where payment_status = 'pending';

create or replace function public.set_order_expiry()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.payment_status = 'pending' and new.expires_at is null then
    new.expires_at := timezone('utc', now()) + interval '30 minutes';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_expiry on public.orders;
create trigger orders_set_expiry
before insert on public.orders
for each row execute function public.set_order_expiry();

create or replace function public.expire_pending_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row record;
  expired_count integer := 0;
begin
  for order_row in
    select id
    from public.orders
    where payment_status = 'pending'
      and expires_at is not null
      and expires_at <= timezone('utc', now())
    for update skip locked
  loop
    delete from public.coupon_redemptions where order_id = order_row.id;
    update public.orders
    set payment_status = 'expired', expires_at = null
    where id = order_row.id and payment_status = 'pending';
    if found then expired_count := expired_count + 1; end if;
  end loop;
  return expired_count;
end;
$$;

revoke all on function public.expire_pending_orders() from public, anon, authenticated;
grant execute on function public.expire_pending_orders() to service_role;

create or replace function public.mark_order_paid(target_order_id uuid, capture_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  item_row record;
begin
  select * into order_row from public.orders where id = target_order_id for update;
  if order_row.id is null then raise exception 'Order not found'; end if;
  if order_row.payment_status = 'paid' then return false; end if;
  if order_row.payment_status in ('refunded', 'failed', 'expired') then raise exception 'Order cannot be marked paid from status %', order_row.payment_status; end if;
  if order_row.expires_at is not null and order_row.expires_at <= timezone('utc', now()) then
    delete from public.coupon_redemptions where order_id = target_order_id;
    update public.orders set payment_status = 'expired', expires_at = null where id = target_order_id;
    raise exception 'Order payment window has expired';
  end if;

  for item_row in select product_id, variant_id, quantity from public.order_items where order_id = target_order_id
  loop
    if item_row.variant_id is null then
      update public.products set stock_quantity = stock_quantity - item_row.quantity where id = item_row.product_id and stock_quantity >= item_row.quantity;
    else
      update public.product_variants set stock_quantity = stock_quantity - item_row.quantity where id = item_row.variant_id and product_id = item_row.product_id and stock_quantity >= item_row.quantity;
    end if;
    if not found then raise exception 'Insufficient stock while confirming order'; end if;
  end loop;

  update public.orders set payment_status = 'paid', paypal_capture_id = capture_id, expires_at = null where id = target_order_id;
  return true;
end;
$$;

create or replace function public.mark_order_refunded(target_order_id uuid, capture_id text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  item_row record;
begin
  select * into order_row from public.orders where id = target_order_id for update;
  if order_row.id is null then raise exception 'Order not found'; end if;
  if order_row.payment_status = 'refunded' then return false; end if;
  if order_row.payment_status <> 'paid' then
    delete from public.coupon_redemptions where order_id = target_order_id;
    update public.orders set payment_status = 'refunded', paypal_capture_id = coalesce(capture_id, paypal_capture_id), expires_at = null where id = target_order_id;
    return true;
  end if;

  for item_row in select product_id, variant_id, quantity from public.order_items where order_id = target_order_id
  loop
    if item_row.variant_id is null then
      update public.products set stock_quantity = stock_quantity + item_row.quantity where id = item_row.product_id;
    else
      update public.product_variants set stock_quantity = stock_quantity + item_row.quantity where id = item_row.variant_id and product_id = item_row.product_id;
    end if;
  end loop;
  update public.orders set payment_status = 'refunded', paypal_capture_id = coalesce(capture_id, paypal_capture_id), expires_at = null where id = target_order_id;
  return true;
end;
$$;

create or replace function public.set_order_payment_status(target_order_id uuid, target_status public.payment_status)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders set payment_status = target_status, expires_at = null where id = target_order_id and payment_status = 'pending';
  if target_status in ('failed', 'expired', 'refunded') then delete from public.coupon_redemptions where order_id = target_order_id; end if;
  return found;
end;
$$;

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
  if current_user_id is null then return jsonb_build_object('valid', false, 'message', 'Authentication is required.'); end if;
  if normalized_code = '' then return jsonb_build_object('valid', true, 'code', null, 'discount', 0, 'free_shipping', false); end if;
  select * into coupon_row from public.coupons where code = normalized_code and is_active = true;
  if coupon_row.id is null then return jsonb_build_object('valid', false, 'message', 'This coupon code is not valid.'); end if;
  perform pg_advisory_xact_lock(hashtextextended(coupon_row.id::text, 0));
  if coupon_row.starts_at is not null and timezone('utc', now()) < coupon_row.starts_at then return jsonb_build_object('valid', false, 'message', 'This coupon is not active yet.'); end if;
  if coupon_row.expires_at is not null and timezone('utc', now()) >= coupon_row.expires_at then return jsonb_build_object('valid', false, 'message', 'This coupon has expired.'); end if;
  select count(*) into total_redemptions from public.coupon_redemptions redemption join public.orders order_row on order_row.id = redemption.order_id where redemption.coupon_id = coupon_row.id and (order_row.payment_status = 'paid' or (order_row.payment_status = 'pending' and order_row.expires_at > timezone('utc', now())));
  if coupon_row.usage_limit is not null and total_redemptions >= coupon_row.usage_limit then return jsonb_build_object('valid', false, 'message', 'This coupon has reached its usage limit.'); end if;
  select count(*) into customer_redemptions from public.coupon_redemptions redemption join public.orders order_row on order_row.id = redemption.order_id where redemption.coupon_id = coupon_row.id and redemption.customer_id = current_user_id and (order_row.payment_status = 'paid' or (order_row.payment_status = 'pending' and order_row.expires_at > timezone('utc', now())));
  if coupon_row.per_customer_limit is not null and customer_redemptions >= coupon_row.per_customer_limit then return jsonb_build_object('valid', false, 'message', 'You have already used this coupon the maximum number of times.'); end if;
  if coupon_row.first_order_only and exists (select 1 from public.orders where customer_id = current_user_id and (payment_status = 'paid' or (payment_status = 'pending' and expires_at > timezone('utc', now())))) then return jsonb_build_object('valid', false, 'message', 'This coupon is available for first orders only.'); end if;
  select exists (select 1 from public.coupon_products where coupon_id = coupon_row.id), exists (select 1 from public.coupon_categories where coupon_id = coupon_row.id) into has_product_targets, has_category_targets;
  for item in select value from jsonb_array_elements(order_items_input)
  loop
    item_product_id := (item ->> 'productId')::uuid;
    item_variant_id := nullif(item ->> 'variantId', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    select * into product_row from public.products where id = item_product_id and is_active = true;
    if product_row.id is null then return jsonb_build_object('valid', false, 'message', 'A product in your cart is no longer available.'); end if;
    if item_variant_id is null then item_price := product_row.base_price;
    else select price into item_price from public.product_variants where id = item_variant_id and product_id = item_product_id and is_active = true; if item_price is null then return jsonb_build_object('valid', false, 'message', 'A selected product variant is no longer available.'); end if; end if;
    calculated_subtotal := calculated_subtotal + item_price * item_quantity;
    matches_target := not has_product_targets and not has_category_targets;
    if has_product_targets then matches_target := exists (select 1 from public.coupon_products where coupon_id = coupon_row.id and product_id = item_product_id); end if;
    if has_category_targets then matches_target := matches_target or exists (select 1 from public.coupon_categories where coupon_id = coupon_row.id and category_id = product_row.category_id); end if;
    if matches_target then eligible_subtotal := eligible_subtotal + item_price * item_quantity; end if;
  end loop;
  if calculated_subtotal < coupon_row.minimum_order_amount then return jsonb_build_object('valid', false, 'message', format('This coupon requires a minimum order of %s MDL.', coupon_row.minimum_order_amount)); end if;
  if eligible_subtotal <= 0 then return jsonb_build_object('valid', false, 'message', 'This coupon does not apply to the products in your cart.'); end if;
  if coupon_row.discount_type = 'percentage' then discount := round(eligible_subtotal * coupon_row.discount_value / 100, 2); else discount := least(coupon_row.discount_value, eligible_subtotal); end if;
  if coupon_row.max_discount_amount is not null then discount := least(discount, coupon_row.max_discount_amount); end if;
  return jsonb_build_object('valid', true, 'code', coupon_row.code, 'discount', discount, 'free_shipping', coupon_row.free_shipping);
end;
$$;

revoke all on function public.validate_coupon(jsonb, text) from public, anon;
grant execute on function public.validate_coupon(jsonb, text) to authenticated;
