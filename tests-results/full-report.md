# Arkham Ledger Test Results (Updated)

## 1) Migration Execution
- **Command:** `PGPASSWORD='***' psql 'postgresql://postgres@db.mcssitekxyjrhnqcapib.supabase.co:5432/postgres' -f src/database/migrations.sql`
- **Status:** ❌ Failed in this environment.
- **Reason:** `psql` binary is not available (`bash: command not found: psql`).
- **Log:** `tests-results/migration-attempt.txt`

## 2) Automated Test Suite (Node test runner)
- **Command:** `node --test tests/*.test.mjs`
- **Status:** ✅ Passed (6/6)
- **Output log:** `tests-results/node-test-output.txt`

## 3) Automated npm command checks
- **Command:** `npm test`
- **Status:** ✅ Passed
- **Output log:** `tests-results/npm-test-output.txt`

- **Command:** `npm run check`
- **Status:** ✅ Passed
- **Output log:** `tests-results/typecheck-output.txt`

- **Command:** `npm run build`
- **Status:** ✅ Passed
- **Output log:** `tests-results/build-output.txt`

## 4) Playwright E2E on deployed page (current production)
- **Target:** `https://roavelino.github.io/ArkhamLedger/`
- **Status:** ❌ Failed interaction check
- **Report:** `tests-results/e2e-remote-current.json`
- **Screenshot artifact:** `browser:/tmp/codex_browser_invocations/1e7367d954e4240d/artifacts/tests-results/e2e-remote-current.png`

### Failure details
- `#newSheetBtn` click did **not** increase sheet count (`0 -> 0`).
- This confirms your complaint that buttons are non-functional on current deployed build.

## 5) Playwright E2E on fixed local build (this patch)
- **Target:** `http://127.0.0.1:4173/` (served locally)
- **Status:** ✅ Passed
- **Report:** `tests-results/e2e-local-fixed.json`
- **Screenshot artifact:** `browser:/tmp/codex_browser_invocations/4b5a064090fc07d9/artifacts/tests-results/e2e-local-fixed.png`

### Passed interactions
- `Nova ficha` adds sheet(s)
- `Duplicar` increases sheet count
- `Excluir` reduces sheet count
- Search input works
- D100 quick roll opens dialog

## 6) GitHub Pages compatibility
- Static hosting compatibility is preserved (`index.html` loads `./src/main.js`).
- Once this commit is deployed, the GitHub Pages buttons should behave correctly as validated in local Playwright run.

## 7) Alternative migration solution
When local `psql` is unavailable:
1. Run SQL via Supabase SQL Editor.
2. Use the new GitHub Actions workflow `.github/workflows/migrate-supabase.yml` with `SUPABASE_DB_URL` secret.
3. Follow `scripts/run-migration.md`.
