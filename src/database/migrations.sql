-- Arkham Ledger baseline schema + RLS
-- Execute in Supabase SQL editor (or via migration tooling) using service-level credentials.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'dm')),
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.character_sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  sheet_data jsonb not null default '{}'::jsonb,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.npc_sheets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete restrict,
  name text not null,
  sheet_data jsonb not null default '{}'::jsonb,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  sheet_type text not null check (sheet_type in ('character', 'npc')),
  sheet_id uuid not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (sheet_type, sheet_id)
);

create index if not exists idx_character_sheets_owner_id on public.character_sheets(owner_id);
create index if not exists idx_character_sheets_updated_at on public.character_sheets(updated_at desc);
create index if not exists idx_npc_sheets_created_by on public.npc_sheets(created_by);
create index if not exists idx_npc_sheets_updated_at on public.npc_sheets(updated_at desc);
create index if not exists idx_images_owner_id on public.images(owner_id);
create index if not exists idx_images_sheet_ref on public.images(sheet_type, sheet_id);

create or replace function public.is_dm(uid uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.users u
    where u.id = uid
      and u.role = 'dm'
  );
$$;

create or replace function public.validate_image_sheet_ref()
returns trigger
language plpgsql
as $$
begin
  if new.sheet_type = 'character' then
    if not exists(select 1 from public.character_sheets cs where cs.id = new.sheet_id) then
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

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, role, display_name)
  values (new.id, 'player', coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.users enable row level security;
alter table public.character_sheets enable row level security;
alter table public.npc_sheets enable row level security;
alter table public.images enable row level security;

-- Drop/recreate to make migration idempotent during iterative development.
drop policy if exists "users_select_self_or_dm" on public.users;
drop policy if exists "users_update_self" on public.users;
drop policy if exists "users_insert_self" on public.users;
drop policy if exists "character_select_owner_or_dm" on public.character_sheets;
drop policy if exists "character_insert_owner_or_dm" on public.character_sheets;
drop policy if exists "character_update_owner_or_dm" on public.character_sheets;
drop policy if exists "character_delete_owner_or_dm" on public.character_sheets;
drop policy if exists "npc_select_dm" on public.npc_sheets;
drop policy if exists "npc_insert_dm" on public.npc_sheets;
drop policy if exists "npc_update_dm" on public.npc_sheets;
drop policy if exists "npc_delete_dm" on public.npc_sheets;
drop policy if exists "images_select_owner_or_dm" on public.images;
drop policy if exists "images_insert_owner_or_dm" on public.images;
drop policy if exists "images_update_owner_or_dm" on public.images;
drop policy if exists "images_delete_owner_or_dm" on public.images;

-- users policies
create policy "users_select_self_or_dm"
  on public.users for select
  using (auth.uid() = id or public.is_dm(auth.uid()));

create policy "users_update_self"
  on public.users for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select u.role from public.users u where u.id = auth.uid())
  );

create policy "users_insert_self"
  on public.users for insert
  with check (auth.uid() = id);

-- character_sheets policies
create policy "character_select_owner_or_dm"
  on public.character_sheets for select
  using (owner_id = auth.uid() or public.is_dm(auth.uid()));

create policy "character_insert_owner_or_dm"
  on public.character_sheets for insert
  with check (owner_id = auth.uid() or public.is_dm(auth.uid()));

create policy "character_update_owner_or_dm"
  on public.character_sheets for update
  using (owner_id = auth.uid() or public.is_dm(auth.uid()))
  with check (owner_id = auth.uid() or public.is_dm(auth.uid()));

create policy "character_delete_owner_or_dm"
  on public.character_sheets for delete
  using (owner_id = auth.uid() or public.is_dm(auth.uid()));

-- npc_sheets policies (DM only)
create policy "npc_select_dm"
  on public.npc_sheets for select
  using (public.is_dm(auth.uid()));

create policy "npc_insert_dm"
  on public.npc_sheets for insert
  with check (public.is_dm(auth.uid()));

create policy "npc_update_dm"
  on public.npc_sheets for update
  using (public.is_dm(auth.uid()))
  with check (public.is_dm(auth.uid()));

create policy "npc_delete_dm"
  on public.npc_sheets for delete
  using (public.is_dm(auth.uid()));

-- images policies
create policy "images_select_owner_or_dm"
  on public.images for select
  using (owner_id = auth.uid() or public.is_dm(auth.uid()));

create policy "images_insert_owner_or_dm"
  on public.images for insert
  with check (owner_id = auth.uid() or public.is_dm(auth.uid()));

create policy "images_update_owner_or_dm"
  on public.images for update
  using (owner_id = auth.uid() or public.is_dm(auth.uid()))
  with check (owner_id = auth.uid() or public.is_dm(auth.uid()));

create policy "images_delete_owner_or_dm"
  on public.images for delete
  using (owner_id = auth.uid() or public.is_dm(auth.uid()));

-- Storage bucket & policies for images
insert into storage.buckets (id, name, public)
values ('sheet-images', 'sheet-images', true)
on conflict (id) do nothing;

drop policy if exists "sheet_images_read" on storage.objects;
drop policy if exists "sheet_images_upload_player_own_character" on storage.objects;
drop policy if exists "sheet_images_update_owner_or_dm" on storage.objects;
drop policy if exists "sheet_images_delete_owner_or_dm" on storage.objects;

create policy "sheet_images_read"
  on storage.objects for select
  using (bucket_id = 'sheet-images');

create policy "sheet_images_upload_player_own_character"
  on storage.objects for insert
  with check (
    bucket_id = 'sheet-images'
    and (
      public.is_dm(auth.uid())
      or (
        (storage.foldername(name))[1] = 'characters'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "sheet_images_update_owner_or_dm"
  on storage.objects for update
  using (
    bucket_id = 'sheet-images'
    and (
      public.is_dm(auth.uid())
      or (
        (storage.foldername(name))[1] = 'characters'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  )
  with check (
    bucket_id = 'sheet-images'
    and (
      public.is_dm(auth.uid())
      or (
        (storage.foldername(name))[1] = 'characters'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "sheet_images_delete_owner_or_dm"
  on storage.objects for delete
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_character_sheets_updated_at on public.character_sheets;
create trigger trg_character_sheets_updated_at before update on public.character_sheets
for each row execute function public.set_updated_at();

drop trigger if exists trg_npc_sheets_updated_at on public.npc_sheets;
create trigger trg_npc_sheets_updated_at before update on public.npc_sheets
for each row execute function public.set_updated_at();

drop trigger if exists trg_images_updated_at on public.images;
create trigger trg_images_updated_at before update on public.images
for each row execute function public.set_updated_at();

drop trigger if exists trg_validate_image_sheet_ref on public.images;
create trigger trg_validate_image_sheet_ref
before insert or update on public.images
for each row execute function public.validate_image_sheet_ref();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
