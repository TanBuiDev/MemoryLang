-- Keep uploaded exam media independent from a particular section, with an
-- explicit usage graph. Existing learner attempts retain public URLs in their
-- immutable snapshots, so replacing source media never changes an attempt.
create table public.exam_media_assets (
  id uuid primary key default gen_random_uuid(),
  media_kind text not null check (media_kind in ('audio', 'image')),
  bucket_id text not null,
  storage_path text not null,
  public_url text not null,
  display_name text not null,
  language_code text,
  transcript text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  version_number integer not null default 1 check (version_number > 0),
  replaces_asset_id uuid references public.exam_media_assets(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create table public.exam_media_asset_usages (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.exam_media_assets(id) on delete restrict,
  resource_type text not null check (resource_type in ('activity', 'prompt', 'question')),
  resource_id uuid not null,
  usage_role text not null check (usage_role in ('audio', 'image', 'tts_prompt')),
  created_at timestamptz not null default now(),
  unique (asset_id, resource_type, resource_id, usage_role)
);

create index exam_media_asset_usages_asset_id_idx on public.exam_media_asset_usages(asset_id);
create index exam_media_asset_usages_resource_idx on public.exam_media_asset_usages(resource_type, resource_id);

create or replace function public.assign_exam_media_asset_version()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  previous_asset public.exam_media_assets%rowtype;
begin
  if new.replaces_asset_id is null then
    new.version_number := 1;
    return new;
  end if;

  select * into previous_asset
  from public.exam_media_assets
  where id = new.replaces_asset_id;

  if previous_asset.id is null or previous_asset.media_kind <> new.media_kind then
    raise exception 'A media asset can only replace an asset of the same kind.';
  end if;

  new.version_number := previous_asset.version_number + 1;
  return new;
end;
$function$;

create trigger set_exam_media_asset_version
before insert on public.exam_media_assets
for each row execute function public.assign_exam_media_asset_version();

-- Register current B1 URLs first. Storage URLs are marked managed so they can
-- later be deleted safely; third-party/TTS URLs remain external metadata only.
with source_assets as (
  select distinct
    'audio'::text as media_kind,
    case when pa.audio_url like '%/storage/v1/object/public/audio_assets/%' then 'audio_assets' else 'external' end as bucket_id,
    case when pa.audio_url like '%/storage/v1/object/public/audio_assets/%' then regexp_replace(pa.audio_url, '^.*/storage/v1/object/public/audio_assets/', '') else 'legacy/' || md5(pa.audio_url) end as storage_path,
    pa.audio_url as public_url,
    pa.title as display_name
  from public.practice_activities pa
  join public.exam_sections es on es.resource_type = 'activity' and es.resource_id = pa.id
  join public.exams e on e.id = es.exam_id and e.source_key = 'b1-de-full-copy'
  where coalesce(btrim(pa.audio_url), '') <> ''
  union
  select distinct
    'audio'::text,
    case when pp.audio_url like '%/storage/v1/object/public/audio_assets/%' then 'audio_assets' else 'external' end,
    case when pp.audio_url like '%/storage/v1/object/public/audio_assets/%' then regexp_replace(pp.audio_url, '^.*/storage/v1/object/public/audio_assets/', '') else 'legacy/' || md5(pp.audio_url) end,
    pp.audio_url,
    pp.title
  from public.practice_prompts pp
  join public.exam_sections es on es.resource_type = 'prompt' and es.resource_id = pp.id
  join public.exams e on e.id = es.exam_id and e.source_key = 'b1-de-full-copy'
  where coalesce(btrim(pp.audio_url), '') <> ''
  union
  select distinct
    'image'::text,
    case when pq.image_url like '%/storage/v1/object/public/vocabulary-images/%' then 'vocabulary-images' else 'external' end,
    case when pq.image_url like '%/storage/v1/object/public/vocabulary-images/%' then regexp_replace(pq.image_url, '^.*/storage/v1/object/public/vocabulary-images/', '') else 'legacy/' || md5(pq.image_url) end,
    pq.image_url,
    coalesce(pq.source_number, pq.source_key)
  from public.practice_questions pq
  join public.practice_activities pa on pa.id = pq.activity_id and pa.source_key = 'signs'
  where coalesce(btrim(pq.image_url), '') <> ''
)
insert into public.exam_media_assets (media_kind, bucket_id, storage_path, public_url, display_name)
select media_kind, bucket_id, storage_path, public_url, display_name
from source_assets
on conflict (bucket_id, storage_path) do nothing;

insert into public.exam_media_asset_usages (asset_id, resource_type, resource_id, usage_role)
select asset.id, 'activity', pa.id, 'audio'
from public.practice_activities pa
join public.exam_sections es on es.resource_type = 'activity' and es.resource_id = pa.id
join public.exams e on e.id = es.exam_id and e.source_key = 'b1-de-full-copy'
join public.exam_media_assets asset on asset.public_url = pa.audio_url and asset.media_kind = 'audio'
where coalesce(btrim(pa.audio_url), '') <> ''
on conflict do nothing;

insert into public.exam_media_asset_usages (asset_id, resource_type, resource_id, usage_role)
select asset.id, 'prompt', pp.id, 'audio'
from public.practice_prompts pp
join public.exam_sections es on es.resource_type = 'prompt' and es.resource_id = pp.id
join public.exams e on e.id = es.exam_id and e.source_key = 'b1-de-full-copy'
join public.exam_media_assets asset on asset.public_url = pp.audio_url and asset.media_kind = 'audio'
where coalesce(btrim(pp.audio_url), '') <> ''
on conflict do nothing;

insert into public.exam_media_asset_usages (asset_id, resource_type, resource_id, usage_role)
select asset.id, 'question', pq.id, 'image'
from public.practice_questions pq
join public.practice_activities pa on pa.id = pq.activity_id and pa.source_key = 'signs'
join public.exam_media_assets asset on asset.public_url = pq.image_url and asset.media_kind = 'image'
where coalesce(btrim(pq.image_url), '') <> ''
on conflict do nothing;

alter table public.exam_media_assets enable row level security;
alter table public.exam_media_asset_usages enable row level security;

create policy "Admins manage exam media assets" on public.exam_media_assets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage exam media usages" on public.exam_media_asset_usages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.exam_media_assets to authenticated;
grant select, insert, update, delete on public.exam_media_asset_usages to authenticated;

-- The audio bucket already has this policy. Signs use the shared image bucket,
-- so make the required admin-only deletion permission explicit and idempotent.
do $block$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'B1 admins can delete sign images'
  ) then
    create policy "B1 admins can delete sign images"
      on storage.objects for delete to authenticated
      using (bucket_id = 'vocabulary-images' and (select public.is_admin()));
  end if;
end;
$block$;
