# Arkham Ledger Test Results

## 1) Migration Execution
- **Command:** `PGPASSWORD='***' psql 'postgresql://postgres@db.mcssitekxyjrhnqcapib.supabase.co:5432/postgres' -f src/database/migrations.sql`
- **Status:** ❌ Failed in this environment.
- **Reason:** `psql` binary is not available (`bash: command not found: psql`).
- **Log:** `tests-results/migration-attempt.txt`

## 2) Automated Test Suite (Node test runner)
- **Command:** `node --test tests/*.test.mjs`
- **Status:** ✅ Passed (6/6)
- **Output log:** `tests-results/node-test-output.txt`

### Coverage scope
- Modular architecture file presence
- GitHub Pages JS runtime compatibility (`index.html` points to `src/main.js`)
- SQL migration contains required table declarations
- SQL migration contains RLS + storage policy declarations
- Permission logic source checks for Player/DM rule presence

## 3) Automated npm test command
- **Command:** `npm test`
- **Status:** ✅ Passed
- **Output log:** `tests-results/npm-test-output.txt`

## 4) Type checks / build checks
- **Command:** `npm run check`
- **Status:** ✅ Passed
- **Output log:** `tests-results/typecheck-output.txt`

- **Command:** `npm run build`
- **Status:** ✅ Passed
- **Output log:** `tests-results/build-output.txt`

## 5) E2E (GitHub Pages deployed site)
- **Target:** `https://roavelino.github.io/ArkhamLedger/`
- **Method:** Playwright browser automation
- **Status:** ✅ Passed
- **Report:** `tests-results/e2e-githubpages.json`
- **Screenshot artifact:** `browser:/tmp/codex_browser_invocations/1cae5c8398d8ec3a/artifacts/tests-results/e2e-githubpages.png`

### E2E checks performed
- Title contains `Arkham`
- Essential UI selectors exist (`#newSheetBtn`, `#sheetSearch`, `#viewRoot`, `#sheetList`, `#statusTag`)
- Clicking `#newSheetBtn` does not crash page
- Filling search input does not crash page

## 6) GitHub Pages compatibility conclusion
Current project is compatible with static hosting requirements for GitHub Pages because it loads a browser-runnable JS module entry (`src/main.js`) directly from `index.html` without requiring server-side routing.
