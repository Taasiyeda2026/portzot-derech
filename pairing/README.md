# מציאת שותפות — ניהול קבוצות ודיווח

The existing questionnaire (15 exact questions/options/codes) and `js/pairing-algorithm.js` are unchanged. The Edge function's `algorithm.mjs` is an exact byte copy, enforced by a test. New activities never read/write Firebase. The owner confirmed that no activity is currently running, so no Firebase compatibility route is needed. Existing Firebase documents are never deleted or migrated.

## Components

- `pairing/admin.html`, `teacher.js`: one responsive RTL manager and personal group history; admin can view/filter all owners.
- `pairing/common.js`: gateway transport; reuses the existing cross-origin dashboard SSO bridge and invalidation watcher without modifying Inspiration.
- `supabase/functions/pairing-groups`: staff JWT verification via Auth.getUser; independent participant bearer tokens; authoritative matching; private PDF; Graph delivery.
- `20261113140437_pairing_group_reporting.sql`: four domain tables (`pairing_activities`, `pairing_participants`, `pairing_reports`, `pairing_policy`); service-only RPCs; private helper/rate/runtime tables; daily retention cleanup; private `pairing-reports` bucket.

RLS is enabled and table access revoked from anon/authenticated. The gateway is the sole data boundary; every staff RPC rechecks the current active dashboard user and the activity owner/admin role. Participant tokens are 256-bit random credentials, hashed in the database, scoped to a single participation; same-name participants remain distinct. Public Realtime broadcasts contain invalidation only. Private participant responses explicitly project only the participant and her published group names. No participant responses/scores enter the PDF or mail.

## Lifecycle and concurrency

Collecting → draft → published → closed. Join/submission use an activity row lock. First matching closes registration; it requires all joined participants to finish and at least two. Draft edits validate an exact partition into groups of 2–4 and use optimistic version checks. Publication is an explicit finalization that freezes editing. Closing expires participation entry, not report retention. Room codes expire after 8 hours. Local bearer recovery expires after 8 hours; questionnaire drafts stay in sessionStorage until successful submission.

PDF generation happens only from the frozen server snapshot and uses packaged Alef fonts, fontkit, bidi-js and the approved Taasiyeda logo, following the payroll implementation. Reports wrap names, paginate A4, and repeat table headings. PDF access requires the same active-owner/admin permission even after activity closure.

Mail: the approved Taasiyeda Dashboard app (`FEEDBACK_STAFF_MS_*`) must issue a token pinned to its app/tenant IDs with application `Mail.Send`. There is no fallback to shared payroll credentials and no new Graph grant. Both sender and recipient are fixed to `office@think.org.il`. Every report has a unique claim and audit history. A 202 response records provider acceptance, not guaranteed inbox delivery. Explicit rejection permits bounded retry; timeout, network error, 5xx or an interrupted sending claim cannot automatically retry. An admin must verify with the office before recording an explicit sent/not-sent resolution; the verification and actor are audited. Downloads never send mail.

## Retention is an organizational decision

`pairing_policy.retention_days` deliberately starts NULL: opening a new activity fails closed until an authorized owner supplies the approved period. No arbitrary retention period is inferred from Inspiration's 30-day classroom policy. After approval, configure the singleton with the agreed number, approver and timestamp:

```sql
-- Replace the period and approver with the explicitly approved values.
update public.pairing_policy
set retention_days = :approved_days, approved_by = :approver, approved_at = now()
where id;
```

Every activity snapshots its expiration at creation. Access stops at expiration. The dedicated daily cron invokes the gateway with a private server-only cleanup credential, deletes its private storage PDF through the Storage API first, then deletes the activity and cascading participants/report. Failures retain references for the next retry. Inspiration cleanup never touches pairing data.

## Deployment order / release gates

1. Confirm the organizational retention period before frontend cutover. The owner has confirmed there are no active legacy activities.
2. Run focused tests below. Review migration and Edge changes.
3. Apply the additive migration to Dashboard (`szinlhjuwyiyszdpsdop`); existing systems remain untouched. Configure approved retention. Verify the bucket is private and SQL grants are restricted.
4. Deploy `pairing-groups` with platform `verify_jwt=false` because the body verifies staff JWTs itself and participants use separate tokens. All existing function configurations stay unchanged.
5. Check existing Graph identity readiness. Authenticate through the real dashboard, run one synthetic end-to-end activity and at most one explicitly marked live test mail to the office. Verify Hebrew PDF visually and provider acceptance.
6. Merge the frontend PR and verify GitHub Pages serves the new HTML/JS/service worker (`v185`). New pairing pages bypass cache/precache. No personal API response is cached.
7. Production smoke check: dashboard staff access, isolated activity, own-group result, history and PDF. Remove only synthetic test data and their private PDFs. Do not delete existing Firebase data.

Do not merge the frontend while backend, retention, mail or real SSO gates remain unverified. No additional paid services or permissions are required by the implementation.

## Validation

```sh
npm run test:pairing
npm run test:pairing:browser
node --test inspiration/tests/edge.test.mjs inspiration/tests/service-worker.test.mjs
```

Database tests use real PostgreSQL semantics via PGlite with minimal Auth/Realtime/Storage/cron stubs, and entirely synthetic identities. Handler tests exercise that database through the actual gateway, real PDF generation and fake Graph transport. Browser tests drive actual manager/questionnaire/results pages against that gateway/database and test refresh recovery, same-name participants, manual editing, publication and mobile layout. A five-page synthetic Hebrew PDF was rendered with Poppler and visually checked for RTL, long names, numerals and repeated table headings. They do not establish live Supabase Auth, Graph or production availability. Temporary PDFs/screenshots go to `../work/pairing-validation`.
