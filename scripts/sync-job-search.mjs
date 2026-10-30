// Manual, idempotent Sheet -> dashboard reconciliation. No credential use or polling.
// Run only after Sheet write/readback and a fresh UNFORMATTED_VALUE snapshot.
// Current input: {readAt,jobs,events}, including headers. Legacy export supported for migration.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { reconcileJobSearch } from '../src/lib/job-search-sync.mjs';
import { applyPublicationProposal } from './job-search-publication.mjs';
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/sync-job-search.mjs snapshot.json');
const raw = readFileSync(input, 'utf8');
const snapshot = JSON.parse(raw);
const age = Date.now() - Date.parse(snapshot.readAt);
if (!Number.isFinite(age) || age < 0 || age > 30 * 60 * 1000)
  throw new Error('Snapshot must be fresh (within 30 minutes)');
if (!snapshot.jobs && (!Array.isArray(snapshot.tracker) || !Array.isArray(snapshot.history) ||
    !Array.isArray(snapshot.interviews)))
  throw new Error('Snapshot must contain Tracker, History and Interview Prep data');
const target = new URL('../src/data/jobSearchData.js', import.meta.url);
const existing = readFileSync(target, 'utf8');
const data = JSON.parse(existing.replace(/^export const jobSearchData = /, '').replace(/;\s*$/, ''));
// Stable digest excludes readAt so re-reading an unchanged Sheet cannot cause
// artificial updates or trigger another build/deployment.
snapshot.sourceHash = createHash('sha256').update(JSON.stringify({
  ...(snapshot.jobs ? {jobs:snapshot.jobs,events:snapshot.events} : {tracker:snapshot.tracker,history:snapshot.history,interviews:snapshot.interviews}),
  outreach:snapshot.outreach || null,
})).digest('hex');
const result = reconcileJobSearch(data, snapshot);
if (!result.changed) {
  const proposalIndex=process.argv.indexOf('--proposal');
  if(proposalIndex>=0) {
    if(!process.argv[proposalIndex+1])throw new Error('--proposal requires an output path');
    writeFileSync(process.argv[proposalIndex+1],JSON.stringify({changed:false})+'\n',{mode:0o600});
  }
  console.log(JSON.stringify({changed:false, reason:'No canonical published data changed. No write/commit/deployment needed.'}));
  process.exit(0);
}
// --proposal FILE writes a small private connector payload, not the large data file.
const proposalIndex = process.argv.indexOf('--proposal');
if (proposalIndex >= 0) {
  const path = process.argv[proposalIndex+1];
  if (!path) throw new Error('--proposal requires an output path');
  const oldJobs = new Map(data.jobs.map(j=>[j.canonicalKey,j]));
  const newJobs = new Map(result.data.jobs.map(j=>[j.canonicalKey,j]));
  const upsertJobs = result.data.jobs.filter(j=>JSON.stringify(j)!==JSON.stringify(oldJobs.get(j.canonicalKey)));
  const removeJobs = data.jobs.filter(j=>!newJobs.has(j.canonicalKey)).map(j=>j.canonicalKey);
  const naturalOrder = data.jobs.filter(j=>newJobs.has(j.canonicalKey)).map(j=>j.canonicalKey)
    .concat(upsertJobs.filter(j=>!oldJobs.has(j.canonicalKey)).map(j=>j.canonicalKey));
  const wantedOrder = result.data.jobs.map(j=>j.canonicalKey);
  const setFields = Object.fromEntries(['updatedAt','metrics','interviewEvents','outreachState','sourceSnapshot']
    .filter(k=>JSON.stringify(data[k])!==JSON.stringify(result.data[k])).map(k=>[k,result.data[k]]));
  const bytes = Buffer.from(existing);
  const baseBlobSha = createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
  const proposal = {version:1,baseBlobSha,upsertJobs,removeJobs,setFields,
    ...(JSON.stringify(naturalOrder)!==JSON.stringify(wantedOrder)?{jobOrder:wantedOrder}:{}),scope:result.scope};
  const applied = applyPublicationProposal(data,proposal,baseBlobSha);
  if (JSON.stringify(applied)!==JSON.stringify(result.data)) throw new Error('Publication proposal differs from reconciliation');
  writeFileSync(path,JSON.stringify(proposal)+'\n',{mode:0o600});
  console.log(JSON.stringify({changed:true,proposalPath:path,baseBlobSha,upserted:upsertJobs.length,scope:result.scope}));
  process.exit(0);
}
writeFileSync(target, 'export const jobSearchData = ' + JSON.stringify(result.data, null, 2) + ';\n');
console.log(JSON.stringify({changed:true, scope:result.scope, metrics:result.data.metrics,
  source:result.data.sourceSnapshot},null,2));

