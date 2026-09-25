-- Repair profiles for users created before the profile trigger was installed
-- or for accounts whose profile insert was interrupted.
insert into public.profiles (id, full_name, email)
select
  users.id,
  nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
  lower(users.email)
from auth.users as users
where users.email is not null
  and not exists (
    select 1 from public.profiles
    where profiles.id = users.id
  )
on conflict (id) do nothing;

create or replace function public.create_pending_order(order_items_input jsonb, shipping_input jsonb)
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
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select email, is_active into current_email, profile_active
  from public.profiles
  where id = current_user_id;
  if current_email is null then
    raise exception 'Active customer profile was not found';
  end if;
  if not profile_active then
    raise exception 'Your customer profile is inactive';
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

    select * into product_row from public.products
    where id = item_product_id and is_active = true;
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
    select * into product_row from public.products where id = item_product_id;
    if item_variant_id is null then
      item_price := product_row.base_price;
      item_name := product_row.name;
      item_sku := product_row.sku;
    else
      select * into variant_row from public.product_variants where id = item_variant_id;
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
