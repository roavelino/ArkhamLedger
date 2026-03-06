-- Arkham Ledger base schema
create table if not exists characters (
  id uuid primary key,
  name text not null,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists npcs (
  id uuid primary key,
  character_id uuid references characters(id) on delete cascade,
  name text not null,
  role text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
