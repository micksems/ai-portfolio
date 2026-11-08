# Job-search execution contract

The live Google Sheet `1Kvb_4CM_FcOEVubMq8LTNFve6LOqw4uxU_SMDMVN44o` is canonical.
Use visible **Jobs, Candidate, Evidence, Events, Rules**. Hidden tabs are frozen archives.
Current explicit user instructions override stored policy. The website publishes a read-only snapshot.

## One entry point

Use `npm run jobs -- run PRIVATE_RUN_DIRECTORY` for a requested search/resume run;
use `npm run jobs -- sync PRIVATE_RUN_DIRECTORY` for **every new canonical Jobs/Events change**, including held `Found` leads, confirmed submissions and reply outcomes. Refresh the live snapshot before syncing; no PDFs are needed for `Found` records.
Use `npm run jobs -- revise PRIVATE_RUN_DIRECTORY` for an explicitly requested rewrite of existing
unsubmitted packages. Set revisionOf to the prior run. Retained roles are not new jobs; reuse their
Library/Drive identities and preserve submitted snapshots. All source, PDF and release checks apply.
Use `npm run jobs -- benchmark PRIVATE_RUN_DIRECTORY` for one explicitly requested existing,
unsubmitted role using its dated captured JD. Set requestedCount=1 and revisionOf. It uses all
source/PDF checks but stops before uploads, tracker or publication; it never asserts current availability.
Use `npm run jobs -- checkpoint PRIVATE_STATE_ROOT ARCHIVE_PATH` to close and verify the private ZIP
before upload. The archive must be outside the state root; unchanged bytes return changed=false.
Use `npm run jobs -- status PRIVATE_RUN_DIRECTORY` for measured stage/wait durations.
Do not copy an earlier run's scripts or assemble a new renderer. Keep private run directories and caches
outside the checkout or inside its ignored `.job-search/` directory. Never commit candidate data, evidence
packs, receipts, raw JDs, PDFs, fonts or run manifests. No credentials are needed by the local runner.

The controller performs local stages and returns the next explicit boundary. The assistant still supplies
research and writing judgement, views the actual final PNGs, and calls the connected Library/Drive/Sheet/
GitHub/Vercel tools. A waiting stage is not completion. The runner does not invent verified evidence,
write application forms, submit applications, send messages, or schedule searches.

## Completion and credit efficiency

The purpose is to return the user-requested number of **verified** new roles and truthful role-specific PDFs,
not to maximize searches, retries or elapsed time. The live Rules tab determines employer scope;
do not consult legacy broad-search instructions when Rules restrict searches to the H-1B employer list.
Within a run, query verified sources once, deduplicate by requisition before full-JD reads,
and reuse cached evidence/failed lookups. Do not run overlapping search engines to rediscover
the same board or repeatedly request full tracker/archives.

Discovery processes up to **12 distinct verified ATS boards per pass** (`maxBoardRequests`, 1–24),
and **automatically continues** to the next boards for at most two passes (`maxDiscoveryPasses`, 1–2).
It records `nextOffset`, per-pass counts and deferred sources. To request a later pass, set
`sourceOffset` to the saved `nextOffset`; never restart at board zero by accident.
Deferred boards are **unsearched**, not rejected. No unbounded search loops.

The built-in source adapters are **Greenhouse, Lever, Ashby, verified public Workday career
sites, and explicitly configured public employer JSON feeds**. Workday runs up to three
server-side terms and two 20-result pages per term, cached by POST body. Do not
guess tenants, hosts or sites; obtain these from the employer's own public careers
URL. Respect unavailable or gated endpoints. SAP SuccessFactors does not expose a
universal public job-search API: only use a genuinely available official employer
feed or the manual verified-source workflow. <strong>Do not invent a feed.</strong>

For employer pages without a configured public feed, save a dated `externalLeadsPath`
array from the exact employer posting. Each record requires company, position,
requisition URL, `evidenceUrl`, ISO `observedAt`, and
`officialEmployerHost` matching the employer's verified ATS host. Leads missing
the last field are **held** as unverified, not counted as new qualified candidates.
The official role JD, mandatory qualifications, actual work authorization and
application form still need independent verification. A general-careers redirect,
sign-in gateway or HTTP 200 alone never verifies a usable application form.

Every manual run must supply `targetEmployers` in approved list order and at least
one configured employer source or dated external lead. Missing source configuration
returns `source-configuration` before fonts/resume work. Only the configured
employers are attempted; the discovery audit lists attempted, failed, deferred
and unconfigured employers. A zero-result run with missing employer coverage is
a **coverage failure**, not evidence that no jobs exist.

Prioritize well-connected **junior stretch roles**, not only nearly identical past experience.
A preferred tool, direct employer-industry background or posted years threshold is not by
itself an automatic exclusion when documented transferable project/internship work supports
the core tasks. Never invent achievements or certifications, waive hard eligibility checks,
or silently lower `requestedCount`.
If **1–4** roles pass all gates in a five-job run, generate and persist those verified resumes,
then return `status: partial`, the original five-job target and exact remaining count.
If none qualify, do not render anything; report reasons, sources searched and deferred employers.
The next requested pass resumes from its saved checkpoint.

For **zero verified jobs** or any held role, the user-facing result is incomplete and
the run's `dashboardSyncRequired` flag must be honored. Record the held
`Found` lead (with source/reason) in canonical Jobs, refresh Jobs/Events, then call
`npm run jobs -- sync PRIVATE_RUN_DIRECTORY` and verify the matching published
GitHub commit plus Vercel READY production route. This is a separate **status-only**
sync and must not generate or release resumes. A run cannot be declared fully
reconciled while the website is behind the Sheet. Normal runs must not set
`releaseStatus: Found` for ready-to-apply resume packages.

A completed GitHub test/build checks software behavior, not actual role eligibility,
form access or a five-job live search. Benchmark and unit tests must never be
represented as a successful end-to-end job run.

A time/credit guardrail limits **repeated work**, not the amount of care spent on each shortlisted
job or the evidence and PDF release gate. Stop retrying a source after the recorded timeout/error
unless a verified alternate source exists. Resume a failed stage only; never redo PDFs after an
upload, Sheet or deployment failure. Keep successful receipts, exact submission protection and
one-page Times New Roman QA.

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
  "targetEmployers": ["Employer", "Next Employer"],
  "sources": [
    {"provider":"greenhouse","board":"verified-slug","company":"Employer"}
  ],
  "sourceOffset": 0,
  "maxBoardRequests": 12,
  "maxDiscoveryPasses": 2,
  "externalLeadsPath": "dated-external-leads.json",
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
   deadlines, explicit errors, and a default 12-board pass limit (24 maximum). Successful sources cache for 15 minutes; 404/410 for 24 hours;
   401/403/429 for one hour; transient failures for five minutes. Source bodies are content-addressed.
   Full Workday requisitions, including hyphens and suffixes, remain distinct. Match historical keys
   through their saved URLs without rewriting submitted records. Dashboard reconciliation accepts a legacy key only when the
   previously published record binds it to that exact requisition URL. LinkedIn numeric and titled
   URLs share the numeric job ID. URL-less named records must match their company/title key. Exact known requisitions are removed
   before deeper research. The runner repeats identity/submission protection before reading authoring plans.
   Use earlyMismatch for explicit salary, location, timing, senior-independent-ownership and CPT/OPT restrictions. A junior years/domain-experience gap is tracked as stretchReasons, NOT filtered at discovery.
   Missing metadata is not proof of mismatch. Broader Associate/Specialist/Graduate titles with relevant duty snippets enter review rather than being rejected by title alone; ambiguous ones remain held until duties are checked. An AI-branded recruiting/admin role is not an AI analyst role. Same employer/title and known aliases
   (including Deploy/Hive) are held as possible reposts. A new ID alone cannot fill a new-job slot.
3. **Research and freeze:** follow the live Rules employer scope, currently the H-1B-dependent employer list. Use native ATS feeds plus dated external leads for Workday/SAP/other company career sites. Do not run unrelated UN/agency or general-market searches unless requested. Review relevant leads and held ambiguous Associate/Specialist titles before excluding them. Verify the
   complete dated employer JD, mandatory/preferred qualifications, seniority, geography, base pay,
   start/enrollment, actual authorization restrictions and the exact application route. Sponsorship is a
   preference, not automatic legal ineligibility. Freeze the requested number of genuinely new roles;
   disclose a real shortfall instead of padding. Scores are not interview probabilities.
4. **Preflight — before any resume drafting or font work:** supply 1..requestedCount policy-v2 candidates to the duplicate/eligibility validator.
   `requestedCount` stays the user's full target. Before asking for `plans.json`, building fonts, or creating
   PDFs, the controller evaluates the latest submission snapshot and every mandatory role gate.
   The `application_path` gate must identify the exact requisition and direct HTTPS form URL,
   `form_verified: true`, `requisition_confirmed: true`,
   `verification_method: "manual_form_review"` (or `authenticated_form_review`),
   `form_evidence`, `reviewed_by` and a fresh `checked_at`.
   An HTTP 200, employer careers landing page or sign-in-only screen is not a verified application form.
   Explicit CPT/OPT exclusion, missing nontransferable credential/degree/language, real legal
   ineligibility or ambiguous hourly/contingent compensation must remain on hold.
   For experience, role_fit and mandatory_requirements, allow verdict="transferable"
   where a documented transferBridge (jobDuty, candidateEvidence, evidenceSource, resumeAngle,
   limits) connects real work to the posting without marking the missing work as done.
   Do not transform a preferred tool or experience depth mismatch into a hard exclusion.
   The preflight output must retain the stretch bridge and classify it separately from
   direct matches. On any failed check the runner returns `qualification-hold`
   with exact reasons; **do not create a resume draft**. Previously submitted roles stay blocked.
   For same-title aliases require `distinctRoleReview` with comparedKey, decision=distinct,
   employerSource, employerQuote in the JD, and an actual team/duties/program difference.
   A shortfall is incomplete, not silently erased.
5. **Draft and render only after passing preflight:** Treat the master as verified facts and style, not inherited experience copy.
   Review each experience slot; replace it or explicitly retain the pinned master bullet with
   authoringReview.retainedBaselines. Do not rewrite all fifteen bullets for wording differences. Each plan has authoringReview with roleFocus,
   evidenceSelections mapping each primary duty to a baseline/sourceIds/rationale, projectChoices
   explaining the three selected projects and scopeLimit, and comparisonDecision. Select evidence and projects for actual duties. Retain strong directly relevant bullets.
   Explain evidence selection and positioning; synonym swaps and keyword edits are not substantive work.
   Be assertive and write what the candidate *did* and *produced*, choosing the most
   relevant actual examples from the UN, AI evaluation, Camp Vega, Lewis and analytics
   projects. Connect tasks by common workflow even if the industry/tool differs.
   Keep limits and risk in the private evidence record, not as gratuitous apologies
   in every resume bullet. Do not claim tools, ownership, levels or results that were
   not actually demonstrated. The runner checks this boundary; an operator still
   reviews semantic relevance. No arbitrary changed-word percentage.
   Optional skillLabels may reorder the three skills categories to put the role focus first.
   **Render:** `plans.json` is an array keyed by canonical requisition, with reviewed `changes`
   (baseline:text) and `projectLabels` (681/694/707:label). The pinned-master renderer preserves geometry,
   chronology, education/experience structure and links. No model writes code or invents bullets inside
   the renderer. Only changes, projectLabels, skillLabels, identity, master, fonts and renderer code invalidate a PDF;
   writing-review rationale and other non-rendering metadata do not. In particular, a new read timestamp, score or publishing retry
   does not. Actual text/bounds/fonts/links are checked and PNG/text companions are produced.
6. **Content and visual release:** `packs.json` follows [the evidence standard](../scripts/RESUME_TAILORING_STANDARD.md).
   Each pack has `key`, 3–5 distinct employer work duties and the full requirements ledger. Every candidate
   evidence entry also binds `localPath` and `sha256` to the original approved/verified file. Critical source
   excerpts are checked against independently read file bytes. SourceTextCache retains extracted text by
   source SHA256 with a text-integrity hash, reused across runs. Keep a compact private evidence bank
   with source hash/path, exact excerpts, work context and factual limits; re-extract only changed sources; course titles cannot prove applied work. Applied critical evidence requires workExample with context
   (professional/internship/academic_team/academic_individual/personal/volunteer), actionQuote present in
   sourceText, and outputQuote present in resumeProof. This replaces the verb whitelist; human review
   must establish that the cited work supports the underlying duty. A direct-match requirement
   stays status="met"; a related but nonidentical requirement can be status="partial",
   reviewVerdict="transferable" with a documented source-anchored transferBridge.
   A credible bridge can substitute for direct tool/sector/tenure experience as a
   *pursuit decision*, without making a false claim that the exact platform, years or
   professional ownership was acquired. Distinguish actual nontransferable requirements
   (credential/degree/language/legal eligibility) from preferences and future duties;
   keep those hard exclusions.
   View each final PNG once; read its actual extracted text and fact-check the claims. Write reviews.json
   entries with key, sha256, previewSha256, reviewer, renderedAndInspected, extractedTextReviewed,
   claimsFactChecked. These flags record real review, never fabricated defaults. The controller invokes
   the final artifact/evidence checker itself. HOLD packages cannot advance to Ready. Only an explicit
   `revise` of an existing unsubmitted package may save a fact-checked draft with a qualification-only
   HOLD, and its tracker status must remain Found. Factual, source and PDF failures always block saving.
   Unsupported duties are a discovery/content problem, not a reason to weaken the checker.
7. **Save:** the runner returns only missing uploads. Use one Library batch and bounded parallel Drive
   uploads. Save exact successful connector receipts to uploads.json: key, sha256, library_file_id,
   drive_file_id, drive_url. Keep successful per-provider receipts on partial failure; the runner returns missing providers only.
   Record uncertain:["library"] or ["drive"] after an ambiguous result; inspect the provider before
   retrying. Do not repeat a successful save or treat missing acknowledgement as proof of failure.
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

## External employer lead format

The private `dated-external-leads.json` is an array; example only:

```json
[
  {
    "company": "Example Employer",
    "position": "Business Operations Associate",
    "url": "https://example.com/careers/req-123",
    "evidenceUrl": "https://example.com/careers/req-123",
    "observedAt": "2026-11-08T15:00:00Z",
    "location": "New York, NY",
    "descriptionSnippet": "Process analytics, reporting and data quality responsibilities."
  }
]
```

Add `"officialEmployerHost": "example.com"` to an external lead only after
confirming that both the job URL and the evidence URL are hosted on that
employer's genuine ATS/career domain. Without it, the lead is **held**
until the official source is established. No third-party board snippet
satisfies this field. The source and timestamp certify only what was found,
not that the position is active, eligible, or has a working application form.
Include no invented employer claims and keep the file private.

### Verified direct career-site starting points

Use `config/verified-employer-career-sites.json` for the November 3 named
employers (TCS, Wipro, Cognizant, Capgemini, HCLTech). These verified starting
URLs are **not** automatic ATS feed configurations and are **not** individual
job application links. They make manual discovery more repeatable.
The H-1B-dependent list and live Rules remain the source of employer scope/order.

### Official Workday source example

Only after confirming host, tenant and site from the company's own careers
page, configure a local source such as:

```json
{
  "company": "Example Employer",
  "provider": "workday",
  "host": "sample.wd5.myworkdayjobs.com",
  "tenant": "sample",
  "site": "External",
  "searchTerms": ["analyst", "data", "AI"],
  "maxPagesPerTerm": 1
}
```

This is a format example, **not** a claim that the sample tenant has live jobs.

### Check application links before generating PDFs

For up to ten shortlisted requisitions, store private URL-check inputs in
`application-links.json` and run:

```bash
node scripts/job-search-application-path.mjs PRIVATE_RUN_DIRECTORY/application-links.json
```

Fields: `url` (exact employer listing or apply URL), `position`,
`requisition`, and optional `permittedHosts` (only verified company ATS
domains). Results distinguish closed/redirected/general-homepage/sign-in
links from visible individual job pages. A visible individual job page is
`state: review`, **not application-ready**; someone must still verify the
actual form beyond login and record the dated source in the preflight gate.

### Mandatory coverage audit

The runner returns `discovery.audit` at the shortlist boundary. Include
the checked and unconfigured company names, actual HTTP requests and cache
hits, candidate/held counts, duplicate/filter reasons, and explicit deferred
source names when reporting a shortfall. It is not a billed ChatGPT token
counter. Do not describe a configured company whose source failed, or an
unconfigured/deferred company, as searched successfully.

## Cache and recovery

Record a reviewed rejection with `npm run jobs -- reject PRIVATE_RUN_DIRECTORY rejections.json`.
Entries are `{key,reason,revision,hours}` (revision may be null). They expire within seven days, default
24 hours, and invalidate when candidate/evidence/rules or source revision changes. No failed HTTP lookup
is silently swallowed. Do not repeat a cached failing route through multiple search engines unless new
evidence changes the result. Cache is a retrieval aid, not qualification or permanent proof of closure.

Every executed stage and external review/wait is timed in manifest.json. These are local stage timings,
not token or billing records; they cannot explain every external research action. Keep tool output to
counts, relevant excerpts and exceptions. Read sources once and retain full responses privately. A completed stage is reused
only when its inputs and every referenced output hash still match. Missing/changed files invalidate reuse.
Resume at the returned boundary. A sync failure never authorizes recreating resumes. Finalize the archive with the checkpoint command (ZIP close, CRC and per-file SHA256 verification,
atomic installation). Never upload an archive while its writer is still running. Keep the existing
Library identity and expected version guard; changed=false means no upload. Save the private
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
