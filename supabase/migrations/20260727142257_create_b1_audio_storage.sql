insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio_assets',
  'audio_assets',
  true,
  10485760,
  array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a']
)
on conflict (id) do nothing;

create policy "B1 admins can read audio assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'audio_assets'
  and (select public.is_admin())
);

create policy "B1 admins can upload audio assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'audio_assets'
  and (select public.is_admin())
);

create policy "B1 admins can update audio assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'audio_assets'
  and (select public.is_admin())
)
with check (
  bucket_id = 'audio_assets'
  and (select public.is_admin())
);

create policy "B1 admins can delete audio assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'audio_assets'
  and (select public.is_admin())
);
