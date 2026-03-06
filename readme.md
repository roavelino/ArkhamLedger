# Arkham Ledger

Supabase-backed architecture for authentication, Player/DM authorization, character/NPC sheets, and image uploads.

## Folder Structure

```txt
/src
  /auth
    login.ts
    authClient.ts
  /database
    supabaseClient.ts
    migrations.sql
  /characters
    characterService.ts
    characterController.ts
  /npcs
    npcService.ts
    npcController.ts
  /storage
    imageUpload.ts
  /permissions
    accessControl.ts
  main.ts
  main.js
```

## Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
```

`SUPABASE_SECRET_KEY` must only be used in trusted backend environments.

## What is implemented

### Auth
- Login/logout/session via Supabase Auth.
- User role loaded from `public.users` profile row.

### App-level authorization
- **Player:** create/view/edit/delete only their own character sheets. Active/inactive state can only be toggled by the DM.
- **DM:** view/edit/delete all character sheets; create/view/edit/delete NPC sheets.

### Database + RLS
`src/database/migrations.sql` creates:
- `public.users` (linked to `auth.users`)
- `public.character_sheets`
- `public.npc_sheets`
- `public.images`
- indexes + triggers + helper functions
- RLS policies enforcing Player/DM rules
- storage bucket and storage object policies (`sheet-images`)
- trigger that auto-creates `public.users` profile row on signup

### Storage uploads
- Character and NPC image upload functions in `src/storage/imageUpload.ts`.
- Stores the storage path on the sheet record and keeps `public.images` metadata for ownership/audit.

## Services / API-style functions

Character functions:
- `createCharacter`
- `viewCharacter`
- `editCharacter`
- `removeCharacter`
- `listCharacters`

NPC functions:
- `createNpc`
- `viewNpc`
- `editNpc`
- `removeNpc`
- `listNpcs`

## Running migrations

1. Open Supabase SQL Editor.
2. Paste/run `src/database/migrations.sql`.
3. Paste/run `src/database/migrations_character_state.sql` (character active/inactive + permission updates).
4. Verify tables and bucket were created.

## Notes

- Browser runtime uses `src/main.js` (no bundler required).
- TypeScript modules under `src/**/*.ts` are service-layer modules intended for integration into your backend or build pipeline.


## Alternative migration execution

If local `psql` is unavailable, use one of these:

1. **Supabase SQL Editor**: run `src/database/migrations.sql` directly in dashboard.
2. **CLI command** documented in `scripts/run-migration.md`.
