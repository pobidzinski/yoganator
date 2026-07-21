-- Public bucket for pose photos — consistent with the app's no-auth,
-- anon-key-only model. "public" only controls unauthenticated GET via the
-- CDN URL; storage.objects still has RLS enabled by default, so explicit
-- policies are required for the anon key to upload/replace/delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pose-images', 'pose-images', true, 5242880,
        array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "pose-images public read"
  on storage.objects for select
  to public
  using (bucket_id = 'pose-images');

create policy "pose-images public insert"
  on storage.objects for insert
  to public
  with check (bucket_id = 'pose-images');

create policy "pose-images public update"
  on storage.objects for update
  to public
  using (bucket_id = 'pose-images');

create policy "pose-images public delete"
  on storage.objects for delete
  to public
  using (bucket_id = 'pose-images');
