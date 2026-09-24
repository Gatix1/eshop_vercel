-- Phase 2 foundation: customer profiles, roles, and authorization boundaries.
create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'owner', 'admin', 'inventory_manager', 'order_manager');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  phone text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_length check (char_length(email) between 3 and 320),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 120),
  constraint profiles_phone_length check (phone is null or char_length(phone) between 3 and 32)
);

create index profiles_role_idx on public.profiles(role);
create index profiles_active_idx on public.profiles(is_active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    lower(new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in ('owner', 'admin', 'inventory_manager', 'order_manager')
  );
$$;

create or replace function public.provision_owner(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  provisioned public.profiles;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the service role can provision the initial owner';
  end if;

  update public.profiles
  set role = 'owner', is_active = true
  where id = target_user_id
  returning * into provisioned;

  if provisioned.id is null then
    raise exception 'No profile exists for user %', target_user_id;
  end if;

  return provisioned;
end;
$$;

alter table public.profiles enable row level security;

create policy "Customers can view their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Staff can view profiles"
on public.profiles for select
to authenticated
using (public.is_staff());

create policy "Customers can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid() and is_active = true)
with check (
  id = auth.uid()
  and role = 'customer'
  and is_active = true
);

create policy "Owners can update staff profiles"
on public.profiles for update
to authenticated
using (
  exists (
    select 1 from public.profiles actor
    where actor.id = auth.uid() and actor.role = 'owner' and actor.is_active = true
  )
)
with check (public.is_staff() or role = 'customer');

revoke all on function public.provision_owner(uuid) from public, anon, authenticated;
grant execute on function public.provision_owner(uuid) to service_role;
