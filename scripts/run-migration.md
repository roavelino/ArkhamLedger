# Migration execution options

## Option A: Supabase SQL Editor
Paste/run `src/database/migrations.sql` in the SQL Editor.

## Option B: Direct psql
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f src/database/migrations.sql
```

## Option C: GitHub Actions (recommended when local psql is unavailable)
This repository includes `.github/workflows/migrate-supabase.yml`.

Required secret:
- `SUPABASE_DB_URL` (example: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`)

Trigger the workflow from the Actions tab (`workflow_dispatch`) or push changes to `src/database/migrations.sql` on `main`.
