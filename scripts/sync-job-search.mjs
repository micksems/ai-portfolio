// Manual, idempotent Sheet -> dashboard reconciliation. No credential use or polling.
// Run only after Sheet write/readback and a fresh UNFORMATTED_VALUE snapshot.
// Expected input: {readAt,tracker,history,interviews,outreach?}, including headers.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { reconcileJobSearch } from '../src/lib/job-search-sync.mjs';
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/sync-job-search.mjs snapshot.json');
const raw = readFileSync(input, 'utf8');
const snapshot = JSON.parse(raw);
const age = Date.now() - Date.parse(snapshot.readAt);
if (!Number.isFinite(age) || age < 0 || age > 30 * 60 * 1000)
  throw new Error('Snapshot must be fresh (within 30 minutes)');
if (!Array.isArray(snapshot.tracker) || !Array.isArray(snapshot.history) ||
    !Array.isArray(snapshot.interviews))
  throw new Error('Snapshot must contain Tracker, History and Interview Prep data');
const target = new URL('../src/data/jobSearchData.js', import.meta.url);
const existing = readFileSync(target, 'utf8');
const data = JSON.parse(existing.replace(/^export const jobSearchData = /, '').replace(/;\s*$/, ''));
// Stable digest excludes readAt so re-reading an unchanged Sheet cannot cause
// artificial updates or trigger another build/deployment.
snapshot.sourceHash = createHash('sha256').update(JSON.stringify({
  tracker:snapshot.tracker,history:snapshot.history,interviews:snapshot.interviews,
  outreach:snapshot.outreach || null,
})).digest('hex');
const result = reconcileJobSearch(data, snapshot);
if (!result.changed) {
  console.log(JSON.stringify({changed:false, reason:'No canonical published data changed. No write/commit/deployment needed.'}));
  process.exit(0);
}
writeFileSync(target, 'export const jobSearchData = ' + JSON.stringify(result.data, null, 2) + ';\n');
console.log(JSON.stringify({changed:true, scope:result.scope, metrics:result.data.metrics,
  source:result.data.sourceSnapshot},null,2));
