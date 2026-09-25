-- Allow the server-side payment integration to attach PayPal identifiers and
-- status changes without exposing update access to customers.
create or replace function public.set_paypal_order(target_order_id uuid, provider_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set paypal_order_id = provider_order_id
  where id = target_order_id;
end;
$$;

create or replace function public.mark_order_paid(target_order_id uuid, capture_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set payment_status = 'paid', paypal_capture_id = capture_id
  where id = target_order_id;
end;
$$;

revoke all on function public.set_paypal_order(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
grant execute on function public.set_paypal_order(uuid, text) to service_role;
grant execute on function public.mark_order_paid(uuid, text) to service_role;
