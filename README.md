# BulkPlan

An iPhone-first lean-bulk nutrition and weight tracking app. Repository: niklausyu99/gym-bulk-plan.

## Development

Run `npm run dev` for the local preview at http://127.0.0.1:8765. No framework or runtime npm dependencies are required. Product content lives in content/; original materials in docs/sources are development archives, not product pages. Local records remain available offline. Optional GitHub synchronization stores records in a separately authorized private repository; never bundle a token. Export before moving from a local origin to the hosted app.

## Standalone package

Run `npm run build`. This generates the product content and offline resource list, then copies only runtime files to dist/. Serve dist/ from an HTTPS host for phone installation. It does not include Skills, audits, source archives, prompts, tests or development instructions. Build output is not proof of deployment or final acceptance.

## Current status

0.13.1 repairs the mobile review findings: daily/history styles stay independent of archived training; the floating nutrition shortcut avoids editing and overlapping controls; larger text reflows; field errors remain beside their inputs; redraws preserve focus; common touch targets are enlarged.

BulkPlan 0.13.1 temporarily withdraws all workout pages and actions at the user's request. Home now starts with today's eating arrangement; navigation contains Today, Nutrition, Progress and More. Progress and history show nutrition and weight. Workout links return Home. Training/rest-day nutrition targets remain manually selectable, independent of the archived PPL cursor; new days use the most recent dietary day type, without copying eaten records.

The full pre-withdrawal app is preserved on `archive/training-v0.12.1` at commit `62800a79630fee064ed4774667b5565b88be18b4`. Workout modules, content and assets also remain in this repository, but the active runtime does not load workout views, muscle diagrams or exercise demonstrations. Prior workout records, drafts and timers remain in local/private backups without being advanced or edited. The original 677 MP4s remain on `exercise-media`. See docs/training-archive.md before restoring the feature.

Chicken breast is recorded independently by portion, above the Side selection. Consumed food retains nutrient snapshots. Existing meal records migrate without changing their totals. The header reports verified synchronization, pending work or an actionable error; offline browsing and local data are distinct from cloud synchronization.

Project Skills remain in .agents/skills. DESIGN.md records the current direction. Developer reports, research, source files and Skills are excluded from the runtime package. See docs/PROJECT_STATUS.md and outputs/BulkPlan更新-2026-11-01/更新与跟进.md for scope and verification limits.

## Hosted app and private records

Open https://niklausyu99.github.io/gym-bulk-plan/ on iPhone Safari. GitHub Actions builds and tests the runtime-only dist/ package, then publishes it through GitHub Pages.

Personal records belong in the private niklausyu99/bulkplan-private-data repository, never the public app repository. Connect in More → Records and backup using a fine-grained token restricted to that private repository, with Contents read/write. The app checks repository privacy before each read/write, saves offline locally, and uses conditional file-SHA writes. Concurrent edits require an explicit whole-version choice; export both first. Tokens are not included in data backups or source. Optional keep-connected stores the token in this browser; disconnect removes it.

Existing local preview records do not migrate across origins automatically. Export there, import on the hosted app, then connect. A created private repository alone does not mean personal records have already uploaded.

## Daily supplements

Nutrition → Supplements records actual daily use for the five configured products. Fish oil supports one or two softgels; other daily doses are reversible checks. Each dated record preserves its ingredient amounts and label source. Supplement-derived micronutrients are shown separately from food, whose micronutrients are not fully covered. Only explicitly labelled fish-oil energy and fat join the daily food totals. Records participate in backups and private sync, including first-connect conflict detection. Reference labels, elemental-mineral conversions and timing evidence are in `outputs/每日补充剂-2026-11-01/服用安排与营养依据.md`.

## Food art, combined micronutrients and composition input

A shared family of65 transparent256px WebP food icons covers pantry, recipes and food choices; originals, prompts and crop evidence stay outside the runtime. Grapes are a usual food and pineapple an optional library food. The daily micronutrient view sums actually eaten foods, the recorded Blend and supplements, with source-specific limits and explicit missing branded-food data. It uses male19–30 DRI references and the labelled EFSA2023 B6 limit. It cannot establish that an incomplete food log is safe or diagnose deficiencies. Chinese composition defers input processing and full renders until commitment. Token setup links to GitHub's fine-grained token form and explains private-repository-only Contents access.
