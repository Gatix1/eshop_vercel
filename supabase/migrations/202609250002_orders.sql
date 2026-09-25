-- Phase 4: customer orders and immutable order-item snapshots.
create type public.payment_status as enum ('pending', 'paid', 'failed', 'expired', 'refunded');
create type public.fulfillment_status as enum ('unfulfilled', 'processing', 'packed', 'shipped', 'delivered', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  email_snapshot text not null,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  shipping_amount numeric(12, 2) not null default 0 check (shipping_amount >= 0),
  total numeric(12, 2) not null check (total >= 0),
  coupon_code text,
  payment_status public.payment_status not null default 'pending',
  fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  shipping_details jsonb not null default '{}'::jsonb,
  paypal_order_id text,
  paypal_capture_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  product_name_snapshot text not null,
  sku_snapshot text not null,
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0)
);

create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_payment_status_idx on public.orders(payment_status);
create index order_items_order_idx on public.order_items(order_id);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Customers can view their own orders"
on public.orders for select
to authenticated
using (customer_id = auth.uid());

create policy "Customers can create their own pending orders"
on public.orders for insert
to authenticated
with check (customer_id = auth.uid() and payment_status = 'pending' and fulfillment_status = 'unfulfilled');

create policy "Customers can view their own order items"
on public.order_items for select
to authenticated
using (exists (
  select 1 from public.orders
  where orders.id = order_items.order_id and orders.customer_id = auth.uid()
));

create policy "Customers can add items to their own orders"
on public.order_items for insert
to authenticated
with check (exists (
  select 1 from public.orders
  where orders.id = order_items.order_id and orders.customer_id = auth.uid()
));

create or replace function public.create_pending_order(order_items_input jsonb, shipping_input jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
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
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select email into current_email from public.profiles where id = current_user_id and is_active = true;
  if current_email is null then
    raise exception 'Active customer profile was not found';
  end if;

  if jsonb_typeof(order_items_input) <> 'array' or jsonb_array_length(order_items_input) = 0 then
    raise exception 'Your cart is empty';
  end if;

  for item in select value from jsonb_array_elements(order_items_input)
  loop
    item_product_id := (item ->> 'productId')::uuid;
    item_variant_id := nullif(item ->> 'variantId', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;

    if item_quantity is null or item_quantity < 1 or item_quantity > 99 then
      raise exception 'Invalid item quantity';
    end if;

    select * into product_row from public.products where id = item_product_id and is_active = true;
    if product_row.id is null then
      raise exception 'A product in your cart is no longer available';
    end if;

    if item_variant_id is null then
      if product_row.stock_quantity < item_quantity then
        raise exception 'Not enough stock for %', product_row.name;
      end if;
      item_price := product_row.base_price;
      item_name := product_row.name;
      item_sku := product_row.sku;
    else
      select * into variant_row from public.product_variants
      where id = item_variant_id and product_id = item_product_id and is_active = true;
      if variant_row.id is null then
        raise exception 'A selected product variant is no longer available';
      end if;
      if variant_row.stock_quantity < item_quantity then
        raise exception 'Not enough stock for %', product_row.name;
      end if;
      item_price := variant_row.price;
      item_name := product_row.name || ' - ' || variant_row.name;
      item_sku := variant_row.sku;
    end if;

    calculated_subtotal := calculated_subtotal + (item_price * item_quantity);
  end loop;

  insert into public.orders (customer_id, email_snapshot, subtotal, total, shipping_details)
  values (current_user_id, current_email, calculated_subtotal, calculated_subtotal, shipping_input)
  returning id into new_order_id;

  for item in select value from jsonb_array_elements(order_items_input)
  loop
    item_product_id := (item ->> 'productId')::uuid;
    item_variant_id := nullif(item ->> 'variantId', '')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    select name, sku, base_price into product_row.name, product_row.sku, product_row.base_price from public.products where id = item_product_id;
    if item_variant_id is null then
      item_price := product_row.base_price;
      item_name := product_row.name;
      item_sku := product_row.sku;
    else
      select name, sku, price into variant_row.name, variant_row.sku, variant_row.price from public.product_variants where id = item_variant_id;
      item_price := variant_row.price;
      item_name := product_row.name || ' - ' || variant_row.name;
      item_sku := variant_row.sku;
    end if;
    insert into public.order_items (order_id, product_id, variant_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total)
    values (new_order_id, item_product_id, item_variant_id, item_name, item_sku, item_price, item_quantity, item_price * item_quantity);
  end loop;

  return new_order_id;
end;
$$;

grant execute on function public.create_pending_order(jsonb, jsonb) to authenticated;
