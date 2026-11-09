import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,copyFileSync,utimesSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {digest,fileDigest,runStage,readManifest} from '../scripts/run-checkpoint.mjs';
import {SourceCache,discoverCandidates,discover,sourceUrl,selectBudgetedSources,candidatesFromExternalLeads} from '../scripts/job-search-discovery.mjs';
import {readyPlan,validateUploads,validateAuthoringPlans,permitsFitHeldRevision,recordRejections,run,savedPackageHandoff,partitionPreflightDecisions} from '../scripts/job-search-run.mjs';
import {applyPublicationProposal} from '../scripts/job-search-publication.mjs';
import {jobKey,calculateMetrics} from '../src/lib/job-search-model.mjs';
import {verifyCandidateSources} from '../scripts/check-resume-fit.mjs';

const temp=t=>{const p=mkdtempSync(join(tmpdir(),'job-search-'));t.after(()=>rmSync(p,{recursive:true,force:true}));return p;};
const header=['Canonical Job Key','Application ID','Company','Position','Job URL','Status','Location','Role Family','Match Score','Posted At','First Seen At','Ready At','Applied At','Submission Confirmed','In Application Cohort','Final Outcome','Rejection At','Offer At','Resume Variant','Tailored Resume','Current Summary','Archive References'];
const eventHeader=['Interview ID','Company','Position','Job URL','Interview Stage','Interview Date / Time','Interviewer Name','Prep Doc URL','Notes'];
const url='https://jobs.lever.co/example/11111111-1111-4111-8111-111111111111';
const candidate={company:'Example',position:'Data Analyst',url,location:'New York',score:85};
const key=jobKey(candidate);
const jobRow=(status='Applied',confirmed=true)=>[key,'APP-1','Example','Data Analyst',url,status,'New York','Analytics',85,'','','','2026-10-29',confirmed,confirmed,'Active','','','','https://drive.google.com/file/d/file1/view','',''];
const snapshot=(rows=[])=>({readAt:new Date().toISOString(),jobs:[header,...rows],events:[eventHeader]});

test('saved PDF handoff is independent of GitHub, Vercel and missing uploads',()=>{
 const c2={company:'Example',position:'AI Data Analyst',
   url:'https://jobs.lever.co/example/22222222-2222-4222-8222-222222222222'};
 const key2=jobKey(c2);
 const release={resumes:[{key,sha256:'hash-1',localPath:'/resumes/one.pdf'},
   {key:key2,sha256:'hash-2',localPath:'/resumes/two.pdf'}]};
 const receipts=[{key,sha256:'hash-1',library_file_id:'libfile_1234',
   drive_file_id:'fileone',drive_url:'https://drive.google.com/file/d/fileone/view'}];
 const first=savedPackageHandoff(release,receipts,[candidate,c2],5);
 assert.equal(first.savedCount,1);
 assert.equal(first.remainingCount,4);
 assert.equal(first.deliverables[0].applicationUrl,candidate.url);
 assert.equal(first.deliverables[0].resumePdfUrl,receipts[0].drive_url);
 assert.deepEqual(first.pendingUploads,[{key:key2,missing:['library','drive']}]);
 const complete=savedPackageHandoff(release,[...receipts,
  {key:key2,sha256:'hash-2',library_file_id:'libfile_5678',drive_file_id:'filetwo',
   drive_url:'https://drive.google.com/file/d/filetwo/view'}],[candidate,c2],5);
 assert.equal(complete.savedCount,2);
 assert.equal(complete.remainingCount,3);
 assert.throws(()=>savedPackageHandoff(release,[{...receipts[0],sha256:'tampered'}],
  [candidate,c2],5),/match/);
});
test('partially qualified shortlists keep eligible roles and report holds without losing original five-job target',()=>{
 const c2={company:'Example',position:'AI Data Analyst',
   url:'https://jobs.lever.co/example/22222222-2222-4222-8222-222222222222'};
 const key2=jobKey(c2);
 const outcome=partitionPreflightDecisions([candidate,c2],[
   {key,eligible_for_resume:true,company:'Example',position:'Data Analyst',reasons:[]},
   {key:key2,eligible_for_resume:false,company:'Example',position:'AI Data Analyst',
    reasons:['Required language missing']}
 ]);
 assert.equal(outcome.eligible.length,1);
 assert.equal(outcome.held.length,1);
 assert.deepEqual(outcome.held[0].reasons,['Required language missing']);
 assert.throws(()=>partitionPreflightDecisions([candidate,c2],[
  {key,eligible_for_resume:true}]),/complete/);
 assert.throws(()=>partitionPreflightDecisions([candidate,c2],[
  {key,eligible_for_resume:true},{key,eligible_for_resume:true}]),/duplicated/);
});
test('recovery mode returns saved PDF links with no fresh tracker read or website wait',async t=>{
 const p=temp(t);
 const saved={resumes:[{key,sha256:'sha-1',localPath:join(p,'resume.pdf')}]};
 const receipts=[{key,sha256:'sha-1',library_file_id:'libfile_abc',
  drive_file_id:'file1',drive_url:'https://drive.google.com/file/d/file1/view'}];
 writeFileSync(join(p,'inputs.json'),JSON.stringify({requestedCount:5,
  shortlistPath:'shortlist.json',uploadsPath:'uploads.json',readbackPath:'readback.json'}));
 writeFileSync(join(p,'shortlist.json'),JSON.stringify([candidate]));
 writeFileSync(join(p,'release.json'),JSON.stringify(saved));
 writeFileSync(join(p,'uploads.json'),JSON.stringify(receipts));
 const result=await run(p,{mode:'handoff'});
 assert.equal(result.status,'recovered');
 assert.equal(result.savedCount,1);
 assert.equal(result.remainingCount,4);
 assert.equal(result.trackerSyncPending,true);
 assert.equal(result.websiteSyncPending,true);
 assert.equal(result.deliverables[0].resumePdfUrl,receipts[0].drive_url);
 assert.equal(existsSync(join(p,'run.lock')),false);
});

test('requested draft revisions preserve qualification holds but never waive factual or PDF failures',()=>{
 const result={blockers:['Critical employer requirement r1 is unknown; do not mark resume ready.','Required work depth is not demonstrated: r1']};
 assert.equal(permitsFitHeldRevision('revise',{releaseStatus:'Found'},result),true);
 assert.equal(permitsFitHeldRevision('run',{releaseStatus:'Found'},result),false);
 assert.equal(permitsFitHeldRevision('revise',{releaseStatus:'Ready to Submit'},result),false);
 assert.equal(permitsFitHeldRevision('revise',{releaseStatus:'Found'},{blockers:['Missing final resume quality check: claimsFactChecked.']}),false);
 assert.equal(permitsFitHeldRevision('revise',{releaseStatus:'Found'},{blockers:['Requirement r1 lacks literal proof in the submitted resume text.']}),false);
});

test('role-first drafting rejects recycled experience with only skills or order changes',()=>{
 const work=[342,355,368,410,423,436,478,491,504,546,559,572,614,627,640];
 const changes=Object.fromEntries(work.map((y,i)=>[y,'Verified work example '+i]));
 for(const y of [681,694,707])changes[y]='Verified project';
 const authoringReview={roleFocus:'Testing and documented data quality',comparisonDecision:'Reviewed against a consulting draft',
   evidenceSelections:[{requirementId:'d1',baseline:546,sourceIds:['e1'],rationale:'Dataset review demonstrates this testing task.'}],
   projectChoices:[681,694,707].map(baseline=>({baseline,rationale:'Selected for this duty',scopeLimit:'Academic team work'}))};
 const plan={key:'one',changes,authoringReview};
 const pack={key:'one',primaryDuties:[{requirementId:'d1'}],candidateEvidence:[{id:'e1'}]};
 assert.doesNotThrow(()=>validateAuthoringPlans([plan],[pack]));
 const other={...plan,key:'two',changes:{...changes,81:'Different skills',342:changes[355],355:changes[342]}};
 assert.throws(()=>validateAuthoringPlans([plan,other],[pack,{...pack,key:'two'}]),/Identical experience/);
 assert.throws(()=>validateAuthoringPlans([{...plan,authoringReview:{...authoringReview,evidenceSelections:[]}}],[pack]),/primary duty/);
 assert.throws(()=>validateAuthoringPlans([{...plan,changes:{81:'Skills only'}}],[pack]),/Review each experience slot/);
});

test('discovery has an explicit source-request budget and reports deferred boards',()=>{
 const sources=Array.from({length:18},(_,i)=>({provider:'greenhouse',board:'employer'+i}));
 const budget=selectBudgetedSources([...sources,sources[0]]);
 assert.equal(budget.total,18);
 assert.equal(budget.selected.length,12);
 assert.equal(budget.deferred,6);
 assert.equal(selectBudgetedSources(sources,5).selected.length,5);
 assert.throws(()=>selectBudgetedSources(sources,25),/maxBoardRequests/);
 assert.throws(()=>selectBudgetedSources(sources,0),/maxBoardRequests/);
});

test('source-budget continuation starts at the NEXT employer, not the first board',()=>{
 const sources=Array.from({length:28},(_,i)=>({provider:'greenhouse',board:'employer'+i}));
 const first=selectBudgetedSources(sources,12);
 const second=selectBudgetedSources(sources,12,first.nextOffset);
 assert.equal(first.nextOffset,12);
 assert.equal(second.offset,12);
 assert.equal(second.selected[0].board,'employer12');
 assert.equal(second.nextOffset,24);
 assert.equal(second.deferred,4);
 assert.throws(()=>selectBudgetedSources(sources,12,29),/sourceOffset/);
});

test('dated external Workday and SAP leads use the same duplicate and role gates',()=>{
 const now=new Date().toISOString();
 const leads=candidatesFromExternalLeads([
  {company:'Example Workday',position:'Business Operations Associate',
   url:'https://example.wd5.myworkdayjobs.com/jobs/job/NY/Business-Operations-Associate_REQ-101',
   evidenceUrl:'https://example.wd5.myworkdayjobs.com/jobs',observedAt:now,
   officialEmployerHost:'example.wd5.myworkdayjobs.com',
   descriptionSnippet:'Business process analytics and reporting.'},
  {company:'Example SAP',position:'AI Data Specialist',
   url:'https://example.sapsf.eu/careers?req=102',
   evidenceUrl:'https://example.sapsf.eu/careers',observedAt:now,
   officialEmployerHost:'example.sapsf.eu',
   descriptionSnippet:'AI data evaluation and validation.'}
 ]);
 assert.equal(leads.length,2);
 assert.ok(leads.every(l=>l.discoveryChannel==='external'&&l.observedAt===now));
 const result=discoverCandidates(leads,snapshot(),{});
 assert.equal(result.candidates.length,2);
 assert.throws(()=>candidatesFromExternalLeads([{company:'A',position:'Analyst',url:'https://example.org'}]),/needs company/);
 const dup=discoverCandidates([...leads,leads[0]],snapshot(),{});
 assert.equal(dup.counts.duplicates,1);
});

test('ambiguous associate title goes to review, not discarded or automatically approved',()=>{
 const now=new Date().toISOString();
 const base={company:'Example',position:'Operations Associate',url:'https://example.com/jobs/operation-associate',
  evidenceUrl:'https://example.com/careers',observedAt:now,officialEmployerHost:'example.com'};
 const ambiguous=discoverCandidates(candidatesFromExternalLeads([base]),snapshot(),{});
 assert.equal(ambiguous.candidates.length,0);
 assert.equal(ambiguous.held.length,1);
 assert.equal(ambiguous.counts.filteredReasons.ambiguousTitle,1);
 const relevant=discoverCandidates(candidatesFromExternalLeads([{...base,descriptionSnippet:'Process analysis and data reporting'}]),snapshot(),{});
 assert.equal(relevant.candidates.length,1);
 const sale=discoverCandidates(candidatesFromExternalLeads([{...base,position:'Sales Associate',
  descriptionSnippet:'Sales process analytics'}]),snapshot(),{});
 assert.equal(sale.candidates.length,0);
 assert.equal(sale.counts.filteredReasons.excludedSeniorityOrSales,1);
});

test('discovery checks the second source pass and caches results for reuse',async t=>{
 const directory=temp(t);
 const sources=Array.from({length:15},(_,i)=>({provider:'greenhouse',board:'jobboard'+i,company:'Company '+i}));
 let requests=0;
 const config={stateDir:directory,sources,maxBoardRequests:12,maxDiscoveryPasses:2,sourceOffset:0,
  requestedCount:5,externalLeads:[],policy:{},
  fetcher:async url=>{
   requests++;
   const isLast=url.includes('jobboard12');
   return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({jobs:isLast?
     [{id:123456,title:'Data Quality Associate',absolute_url:'https://boards.greenhouse.io/jobboard12/jobs/123456',content:'Review data quality and AI evaluation outputs',location:{name:'New York'}}]:[]})};
  }};
 const first=await discover(config,snapshot());
 assert.equal(first.sourceBudget.queried,15);
 assert.equal(first.sourceBudget.passes,2);
 assert.equal(first.sourceBudget.nextOffset,15);
 assert.equal(first.passSummaries[1].offset,12);
 assert.equal(first.candidates.length,1);
 assert.equal(requests,15);
 const second=await discover(config,snapshot());
 assert.equal(second.requests.networkRequests,0);
 assert.equal(second.requests.cacheHits,15);
 assert.equal(second.candidates.length,1);
});

test('completed stage reuse requires unchanged outputs, not a saved PASS label',async t=>{
 const p=temp(t),manifest=join(p,'manifest.json'),output=join(p,'output');let calls=0;
 const action=async()=>{calls++;writeFileSync(output,'verified');return [output];};
 await runStage(manifest,'render',{input:1},action);
 assert.equal((await runStage(manifest,'render',{input:1},action)).reused,true);assert.equal(calls,1);
 writeFileSync(output,'corrupted');await runStage(manifest,'render',{input:1},action);assert.equal(calls,2);
 rmSync(output);await runStage(manifest,'render',{input:1},action);assert.equal(calls,3);
 assert.equal(typeof readManifest(manifest).stages.render.durationMs,'number');
});
test('failed downstream stage resumes without replaying completed work',async t=>{
 const p=temp(t),m=join(p,'manifest.json'),o=join(p,'pdf');let renders=0;
 const render=async()=>{renders++;writeFileSync(o,'pdf');return [o];};
 await runStage(m,'render',1,render);
 await assert.rejects(runStage(m,'upload',1,async()=>{throw Error('network');}),/network/);
 await runStage(m,'render',1,render);assert.equal(renders,1);assert.equal(readManifest(m).stages.upload.status,'failed');
});
test('nested checks retain per-role timings in the same manifest',async t=>{
 const p=temp(t),m=join(p,'manifest.json'),o=join(p,'proof');writeFileSync(o,'proof');
 await runStage(m,'release',1,async()=>{await runStage(m,'content:1',1,async()=>[o]);return [o];});
 assert.equal(readManifest(m).stages['content:1'].status,'complete');
});
test('duplicate in-flight and cached ATS requests are fetched once',async t=>{
 let calls=0;const cache=new SourceCache(temp(t),{fetcher:async()=>{calls++;return new Response(JSON.stringify({jobs:[]}));}});
 await Promise.all([cache.get('https://example.org/board'),cache.get('https://example.org/board')]);
 await cache.get('https://example.org/board');assert.equal(calls,1);assert.equal(cache.stats.cacheHits,1);
});
test('blocked and closed ATS sources retain explicit failure TTLs',async t=>{
 let now=100,calls=0;const cache=new SourceCache(temp(t),{now:()=>now,fetcher:async()=>{calls++;return new Response('',{status:404});}});
 const a=await cache.get('https://example.org/closed');assert.equal(a.status,404);assert.match(a.error,/404/);
 await cache.get('https://example.org/closed');assert.equal(calls,1);
 now=a.expiresAt+1;await cache.get('https://example.org/closed');assert.equal(calls,2);
});
test('request timeouts are recorded instead of silently swallowed',async t=>{
 const cache=new SourceCache(temp(t),{timeoutMs:5,fetcher:async(_,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('abort'),{name:'AbortError'}))))});
 assert.equal((await cache.get('https://example.org/slow')).error,'Request timed out');
});
test('Greenhouse discovery requests metadata, not every full description',()=>{
 assert.equal(sourceUrl({provider:'greenhouse',board:'example'}),'https://boards-api.greenhouse.io/v1/boards/example/jobs');
 assert.throws(()=>sourceUrl({provider:'greenhouse',board:'foo?token=x'}),/slug/);
});
test('known submissions and duplicate lead URLs are removed before research',()=>{
 const result=discoverCandidates([candidate,{...candidate,url:url+'/apply'},{...candidate,position:'Senior Analyst'}],snapshot([jobRow()]),{});
 assert.equal(result.candidates.length,0);assert.equal(result.counts.duplicates,3);
});
test('new requisition under an employer alias is held as a possible repost',()=>{
 const prior=jobRow();prior[2]='Hive';const next={...candidate,company:'Deploy',url:url.replace(/11111111-1111-4111-8111-111111111111/,'22222222-2222-4222-8222-222222222222')};
 const result=discoverCandidates([next],snapshot([prior]),{employerAliases:{Deploy:'Hive'}});
 assert.equal(result.candidates.length,0);assert.equal(result.held.length,1);
});
test('rejection cache expires or invalidates when source/context changes',()=>{
 const policy={candidateDigest:'facts',rulesDigest:'rules'},context=digest({candidate:'facts',rules:'rules'});
 const cached={[key]:{context,revision:1,expiresAt:Date.now()+10000}};
 assert.equal(discoverCandidates([{...candidate,revision:1}],snapshot(),policy,cached).candidates.length,0);
 assert.equal(discoverCandidates([{...candidate,revision:2}],snapshot(),policy,cached).candidates.length,1);
 assert.equal(discoverCandidates([{...candidate,revision:1}],snapshot(),{...policy,rulesDigest:'changed'},cached).candidates.length,1);
});
test('upload recovery requests only missing released PDFs and rejects wrong hashes',()=>{
 const release={resumes:[{key,sha256:'a'},{key:'second',sha256:'b'}]};
 const receipt={key,sha256:'a',library_file_id:'libfile_abc',drive_file_id:'file1',drive_url:'https://drive.google.com/file/d/file1/view'};
 assert.deepEqual(validateUploads(release,[receipt]).map(r=>r.key),['second']);
 assert.throws(()=>validateUploads(release,[{...receipt,sha256:'wrong'}]),/match/);
 assert.throws(()=>validateUploads(release,[receipt,receipt]),/Duplicate/);
});
test('ready plan preserves a confirmed submission and native booleans',()=>{
 const receipt={key,drive_url:'https://drive.google.com/file/d/file1/view'};
 assert.equal(readyPlan(snapshot([jobRow()]),[candidate],[receipt],'sheet').requests.length,0);
 const plan=readyPlan(snapshot(),[candidate],[receipt],'sheet');const cells=plan.requests[0].updateCells.rows[0].values;
 assert.equal(cells[13].userEnteredValue.boolValue,false);assert.equal(cells[14].userEnteredValue.boolValue,false);
 assert.equal(cells[5].userEnteredValue.stringValue,'Ready to Submit');
  assert.equal(readyPlan(snapshot(),[{...candidate,releaseStatus:'Found'}],[receipt],'sheet').requests[0].updateCells.rows[0].values[5].userEnteredValue.stringValue,'Found');
  assert.throws(()=>readyPlan(snapshot(),[{...candidate,releaseStatus:'Applied'}],[receipt],'sheet'),/Invalid package/);
});
test('sheet row indexes remain correct after blank rows',()=>{
 const row=jobRow('Ready to Submit',false),receipt={key,drive_url:row[19]};row[12]='';
 const plan=readyPlan(snapshot([[],row]),[candidate],[receipt],'sheet');
 assert.equal(plan.requests[0].updateCells.range.startRowIndex,2);
});
test('blocked applicant cannot reach authoring plans, font extraction or PDF rendering',async t=>{
 const p=temp(t),master=join(p,'master.pdf');writeFileSync(master,'pinned test resume');
 const candidatePath=join(p,'candidate.json'),evidencePath=join(p,'evidence.json'),
   rulesPath=join(p,'rules.json');
 for(const path of [candidatePath,evidencePath,rulesPath])writeFileSync(path,'{}');
 const job={company:'Example Workday',position:'Data Analyst',
   url:'https://sample.wd5.myworkdayjobs.com/External/job/New-York/Data-Analyst_R123',
   gates:{role_fit:{verdict:'pass',evidence:'UN analytical experience'}}};
 writeFileSync(join(p,'shortlist.json'),JSON.stringify([job]));
 writeFileSync(join(p,'snapshot.json'),JSON.stringify(snapshot()));
 writeFileSync(join(p,'inputs.json'),JSON.stringify({
   spreadsheetId:'fixture',snapshotPath:'snapshot.json',candidatePath:'candidate.json',
   evidencePath:'evidence.json',rulesPath:'rules.json',shortlistPath:'shortlist.json',
   master:{library_file_id:'fixture',version:1,local_path:master,sha256:fileDigest(master)}
 }));
 const result=await run(p);
 assert.equal(result.status,'waiting');
 assert.equal(result.stage,'qualification-hold');
 assert.equal(result.detail.dashboardSyncRequired,true);
 assert.ok(result.detail.reasons[0].reasons.some(reason=>reason.includes('application')));
 assert.equal(existsSync(join(p,'fonts.json')),false);
 assert.equal(existsSync(join(p,'resumes')),false);
 assert.equal(existsSync(join(p,'preflight-result.json')),true);
 assert.equal(readManifest(join(p,'manifest.json')).stages.preflight.status,'complete');
});

test('concurrent run cannot take over another run lock',async t=>{
 const p=temp(t);writeFileSync(join(p,'run.lock'),'busy');
 await assert.rejects(run(p),/Another run/);assert.equal(readFileSync(join(p,'run.lock'),'utf8'),'busy');
});

test('an expired crash lease resumes without a permanent lockout',async t=>{
 const p=temp(t),lock=join(p,'run.lock');writeFileSync(lock,'old crashed run');writeFileSync(join(p,'inputs.json'),'{}');
 const old=new Date(Date.now()-16*60_000);utimesSync(lock,old,old);
 const result=await run(p,{mode:'status'});assert.equal(result.status,'recorded');assert.equal(existsSync(lock),false);
});
test('rejection ledger survives a later run using the same facts',t=>{
 const p=temp(t);for(const n of ['candidate','evidence','rules'])writeFileSync(join(p,n+'.json'),'{}');
 writeFileSync(join(p,'inputs.json'),JSON.stringify({candidatePath:'candidate.json',evidencePath:'evidence.json',rulesPath:'rules.json',stateDir:'cache'}));
 const result=recordRejections(p,[{key,reason:'mandatory domain experience missing',revision:1}]);
 assert.equal(JSON.parse(readFileSync(result.path))[key].reason,'mandatory domain experience missing');
});

test('reformatting unchanged JSON facts does not invalidate rejection caching',t=>{
 const p=temp(t);for(const n of ['candidate','evidence','rules'])writeFileSync(join(p,n+'.json'),'{"fact":true}');
 writeFileSync(join(p,'inputs.json'),JSON.stringify({candidatePath:'candidate.json',evidencePath:'evidence.json',rulesPath:'rules.json',stateDir:'cache'}));
 const first=recordRejections(p,[{key,reason:'required experience missing',revision:null}]);const before=JSON.parse(readFileSync(first.path))[key].context;
 for(const n of ['candidate','evidence','rules'])writeFileSync(join(p,n+'.json'),JSON.stringify({fact:true},null,2)+'\n');
 const after=recordRejections(p,[{key,reason:'required experience missing',revision:null}]);
 assert.equal(JSON.parse(readFileSync(after.path))[key].context,before);
});

test('claim review reads the actual source and rejects invented or changed evidence',t=>{
 const p=temp(t),source=join(p,'evidence.txt');writeFileSync(source,'Cleaned and validated customer datasets.');
 const pack={candidateEvidence:[{id:'e1',localPath:source,sha256:fileDigest(source)}],
  requirements:[{id:'r1',kind:'task',critical:true,evidenceIds:['e1'],sourceText:'Cleaned and validated customer datasets.'}]};
 assert.doesNotThrow(()=>verifyCandidateSources(pack));
 pack.requirements[0].sourceText='Owned enterprise production pipelines';
 assert.throws(()=>verifyCandidateSources(pack),/absent/);
 writeFileSync(source,'Different evidence');
 assert.throws(()=>verifyCandidateSources(pack),/changed/);
});

test('compact publication updates exact fields and refuses stale source SHA',()=>{
 const job={canonicalKey:key,company:'Example',position:'Data Analyst',submissionConfirmed:false,inApplicationCohort:false,notes:''};
 const current={jobs:[job],metrics:{applications:0,lifetimeApplications:0}};
 const next={...job,submissionConfirmed:true,inApplicationCohort:true,status:'Applied'};
 const proposal={version:1,baseBlobSha:'sha',upsertJobs:[next],removeJobs:[],setFields:{metrics:{applications:1,lifetimeApplications:1}}};
 assert.equal(applyPublicationProposal(current,proposal,'sha').jobs[0].status,'Applied');
 assert.throws(()=>applyPublicationProposal(current,proposal,'newsha'),/Stale/);
 assert.throws(()=>applyPublicationProposal(current,{...proposal,upsertJobs:[{...next,notes:'private research'}]},'sha'),/private/);
});

test('publication CLI produces a small patch, leaves base untouched and clears old proposal on no-op',t=>{
 const dir=temp(t);
 for(const name of ['scripts/sync-job-search.mjs','scripts/job-search-publication.mjs','src/lib/job-search-sync.mjs','src/lib/job-search-model.mjs','src/lib/job-search-source.mjs']) {
  mkdirSync(join(dir,name,'..'),{recursive:true});copyFileSync(resolve(name),join(dir,name));
 }
 const job={canonicalKey:key,company:'Example',position:'Data Analyst',url,status:'Applied',resumeUrl:'https://drive.google.com/file/d/file1/view',submissionConfirmed:true,inApplicationCohort:true,notes:'',firstSeenAt:'',appliedAt:'2026-10-29',finalOutcome:'Active',rejectionAt:'',offerAt:''};
 const data={jobs:[job],interviewEvents:[],metrics:{},sourceSnapshot:{sha256:'old',readAt:new Date().toISOString()}};data.metrics=calculateMetrics(data);
 const base=join(dir,'src/data/jobSearchData.js');mkdirSync(join(dir,'src/data'),{recursive:true});
 const original='export const jobSearchData = '+JSON.stringify(data)+';\n';writeFileSync(base,original);
 const input=join(dir,'snapshot.json'),proposal=join(dir,'proposal.json');writeFileSync(input,JSON.stringify(snapshot([jobRow()])));
 const command=()=>spawnSync(process.execPath,[join(dir,'scripts/sync-job-search.mjs'),input,'--proposal',proposal],{encoding:'utf8'});
 const first=command();assert.equal(first.status,0,first.stderr);
 // Fixture is semantically equal. The no-op must not leave a stale write proposal.
 const status=JSON.parse(first.stdout);
 if(status.changed) {
  const patch=JSON.parse(readFileSync(proposal));const updated=applyPublicationProposal(data,patch,patch.baseBlobSha);
  assert.ok(readFileSync(proposal).length<readFileSync(base).length+3000);
  assert.equal(readFileSync(base,'utf8'),original);
  writeFileSync(base,'export const jobSearchData = '+JSON.stringify(updated)+';\n');
 }
 const last=command();assert.equal(last.status,0,last.stderr);assert.equal(JSON.parse(last.stdout).changed,false);
 assert.deepEqual(JSON.parse(readFileSync(proposal)),{changed:false});
});

test('a landed commit still waits for CI/deployment proof after the local base refreshes',t=>{
 const dir=temp(t),runDir=join(dir,'state');mkdirSync(runDir);
 const files=['scripts/job-search-run.mjs','scripts/run-checkpoint.mjs','scripts/job-search-discovery.mjs',
  'scripts/check-resume-fit.mjs','scripts/render-job-resumes.py','scripts/job_search_preflight.py',
  'scripts/sync-job-search.mjs','scripts/job-search-publication.mjs','src/lib/job-search-sync.mjs',
  'src/lib/job-search-model.mjs','src/lib/job-search-source.mjs'];
 for(const file of files){mkdirSync(join(dir,file,'..'),{recursive:true});copyFileSync(resolve(file),join(dir,file));}
 const job={canonicalKey:key,company:'Example',position:'Data Analyst',url,status:'Ready to Submit',resumeUrl:'https://drive.google.com/file/d/file1/view',submissionConfirmed:false,inApplicationCohort:false,notes:'',firstSeenAt:'',appliedAt:'',finalOutcome:'Active',rejectionAt:'',offerAt:''};
 const data={jobs:[job],interviewEvents:[],metrics:{},sourceSnapshot:{sha256:'old',readAt:new Date().toISOString()}};data.metrics=calculateMetrics(data);
 const base=join(dir,'src/data/jobSearchData.js');mkdirSync(join(dir,'src/data'),{recursive:true});writeFileSync(base,'export const jobSearchData = '+JSON.stringify(data)+';\n');
 writeFileSync(join(runDir,'inputs.json'),JSON.stringify({spreadsheetId:'fixture',snapshotPath:'snapshot.json',publishedPath:'published.json'}));
 writeFileSync(join(runDir,'snapshot.json'),JSON.stringify(snapshot([jobRow()])));
 const command=()=>{const result=spawnSync(process.execPath,[join(dir,'scripts/job-search-run.mjs'),'sync',runDir],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);};
 assert.equal(command().stage,'publish');
 const proposalPath=join(runDir,'publication-proposal.json'),proposal=JSON.parse(readFileSync(proposalPath)),proposalHash=fileDigest(proposalPath);
 const committed=applyPublicationProposal(data,proposal,proposal.baseBlobSha);writeFileSync(base,'export const jobSearchData = '+JSON.stringify(committed)+';\n');
 const receipt={proposalSha256:proposalHash,commit:'1'.repeat(40),ci:'pending'};writeFileSync(join(runDir,'published.json'),JSON.stringify(receipt));
 assert.equal(command().stage,'verification');assert.equal(fileDigest(proposalPath),proposalHash);
 receipt.ci='success';receipt.productionVerified=true;receipt.deployment={state:'READY',commit:receipt.commit,aliases:['ai-portfolio-ruddy-nine.vercel.app']};
 writeFileSync(join(runDir,'published.json'),JSON.stringify(receipt));assert.equal(command().status,'complete');
});
