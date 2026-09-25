-- Phase 3: public catalog, variants, images, stock, and category browsing.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  brand text,
  model text,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  base_price numeric(12, 2) not null check (base_price >= 0),
  sku text not null unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  warranty_information text,
  main_image text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  attributes jsonb not null default '{}'::jsonb,
  sku text not null unique,
  price numeric(12, 2) not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index categories_active_idx on public.categories(is_active);
create index products_category_idx on public.products(category_id);
create index products_active_featured_idx on public.products(is_active, is_featured);
create index products_created_idx on public.products(created_at desc);
create index product_variants_product_idx on public.product_variants(product_id);
create index product_images_product_idx on public.product_images(product_id, sort_order);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

create policy "Anyone can view active categories"
on public.categories for select
to anon, authenticated
using (is_active = true);

create policy "Anyone can view active products"
on public.products for select
to anon, authenticated
using (is_active = true);

create policy "Anyone can view active variants"
on public.product_variants for select
to anon, authenticated
using (is_active = true);

create policy "Anyone can view product images"
on public.product_images for select
to anon, authenticated
using (exists (
  select 1 from public.products
  where products.id = product_images.product_id and products.is_active = true
));
