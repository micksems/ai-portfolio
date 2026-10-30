# Job-search process

The single execution contract is [docs/job-search-workflow.md](../docs/job-search-workflow.md).
Read the live **Rules** tab for current user policy. Hidden legacy tabs are archives, not operating inputs.

Use `npm run jobs -- run PRIVATE_RUN_DIRECTORY` for manual discovery/resumes and
`npm run jobs -- sync PRIVATE_RUN_DIRECTORY` for a canonical status/outcome update.
The staged controller records timings, validates reuse, runs the duplicate and final PDF evidence checks,
and returns only the next missing external action. Do not recreate per-run scripts or bypass its release gate.

The detailed claim, ownership, required-depth and source standards remain in
[RESUME_TAILORING_STANDARD.md](RESUME_TAILORING_STANDARD.md). Each candidate-evidence entry must now
include its actual `localPath` and `sha256`; declaring `verified:true` alone is not proof. The final checker
independently extracts the PDF and reads the bound candidate sources.

The reply monitor handles only new evidenced correspondence. It preserves stable message/event IDs,
does not turn an invitation into a completed event, and labels a message processed only after required
canonical writes and publication succeed. Covers, outreach and forms remain separate explicit requests.
No scheduling or submission is added by this runtime.

Applications remain unique confirmed submissions since August 24, 2026, with lifetime totals separate.
Rejected/closed submissions continue to count. Four earlier confirmed applications stay lifetime-only;
Gartner's unknown original submission date stays unknown; Loop stays unverified until evidence changes it.
Assessments remain separate from human interviews and combine only in the labeled progress-events card.
Private candidate facts, new source notes, contact details and email bodies never go into public data.
