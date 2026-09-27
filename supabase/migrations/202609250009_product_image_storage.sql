-- Phase 8: public product image storage with staff-managed metadata.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can view product image files"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy "Catalog staff can upload product image files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and exists (select 1 from public.profiles where id = auth.uid() and is_active and role in ('owner', 'admin', 'inventory_manager')));

create policy "Catalog staff can update product image files"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and exists (select 1 from public.profiles where id = auth.uid() and is_active and role in ('owner', 'admin', 'inventory_manager')))
with check (bucket_id = 'product-images' and exists (select 1 from public.profiles where id = auth.uid() and is_active and role in ('owner', 'admin', 'inventory_manager')));

create policy "Catalog staff can delete product image files"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and exists (select 1 from public.profiles where id = auth.uid() and is_active and role in ('owner', 'admin', 'inventory_manager')));
