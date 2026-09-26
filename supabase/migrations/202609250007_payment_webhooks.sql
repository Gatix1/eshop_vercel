-- Phase 6: verified PayPal events, idempotency, and payment-bound inventory changes.
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  processing_status text not null default 'processing' check (processing_status in ('processing', 'processed', 'failed')),
  error_details text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_event_id)
);

create index webhook_events_provider_status_idx on public.webhook_events(provider, processing_status);

alter table public.webhook_events enable row level security;

drop function if exists public.mark_order_paid(uuid, text);

create or replace function public.claim_webhook_event(
  provider_input text,
  provider_event_id_input text,
  event_type_input text,
  payload_input jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.webhook_events (provider, provider_event_id, event_type, payload)
  values (provider_input, provider_event_id_input, event_type_input, payload_input)
  on conflict (provider, provider_event_id) do update
    set processing_status = 'processing', event_type = excluded.event_type, payload = excluded.payload, error_details = null
    where webhook_events.processing_status = 'failed';
  return found;
end;
$$;

create or replace function public.complete_webhook_event(provider_input text, provider_event_id_input text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.webhook_events
  set processing_status = 'processed', processed_at = timezone('utc', now()), error_details = null
  where provider = provider_input and provider_event_id = provider_event_id_input;
$$;

create or replace function public.fail_webhook_event(provider_input text, provider_event_id_input text, error_input text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.webhook_events
  set processing_status = 'failed', error_details = left(error_input, 2000)
  where provider = provider_input and provider_event_id = provider_event_id_input;
$$;

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

  for item_row in select product_id, variant_id, quantity from public.order_items where order_id = target_order_id
  loop
    if item_row.variant_id is null then
      update public.products
      set stock_quantity = stock_quantity - item_row.quantity
      where id = item_row.product_id and stock_quantity >= item_row.quantity;
    else
      update public.product_variants
      set stock_quantity = stock_quantity - item_row.quantity
      where id = item_row.variant_id and product_id = item_row.product_id and stock_quantity >= item_row.quantity;
    end if;
    if not found then raise exception 'Insufficient stock while confirming order'; end if;
  end loop;

  update public.orders
  set payment_status = 'paid', paypal_capture_id = capture_id
  where id = target_order_id;
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
    update public.orders set payment_status = 'refunded', paypal_capture_id = coalesce(capture_id, paypal_capture_id) where id = target_order_id;
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
  update public.orders set payment_status = 'refunded', paypal_capture_id = coalesce(capture_id, paypal_capture_id) where id = target_order_id;
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
  update public.orders set payment_status = target_status where id = target_order_id and payment_status = 'pending';
  return found;
end;
$$;

revoke all on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_order_refunded(uuid, text) from public, anon, authenticated;
revoke all on function public.set_order_payment_status(uuid, public.payment_status) from public, anon, authenticated;
revoke all on function public.claim_webhook_event(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.complete_webhook_event(text, text) from public, anon, authenticated;
revoke all on function public.fail_webhook_event(text, text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text) to service_role;
grant execute on function public.mark_order_refunded(uuid, text) to service_role;
grant execute on function public.set_order_payment_status(uuid, public.payment_status) to service_role;
grant execute on function public.claim_webhook_event(text, text, text, jsonb) to service_role;
grant execute on function public.complete_webhook_event(text, text) to service_role;
grant execute on function public.fail_webhook_event(text, text, text) to service_role;
