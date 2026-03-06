# Tests

This folder contains automated validation for:

- Project architecture and GitHub Pages runtime entry.
- SQL migration coverage for required tables, RLS, and storage policies.
- Static permission rule assertions for Player/DM role logic.

## Run

```bash
node --test tests/*.test.mjs
```
