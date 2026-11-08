import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {jobKey,sameJob} from '../src/lib/job-search-model.mjs';
import {discoverCandidates,earlyMismatch} from '../scripts/job-search-discovery.mjs';
import {renderPlan,validateAuthoringPlans,checkCandidateIdentity,readyPlan,validateUploads} from '../scripts/job-search-run.mjs';
import {SourceTextCache} from '../scripts/check-resume-fit.mjs';
const url=n=>`https://example.wd5.myworkdayjobs.com/jobs/job/New-York/Analyst_REQ-${n}`;
const header=['Canonical Job Key','Company','Position','Job URL','Status','Submission Confirmed','In Application Cohort','Applied At'];
const snapshot=(submitted=false)=>({readAt:new Date().toISOString(),jobs:[header,['example.wd5.myworkdayjobs.com:req','E','Analyst',url('058936'),'Ready to Submit',submitted,false,'']]});
const candidate={company:'E',position:'Analyst',url:url('058936')};
test('Workday full hyphenated requisitions and suffixes remain distinct in JS and Python',()=>{
 const urls=[url('058936'),url('058937'),url('058936')+'/apply',url('058936-1'),url('058936-2')];
 const keys=urls.map(url=>jobKey({url}));assert.equal(keys[0],keys[2]);assert.equal(new Set(keys).size,4);
 const py=spawnSync('python3',['-c',"from scripts.job_search_preflight import identity;import json,sys;print(json.dumps([identity({'url':u}) for u in json.loads(sys.argv[1])]))",JSON.stringify(urls)],{encoding:'utf8'});
 assert.equal(py.status,0,py.stderr);assert.deepEqual(JSON.parse(py.stdout),keys);
});
test('legacy generic key matches its original URL, never another requisition',()=>{
 assert.equal(sameJob(candidate,{canonicalKey:'example.wd5.myworkdayjobs.com:req',url:url('058936')}),true);
 const output=discoverCandidates([candidate,{...candidate,position:'Data Analyst',url:url('058937')}],snapshot(),{});
 assert.equal(output.counts.duplicates,1);assert.equal(output.candidates.length,1);
 assert.throws(()=>checkCandidateIdentity([candidate],snapshot(),'run'),/Previously seen/);
 assert.throws(()=>checkCandidateIdentity([candidate],snapshot(true),'benchmark'),/Already submitted/);
 assert.doesNotThrow(()=>checkCandidateIdentity([candidate],snapshot(),'benchmark'));
 const snap=snapshot(true),before=JSON.stringify(snap);
 assert.equal(readyPlan(snap,[candidate],[{key:jobKey(candidate)}],'sheet').requests.length,0);
 assert.equal(JSON.stringify(snap),before);
});
test('review metadata changes do not invalidate a PDF; changed text does',()=>{
 const a={changes:{342:'Evidence'},projectLabels:{},authoringReview:{rationale:'A'}};
 assert.deepEqual(renderPlan(a),renderPlan({...a,authoringReview:{rationale:'B'}}));
 assert.notDeepEqual(renderPlan(a),renderPlan({...a,changes:{342:'Changed evidence'}}));
});
test('explicit retention is accepted with duty and project evidence review',()=>{
 const retainedBaselines=[342,355,368,410,423,436,478,491,504,546,559,572,614,627,640];
 const p={key:'k',changes:{},authoringReview:{retainedBaselines,roleFocus:'AI review',comparisonDecision:'Keep directly relevant verified facts',evidenceSelections:[{requirementId:'d1',baseline:342,sourceIds:['master'],rationale:'Direct evaluation work'}],projectChoices:[681,694,707].map(baseline=>({baseline,rationale:'Selected evidence',scopeLimit:'Academic team'}))}};
 assert.doesNotThrow(()=>validateAuthoringPlans([p],[{key:'k',primaryDuties:[{requirementId:'d1'}],candidateEvidence:[{id:'master'}]}]));
});
test('nontransferable mismatches filter early while junior experience gaps are reviewed',()=>{
 for(const item of [{salaryMaxAnnual:69000},{explicitCptOptRestriction:true},{startTimingEligible:false},{seniorOwnershipRequired:true},{roleFamily:'AI / Operations',aiDutiesRelevant:false}])assert.ok(earlyMismatch(item));
 assert.equal(earlyMismatch({mandatoryExperienceMet:false}),null);
 assert.equal(earlyMismatch({sponsorship:'unknown',mandatoryExperienceMet:false,domainTrainingProvided:true}),null);
});
test('text cache persists across processes and detects corrupt stored text',t=>{
 const d=mkdtempSync(join(tmpdir(),'evidence-'));t.after(()=>rmSync(d,{recursive:true,force:true}));
 new SourceTextCache(d).set('abc','verified text');assert.equal(new SourceTextCache(d).get('abc'),'verified text');
 writeFileSync(join(d,'abc.json'),JSON.stringify({sourceHash:'abc',text:'tampered',textHash:'old'}));assert.throws(()=>new SourceTextCache(d).get('abc'),/integrity/);
});
test('checkpoint archive closes before use, validates bytes, and unchanged input is a no-op',t=>{
 const d=mkdtempSync(join(tmpdir(),'archive-'));t.after(()=>rmSync(d,{recursive:true,force:true}));
 const script="import importlib.util,pathlib,json; s=importlib.util.spec_from_file_location('a','scripts/archive-job-search.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);p=pathlib.Path(__import__('sys').argv[1]);(p/'state').mkdir();(p/'state'/'file').write_text('saved');a=m.archive(p/'state',p/'state.zip');b=m.archive(p/'state',p/'state.zip');assert a['changed'] and not b['changed'];print('ok')";
 const r=spawnSync('python3',['-c',script,d],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 assert.ok(readFileSync(join(d,'state.zip')).length);
});

test('partial provider receipts request only missing saves and ambiguous outcomes require reconciliation',()=>{
 const release={resumes:[{key:'k',sha256:'h'}]},receipt={key:'k',sha256:'h',library_file_id:'libfile_abc'};
 assert.deepEqual(validateUploads(release,[receipt])[0].missing,['drive']);
 assert.throws(()=>validateUploads(release,[{...receipt,uncertain:['drive']}]),/Uncertain upload/);
 assert.equal(validateUploads(release,[{...receipt,drive_file_id:'d',drive_url:'https://drive.google.com/file/d/d/view'}]).length,0);
});


test('LinkedIn numeric and titled URLs resolve one requisition in both identity parsers',()=>{
 const urls=['https://www.linkedin.com/jobs/view/4486880689/','https://www.linkedin.com/jobs/view/ai-strategist-at-example-4486880689/'];
 const keys=urls.map(url=>jobKey({url}));assert.deepEqual(keys,['linkedin:4486880689','linkedin:4486880689']);
 const py=spawnSync('python3',['-c',"from scripts.job_search_preflight import identity;import json,sys;print(json.dumps([identity({'url':u}) for u in json.loads(sys.argv[1])]))",JSON.stringify(urls)],{encoding:'utf8'});
 assert.equal(py.status,0,py.stderr);assert.deepEqual(JSON.parse(py.stdout),keys);
});
