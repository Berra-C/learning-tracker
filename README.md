# Learning Tracker — v0.1 integration build

Learning Tracker, using the approved `learning_tracker_v2_0.html` interface as its design reference and **Productivity App v96** as its authentication and backend architecture reference.

This is a **locally tested integration build**, not a verified live deployment. The Supabase migration and modified Edge Function have **not** been applied to any remote project.

## Files

- `index.html` — GitHub Pages entry point, preserving the prototype’s navigation and visual components.
- `assets/css/prototype.css` — retained prototype stylesheet, including light/dark themes and geometric markers.
- `assets/css/app.css` — functional UI additions.
- `assets/js/modules/01-model.js` — courses, resources, stable IDs, progress, assignments, events, reviews, snapshots and merge logic.
- `assets/js/modules/02-importer.js` — external-AI prompt, JSON validation, editable hierarchy import.
- `assets/js/modules/03-cloud.js` — shared Productivity App session, account API, account-specific local caching, conflict detection and sync.
- `assets/js/modules/04-ui.js` — browser UI composition and interactions.
- `assets/js/cloud-config.js` — copied **public/publishable** Productivity App v96 endpoint configuration, not a private key.
- `assets/js/app.js` — generated production bundle; do not modify directly.
- `supabase/migrations/004_learning_tracker_states.sql` — new isolated state table.
- `supabase/functions/app-api/index.ts` — **complete Productivity App v96 Edge Function**, with additive Learning Tracker routes.
- `supabase/functions/app-api/product-analytics.mjs` and `deno.d.ts` — dependencies carried over unchanged from the v96 archive.
- `tests/` — deterministic domain tests and Chromium DOM smoke test.

## Local commands

```bash
npm run build
npm run check
```

No dependency installation is required for those tests; Chromium must be available for `browser:check`. For local browsing, use a local static HTTP server or upload the frontend to GitHub Pages.

## Deployment sequence (manual; not yet performed)

1. **Back up** the existing Supabase database and the existing `supabase/functions/app-api/index.ts` from the current Productivity App project.
2. In the **same existing Supabase project**, run `supabase/migrations/004_learning_tracker_states.sql` using the SQL editor or the normal migration workflow. Confirm the table `public.learning_tracker_states` exists and has RLS enabled. It is separate from `public.app_states`.
3. In the **Productivity App** repository, replace `supabase/functions/app-api/index.ts` with the provided updated file. Retain `product-analytics.mjs` and related function configuration from v96. Deploy the existing `app-api` Edge Function using your usual workflow. **Do not expose** service-role keys in the frontend or chat.
4. Verify the existing Productivity App still supports `signup`, `login`, `me`, `sync-pull`, `sync-push`, device list and logout. Then verify authenticated `learning-tracker-sync-pull`, `learning-tracker-sync-push`, and `learning-tracker-study-summary` calls. Unauthenticated calls must return HTTP 401.
5. Upload the frontend `index.html`, `assets/`, `scripts/`, `tests/`, `package.json` and `README.md` (the Supabase migration/function files may be kept alongside the project for reference) to the intended `learning-tracker` GitHub Pages repository. Enable Pages for the deployment branch/root, keeping relative asset paths intact.
6. For automatic session sharing via browser storage, both frontends must use the **same origin** (scheme + hostname + port); paths may differ. For example `https://berra-c.github.io/productivity-app/` and `https://berra-c.github.io/learning-tracker/`. If the origins differ, the **same credentials** still work, but the user must sign in separately.
7. Test with an existing user on both apps, then with a new user created in Learning Tracker and recognized in Productivity App. Verify multi-device sync, logout/revocation, conflict handling and mobile appearance before general rollout.

## Functional features in this build

- Shared identity and login using Productivity App's username, two-word magic phrase and six-digit code.
- Registration using the existing server-side username/phrase generator; credentials shown until the user confirms they are saved.
- Existing browser session keys (`test_cloud_session`, `test_cloud_username`, `test_cloud_account_id`) with server-side validation via `me`.
- Separate per-account Learning Tracker state table, local caching, pull/push with optimistic revisions, conflict merge with on-device recovery backup and manual sync.
- Add/edit/category/color/archive/delete/restore courses and resources. Multiple resources per course.
- External AI import prompt, JSON validation, editable hierarchy preview, arbitrary practical-depth nested topic structure and stable internal IDs.
- Add/reorder/reparent/rename/remove topics, parent bulk completion, topic statuses and leaf-only combined progress percentages.
- Monday–Sunday calendar, multi-topic bulk scheduling, moving/removing planned items and assignment history.
- End-of-week completion snapshot and manual review of unfinished topics; previously recorded weekly percentages do not update from later progress.
- Dashboard, upcoming weeks, weekly history, course/resource progress and read-only Productivity App subject durations.
- JSON backup and restoration. Light/dark themes and responsive layout based on the supplied prototype.

## Test results

`npm run check` validates production bundle freshness and syntax, runs domain tests covering progress/weighting, recursive import, historical snapshots and merging, and runs a **real Chromium DOM smoke test** for login and course/resource/import/planning actions using an explicitly mocked API. It does not test the actual Supabase network or database, GitHub Pages origin sharing, CSP, browser storage persistence, live two-device sync, or deployment.

## Known limitations and work still required before production release

1. No live Supabase/Deno compilation or end-to-end production network tests have been performed.
2. Advanced sync conflict resolution uses stable record IDs, timestamps, tombstones and full local conflict backups. Same-record simultaneous edits still resolve deterministically by newest timestamp, not a per-field interactive merge. Users can download conflict backups in Settings. More automated conflict scenarios should be tested.
3. The hierarchy editor supports nested structures, editing, adding and ordering by a numeric position; it does not yet provide a drag-and-drop tree rearrangement UI.
4. The browser smoke test does not perform screenshot-based responsive/theming accessibility review. Mobile visual QA is still needed.
5. Historical course/resource graphs use recorded completion events, but changing hierarchy membership or deleting a topic later can affect historical denominators; fully event-sourced hierarchy snapshots are still required for rigorous longitudinal comparison.
6. Passwordless credential recovery is delegated to the existing Productivity App administrator workflow; no independent recovery is introduced.
7. The Supabase v96 ZIP contains migrations `002` and `003`, but not the original initial migration. The new SQL uses the known `public.app_accounts(id)` UUID relationship visible in migration `003`; confirm against your deployed schema before running it.
8. Existing prototype demo data is **not** silently migrated into student accounts. Each account starts empty; using a legacy prototype requires a deliberate conversion process to preserve genuine data and avoid importing example courses as student progress.
9. AI imports support at most 20,000 nodes and 80 recursive levels as safety limits. They do not access external AI APIs inside Learning Tracker.

Do not roll out to students until the backend, actual session-sharing behavior and data integrity are verified in a staging/live test account.
