-- Allow the order-items policies to check ownership without recursively
-- evaluating orders RLS while an order is being created.
create or replace function public.owns_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders
    where id = target_order_id and customer_id = auth.uid()
  );
$$;

drop policy if exists "Customers can view their own order items" on public.order_items;
create policy "Customers can view their own order items"
on public.order_items for select
to authenticated
using (public.owns_order(order_id));

drop policy if exists "Customers can add items to their own orders" on public.order_items;
create policy "Customers can add items to their own orders"
on public.order_items for insert
to authenticated
with check (public.owns_order(order_id));
