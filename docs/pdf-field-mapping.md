# PDF Field Mapping

## Template choice

Current implementation uses a browser-generated printable sheet optimized for "Print to PDF" from the app UI.

This keeps the feature compatible with the existing static frontend and avoids introducing a server renderer.

## Field mapping

| App field | Printable output |
| --- | --- |
| `character_sheets.name` | Title / character name |
| `character_sheets.type` | Subtitle (`Investigador` or `NPC`) |
| `character_sheets.age` | Metadata block |
| `character_sheets.occupation` | Metadata block |
| `sheet_data.home` | Metadata block |
| `character_sheets.campaign_id` | Campaign title lookup |
| `character_sheets.image_url` | Portrait image |
| `character_sheets.description` | Description section |
| `character_sheets.notes` | Notes section |
| `sheet_data.skills[]` | Skills table |

## Explicit exclusions

- `intro_video_url` is ignored in printable output.
- Campaign-only content is not embedded in the character PDF.
- Hidden DM-only NPC details are only printable when the user can access the full sheet in the app.
