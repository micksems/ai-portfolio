# Evidence-first resume tailoring standard (v2)

October 30 corrective rule: the approved master is a fact and style reference, not default experience copy.
Supply the full reviewed experience draft for each role. Before rendering, each plan must include
`authoringReview` with a roleFocus, primary-duty evidenceSelections (requirementId, baseline,
sourceIds, rationale), three projectChoices (baseline, rationale, scopeLimit), and a comparisonDecision.
Review the actual employer duties before choosing evidence. Explain relevant overlap; do not impose a
word-change percentage or manufacture differences. Identical experience sets across roles require an
explicit evidence-based sharedExperienceRationale. Skills changes and bullet reordering alone are not
a substantive rewrite. The runner now checks this authoring boundary; it does not certify semantic fit.

Use `jobs revise PRIVATE_RUN_DIRECTORY` only for a user-requested rewrite of existing unsubmitted
packages, with revisionOf identifying the prior run. This uses the same renderer, evidence gate and
upload/sync path; it never counts retained roles as new and never edits submitted snapshots. Keep
existing Library/Drive file identities when replacing unsubmitted drafts. A resume may be saved for
human review while its job remains Found when an authorization or fit question is unresolved; do not
upgrade that job to Ready merely because the PDF exists. All factual and artifact checks still apply.
Only in explicit revision mode, an existing unsubmitted draft may be replaced while a qualification
HOLD remains recorded as REVISED_DRAFT_FIT_HOLD and its job remains Found. This does not release a
new application or certify fit. Source, claim-proof and PDF failures still block saving in every mode.

Execution update, October 29: the staged runner in `job-search-run.mjs` is mandatory for new packages.
It invokes the final checker before upload/Ready rather than relying on an operator to remember it.
Every candidateEvidence record includes `localPath` and `sha256` for an actual approved/verified source
file. The checker independently reads that file and verifies critical sourceText excerpts against it.
PDF path/hash/text and actual PNG review remain required. An existing submitted resume is immutable.
Effective 2026-10-26. Applies to every manual or automated job recommendation, tailored resume, or "Ready to Submit" package. The user requested this corrective change after the Mecka Strategic Project Lead rejection.

## Why this exists
A match score measures *overlap*, not qualification. Mecka Strategic Project Lead was scored 94 despite a much stronger expectation of independent end-to-end project, client, timeline, SLA, and cross-functional delivery ownership than the final resume demonstrated. The rejection email used generic "not the right match" language; the cause cannot be attributed to the resume with certainty. This is a preventive QA correction, not a claim to know employer reasoning.

## Mandatory sequence — never reverse the order
1. **Capture immutable job evidence before scoring.** Record exact employer, title, requisition ID, official job URL, complete JD text, observation date, location, level, required years, required competencies, degree, compensation, working arrangement, start date, authorization/sponsorship terms, and uncertain items. Do not silently substitute a newer JD version for the version evaluated when applying. When an official posting is JS-only or incomplete, use an identified archived copy or third-party record and label source quality explicitly.
2. **Role eligibility and seniority gate before tailoring.** Compare mandatory education, years, independent scope, domain, tools, people management, project ownership and stakeholder expectations against actual evidence. Distinguish internship, course, volunteer, and salaried professional experience; do not sum overlapping periods or equate project participation with project ownership. Default manual search policy (R-11/HF-02) excludes Senior/Sr/Lead titles and senior/lead scope unless the user explicitly changes the scope. For any allowed managerial role, independent ownership still requires direct evidence. A mandatory gap means HOLD/NO-GO, not "94% match." Unknown means investigate; do not score as met. Work authorization is role-specific, and company-wide conclusions require employer-wide evidence. Never auto-answer the candidate's personal sponsorship questions.
3. **Evidence ledger.** For every requirement, record: (a) employer's exact words, (b) Must/Preferred, (c) candidate source (approved master resume or independently verified fact), (d) Met/Partial/Missing/Unknown, (e) what could be truthfully stated on the resume, and (f) risk/gap. Candidate background is not a keyword bag.
4. **Scoring is secondary to gates.** Show fit by dimensions: domain/function, demonstrated skills, level/years, real ownership scope, work authorization, location/start, and compensation. Do not issue a high composite score when there is a critical requirement gap; disclose any stretch clearly. Never report ATS/hiring odds from an invented numerical score. A role with unresolved mandatory requirements is not "Ready to Submit." Do not pad a fixed-size shortlist.
5. **Tailor for duties, not nouns.** Start with the employer's top 3–5 tasks, then select the most relevant *verified* achievements. Put the strongest direct proof near the top of Experience; prioritize actions, scale, outcome, stakeholders and tools where supported. Reorder/rephrase faithfully, without inflating titles, independent ownership, team size, revenue, percentages, shipped status, tenure, authorization, or seniority. If top responsibilities cannot be supported, recommend a different role rather than manufacturing bullets.
6. **Adversarial review.** Ask: "If I were a skeptical hiring manager, which required duties remain unproven by this exact resume?" Test end-to-end deliverables versus assisting on a stage; consumer/customer ownership versus internal collaboration; maintaining records versus owning an SLA; projects/coursework versus production outcomes; and tools used versus tools merely familiar. State the gaps, not just strengths.
7. **Mechanical and evidence QA.** Use approved master, original facts, chronology, font/layout and links; render/inspect the PDF, check selectable/extracted text, line wrapping, date/location alignment, contact links, ATS-readable headings, one-page target (unless user approves otherwise), and final claim-by-claim fact check. Preserve a source-master version/hash and final PDF URL. Optional keywords never replace proof. Do not produce cover letters unless specifically requested.
8. **Release gate.** Assemble a reviewed evidence pack and run `node scripts/check-resume-fit.mjs /path/to/evidence-pack.json`. The tool returns HOLD for unknown/missing critical evidence, unsupported seniority, unsupported claims, verified legal ineligibility, missing dated JD, or incomplete PDF QA. A no-sponsorship employer policy alone is a warning, not a hard filter. Passing the tool only means READY_FOR_HUMAN_REVIEW; it is not permission to submit, nor proof the employer will interview or sponsor. If the checker is unavailable, hold the package and repair the environment. Do not manually bypass the release gate or infer QA completed.
9. **Audit and feedback.** Save the scorecard, unmet requirements, resume version, posting snapshot, authorization uncertainty and eventual outcome by exact requisition. Do not claim any individual rejection reveals why unless the employer explicitly states it. Periodically review rejected, interviewed and assessed applications to calibrate thresholds. Preserve already-submitted materials as historical snapshots.

## Minimum evidence pack for the checker
JSON containing:
- `role: {company, title, requisitionOrJobUrl}`
- `jobDescriptionSnapshot: {url, capturedAt, text}` (full text, minimum 400 characters)
- `candidateEvidence: [{id, description, source, verified:true, localPath, sha256}]`
- `requirements: [{id, description, critical:true|false, status:"met"|"partial"|"missing"|"unknown", evidenceIds:["e1"], resumeProof:"exact excerpt from submitted resume"}]`
- `resume: {masterSource, text}` (extract from actual final PDF, not intended draft)
- `seniorityAssessment: {status:"supported"|"borderline"|"gap"|"unknown", postingRequirement, actualEvidence}`
- `workAuthorization: {status:"verified_permitted"|"unknown"|"explicit_restriction"|"legal_ineligible"}`
- `qualityChecks: {masterLayoutPreserved:true, renderedAndInspected:true, extractedTextReviewed:true, contactLinksVerified:true, claimsFactChecked:true}`
Optional `fitScore` is informational and never cancels a blocker.

## Mecka retrospective (September 2026 application, October 26 rejection)
- Original tracker score: 94/100. Treat this as an **uncalibrated historical score**, not a validated fit probability.
- Resume: AI evaluation/annotation, UN team-based requirements and Copilot Studio work, Lewis data/records project manager work, Camp Vega data QA, analytical tools. These are real, useful experiences.
- Posting emphasized high-stakes end-to-end delivery, external customer ownership, cross-functional engineering/ops execution, time/quality/SLA accountability, startup operating cadence. The resume gave strong adjacent-domain evidence but insufficient direct proof of multiple critical leadership/delivery responsibilities. This should have been HOLD or marked a transparent stretch rather than a confident 94.
- Archived versions vary in required years (1–3 in an older listing; 4+ in another public version). Never rewrite the historical eligibility evaluation using an undated/current version. Resolve version provenance before any firm claim.
- The Mecka rejection is generic. This audit identifies an *internal process weakness*, not the employer's definitive reason for rejecting.
- Keep submitted resume unchanged as evidence; improve the process for future roles, and consider role families with stronger demonstrated individual contribution (analytics, AI-data quality, business analyst, early-career product/ops analyst).

## Roles and functions
This standard governs ChatGPT-driven/manual generation. The portfolio repository stores dashboard data and scripts but does **not** itself demonstrate a production resume-generation engine. Adding this gate does not automatically change any external scheduled task; future operators must invoke it explicitly or integrate it into their own runner.

## Release schema v3 — October 27 correction
The previous gate accepted course labels as applied proficiency and repeated one generic proof across primary duties. All v2 packages require re-review; a historical PASS is not current authorization.

- Extract 3–5 distinct **work tasks** from the employer JD before consulting candidate evidence. Degrees, tool names and personality traits cannot fill these slots.
- Every ledger row includes kind, exact employerQuote present in the stored JD, requiredDepth and demonstratedDepth (exposure/applied/independent/production), original sourceText/sourceQuote, evidenceRationale, gaps, and reviewVerdict. Mandatory gaps remain HOLD. Preferred requirements must not be misclassified to hide a mandatory gap.
- Applied skills require an executed-work example in the final resume. A course title or skill list alone cannot prove strong SQL, modeling, or independent delivery. Course projects can prove applied work when the actual method, output and contribution are sourced; they do not prove professional production ownership.
- Select relevant projects from the full verified project bank before authoring. For AI evaluation: model evaluation/NLP and customer segmentation; for reporting: SQL database and dashboard projects. Preserve chronology and Times New Roman, but replace less relevant project slots. Do not confine tailoring to synonym changes on legacy bullets.
- The CLI binds the reviewed text to actual PDF bytes using resume.localPath, resume.sha256 and independent PDF extraction. Changed bytes or intended-draft text block release.
- The checker checks structural evidence and depth declarations; it cannot independently judge semantic relevance or certify self-reported provenance. A skeptical content review remains required. Report unresolved gaps explicitly and do not promise interviews.
