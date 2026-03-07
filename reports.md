# Arkham Ledger Progress Report

## Technical Audit

### Current architecture

- Frontend framework and routing structure: static HTML pages (`index.html`, `login.html`) with browser-side ES modules. No router; the app is a single-page client driven by `src/main.js`.
- Current auth flow: Supabase Auth in browser. `src/login.js` handles sign in/sign up, then redirects to `index.html`. `src/auth/login.ts` and `src/auth/authClient.ts` provide typed helpers used by TypeScript services.
- Current sheet data model: `character_sheets` was the main player sheet table with `owner_id`, `name`, `is_active`, `sheet_data`, `image_url`. NPCs also existed in a separate `npc_sheets` table, but the browser app was only using `character_sheets`.
- Current Supabase schema: baseline users, character sheets, npc sheets, images, storage bucket and RLS policies in `src/database/migrations.sql`; character activity/storage follow-up migration in `src/database/migrations_character_state.sql`.
- Current storage buckets: `sheet-images` existed for portraits. No separate campaign asset or video bucket before this pass.
- Current DM specific screens: DM had broader sheet visibility in the same screen and could duplicate/import/export JSON, but there was no campaign hub.
- Existing player specific screens: players used the same screen with reduced permissions and login gating.
- Current mobile behavior: CSS was already responsive and single-column on smaller screens, but the app was still focused on a single sheet editor.
- Current file upload logic: portrait upload only, via `src/browser/characterSheetsApi.js` and `src/storage/imageUpload.ts`.

### Reusable modules

- `src/browser/characterSheetsApi.js`: browser CRUD and portrait upload for character sheets.
- `src/auth/authClient.ts` and `src/auth/login.ts`: session/bootstrap helpers.
- `src/permissions/accessControl.ts`: central permission helpers.
- `src/database/supabaseClient.ts`: typed Supabase client surface.
- `src/storage/imageUpload.ts`: typed upload/update flow for portrait storage.

### Weak points and mismatches against the new spec

- Campaigns, membership, investigation content, and DM screen data did not exist.
- Browser UI only handled character sheets; no campaign dashboard or campaign navigation.
- NPC browser workflow was not aligned with the target spec because NPCs lived in `npc_sheets`, while the player-facing app only queried `character_sheets`.
- No video upload support.
- No visibility model for campaign content.
- No player-safe revealed NPC mini profile flow.
- No map pin UI, markdown rendering, Mermaid rendering, or PDF export.

## Gap Analysis

| Feature Area | Status Before | Status Now | Notes |
| --- | --- | --- | --- |
| Technical audit and spec mapping | Missing | Done | This report covers the audit and progress log. |
| Character sheet metadata extension | Missing | Implemented | Added type, campaign linkage, metadata, notes, intro video URL support. |
| Campaign tables and membership | Missing | Implemented | Added schema, types, browser API, and dashboard UI. |
| Content tables and visibility rules | Missing | Implemented | Added schema/RLS helpers and minimal browser CRUD for core content sections. |
| Campaign list and dashboard UI | Missing | Implemented | Added campaign navigation, list, dashboard, members, gallery, and content cards. |
| NPC quick create and generator | Missing | Implemented | Added quick draft and lightweight generator in the sheets workspace. |
| NPC reveal / mini profile | Missing | Implemented | Added reveal flag and player mini-profile rendering for visible NPCs. |
| Character gallery by campaign | Missing | Implemented | Added gallery section inside campaign dashboard. |
| Session summaries CRUD | Missing | Implemented | Minimal CRUD in campaign dashboard. |
| Timeline CRUD | Missing | Implemented | Minimal CRUD in campaign dashboard. |
| Clues CRUD | Missing | Implemented | Minimal CRUD in campaign dashboard. |
| Handouts CRUD | Missing | Implemented | Minimal CRUD in campaign dashboard. |
| Maps upload/listing | Missing | Partial | Schema and dashboard entries exist, but no dedicated map viewer or pin placement UI yet. |
| Map pins | Missing | Partial | Schema and RLS exist; browser UI still missing. |
| Markdown rendering | Missing | Partial | Storage/editing exists; content is displayed as preformatted text, not rendered markdown. |
| Mermaid rendering | Missing | Partial | Storage/editing exists; source is displayed as text for now. |
| DM screen UI | Missing | Partial | DM screen pages CRUD exists inside dashboard; no dedicated live session viewer yet. |
| File validation | Missing | Partial | Added client-side image/video validation for portraits, campaign covers, and character intro video. |
| PDF export | Missing | Not started | No implementation in this pass. |

## Implemented Work

### Schema and typed contract

- Extended `character_sheets` in `src/database/migrations_character_state.sql` with:
  - `type`
  - `campaign_id`
  - `owner_user_id`
  - `age`
  - `occupation`
  - `description`
  - `intro_video_url`
  - `notes`
- Added campaign/investigation tables:
  - `campaigns`
  - `campaign_members`
  - `session_summaries`
  - `timeline_entries`
  - `clues`
  - `handouts`
  - `maps`
  - `map_pins`
  - `markdown_documents`
  - `relationship_diagrams`
  - `npc_gallery_assets`
  - `dm_screen_pages`
- Added visibility validation helpers and RLS policies for campaign content.
- Added new storage buckets for `campaign-assets` and `sheet-media`.
- Updated `src/database/supabaseClient.ts` and `src/characters/characterService.ts` to reflect the extended schema.

### Browser app

- Reworked `src/main.js` into a two-workspace browser client:
  - `Fichas`
  - `Campanhas`
- Upgraded sheet UI to support:
  - investigator vs NPC type
  - campaign assignment
  - age, occupation, description, notes
  - optional intro video upload
  - reveal toggle for NPC mini profile
- Added lightweight DM NPC flows:
  - quick NPC draft
  - random NPC draft generator
- Added player-facing revealed NPC mini profile behavior.
- Added campaign dashboard with:
  - campaign info and cover image upload
  - member management by user ID
  - character gallery
  - CRUD cards for summaries, timeline, clues, handouts, maps, markdown docs, relationship diagrams, and DM screen pages
- Added browser-side campaign API helpers in `src/browser/campaignApi.js`.

### Validation and tests

- Added client-side image/video validation rules in the browser app.
- Updated migration tests to assert the new schema/RLS surface.
- Updated permission static tests to assert new helpers.
- Verified:
  - `npm test`
  - `npm run check`
  - `node --check src/main.js`

## Remaining Work

- Build a dedicated player map screen and DM map pin placement UI.
- Render markdown and Mermaid instead of displaying plain source text.
- Add upload workflows for handout files, clue files, map images, and reusable NPC portrait gallery assets.
- Tighten storage policies further; current `campaign-assets` and `sheet-media` policies are broader than the DB row-level visibility rules.
- Add a dedicated DM screen viewer optimized for live session use.
- Implement PDF export.
- Add targeted browser/UI tests for the new campaign flows.
