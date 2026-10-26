import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileJobSearch, sheetDate } from '../src/lib/job-search-sync.mjs';
import { calculateMetrics } from '../src/lib/job-search-model.mjs';

const url='https://jobs.ashbyhq.com/sample/11111111-1111-1111-1111-111111111111';
const key='jobs.ashbyhq.com:11111111-1111-1111-1111-111111111111';
const trackerHeader=['Company','Position','Job URL','Status','Tailored Resume'];
const historyHeader=['Application ID','Company','Position','Job URL','Submission Confirmed',
  'In Application Cohort','Canonical Job Key','Current Stage','Final Outcome','First Seen At','Applied At','Rejection At','Offer At'];
const interviewsHeader=['Interview ID','Company','Position','Interview Stage','Interview Date / Time','Interviewer Name'];
const outreachHeader=['Company','Position','Job URL','Contact Name','Outreach Status','Last Response At'];
function source(stamp='2026-10-26T12:00:00Z') {
  return {readAt:stamp,
    tracker:[trackerHeader,['Sample','Analyst',url,'Applied','https://drive.google.com/a']],
    history:[historyHeader,['APP-1','Sample','Analyst',url,true,true,key,'Applied','Active','2026-10-20','2026-10-21',null,null]],
    interviews:[interviewsHeader],
    outreach:[outreachHeader,['Sample','Analyst',url,'Alex Smith','New',null]],
    sourceHash:'source-digest',
  };
}
function base() {
  const j={canonicalKey:key,company:'Sample',position:'Analyst',url,status:'Applied',
    resumeUrl:'https://drive.google.com/a',notes:'Keep full historical evidence.',
    firstSeenAt:'2026-10-20',appliedAt:'2026-10-21',
    submissionConfirmed:true,inApplicationCohort:true,finalOutcome:'Active',
    rejectionAt:'',offerAt:''};
  const d={jobs:[j],interviewEvents:[],outreachState:[{company:'Sample',position:'Analyst',
    jobUrl:url,contact:'Alex Smith',status:'New',lastResponseAt:''}],
    updatedAt:'October 21, 2026',
    sourceSnapshot:{readAt:'2026-10-21T12:00:00Z',sha256:'old'},
  };
  d.metrics={...calculateMetrics(d),auditedAt:'2026-10-21'};
  return d;
}
test('same canonical input is a no-op even with different readAt timestamp', () => {
  const first=reconcileJobSearch(base(),source());
  assert.equal(first.changed,false);
  const later=reconcileJobSearch(base(),source('2026-10-26T15:00:00Z'));
  assert.equal(later.changed,false);
  assert.equal(later.data.updatedAt,'October 21, 2026');
});
test('explicit rejection preserves confirmed application and increments rejection count',()=>{
  const s=source();
  s.tracker[1][3]='Closed';
  s.history[1][7]='Closed'; s.history[1][8]='Rejected'; s.history[1][11]='2026-10-26';
  const result=reconcileJobSearch(base(),s);
  assert.equal(result.changed,true);
  assert.equal(result.data.jobs[0].status,'Closed');
  assert.equal(result.data.jobs[0].submissionConfirmed,true);
  assert.equal(result.data.jobs[0].notes,'Keep full historical evidence.');
  assert.equal(result.data.metrics.applications,1);
  assert.equal(result.data.metrics.rejections,1);
});
test('Outreach Queue reply updates exactly one contact and repeated snapshot is no-op',()=>{
  const s=source();s.outreach[1][4]='Replied';s.outreach[1][5]='2026-10-26';
  const once=reconcileJobSearch(base(),s);
  assert.equal(once.changed,true);
  assert.equal(once.data.outreachState.length,1);
  assert.equal(once.data.outreachState[0].status,'Replied');
  const twice=reconcileJobSearch(once.data,{...s,readAt:'2026-10-26T14:00:00Z'});
  assert.equal(twice.changed,false);
  assert.equal(twice.data.outreachState.length,1);
});
test('changed resume URL on a tracker-only role updates the published link',()=>{
  const d=base();d.jobs[0].submissionConfirmed=false;d.jobs[0].inApplicationCohort=false;
  const s=source();s.history=[historyHeader];s.tracker[1][3]='Ready to Submit';
  s.tracker[1][4]='https://drive.google.com/revised';
  const result=reconcileJobSearch(d,s);
  assert.equal(result.data.jobs[0].resumeUrl,'https://drive.google.com/revised');
});
test('a second tracker record with the same canonical requisition is rejected',()=>{
  const s=source();s.tracker.push([...s.tracker[1]]);
  assert.throws(()=>reconcileJobSearch(base(),s),/Duplicate canonical Job Tracker/);
});
test('unverified history metadata fails instead of silently changing counts',()=>{
  const s=source();s.history[1][4]=null;
  assert.throws(()=>reconcileJobSearch(base(),s),/Missing submission metadata/);
});
test('date-only serials stay date-only; ambiguous legacy text remains verbatim',()=>{
  assert.equal(sheetDate(46310),'2026-10-15');
  assert.equal(sheetDate('10/26/2026 12:00 ET'),'10/26/2026 12:00 ET');
});
