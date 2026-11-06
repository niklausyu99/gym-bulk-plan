# Training feature archive

Suspended at the user's request on 2026-11-06, starting with BulkPlan 0.13.0. Nutrition and weight tracking remain active.

## Preserved baseline

- Branch: `archive/training-v0.12.1`
- Commit: `62800a79630fee064ed4774667b5565b88be18b4`
- Original animation sources remain on `exercise-media`.
- Existing training modules, source content, media and model tests remain in the main repository. The active HTML and offline package exclude their presentation resources; main.js no longer exposes their views or event handlers.
- Personal sessions, active/parked drafts, pending edits, selections, cursor and timer values remain in the original state schema and participate in complete export/import and private synchronization. No personal data is committed to this public repository.

## Restoration

Use the archive branch as a reference, then restore training deliberately on a new working branch based on current main. Do not reset main to the old snapshot: subsequent nutrition fixes must survive. Reconnect the main controller, HTML scripts/styles, history/progress/guide entries and offline/media packaging together. Restore the archived UI flow tests and rerun current diet, storage, sync and legacy-data checks. Reassess dietary day-type behavior: it is now manual and carries forward the latest prior nutrition setting, independently of the old PPL cursor. Do not restart an archived timer automatically. Publish only after the user requests restoration.
