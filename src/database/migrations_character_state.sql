-- Character state and permission updates (March 2026)
-- Run this after baseline migration.

alter table public.character_sheets
  add column if not exists is_active boolean not null default true;

update public.character_sheets
set is_active = true
where is_active is null;

with ranked_active as (
  select
    id,
    row_number() over (partition by owner_id order by updated_at desc, created_at desc, id desc) as rn
  from public.character_sheets
  where is_active = true
)
update public.character_sheets
set is_active = false
where id in (select id from ranked_active where rn > 1);

create unique index if not exists uniq_character_active_owner
  on public.character_sheets(owner_id)
  where is_active = true;

create or replace function public.can_create_character_sheet(actor_uid uuid, target_owner_id uuid)
returns boolean
language sql
stable
as $$
  select
    case
      when actor_uid is null then false
      when public.is_dm(actor_uid) then true
      when actor_uid <> target_owner_id then false
      else not exists (
        select 1
        from public.character_sheets cs
        where cs.owner_id = actor_uid
          and cs.is_active = true
      )
    end;
$$;

create or replace function public.can_manage_image_record(
  actor_uid uuid,
  image_owner_id uuid,
  image_sheet_type text,
  image_sheet_id uuid
)
returns boolean
language sql
stable
as $$
  select
    case
      when actor_uid is null then false
      when public.is_dm(actor_uid) then
        case
          when image_sheet_type = 'character' then exists(select 1 from public.character_sheets cs where cs.id = image_sheet_id)
          when image_sheet_type = 'npc' then exists(select 1 from public.npc_sheets ns where ns.id = image_sheet_id)
          else false
        end
      when actor_uid <> image_owner_id then false
      when image_sheet_type = 'character' then exists(
        select 1
        from public.character_sheets cs
        where cs.id = image_sheet_id
          and cs.owner_id = actor_uid
      )
      else false
    end;
$$;

create or replace function public.validate_image_sheet_ref()
returns trigger
language plpgsql
as $$
begin
  if new.sheet_type = 'character' then
    if not exists(select 1 from public.character_sheets cs where cs.id = new.sheet_id and cs.owner_id = new.owner_id) then
      raise exception 'Invalid character sheet reference for image: %', new.sheet_id;
    end if;
  elsif new.sheet_type = 'npc' then
    if not exists(select 1 from public.npc_sheets ns where ns.id = new.sheet_id) then
      raise exception 'Invalid npc sheet reference for image: %', new.sheet_id;
    end if;
  else
    raise exception 'Unsupported sheet_type: %', new.sheet_type;
  end if;

  return new;
end;
$$;

drop policy if exists "character_insert_owner_or_dm" on public.character_sheets;
drop policy if exists "character_update_owner_or_dm" on public.character_sheets;
drop policy if exists "character_delete_owner_or_dm" on public.character_sheets;
drop policy if exists "images_select_owner_or_dm" on public.images;
drop policy if exists "images_insert_owner_or_dm" on public.images;
drop policy if exists "images_update_owner_or_dm" on public.images;
drop policy if exists "images_delete_owner_or_dm" on public.images;
drop policy if exists "sheet_images_read" on storage.objects;

alter table public.images
alter column public_url drop not null;

create policy "character_insert_owner_or_dm"
  on public.character_sheets for insert
  with check (public.can_create_character_sheet(auth.uid(), owner_id));

create policy "character_update_owner_or_dm"
  on public.character_sheets for update
  using (public.is_dm(auth.uid()) or owner_id = auth.uid())
  with check (public.is_dm(auth.uid()) or owner_id = auth.uid());

create policy "character_delete_owner_or_dm"
  on public.character_sheets for delete
  using (public.is_dm(auth.uid()) or owner_id = auth.uid());

create policy "images_select_owner_or_dm"
  on public.images for select
  using (public.can_manage_image_record(auth.uid(), owner_id, sheet_type, sheet_id));

create policy "images_insert_owner_or_dm"
  on public.images for insert
  with check (public.can_manage_image_record(auth.uid(), owner_id, sheet_type, sheet_id));

create policy "images_update_owner_or_dm"
  on public.images for update
  using (public.can_manage_image_record(auth.uid(), owner_id, sheet_type, sheet_id))
  with check (public.can_manage_image_record(auth.uid(), owner_id, sheet_type, sheet_id));

create policy "images_delete_owner_or_dm"
  on public.images for delete
  using (public.can_manage_image_record(auth.uid(), owner_id, sheet_type, sheet_id));

update storage.buckets
set public = false
where id = 'sheet-images';

create policy "sheet_images_read"
  on storage.objects for select
  using (
    bucket_id = 'sheet-images'
    and (
      public.is_dm(auth.uid())
      or (
        (storage.foldername(name))[1] = 'characters'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
