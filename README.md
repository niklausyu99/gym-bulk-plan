# BulkPlan

A daily iPhone-first PPL training and lean-bulk nutrition app. Repository: niklausyu99/gym-bulk-plan.

## Development

Run `npm run dev` for the local preview at http://127.0.0.1:8765. No framework or runtime npm dependencies are required. Product content lives in content/; original materials in docs/sources are development archives, not product pages. Local records remain available offline. Optional GitHub synchronization stores records in a separately authorized private repository; never bundle a token. Export before moving from a local origin to the hosted app.

## Standalone package

Run `npm run build`. This generates the product content and offline resource list, then copies only runtime files to dist/. Serve dist/ from an HTTPS host for phone installation. It does not include Skills, audits, source archives, prompts, tests or development instructions. Build output is not proof of deployment or final acceptance.

## Current status

BulkPlan 0.5.0 uses the user-requested black/charcoal/fit-lime design. Today’s workouts are selected by muscle group, with ranked equipment choices, editable order and explicit optional suggested combinations. Sets can be added, selected and deleted; saved sessions can be reopened without duplicating records or advancing the cycle again. Separate drafts and pending history edits persist.

All 31 slots / 92 equipment variants retain written technique guidance and muscle-role diagrams. Exact-version animations are available for 46 variants across 24 slots. The user-provided 677 original MP4s are preserved on the `exercise-media` branch under `GYM Exercise Animations/`; they are not included in the application deployment. Runtime demonstrations are silent inline loops with a WebP fallback. Missing exact matches are omitted rather than substituted.

Chicken breast is recorded independently by portion, above the Side selection. Consumed food retains nutrient snapshots. Existing meal records migrate without changing their totals. The header reports verified synchronization, pending work or an actionable error; offline browsing and local data are distinct from cloud synchronization.

Project Skills remain in .agents/skills. DESIGN.md records the current direction. Developer reports, research, source files and Skills are excluded from the runtime package. See docs/PROJECT_STATUS.md and outputs/BulkPlan更新-2026-11-01/更新与跟进.md for scope and verification limits.

## Hosted app and private records

Open https://niklausyu99.github.io/gym-bulk-plan/ on iPhone Safari. GitHub Actions builds and tests the runtime-only dist/ package, then publishes it through GitHub Pages.

Personal records belong in the private niklausyu99/bulkplan-private-data repository, never the public app repository. Connect in More → Records and backup using a fine-grained token restricted to that private repository, with Contents read/write. The app checks repository privacy before each read/write, saves offline locally, and uses conditional file-SHA writes. Concurrent edits require an explicit whole-version choice; export both first. Tokens are not included in data backups or source. Optional keep-connected stores the token in this browser; disconnect removes it.

Existing local preview records do not migrate across origins automatically. Export there, import on the hosted app, then connect. A created private repository alone does not mean personal records have already uploaded.
