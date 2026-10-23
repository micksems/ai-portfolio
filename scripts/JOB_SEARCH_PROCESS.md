# Job search updates

The native Google Sheet is the record of applications and outcomes. The website
is a published snapshot, not a live connection. Do not hand-edit headline totals.

1. Read the current Job Tracker, Application History and Interview Prep before
   mutations. Identify an exact requisition; use canonical keys, not employer
   name alone. Never change a historical submission into an unsubmitted lead.
2. On user-confirmed submission, update Tracker Status/Applied At and History
   Current Stage/Final Outcome/Applied At. Set History AB Submission Confirmed
   and AC In Application Cohort to true for the primary unique record, and AD
   Canonical Job Key. Preserve evidence and unknown time precision in Notes.
   Closed/rejected applications remain confirmed. Four pre-August 24 submissions
   remain lifetime-only. Gartner has a confirmed cohort submission with unknown
   submission date; do not invent one. Loop stays unverified until new evidence.
3. When creating records, set AB/AC false and AD to the exact canonical key.
   Historical duplicate rows remain as evidence, with submission flags false;
   only the primary record contributes to totals. Rejection counts deduplicate
   by AD. Keep distinct requisitions distinct. Append interview events once per
   event ID; automated assessments do not count as human interviews.
4. Read the three sheets back with UNFORMATTED_VALUE. Export an object containing
   readAt (ISO timestamp), tracker (A:S), history (A:AD), interviews (A:R), each
   with header row. Save this export outside the repository; it includes private
   notes. Run `node scripts/sync-job-search.mjs /absolute/path/snapshot.json` from
   the repository within 30 minutes. It rejects missing submission metadata,
   reconciles terminal outcomes, preserves unknown dates, removes display
   duplicates, derives totals and records the source hash and read time.
5. Run `npm run check:pipeline`, `npm run test:pipeline`, then `npm run build`.
   Both pipeline checks are required by prebuild. Review the diff, commit the
   code/data and publish through the connected production Git branch. Verify
   that production is READY on the exact commit and the website shows the new
   values. A Sheet write alone does not update the website.

Manual requested searches retain their separate preflight: exactly the requested
new jobs, no Senior/Sr/Lead titles, no submitted duplicates, verified role and
application evidence, and master-based resumes. Always use Times New Roman for
all resume and cover-letter text in Word and PDF. Run the actual font checker,
render and inspect each page before release. No scheduled search, applications,
outreach or email is enabled by these scripts.
