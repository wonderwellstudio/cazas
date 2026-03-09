# Cazas Thread Recovery History (March 9, 2026)

## Purpose
This document records the thread-recovery state before any additional workspace/folder changes.
Use this as a rollback reference if thread organization gets worse.

## Snapshot (Verified)
- Verified at: `2026-03-09 01:40:17 EDT`
- Active shell `pwd` while opened from `Cazas Northstar v2` resolves to:
  - `/Users/gregwashington/Library/CloudStorage/Dropbox/Projects/Wonderwell/04 Clients/26 Cazas/Agentic Coding/Cazas Northstar`
- Parent folder contents include:
  - Real directory: `Cazas Northstar`
  - Symlink: `Cazas Northstar v2 -> /Users/gregwashington/Library/CloudStorage/Dropbox/Projects/Wonderwell/04 Clients/26 Cazas/Agentic Coding/Cazas Northstar`
  - Backup directory: `Cazas Northstar backup 2026-03-09`

## Root Cause
`Cazas Northstar v2` is a symlink to `Cazas Northstar`, so Codex can treat both sidebar workspaces as the same underlying project path.
When threads are opened from one, they can be re-associated under the other.

## UI State Confirmed From Screenshots
- `Cazas Northstar v2` currently contains the expected main set of threads.
- `Cazas Northstar (Original)` currently contains 3 threads:
  - `Refactor vector globe regions`
  - `Add cinematic globe interface`
  - `Show experience in browser`

## Safety Before Changes
1. Do not delete `Cazas Northstar`.
2. Do not delete `Cazas Northstar backup 2026-03-09`.
3. If making folder-link changes, only remove the symlink entry `Cazas Northstar v2`, not the real folder `Cazas Northstar`.

## Recommended Stabilization Plan
1. Keep using `Cazas Northstar v2` in Codex for active work.
2. After validating the 3 threads in `(Original)`, remove that workspace entry from the sidebar.
3. Optionally convert `Cazas Northstar v2` from symlink to a real folder to prevent future re-keying.

## Rollback / Recovery Commands (Reference)
Run from:
- `/Users/gregwashington/Library/CloudStorage/Dropbox/Projects/Wonderwell/04 Clients/26 Cazas/Agentic Coding`

Check current linkage:
```bash
ls -ld "Cazas Northstar" "Cazas Northstar v2"
```

Recreate `Cazas Northstar v2` symlink to original (if needed):
```bash
rm "Cazas Northstar v2"
ln -s "/Users/gregwashington/Library/CloudStorage/Dropbox/Projects/Wonderwell/04 Clients/26 Cazas/Agentic Coding/Cazas Northstar" "Cazas Northstar v2"
```

Create real `Cazas Northstar v2` folder from backup (safer long-term isolation):
```bash
rm "Cazas Northstar v2"
cp -R "Cazas Northstar backup 2026-03-09" "Cazas Northstar v2"
```

## Notes
- Thread assignment behavior is app metadata behavior, not git history behavior.
- The backup directory protects project files, but may not preserve thread-to-workspace metadata.
