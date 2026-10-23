// Manual reconciliation. Input is an unformatted export of the three native
// sheets. No credentials, live polling, applications, outreach or scheduling.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { jobKey, calculateMetrics, validatePipeline } from '../src/lib/job-search-model.mjs';
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/sync-job-search.mjs snapshot.json');
const raw = readFileSync(input, 'utf8'), snapshot = JSON.parse(raw);
const age = Date.now() - Date.parse(snapshot.readAt);
if (!Number.isFinite(age) || age < 0 || age > 30 * 60 * 1000) throw new Error('Snapshot must be fresh (within 30 minutes)');
const target = new URL('../src/data/jobSearchData.js', import.meta.url);
const data = JSON.parse(readFileSync(target, 'utf8').replace(/^export const jobSearchData = /, '').replace(/;\s*$/, ''));
function rows(values) {
  const [header, ...body] = values;
  return body.filter((r) => r[0]).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? null])));
}
function dateOnly(v) {
  if (typeof v === 'number') return new Date(Math.floor(v) * 86400000 - 2209161600000).toISOString().slice(0, 10);
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  // Legacy text dates have mixed locales. Preserve them, never guess a date.
  return String(v);
}
const byKey = new Map();
for (const j of data.jobs) {
  const k = jobKey(j);
  if (!byKey.has(k)) byKey.set(k, j);
  else if (j.submissionConfirmed || (!byKey.get(k).resumeUrl && j.resumeUrl)) byKey.set(k, j);
}
const histories = rows(snapshot.history), trackers = rows(snapshot.tracker);
const historical = new Map();
for (const r of histories) {
  if (typeof r['Submission Confirmed'] !== 'boolean' || typeof r['In Application Cohort'] !== 'boolean' || !r['Canonical Job Key']) throw new Error(`Missing explicit submission metadata: ${r['Application ID']}`);
  const k = r['Canonical Job Key'];
  const expected = jobKey({url:r['Job URL'],company:r.Company,position:r.Position});
  if (k !== expected) throw new Error(`Canonical key differs: ${r['Application ID']}`);
  const previous = historical.get(k);
  if (!previous || r['Submission Confirmed'] || !previous['Submission Confirmed']) historical.set(k, r);
}
for (const [k, r] of historical) {
  const t = trackers.find((t) => jobKey({url:t['Job URL'],company:t.Company,position:t.Position}) === k);
  const existing = byKey.get(k) || {};
  const rejected = r['Final Outcome'] === 'Rejected';
  const confirmed = r['Submission Confirmed'];
  let status = (rejected || r['Current Stage'] === 'Closed' || r['Current Stage'] === 'Rejected') ? 'Closed' : t?.Status || r['Current Stage'] || existing.status || 'Archived';
  if (confirmed && ['Found','Ready to Submit','Archived','Submission Unverified'].includes(status)) status = r['Current Stage'] === 'Closed' ? 'Closed' : 'Applied';
  if (!confirmed && status === 'Applied') status = 'Submission Unverified';
  byKey.set(k, {...existing, canonicalKey:k, company:r.Company, position:r.Position, url:r['Job URL'] || '', status,
    resumeUrl:t?.['Tailored Resume'] || existing.resumeUrl || '',
    firstSeenAt:existing.firstSeenAt || dateOnly(r['First Seen At']), appliedAt:dateOnly(r['Applied At']),
    submissionConfirmed:confirmed, inApplicationCohort:r['In Application Cohort'],
    finalOutcome:rejected ? 'Rejected' : r['Final Outcome'] || existing.finalOutcome || '',
    rejectionAt:dateOnly(r['Rejection At']), offerAt:dateOnly(r['Offer At']),
    // Private research notes stay in the source sheet, not a new public export.
    notes:existing.notes || '',
  });
}
// Tracker-only discoveries remain eligible for display; historical archived rows
// stay intact. Do not turn a closed/applied history record into an open lead.
for (const t of trackers) {
  const k = jobKey({url:t['Job URL'],company:t.Company,position:t.Position});
  if (historical.has(k)) continue;
  const existing = byKey.get(k);
  if (existing) byKey.set(k,{...existing,status:t.Status || existing.status});
  else if (['Found','Ready to Submit'].includes(t.Status)) byKey.set(k,{canonicalKey:k,company:t.Company,position:t.Position,url:t['Job URL'],status:t.Status,resumeUrl:t['Tailored Resume']||'',submissionConfirmed:false,inApplicationCohort:false,finalOutcome:''});
}
data.jobs = [...byKey.values()];
data.interviewEvents = rows(snapshot.interviews).map((r) => ({id:r['Interview ID'],company:r.Company,position:r.Position,stage:r['Interview Stage'],date:dateOnly(r['Interview Date / Time']),interviewer:r['Interviewer Name']}));
data.updatedAt = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'long'}).format(new Date(snapshot.readAt));
data.metrics = {...data.metrics,...calculateMetrics(data),auditedAt:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date(snapshot.readAt))};
data.sourceSnapshot = {readAt:snapshot.readAt,sha256:createHash('sha256').update(raw).digest('hex'),historyRecords:histories.length,trackerRecords:trackers.length,uniqueHistoryRecords:historical.size};
const errors = validatePipeline(data);
if (errors.length) throw new Error(errors.join('\n'));
writeFileSync(target,'export const jobSearchData = '+JSON.stringify(data,null,2)+';\n');
console.log(JSON.stringify({metrics:calculateMetrics(data),jobs:data.jobs.length,source:data.sourceSnapshot},null,2));
