# Migration execution options

## Option A: Supabase SQL Editor
Paste/run `src/database/migrations.sql` in the SQL Editor.

## Option B: Direct psql
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f src/database/migrations.sql
```

## Option C: GitHub Actions (recommended when local psql is unavailable)
This repository no longer applies database migrations from GitHub Actions.

Use one of these instead:
- Supabase SQL Editor
- Local `psql`
