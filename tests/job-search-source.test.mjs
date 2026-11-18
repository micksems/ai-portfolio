import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSnapshot} from '../src/lib/job-search-source.mjs';
import {reconcileJobSearch} from '../src/lib/job-search-sync.mjs';
import {activeShortlist,calculateMetrics,jobKey} from '../src/lib/job-search-model.mjs';
const fields=['Canonical Job Key','Application ID','Company','Position','Job URL','Status','Submission Confirmed','In Application Cohort','Final Outcome','Tailored Resume'];
function fixture(){return {readAt:'2026-10-29T18:00:00Z',sourceHash:'test',jobs:[fields,['greenhouse:123','APP1','Employer','Analyst','https://job-boards.greenhouse.io/employer/jobs/123','Closed',true,true,'Rejected','https://drive.google.com/resume']],events:[['Interview ID','Company','Position','Interview Stage','Interview Date / Time','Interviewer Name']]};}
test('one Jobs row carries submission and rejection without duplicate trackers',()=>{const s=fixture();const d={jobs:[],metrics:{},sourceSnapshot:{sha256:'old',readAt:s.readAt}};const first=reconcileJobSearch(d,s);assert.equal(first.data.metrics.applications,1);assert.equal(first.data.metrics.rejections,1);assert.equal(first.data.jobs.length,1);assert.equal(reconcileJobSearch(first.data,s).changed,false);});
test('new source rejects duplicate requisitions before publish',()=>{const s=fixture();s.jobs.push([...s.jobs[1]]);assert.throws(()=>normalizeSnapshot(s),/Duplicate canonical Jobs/);});
test('submission metadata cannot be a text boolean',()=>{const s=fixture();s.jobs[1][6]='true';assert.throws(()=>normalizeSnapshot(s),/native booleans/);});
test('events from new table feed existing metric definitions',()=>{const s=fixture();s.events.push(['E1','Employer','Analyst','Completed — Recruiter screen','2026-10-28','Emily']);const out=reconcileJobSearch({jobs:[],metrics:{}},s);assert.equal(calculateMetrics(out.data).interviews,1);});

test('distinct roles can share a general careers page and the shortlist follows the complete Jobs table',()=>{
  const s=fixture(),url='https://www.example.com/careers';
  const old={canonicalKey:'greenhouse:100',url:'https://boards.greenhouse.io/e/jobs/100',company:'Example',
    position:'Old role',status:'Found',submissionConfirmed:false,inApplicationCohort:false};
  for(const title of ['Sales Development Representative','Operations Analyst']) {
    const key=jobKey({url,position:title});
    assert.equal(key,'example.com/careers:'+title.toLowerCase().replaceAll(' ','-'));
    s.jobs.push([key,'APP-'+title,'Example',title,url,'Found',false,false,'Active','']);
  }
  const changes=reconcileJobSearch({jobs:[old],metrics:{}},s);
  assert.equal(changes.data.jobs.length,4);
  assert.deepEqual(activeShortlist(changes.data).map(j=>j.position),['Sales Development Representative','Operations Analyst']);
  assert.equal(reconcileJobSearch(changes.data,s).changed,false);
  s.jobs.pop();
  const removed=reconcileJobSearch(changes.data,s);
  assert.deepEqual(activeShortlist(removed.data).map(j=>j.position),['Sales Development Representative']);
  assert.equal(removed.data.jobs.length,4);
});

test('counts completed hiring interviews and introductory hiring calls once, excluding missed or scheduled events',()=>{
  const stages=['Completed — Hiring manager interview','Completed — Introductory sales call',
    'Not attended — user confirmed','Scheduled — Hiring manager interview','Completed — Online assessment'];
  const events=stages.map((stage,i)=>({id:'E'+i,stage}));
  const data={jobs:[],interviewEvents:[...events,events[0]]};
  assert.equal(calculateMetrics(data).interviews,0);
  const metrics=calculateMetrics({...data,sourceSnapshot:{metricsVersion:2}});
  assert.equal(metrics.interviews,2);assert.equal(metrics.scheduledInterviews,1);assert.equal(metrics.onlineAssessments,1);
});
