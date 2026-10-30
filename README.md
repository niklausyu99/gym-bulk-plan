# BulkPlan

A daily iPhone-first PPL training and lean-bulk nutrition app. Repository: niklausyu99/gym-bulk-plan.

## Development

Run `npm run dev` for the local preview at http://127.0.0.1:8765. No framework or runtime npm dependencies are required. Product content lives in content/; original materials in docs/sources are development archives, not product pages. Local records remain available offline. Optional GitHub synchronization stores records in a separately authorized private repository; never bundle a token. Export before moving from a local origin to the hosted app.

## Standalone package

Run `npm run build`. This generates the product content and offline resource list, then copies only runtime files to dist/. Serve dist/ from an HTTPS host for phone installation. It does not include Skills, audits, source archives, prompts, tests or development instructions. Build output is not proof of deployment or final acceptance.

## Current status

Feature completion is active. All 29 exercise entries have written technique guidance and muscle-role diagrams, generated from one neutral front/back base and shared regional masks. The user canceled action-pose/trajectory demonstrations; do not resume their generation or stock procurement. Global optimization and acceptance are deferred by the user until content and functions are complete. See docs/PROJECT_STATUS.md.

Skills are project-local and pinned in skills-lock.json. Latest additions and runtime discovery are recorded in outputs/Skills-补充安装与接入.md and outputs/Skills-补充安装证据.json. DESIGN.md records the approved direction; AGENTS.md records development boundaries.

Muscle-map source lives in content/muscle-map-spec.json. The optional developer script scripts/build-muscle-maps.cjs uses Sharp to regenerate assets; the normal build uses the checked-in images and needs no image-processing dependency.

Training days can now be switched after confirmation while retaining separate unfinished drafts. A left-side shoulder supplement shares a 3-set allowance across a rolling 96-hour window. Equipment recommendations cover 29 slots / 90 variants, with per-side records, explicit load conventions and completed-set snapshots. Product equipment data is curated in content/equipment.json; the separate research delivery remains unchanged.

## Hosted app and private records

Open https://niklausyu99.github.io/gym-bulk-plan/ on iPhone Safari. GitHub Actions builds and tests the runtime-only dist/ package, then publishes it through GitHub Pages.

Personal records belong in the private niklausyu99/bulkplan-private-data repository, never the public app repository. Connect in More → Records and backup using a fine-grained token restricted to that private repository, with Contents read/write. The app checks repository privacy before each read/write, saves offline locally, and uses conditional file-SHA writes. Concurrent edits require an explicit whole-version choice; export both first. Tokens are not included in data backups or source. Optional keep-connected stores the token in this browser; disconnect removes it.

Existing local preview records do not migrate across origins automatically. Export there, import on the hosted app, then connect. A created private repository alone does not mean personal records have already uploaded.
