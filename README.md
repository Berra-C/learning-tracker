# Learning Tracker

A static, Turkish-language student learning organizer with a modular, dependency-free JavaScript frontend. Based on the provided **Learning Tracker prototype v1.9** (HTML file named `learning_tracker_v2_0.html`). Layout, warm ivory/teal and dark themes, topic geometry, calendar design and marker-like highlights have been retained.

## What works in a local workspace

- Create, edit, categorize, archive and delete courses.
- Manage independent books, videos, websites and other resources.
- Import real source hierarchies using an external AI chatbot and validated JSON; edit, reorder, add and remove nodes before confirming; existing IDs and completion are preserved when editing.
- Track leaf topics independently in each resource, with combined-topic course weighting and group percentages.
- Plan individual or multiple topics across Monday–Sunday weeks, move or remove assignments and preserve assignment events.
- Produce end-of-week reviews without automatically rescheduling; keep completed/incomplete history based on completion timestamps.
- Display current-week targets prominently and future weeks subtly, plus data-backed analytics.
- Save local work, export/import validated JSON backups, maintain light and dark modes, mobile layouts and source-prototype visual indicators.

**Important:** The local workspace is a genuine offline/local data mode, NOT a substitute for shared student authentication. It makes no claim to cloud syncing.

## What is prepared but NOT connected or validated

The user-provided Productivity App repository (`https://github.com/Berra-C/productivity-app`) could not be accessed in this environment. Its existing auth response shape, session field names, `app_accounts.id` type, rate limiting and active CORS deployment could not be verified. Do **not** assume that shared login, registration, device management, cross-app sessions or production cloud persistence have already been tested.

- `assets/js/modules/cloud.js` is a shared-auth adapter using the specification's `signup`, `login`, `me`, `logout`, `list-devices`, and `revoke-other-devices` actions and the specified shared session keys.
- `supabase/migrations/20261116_learning_tracker_states.sql` creates a **separate** state table and revision-safe atomic CAS RPC, without altering the productivity database.
- `supabase/patches/learning-tracker-actions.ts` implements additive pull/push operations **only when called after existing Productivity App authentication**; it must be wired into the verified authenticated action switch.
- `assets/js/cloud-config.js` has deliberately empty public endpoint settings. Populate ONLY from the actual existing `cloud-config.js`; do not embed service-role credentials.
- Productivity App focus-time aggregation is deliberately **not** simulated. It requires a real, authenticated read-only API with actual subject/session schemas; mapping preferences can be stored.

**A hosted/production deployment is not included.** No production repositories, tables or cloud functions were changed in this deliverable.

## Run locally

```sh
npm run check
python3 -m http.server 8080
```

Open `http://localhost:8080` and choose **Yerel çalışma alanını aç (deneme)**. Browser data is stored under `lt_demo_v1`. Hosting the files on the same GitHub Pages origin will not automatically make them authenticate: configure and deploy the backend changes first.

## Connect to the existing backend (requires authorized access)

1. Inspect the live Productivity App repository's README, `ARCHITECTURE.md`, `assets/js/cloud-sync.js`, `assets/js/cloud-config.js`, migrations, and `supabase/functions/app-api/index.ts` before using these patches.
2. Ensure the proposed public `app_accounts.id` FK type, actual SQL schemas, session expiry semantics, service client usage and CORS allowlist match the live repository. The SQL migration infers the FK type from the `app_accounts` table, but must be reviewed against the deployed database.
3. On a **separate backend branch**, review and apply the additive migration (do not merge directly to production).
4. Integrate `handleLearningTrackerAction` after existing session verification; use the account ID derived server-side from that verified session. Never trust a client-supplied account ID or accept service keys in the browser.
5. Verify the existing auth field names in `cloud.js`; adapt request and response to match the real backend's `signup`, `login`, `me` and session validation contracts. Verify cross-origin request headers. Reuse the same public endpoint/config.
6. Run real existing-user/new-user, expired token, logout, device revoke, rate-limit and multi-device conflict tests on **staging**, then enable production.
7. Create and publish a GitHub Pages project, commit the whole folder including generated `assets/js/app.js`, and ensure both apps are served from the same origin if storage-based session sharing is desired.

## Development

All edited frontend logic belongs in `assets/js/modules/` and `assets/js/app-main.js`. `assets/js/app.js` is generated. `scripts/module-manifest.js` defines build order.

```sh
npm run build
npm run test
npm run check
```

`npm run check` covers source syntax and Node core-domain tests. Actual browser integration, backend contract, CORS, authenticated sessions, concurrent-device behavior, and GitHub Pages hosting must still be verified in staging.

## Data and history semantics

Each resource owns its ordered recursive node tree. Only non-group leaf nodes count toward progress. Events retain timestamped status changes. Weekly assignments record moves/removals and do not carry unfinished work forward automatically. Closed-week reviews retain a snapshot. Resources and topics are soft deleted to keep historical records and prevent reappearance after sync. Cloud CAS uses an expected revision; divergent same-record edits require explicit user choice.

## Limitations

- Real cloud login and sync are integration-ready, not verified or deployed.
- No actual Productivity App focus-time integration until its session schema can be inspected and authorized endpoints added.
- Local mode is one-browser storage and cannot sync devices.
- Browser UI has not been validated on all target devices or against a real shared account.
- Some advanced import hierarchy editing (e.g. drag-and-drop) is offered via explicit up/down/outdent operations rather than direct mouse drag.

## Security

Never commit service role keys. The backend helper is **not** an independent auth service. Browser requests use the existing session convention. Server access must use the existing verified session account ID and the app-specific table. Exported backups can contain private learning data and should be stored securely.
