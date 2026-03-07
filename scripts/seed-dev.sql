-- Local development seed data for Arkham Ledger.
-- Apply after the schema migrations. Adjust auth users separately in Supabase Auth.

insert into public.users (id, role, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'dm', 'Keeper Rowan'),
  ('22222222-2222-2222-2222-222222222222', 'player', 'Daisy Walker'),
  ('33333333-3333-3333-3333-333333333333', 'player', 'Michael McGlen')
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name,
    updated_at = timezone('utc', now());

insert into public.campaigns (id, owner_user_id, title, public_summary, status)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'The Whispering Archive',
  'Investigators trace a series of disappearances tied to forbidden records in Arkham.',
  'active'
)
on conflict (id) do update
set title = excluded.title,
    public_summary = excluded.public_summary,
    status = excluded.status,
    updated_at = timezone('utc', now());

insert into public.campaign_members (campaign_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'player'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'player')
on conflict (campaign_id, user_id) do update
set role = excluded.role;

insert into public.character_sheets (
  id,
  owner_id,
  owner_user_id,
  name,
  type,
  campaign_id,
  is_active,
  age,
  occupation,
  description,
  notes,
  sheet_data
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Agnes Harper',
    'player_character',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    true,
    29,
    'Librarian',
    'Researches occult newspapers and missing references.',
    'Suspicious of the restricted archives.',
    '{"home":"Arkham","skills":[{"name":"Library Use","base":20,"value":65},{"name":"Occult","base":5,"value":40}],"player_visible":false}'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'Jonah Price',
    'player_character',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    true,
    37,
    'Reporter',
    'Tracks corruption around Miskatonic University.',
    'Keeps a hidden notebook with witness statements.',
    '{"home":"Boston","skills":[{"name":"Fast Talk","base":5,"value":55},{"name":"Spot Hidden","base":25,"value":60}],"player_visible":false}'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    '11111111-1111-1111-1111-111111111111',
    null,
    'Professor Elbridge Thorne',
    'npc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    true,
    54,
    'Historian',
    'Nervous curator who knows more than he admits.',
    'Reveal after session 1.',
    '{"home":"Arkham","skills":[],"player_visible":true}'::jsonb
  )
on conflict (id) do update
set campaign_id = excluded.campaign_id,
    name = excluded.name,
    type = excluded.type,
    occupation = excluded.occupation,
    description = excluded.description,
    notes = excluded.notes,
    sheet_data = excluded.sheet_data,
    updated_at = timezone('utc', now());

insert into public.session_summaries (id, campaign_id, title, session_number, summary_markdown, visibility)
values (
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Session 1',
  1,
  '# The Restricted Wing

- The investigators gained access to the archives.
- A missing folio referenced the name `Carcosa`.
- Professor Thorne asked for secrecy.',
  'shared_all'
)
on conflict (id) do update
set summary_markdown = excluded.summary_markdown,
    visibility = excluded.visibility,
    updated_at = timezone('utc', now());

insert into public.clues (id, campaign_id, title, description, visibility, status)
values (
  'cccccccc-cccc-cccc-cccc-ccccccccccc2',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Ledger Fragment',
  'A torn ledger page listing payments to a false bookseller.',
  'shared_all',
  'available'
)
on conflict (id) do update
set description = excluded.description,
    visibility = excluded.visibility,
    status = excluded.status,
    updated_at = timezone('utc', now());

insert into public.maps (id, campaign_id, title, image_url, description, visibility)
values (
  'cccccccc-cccc-cccc-cccc-ccccccccccc3',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Arkham Downtown',
  'https://example.com/arkham-map.jpg',
  'Shared street map for the first investigation arc.',
  'shared_all'
)
on conflict (id) do update
set title = excluded.title,
    image_url = excluded.image_url,
    description = excluded.description,
    visibility = excluded.visibility,
    updated_at = timezone('utc', now());

insert into public.markdown_documents (id, campaign_id, title, markdown_content, visibility)
values (
  'cccccccc-cccc-cccc-cccc-ccccccccccc4',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'House Rules',
  '# House Rules

- Pushed rolls require an in-fiction consequence.
- Downtime notes should be stored after every session.',
  'shared_all'
)
on conflict (id) do update
set markdown_content = excluded.markdown_content,
    visibility = excluded.visibility,
    updated_at = timezone('utc', now());

insert into public.relationship_diagrams (id, campaign_id, title, mermaid_source, visibility)
values (
  'cccccccc-cccc-cccc-cccc-ccccccccccc5',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Archive Links',
  'graph TD
Archive --> Thorne
Thorne --> LedgerFragment
LedgerFragment --> Bookseller',
  'shared_all'
)
on conflict (id) do update
set mermaid_source = excluded.mermaid_source,
    visibility = excluded.visibility,
    updated_at = timezone('utc', now());
