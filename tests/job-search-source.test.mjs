import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSnapshot} from '../src/lib/job-search-source.mjs';
import {reconcileJobSearch} from '../src/lib/job-search-sync.mjs';
import {calculateMetrics} from '../src/lib/job-search-model.mjs';
const fields=['Canonical Job Key','Application ID','Company','Position','Job URL','Status','Submission Confirmed','In Application Cohort','Final Outcome','Tailored Resume'];
function fixture(){return {readAt:'2026-10-29T18:00:00Z',sourceHash:'test',jobs:[fields,['greenhouse:123','APP1','Employer','Analyst','https://job-boards.greenhouse.io/employer/jobs/123','Closed',true,true,'Rejected','https://drive.google.com/resume']],events:[['Interview ID','Company','Position','Interview Stage','Interview Date / Time','Interviewer Name']]};}
test('one Jobs row carries submission and rejection without duplicate trackers',()=>{const s=fixture();const d={jobs:[],metrics:{},sourceSnapshot:{sha256:'old',readAt:s.readAt}};const first=reconcileJobSearch(d,s);assert.equal(first.data.metrics.applications,1);assert.equal(first.data.metrics.rejections,1);assert.equal(first.data.jobs.length,1);assert.equal(reconcileJobSearch(first.data,s).changed,false);});
test('new source rejects duplicate requisitions before publish',()=>{const s=fixture();s.jobs.push([...s.jobs[1]]);assert.throws(()=>normalizeSnapshot(s),/Duplicate canonical Jobs/);});
test('submission metadata cannot be a text boolean',()=>{const s=fixture();s.jobs[1][6]='true';assert.throws(()=>normalizeSnapshot(s),/native booleans/);});
test('events from new table feed existing metric definitions',()=>{const s=fixture();s.events.push(['E1','Employer','Analyst','Completed — Recruiter screen','2026-10-28','Emily']);const out=reconcileJobSearch({jobs:[],metrics:{}},s);assert.equal(calculateMetrics(out.data).interviews,1);});
