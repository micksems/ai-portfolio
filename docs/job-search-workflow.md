# Job search: current operating contract

The live spreadsheet is 1Kvb_4CM_FcOEVubMq8LTNFve6LOqw4uxU_SMDMVN44o.
Five visible tabs replace the legacy operating surface:

- Jobs (gid1900000200): one mutable row per canonical ATS requisition. Submission flags are native booleans. Preserve dates and outcomes. Use Current Summary for a concise current decision and evidence/artifact references, never copied logs. Archive References locate full historical notes in hidden tabs.
- Candidate (gid1900000201): approved facts, preferences, application answers and master identity.
- Evidence (gid1900000202): verified experience and project evidence; add new proof only after verification.
- Events (gid1900000203): one evidenced assessment/call/interview event per ID. Scheduled invitations are not completion evidence.
- Rules (gid1900000204): current operational instructions. Hidden old tabs are frozen reference, not competing instructions or application sources.

## Normal run

1. Read Candidate/Evidence/Rules and Jobs once. Reconcile user confirmations; make one canonical duplicate index. Do not read old long notes, contact tables, company lists, or all inboxes by default.
2. Discover and immediately deduplicate. Verify full employer JD, required versus preferred qualifications, level, location, pay, start/enrollment and actual application path only for survivors. Five NEW roles, no sales/senior/lead. Sponsor support is a strong preference, not a legal eligibility determination.
3. Freeze five. Map core duties and mandatory qualifications to verified evidence and limits. Before authoring, refresh only the live compact Jobs identity/submission columns. Keep discovery leads local until they pass; otherwise inserting a Found record makes them previously seen under the new-job gate.
4. Run `python scripts/job_search_preflight.py run.json` (exit0). Same policy-v2 payload; snapshot now accepts `{read_at,jobs}` where jobs is the full header/value matrix from Jobs. Pin actual current master identity/hash. Do not fabricate PASS evidence.
5. Write five role-specific resumes from the pinned master. Content check plus actual final PDF rendering, text, fonts, bounds and links. Inspect once, repeat only after a relevant change. Academic projects stay identified. No unsupported claims.
6. Persist final PDFs to Library and existing Drive destinations. Upsert Jobs by canonical identity. Preserve exact submitted snapshots. Read back changed rows. Export `{readAt,jobs,events}` from Jobs and Events, including headers and native booleans.
7. `node scripts/sync-job-search.mjs snapshot.json`. Identical published state is a no-op. Commit/publish once only when changed; verify matching production commit. Handoff only the five application links and PDFs, with material caveats.

## Timing and recovery

Use `node scripts/run-checkpoint.mjs manifest.json start STAGE INPUT_DIGEST` before a stage and `finish STAGE INPUT_DIGEST OUTPUT_REF` after it (`fail` on failure). It records measured milliseconds; starting a completed stage with the same digest reports reuse. Verify the referenced artifact still exists and is unchanged before reuse. A digest must include that stage's actual inputs, not a static role name. Refresh the manifest when candidate facts, JD, authorization, master or submission evidence changes. Retry the failed stage; do not recreate PDFs for a spreadsheet/publishing failure. The helper measures and checkpoints work; it does not perform searches or authorize reuse of stale evidence.

## Metrics

Applications are unique confirmed submissions; preparation is never submission. Assessment counts remain separate from human-call counts. The Progress events card combines recorded completed calls/interviews and assessments and labels both components; repeat rounds are events, not additional applications. There is no manually maintained analytics tab or extra metrics writer.

Optional outreach, covers, company research, broad inbox reviews and strategy reviews run only on request. The existing Job Reply Monitor uses Jobs/Events and only publishes actual evidence-backed changes. Keep its schedule unchanged.

## Migration and rollback

All 14 original tabs are preserved and hidden, with values, formulas and validation intact. Old per-row notes remain there; only canonical current fields are in Jobs. Hive/Instawork lifecycle duplicates merge to one current record and keep all archive row references. Existing public history and resume URLs are retained. Legacy snapshot input remains supported for tests and rollback only; production operators must use Jobs/Events. To roll back, restore the prior repository commit and monitor prompt, unhide legacy tabs and reconcile any changes made since migration before resuming. Never operate both schemas as mutable sources.
