# Job-search execution contract

The live Google Sheet `1Kvb_4CM_FcOEVubMq8LTNFve6LOqw4uxU_SMDMVN44o` is canonical.
Use visible **Jobs, Candidate, Evidence, Events, Rules**. Hidden tabs are frozen archives.
Current explicit user instructions override stored policy. The website publishes a read-only snapshot.

## One entry point

Use `npm run jobs -- run PRIVATE_RUN_DIRECTORY` for a requested search/resume run;
use `npm run jobs -- sync PRIVATE_RUN_DIRECTORY` for confirmed submissions or reply updates.
Use `npm run jobs -- revise PRIVATE_RUN_DIRECTORY` for an explicitly requested rewrite of existing
unsubmitted packages. Set revisionOf to the prior run. Retained roles are not new jobs; reuse their
Library/Drive identities and preserve submitted snapshots. All source, PDF and release checks apply.
Use `npm run jobs -- status PRIVATE_RUN_DIRECTORY` for measured stage/wait durations.
Do not copy an earlier run's scripts or assemble a new renderer. Keep private run directories and caches
outside the checkout or inside its ignored `.job-search/` directory. Never commit candidate data, evidence
packs, receipts, raw JDs, PDFs, fonts or run manifests. No credentials are needed by the local runner.

The controller performs local stages and returns the next explicit boundary. The assistant still supplies
research and writing judgement, views the actual final PNGs, and calls the connected Library/Drive/Sheet/
GitHub/Vercel tools. A waiting stage is not completion. The runner does not invent verified evidence,
write application forms, submit applications, send messages, or schedule searches.

## Completion and timing

There is no overall run deadline, elapsed-time budget, search-query budget, or speed target.
Timing measurements are diagnostic only. Continue discovery across additional employers and sources
until the user-requested number of new qualified roles and verified role-specific PDFs, tracker updates and
website synchronization are complete. Rejected leads, exhausted initial queries, and an individual
source failure are not run-level blockers. Per-request and per-command timeouts only prevent hangs;
retry or switch sources and resume the same run. Do not lower requestedCount to deliver a partial run
without the user's instruction. Preserve duplicate, eligibility, factual and PDF checks. A shortfall
requires a concrete external blocker that actually prevents further progress, identified precisely;
it must never be attributed to an inferred time limit or a limited first batch of search results.

## Inputs

Create `inputs.json` in the private run directory. Paths relative to that directory are supported for
the named input files; master/font/evidence artifact paths must be absolute. Example shape:

```json
{
  "spreadsheetId": "1Kvb_4CM_FcOEVubMq8LTNFve6LOqw4uxU_SMDMVN44o",
  "requestedCount": 5,
  "snapshotPath": "snapshot.json",
  "candidatePath": "candidate.json",
  "evidencePath": "evidence.json",
  "rulesPath": "rules.json",
  "shortlistPath": "shortlist.json",
  "plansPath": "plans.json",
  "packsPath": "packs.json",
  "reviewsPath": "reviews.json",
  "uploadsPath": "uploads.json",
  "readbackPath": "readback.json",
  "publishedPath": "published.json",
  "stateDir": "../../cache",
  "sources": [{"provider":"greenhouse","board":"verified-slug","company":"Employer"}],
  "master": {"library_file_id":"current-approved-id","version":2,"sha256":"actual-sha256","local_path":"/absolute/master.pdf"},
  "fontSourcePath": "/absolute/previously-saved-Times-New-Roman-resume.pdf"
}
```

`snapshot.json` and `readback.json` contain `{readAt,jobs,events}` with header matrices, native boolean
submission flags and a read time within 30 minutes. A sync-only input needs only spreadsheetId,
snapshotPath and publishedPath. Resolve current metadata and exact tab/range before connector writes.
Preserve date-only precision; never infer an application from preparation or a scheduled call from completion.

## Stages and checks

1. **Environment:** read Candidate/Evidence/Rules/Jobs once; pin the actual current approved master
   Library version/hash. Resolve authentic Times New Roman before discovery. The renderer can extract
   complete embedded Times fonts from an already saved resume, keeping these assets private. Missing
   dependencies/fonts fail once before research rather than halfway through document creation.
2. **Discovery:** configure verified ATS slugs, never guess a long list of alternate slugs. Greenhouse
   requests metadata first; Lever/Ashby reuse their board response. Four concurrent requests, eight-second
   deadlines, explicit errors. Successful sources cache for 15 minutes; 404/410 for 24 hours;
   401/403/429 for one hour; transient failures for five minutes. Source bodies are content-addressed.
   Exact known requisitions are removed before deeper research. Same employer/title and known aliases
   (including Deploy/Hive) are held as possible reposts. A new ID alone cannot fill a new-job slot.
3. **Research and freeze:** supplement ATS discovery with connected search, including the official
   UN/agency check and sponsor-friendly employers. Research only surviving relevant leads. Verify the
   complete dated employer JD, mandatory/preferred qualifications, seniority, geography, base pay,
   start/enrollment, actual authorization restrictions and the exact application route. Sponsorship is a
   preference, not automatic legal ineligibility. Freeze the requested number of genuinely new roles;
   disclose a real shortfall instead of padding. Scores are not interview probabilities.
4. **Preflight:** provide policy-v2 candidates to the existing duplicate/eligibility validator. Fresh
   Jobs submission state is required before authoring. A confirmed submission remains blocked after
   rejection/closure. A same-title alias requires `distinctRoleReview` with comparedKey, decision=distinct,
   employerSource, employerQuote present in the JD, and an actual team/duties/program difference.
5. **Draft and render:** Treat the master as verified facts and style, not inherited experience copy.
   Supply the complete reviewed experience text. Each plan has authoringReview with roleFocus,
   evidenceSelections mapping each primary duty to a baseline/sourceIds/rationale, projectChoices
   explaining the three selected projects and scopeLimit, and comparisonDecision. Skills edits and
   reordered master bullets alone are not substantive rewriting. The runner checks this boundary;
   an operator must still review semantic relevance. No arbitrary changed-word percentage.
   Optional skillLabels may reorder the three skills categories to put the role focus first.
   **Render:** `plans.json` is an array keyed by canonical requisition, with reviewed `changes`
   (baseline:text) and `projectLabels` (681/694/707:label). The pinned-master renderer preserves geometry,
   chronology, education/experience structure and links. No model writes code or invents bullets inside
   the renderer. Only its actual inputs invalidate a PDF; a new read timestamp, score or publishing retry
   does not. Actual text/bounds/fonts/links are checked and PNG/text companions are produced.
6. **Content and visual release:** `packs.json` follows [the evidence standard](../scripts/RESUME_TAILORING_STANDARD.md).
   Each pack has `key`, 3–5 distinct employer work duties and the full requirements ledger. Every candidate
   evidence entry also binds `localPath` and `sha256` to the original approved/verified file. Critical source
   excerpts are checked against independently read file bytes; course titles cannot prove applied work.
   View each final PNG once; read its actual extracted text and fact-check the claims. Write reviews.json
   entries with key, sha256, previewSha256, reviewer, renderedAndInspected, extractedTextReviewed,
   claimsFactChecked. These flags record real review, never fabricated defaults. The controller invokes
   the final artifact/evidence checker itself. HOLD packages cannot advance to Ready. Only an explicit
   `revise` of an existing unsubmitted package may save a fact-checked draft with a qualification-only
   HOLD, and its tracker status must remain Found. Factual, source and PDF failures always block saving.
   Unsupported duties are a discovery/content problem, not a reason to weaken the checker.
7. **Save:** the runner returns only missing uploads. Use one Library batch and bounded parallel Drive
   uploads. Save exact successful connector receipts to uploads.json: key, sha256, library_file_id,
   drive_file_id, drive_url. Keep successful receipts on partial failure; do not upload them again.
8. **Sheet:** the runner produces ready-sheet-plan.json. Compare expectedBefore with fresh target cell
   metadata immediately before applying its structured requests. If state changed, refresh snapshot.json
   and regenerate the plan. Preserve submitted records and exact submitted PDFs. Read back Jobs/Events
   into readback.json. One row per canonical requisition; concise summary only, no copied logs.
9. **Publish:** refresh the checkout's base data once. Run again to prepare a compact publication proposal.
   Identical state returns no-op; it does not commit/deploy. Apply the proposal using the connector recipe
   below. Verify exact CI success, production READY and the live route. Record published.json with
   proposalSha256, commit, ci=success, productionVerified=true, deployment:{state:READY,commit,aliases}.
   Immediately after the commit succeeds, save its exact commit and proposalSha256 in published.json
   with ci=pending. This is the recovery receipt; add CI/deployment/route results to that same receipt as
   verification finishes. While verification is pending the runner preserves the proposal and requests no
   new commit. If the remote write timed out, inspect GitHub state before retrying. A stale-base conflict
   requires checking whether the proposal was already applied; reconcile a newer base only after ruling
   out an earlier successful write. Final handoff stays the application/PDF table and material caveats.

## Cache and recovery

Record a reviewed rejection with `npm run jobs -- reject PRIVATE_RUN_DIRECTORY rejections.json`.
Entries are `{key,reason,revision,hours}` (revision may be null). They expire within seven days, default
24 hours, and invalidate when candidate/evidence/rules or source revision changes. No failed HTTP lookup
is silently swallowed. Do not repeat a cached failing route through multiple search engines unless new
evidence changes the result. Cache is a retrieval aid, not qualification or permanent proof of closure.

Every executed stage and external review/wait is timed in manifest.json. A completed stage is reused
only when its inputs and every referenced output hash still match. Missing/changed files invalidate reuse.
Resume at the returned boundary. A sync failure never authorizes recreating resumes. Save the private
state/cache manifest and new rejection ledger with the existing private pipeline state at handoff; restore
that state once at the next run, then refresh live Jobs/submission evidence. Bootstrap/source data is not
another mutable tracker. Keep the reply monitor schedule unchanged.

## Compact connector publishing

This avoids transferring the 380KB public data file back out through twenty terminal reads. The fresh
GitHub fetch result stays in code-mode memory. The proposal contains only changed jobs and public fields.
Use the repository's tested self-contained apply function, not a hand-written patch implementation:

```js
const current = await tools.mcp__codex_apps__github_fetch_file({
  repository_full_name:"micksems/ai-portfolio",path:"src/data/jobSearchData.js",ref:"master"
});
// Refresh the local checkout/base to the same content before running the sync controller.
// Capture a small private proposal with exec_command; never print the full data file.
const source = await tools.mcp__codex_apps__github_fetch_file({
  repository_full_name:"micksems/ai-portfolio",path:"scripts/job-search-publication.mjs",ref:"master"
});
const apply = new Function(source.structuredContent.content.replace('export function','return function'))();
const old = JSON.parse(current.structuredContent.content.replace(/^export const jobSearchData = /,'').replace(/;\s*$/,''));
const next = apply(old, proposal, current.structuredContent.sha);
await tools.mcp__codex_apps__github_update_file({
  repository_full_name:"micksems/ai-portfolio",branch:"master",path:"src/data/jobSearchData.js",
  sha:current.structuredContent.sha,content:'export const jobSearchData = '+JSON.stringify(next,null,2)+';\n',
  message:'Sync verified canonical job-search changes'
});
```

The local base's Git blob SHA is in the proposal. A different fresh SHA is a hard stop: refresh/reconcile
   before retrying. Connector writes remain ordered. For backend code changes, one local test/lint pass and
the normal CI/build are sufficient; ordinary data syncs rely on the normal CI/Vercel checks once.
