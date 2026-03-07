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

-- Campaign and investigation support (March 2026)

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  public_summary text not null default '',
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'player' check (role in ('dm', 'player')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, user_id)
);

alter table public.character_sheets
  add column if not exists owner_user_id uuid references public.users(id) on delete set null,
  add column if not exists type text not null default 'player_character' check (type in ('player_character', 'npc')),
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists age integer,
  add column if not exists occupation text,
  add column if not exists description text,
  add column if not exists intro_video_url text,
  add column if not exists notes text,
  add column if not exists archived_at timestamptz;

update public.character_sheets
set
  owner_user_id = coalesce(owner_user_id, owner_id),
  type = coalesce(type, 'player_character'),
  age = coalesce(age, nullif(sheet_data ->> 'age', '')::integer),
  occupation = coalesce(occupation, nullif(sheet_data ->> 'occupation', '')),
  description = coalesce(description, nullif(sheet_data ->> 'description', '')),
  notes = coalesce(notes, nullif(sheet_data ->> 'notes', ''))
where owner_user_id is null
   or age is null
   or occupation is null
   or description is null
   or notes is null;

create index if not exists idx_campaigns_owner_user_id on public.campaigns(owner_user_id);
create index if not exists idx_campaign_members_campaign_id on public.campaign_members(campaign_id);
create index if not exists idx_campaign_members_user_id on public.campaign_members(user_id);
create index if not exists idx_character_sheets_campaign_id on public.character_sheets(campaign_id);
create index if not exists idx_character_sheets_type on public.character_sheets(type);

create or replace function public.is_campaign_dm(actor_uid uuid, target_campaign_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.campaigns c
    where c.id = target_campaign_id
      and c.owner_user_id = actor_uid
  );
$$;

create or replace function public.is_campaign_member(actor_uid uuid, target_campaign_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.campaign_members cm
    where cm.campaign_id = target_campaign_id
      and cm.user_id = actor_uid
  )
  or public.is_campaign_dm(actor_uid, target_campaign_id);
$$;

create or replace function public.can_view_character_sheet(
  actor_uid uuid,
  sheet_owner_id uuid,
  sheet_type text,
  target_campaign_id uuid,
  sheet_payload jsonb
)
returns boolean
language sql
stable
as $$
  select
    case
      when actor_uid is null then false
      when public.is_dm(actor_uid) then true
      when actor_uid = sheet_owner_id then true
      when sheet_type = 'npc'
        and target_campaign_id is not null
        and public.is_campaign_member(actor_uid, target_campaign_id)
        and coalesce((sheet_payload ->> 'player_visible')::boolean, false) = true then true
      else false
    end;
$$;

create or replace function public.can_read_campaign_content(
  actor_uid uuid,
  target_campaign_id uuid,
  row_visibility text,
  shared_uid uuid
)
returns boolean
language sql
stable
as $$
  select
    case
      when actor_uid is null then false
      when public.is_campaign_dm(actor_uid, target_campaign_id) then true
      when not public.is_campaign_member(actor_uid, target_campaign_id) then false
      when row_visibility = 'shared_all' then true
      when row_visibility = 'shared_player' and shared_uid = actor_uid then true
      else false
    end;
$$;

create or replace function public.can_access_campaign_asset_path(actor_uid uuid, asset_name text)
returns boolean
language sql
stable
as $$
  select
    case
      when actor_uid is null then false
      when asset_name is null then false
      when (storage.foldername(asset_name))[1] = 'npc-gallery' then
        public.is_dm(actor_uid) and (storage.foldername(asset_name))[2] = actor_uid::text
      else exists(
        select 1
        from public.campaigns c
        where c.id::text = (storage.foldername(asset_name))[1]
          and public.is_campaign_member(actor_uid, c.id)
      )
    end;
$$;

create or replace function public.can_manage_campaign_asset_path(actor_uid uuid, asset_name text)
returns boolean
language sql
stable
as $$
  select
    case
      when actor_uid is null then false
      when asset_name is null then false
      when (storage.foldername(asset_name))[1] = 'npc-gallery' then
        public.is_dm(actor_uid) and (storage.foldername(asset_name))[2] = actor_uid::text
      else exists(
        select 1
        from public.campaigns c
        where c.id::text = (storage.foldername(asset_name))[1]
          and public.is_campaign_dm(actor_uid, c.id)
      )
    end;
$$;

create or replace function public.can_access_sheet_media_path(actor_uid uuid, asset_name text)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.character_sheets cs
    where cs.id::text = (storage.foldername(asset_name))[2]
      and public.can_view_character_sheet(actor_uid, cs.owner_id, cs.type, cs.campaign_id, cs.sheet_data)
  );
$$;

create or replace function public.can_manage_sheet_media_path(actor_uid uuid, asset_name text)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.character_sheets cs
    where cs.id::text = (storage.foldername(asset_name))[2]
      and (
        public.is_dm(actor_uid)
        or cs.owner_id = actor_uid
      )
  );
$$;

create or replace function public.validate_visibility_assignment()
returns trigger
language plpgsql
as $$
begin
  if new.visibility = 'shared_player' and new.shared_with_user_id is null then
    raise exception 'shared_player rows require shared_with_user_id';
  end if;

  if new.visibility = 'dm_only' then
    new.shared_with_user_id = null;
  end if;

  return new;
end;
$$;

create table if not exists public.session_summaries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  session_number integer,
  session_date date,
  summary_markdown text not null default '',
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  event_type text not null default 'event',
  event_date date,
  date_label text,
  description text not null default '',
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clues (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  description text not null default '',
  image_url text,
  file_url text,
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  status text not null default 'hidden' check (status in ('hidden', 'available', 'found')),
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.clues
  add column if not exists archived_at timestamptz;

create table if not exists public.handouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  type text not null default 'markdown' check (type in ('text', 'markdown', 'image', 'pdf')),
  content_text text,
  file_url text,
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.handouts
  add column if not exists archived_at timestamptz;

create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  image_url text not null,
  description text,
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.map_pins (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  label text not null,
  x_position numeric not null,
  y_position numeric not null,
  description text,
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  linked_npc_id uuid references public.character_sheets(id) on delete set null,
  linked_clue_id uuid references public.clues(id) on delete set null,
  linked_handout_id uuid references public.handouts(id) on delete set null,
  linked_timeline_entry_id uuid references public.timeline_entries(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.markdown_documents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  markdown_content text not null default '',
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.relationship_diagrams (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  mermaid_source text not null default '',
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.npc_gallery_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  image_url text not null,
  label text,
  tags_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dm_screen_pages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  content_type text not null,
  content_json_or_text text not null default '',
  sort_order integer not null default 0,
  visibility text not null default 'dm_only' check (visibility in ('dm_only', 'shared_all', 'shared_player')),
  shared_with_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists session_summaries_validate_visibility on public.session_summaries;
create trigger session_summaries_validate_visibility
before insert or update on public.session_summaries
for each row execute function public.validate_visibility_assignment();

drop trigger if exists timeline_entries_validate_visibility on public.timeline_entries;
create trigger timeline_entries_validate_visibility
before insert or update on public.timeline_entries
for each row execute function public.validate_visibility_assignment();

drop trigger if exists clues_validate_visibility on public.clues;
create trigger clues_validate_visibility
before insert or update on public.clues
for each row execute function public.validate_visibility_assignment();

drop trigger if exists handouts_validate_visibility on public.handouts;
create trigger handouts_validate_visibility
before insert or update on public.handouts
for each row execute function public.validate_visibility_assignment();

drop trigger if exists maps_validate_visibility on public.maps;
create trigger maps_validate_visibility
before insert or update on public.maps
for each row execute function public.validate_visibility_assignment();

drop trigger if exists map_pins_validate_visibility on public.map_pins;
create trigger map_pins_validate_visibility
before insert or update on public.map_pins
for each row execute function public.validate_visibility_assignment();

drop trigger if exists markdown_documents_validate_visibility on public.markdown_documents;
create trigger markdown_documents_validate_visibility
before insert or update on public.markdown_documents
for each row execute function public.validate_visibility_assignment();

drop trigger if exists relationship_diagrams_validate_visibility on public.relationship_diagrams;
create trigger relationship_diagrams_validate_visibility
before insert or update on public.relationship_diagrams
for each row execute function public.validate_visibility_assignment();

drop trigger if exists dm_screen_pages_validate_visibility on public.dm_screen_pages;
create trigger dm_screen_pages_validate_visibility
before insert or update on public.dm_screen_pages
for each row execute function public.validate_visibility_assignment();

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.session_summaries enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.clues enable row level security;
alter table public.handouts enable row level security;
alter table public.maps enable row level security;
alter table public.map_pins enable row level security;
alter table public.markdown_documents enable row level security;
alter table public.relationship_diagrams enable row level security;
alter table public.npc_gallery_assets enable row level security;
alter table public.dm_screen_pages enable row level security;

drop policy if exists "character_select_owner_or_dm" on public.character_sheets;
create policy "character_select_owner_or_dm"
  on public.character_sheets for select
  using (public.can_view_character_sheet(auth.uid(), owner_id, type, campaign_id, sheet_data));

drop policy if exists "campaign_select_member_or_owner" on public.campaigns;
drop policy if exists "campaign_insert_dm_owner" on public.campaigns;
drop policy if exists "campaign_update_dm_owner" on public.campaigns;
drop policy if exists "campaign_delete_dm_owner" on public.campaigns;
create policy "campaign_select_member_or_owner"
  on public.campaigns for select
  using (owner_user_id = auth.uid() or public.is_campaign_member(auth.uid(), id));
create policy "campaign_insert_dm_owner"
  on public.campaigns for insert
  with check (public.is_dm(auth.uid()) and owner_user_id = auth.uid());
create policy "campaign_update_dm_owner"
  on public.campaigns for update
  using (owner_user_id = auth.uid() and public.is_dm(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_dm(auth.uid()));
create policy "campaign_delete_dm_owner"
  on public.campaigns for delete
  using (owner_user_id = auth.uid() and public.is_dm(auth.uid()));

drop policy if exists "campaign_members_select_member_or_owner" on public.campaign_members;
drop policy if exists "campaign_members_insert_owner" on public.campaign_members;
drop policy if exists "campaign_members_update_owner" on public.campaign_members;
drop policy if exists "campaign_members_delete_owner" on public.campaign_members;
create policy "campaign_members_select_member_or_owner"
  on public.campaign_members for select
  using (user_id = auth.uid() or public.is_campaign_dm(auth.uid(), campaign_id));
create policy "campaign_members_insert_owner"
  on public.campaign_members for insert
  with check (public.is_campaign_dm(auth.uid(), campaign_id));
create policy "campaign_members_update_owner"
  on public.campaign_members for update
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));
create policy "campaign_members_delete_owner"
  on public.campaign_members for delete
  using (public.is_campaign_dm(auth.uid(), campaign_id));

drop policy if exists "session_summaries_select_visibility" on public.session_summaries;
drop policy if exists "session_summaries_manage_owner" on public.session_summaries;
create policy "session_summaries_select_visibility"
  on public.session_summaries for select
  using (public.can_read_campaign_content(auth.uid(), campaign_id, visibility, shared_with_user_id));
create policy "session_summaries_manage_owner"
  on public.session_summaries for all
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));

drop policy if exists "timeline_entries_select_visibility" on public.timeline_entries;
drop policy if exists "timeline_entries_manage_owner" on public.timeline_entries;
create policy "timeline_entries_select_visibility"
  on public.timeline_entries for select
  using (public.can_read_campaign_content(auth.uid(), campaign_id, visibility, shared_with_user_id));
create policy "timeline_entries_manage_owner"
  on public.timeline_entries for all
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));

drop policy if exists "clues_select_visibility" on public.clues;
drop policy if exists "clues_manage_owner" on public.clues;
create policy "clues_select_visibility"
  on public.clues for select
  using (public.can_read_campaign_content(auth.uid(), campaign_id, visibility, shared_with_user_id));
create policy "clues_manage_owner"
  on public.clues for all
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));

drop policy if exists "handouts_select_visibility" on public.handouts;
drop policy if exists "handouts_manage_owner" on public.handouts;
create policy "handouts_select_visibility"
  on public.handouts for select
  using (public.can_read_campaign_content(auth.uid(), campaign_id, visibility, shared_with_user_id));
create policy "handouts_manage_owner"
  on public.handouts for all
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));

drop policy if exists "maps_select_visibility" on public.maps;
drop policy if exists "maps_manage_owner" on public.maps;
create policy "maps_select_visibility"
  on public.maps for select
  using (public.can_read_campaign_content(auth.uid(), campaign_id, visibility, shared_with_user_id));
create policy "maps_manage_owner"
  on public.maps for all
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));

drop policy if exists "map_pins_select_visibility" on public.map_pins;
drop policy if exists "map_pins_manage_owner" on public.map_pins;
create policy "map_pins_select_visibility"
  on public.map_pins for select
  using (
    exists(
      select 1
      from public.maps m
      where m.id = map_id
        and public.can_read_campaign_content(auth.uid(), m.campaign_id, visibility, shared_with_user_id)
    )
  );
create policy "map_pins_manage_owner"
  on public.map_pins for all
  using (
    exists(
      select 1
      from public.maps m
      where m.id = map_id
        and public.is_campaign_dm(auth.uid(), m.campaign_id)
    )
  )
  with check (
    exists(
      select 1
      from public.maps m
      where m.id = map_id
        and public.is_campaign_dm(auth.uid(), m.campaign_id)
    )
  );

drop policy if exists "markdown_documents_select_visibility" on public.markdown_documents;
drop policy if exists "markdown_documents_manage_owner" on public.markdown_documents;
create policy "markdown_documents_select_visibility"
  on public.markdown_documents for select
  using (public.can_read_campaign_content(auth.uid(), campaign_id, visibility, shared_with_user_id));
create policy "markdown_documents_manage_owner"
  on public.markdown_documents for all
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));

drop policy if exists "relationship_diagrams_select_visibility" on public.relationship_diagrams;
drop policy if exists "relationship_diagrams_manage_owner" on public.relationship_diagrams;
create policy "relationship_diagrams_select_visibility"
  on public.relationship_diagrams for select
  using (public.can_read_campaign_content(auth.uid(), campaign_id, visibility, shared_with_user_id));
create policy "relationship_diagrams_manage_owner"
  on public.relationship_diagrams for all
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));

drop policy if exists "npc_gallery_assets_select_owner" on public.npc_gallery_assets;
drop policy if exists "npc_gallery_assets_manage_owner" on public.npc_gallery_assets;
create policy "npc_gallery_assets_select_owner"
  on public.npc_gallery_assets for select
  using (owner_user_id = auth.uid() and public.is_dm(auth.uid()));
create policy "npc_gallery_assets_manage_owner"
  on public.npc_gallery_assets for all
  using (owner_user_id = auth.uid() and public.is_dm(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_dm(auth.uid()));

drop policy if exists "dm_screen_pages_select_visibility" on public.dm_screen_pages;
drop policy if exists "dm_screen_pages_manage_owner" on public.dm_screen_pages;
create policy "dm_screen_pages_select_visibility"
  on public.dm_screen_pages for select
  using (public.can_read_campaign_content(auth.uid(), campaign_id, visibility, shared_with_user_id));
create policy "dm_screen_pages_manage_owner"
  on public.dm_screen_pages for all
  using (public.is_campaign_dm(auth.uid(), campaign_id))
  with check (public.is_campaign_dm(auth.uid(), campaign_id));

insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('sheet-media', 'sheet-media', false)
on conflict (id) do nothing;

drop policy if exists "campaign_assets_rw_authenticated" on storage.objects;
drop policy if exists "campaign_assets_read_scoped" on storage.objects;
drop policy if exists "campaign_assets_write_scoped" on storage.objects;
create policy "campaign_assets_read_scoped"
  on storage.objects for select
  using (
    bucket_id = 'campaign-assets'
    and public.can_access_campaign_asset_path(auth.uid(), name)
  );
create policy "campaign_assets_write_scoped"
  on storage.objects for all
  using (
    bucket_id = 'campaign-assets'
    and public.can_manage_campaign_asset_path(auth.uid(), name)
  )
  with check (
    bucket_id = 'campaign-assets'
    and public.can_manage_campaign_asset_path(auth.uid(), name)
  );

drop policy if exists "sheet_media_rw_authenticated" on storage.objects;
drop policy if exists "sheet_media_read_scoped" on storage.objects;
drop policy if exists "sheet_media_write_scoped" on storage.objects;
create policy "sheet_media_read_scoped"
  on storage.objects for select
  using (
    bucket_id = 'sheet-media'
    and public.can_access_sheet_media_path(auth.uid(), name)
  );
create policy "sheet_media_write_scoped"
  on storage.objects for all
  using (
    bucket_id = 'sheet-media'
    and public.can_manage_sheet_media_path(auth.uid(), name)
  )
  with check (
    bucket_id = 'sheet-media'
    and public.can_manage_sheet_media_path(auth.uid(), name)
  );
