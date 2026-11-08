// Manual run controller. Research/content judgement and connected writes remain
// explicit review boundaries; all local dependencies, timings and reuse are enforced.
import {readFileSync,writeFileSync,statSync,existsSync,mkdirSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {digest,fileDigest,writeJson,readManifest,runStage,outputsValid} from './run-checkpoint.mjs';
import {discover,EMPLOYER_ALIASES,earlyMismatch} from './job-search-discovery.mjs';
import {jobKey,sameJob} from '../src/lib/job-search-model.mjs';
import {auditResumeArtifact,SourceTextCache} from './check-resume-fit.mjs';

const scripts=dirname(fileURLToPath(import.meta.url));
const python=process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python3';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const required=(condition,message)=>{if(!condition)throw new Error(message);};
const hashFiles=paths=>paths.map(path=>({path,sha256:fileDigest(path)}));
const policyFor=(dir,config)=>({candidateDigest:digest({candidate:read(resolve(dir,config.candidatePath)),
  evidence:read(resolve(dir,config.evidencePath))}),rulesDigest:digest(read(resolve(dir,config.rulesPath))),employerAliases:{...EMPLOYER_ALIASES,...config.employerAliases}});
function execute(program,args) {
  const r=spawnSync(program,args,{encoding:'utf8',maxBuffer:12_000_000,timeout:120_000});
  if(r.error||r.status!==0)throw new Error((r.error?.message||r.stderr||r.stdout||'Command failed').trim());
  return r.stdout;
}
function fresh(snapshot) {
  const age=Date.now()-Date.parse(snapshot.readAt);
  required(Number.isFinite(age)&&age>=0&&age<=30*60_000,'Refresh the live Jobs snapshot (within 30 minutes).');
}
function jobs(snapshot) {
  const [header,...rows]=snapshot.jobs;
  for(const field of ['Canonical Job Key','Company','Position','Job URL','Status','Submission Confirmed','In Application Cohort'])
    required(header.includes(field),'Missing Jobs header '+field);
  return rows.map((row,index)=>({row,index:index+1,record:Object.fromEntries(header.map((h,i)=>[h,row[i]??'']))})).filter(r=>r.row[0]);
}
function value(v) {return {userEnteredValue:typeof v==='boolean'?{boolValue:v}:typeof v==='number'?{numberValue:v}:{stringValue:String(v??'')}};}

export function checkCandidateIdentity(candidates,snapshot,mode) {
  const records=jobs(snapshot),seen=new Set();
  for(const c of candidates){
    const mismatch=earlyMismatch(c);required(!mismatch,mismatch);
    const key=jobKey({...c,canonicalKey:undefined});
    required(!c.canonicalKey||c.canonicalKey===key,'New candidate key must match its full requisition URL');
    required(!seen.has(key),'Duplicate within shortlist');seen.add(key);
    const matches=records.filter(r=>sameJob(c,{canonicalKey:r.record['Canonical Job Key'],url:r.record['Job URL']}));
    required(!matches.some(r=>r.record['Submission Confirmed']===true||r.record['Applied At']||/^(Applied|Rejected|Interview|Offer)$/i.test(r.record.Status)),
      'Already submitted: resume generation forbidden');
    if(mode==='run')required(!matches.length&&!c.retained,'Previously seen roles cannot fill new-job slots');
    else required(matches.length===1,'Revision/benchmark must resolve one existing unsubmitted role');
  }
}

export function validateUploads(release,receipts) {
  const seen=new Set();
  for(const receipt of receipts) {
    required(!seen.has(receipt.key),'Duplicate upload receipt');seen.add(receipt.key);
    const resume=release.resumes.find(r=>r.key===receipt.key);
    required(resume&&resume.sha256===receipt.sha256,'Upload receipt does not match released PDF');
    if(receipt.library_file_id)required(/^libfile_[a-z0-9]+$/i.test(receipt.library_file_id),'Invalid Library receipt');
    const id=String(receipt.drive_url||'').match(/^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view(?:\?|$)/)?.[1];
    if(receipt.drive_url||receipt.drive_file_id)required(id&&id===receipt.drive_file_id,'Missing/mismatched Drive receipt');
    if(receipt.uncertain?.length)required(false,'Uncertain upload outcome: inspect provider state before retrying '+receipt.key);
  }
  return release.resumes.flatMap(r=>{const receipt=receipts.find(x=>x.key===r.key);
    const missing=['library','drive'].filter(provider=>provider==='library'?!receipt?.library_file_id:!receipt?.drive_file_id);
    return missing.length?[{...r,missing}]:[];});
}

// This checks that a role-first draft was supplied. Semantic relevance and
// truthfulness still require a source-based review; a word-change score cannot.
export function validateAuthoringPlans(plans,packs) {
  const work=[342,355,368,410,423,436,478,491,504,546,559,572,614,627,640];
  const signatures=new Map();
  for(const plan of plans) {
    const pack=packs.find(p=>p.key===plan.key),review=plan.authoringReview;
    required(pack&&review?.roleFocus&&review.comparisonDecision,'Missing role-first drafting review for '+plan.key);
    required(work.every(y=>(typeof plan.changes?.[y]==='string'&&plan.changes[y].trim())||review.retainedBaselines?.includes(y)),
      'Review each experience slot: supply a replacement or explicitly retain the pinned master evidence.');
    for(const duty of pack.primaryDuties||[]) {
      const selected=review.evidenceSelections?.find(s=>s.requirementId===duty.requirementId);
      required(selected&&(plan.changes[selected.baseline]||review.retainedBaselines?.includes(Number(selected.baseline)))&&selected.rationale&&selected.sourceIds?.length,
        'Map each primary duty to the selected draft evidence: '+duty.requirementId);
      required(selected.sourceIds.every(id=>pack.candidateEvidence.some(e=>e.id===id)),'Unknown selected evidence source');
    }
    required([681,694,707].every(y=>review.projectChoices?.some(p=>Number(p.baseline)===y&&p.rationale&&p.scopeLimit)),
      'Explain each project choice and its factual scope.');
    const signature=work.map(y=>(plan.changes[y]||'retained:'+y).trim()).sort().join('\n');
    required(!signatures.has(signature)||review.sharedExperienceRationale,
      'Identical experience text across roles requires an explicit evidence-based justification; skills and ordering alone are not a rewrite.');
    signatures.set(signature,plan.key);
  }
}

// Only values consumed by the renderer belong in its cache fingerprint.
export function renderPlan(plan) {
  return {changes:plan.changes,projectLabels:plan.projectLabels,skillLabels:plan.skillLabels||{}};
}

export function permitsFitHeldRevision(mode,candidate,result) {
  // A requested edit may replace an existing draft while keeping the job on
  // hold. Missing source/PDF proof never qualifies for this narrow exception.
  return mode==='revise'&&candidate.releaseStatus==='Found'&&result.blockers.length>0&&
    result.blockers.every(b=>/^Critical employer requirement .* is (?:unknown|missing|partial);|^Required work depth is not demonstrated:|^Seniority is (?:borderline|gap|unknown):/.test(b));
}

export function readyPlan(snapshot,candidates,receipts,spreadsheetId) {
  fresh(snapshot);
  const header=snapshot.jobs[0], records=jobs(snapshot), byKey=new Map(records.map(r=>[r.record['Canonical Job Key'],r]));
  let nextRow=snapshot.jobs.reduce((last,row,index)=>row[0]?index+1:last,1);
  const requests=[],expectedBefore=[];
  for(const candidate of candidates) {
    const key=jobKey(candidate), upload=receipts.find(r=>r.key===key), existing=byKey.get(key)||records.find(r=>sameJob(candidate,{canonicalKey:r.record['Canonical Job Key'],url:r.record['Job URL']}));
    const readyStatus=candidate.releaseStatus||'Ready to Submit';
    required(['Ready to Submit','Found'].includes(readyStatus),'Invalid package review status');
    required(upload,'Missing upload for '+key);
    if(existing&&(existing.record['Submission Confirmed']===true||existing.record['Applied At']||/^(Applied|Rejected|Interview|Offer)$/i.test(existing.record.Status))) continue;
    if(existing) required(existing.record['Tailored Resume']===upload.drive_url,'Existing job is not this run’s uploaded artifact; reconcile before writing.');
    const row=header.map((_,i)=>existing?.row[i]??'');
    const fields={'Canonical Job Key':existing?.record['Canonical Job Key']||key,'Application ID':existing?.record['Application ID']||'APP-'+digest(key).slice(0,16),
      Company:candidate.company,Position:candidate.position,'Job URL':candidate.url,Status:readyStatus,
      Location:candidate.location||'','Role Family':candidate.roleFamily||'Analytics','Match Score':candidate.score??'',
      'Posted At':candidate.posted||'','First Seen At':existing?.record['First Seen At']||new Date().toISOString(),
      'Ready At':existing?.record['Ready At']||new Date().toISOString(),'Submission Confirmed':false,'In Application Cohort':false,
      'Final Outcome':existing?.record['Final Outcome']||'Active','Resume Variant':key,'Tailored Resume':upload.drive_url,
      'Current Summary':candidate.currentSummary||candidate.why||''};
    for(const [field,v] of Object.entries(fields))if(header.includes(field))row[header.indexOf(field)]=v;
    const index=existing?existing.index:nextRow++;
    if(existing&&JSON.stringify(row)===JSON.stringify(existing.row))continue;
    expectedBefore.push({row:index+1,key:existing?.record['Canonical Job Key']||'',submitted:existing?.record['Submission Confirmed']||false});
    requests.push({updateCells:{range:{sheetId:1900000200,startRowIndex:index,endRowIndex:index+1,startColumnIndex:0,endColumnIndex:header.length},
      rows:[{values:row.map(value)}],fields:'userEnteredValue'}});
  }
  return {spreadsheet_id:spreadsheetId,requests,expectedBefore};
}

export function recordRejections(directory,input) {
  const dir=resolve(directory),config=read(join(dir,'inputs.json')),policy=policyFor(dir,config);
  const context=digest({candidate:policy.candidateDigest,rules:policy.rulesDigest});
  const file=join(resolve(dir,config.stateDir||'../../cache'),'rejections.json');
  const saved=existsSync(file)?read(file):{};
  for(const entry of input) {
    required(entry.key&&entry.reason&&Object.hasOwn(entry,'revision'),'Record exact key, source revision (or null), and rejection reason');
    const hours=entry.hours??24;
    required(Number.isFinite(hours)&&hours>0&&hours<=168,'Rejection cache must expire within seven days');
    saved[entry.key]={reason:entry.reason,revision:entry.revision,context,checkedAt:Date.now(),expiresAt:Date.now()+hours*3600_000};
  }
  writeJson(file,saved);return {saved:input.length,path:file};
}

export async function run(directory,{mode='run'}={}) {
  const dir=resolve(directory);mkdirSync(dir,{recursive:true});
  const lock=join(dir,'run.lock'),token=randomUUID();let fd;
  if(existsSync(lock)&&Date.now()-statSync(lock).mtimeMs>15*60_000)unlinkSync(lock);
  try{fd=openSync(lock,'wx',0o600);}catch{throw new Error('Another run holds this directory. Inspect run.lock before recovery.');}
  const heartbeat=()=>writeFileSync(lock,JSON.stringify({token,updatedAt:new Date().toISOString()})+'\n',{mode:0o600});
  heartbeat();const lease=setInterval(heartbeat,10_000);lease.unref();
  try {
    const config=read(join(dir,'inputs.json'));
    const path=name=>resolve(dir,config[name]||name);
    const manifestPath=join(dir,'manifest.json');
    const manifest=readManifest(manifestPath);
    const wait=(stage,detail)=>{
      const m=readManifest(manifestPath);
      if(m.waiting?.stage!==stage)m.waiting={stage,since:new Date().toISOString()};
      m.updatedAt=new Date().toISOString();writeJson(manifestPath,m);
      return {status:'waiting',stage,detail,manifest:manifestPath};
    };
    const resolveWait=(...stages)=>{
      const m=readManifest(manifestPath);
      if(m.waiting&&(!stages.length||stages.includes(m.waiting.stage))){m.waitHistory=m.waitHistory||[];m.waitHistory.push({...m.waiting,durationMs:Date.now()-Date.parse(m.waiting.since)});delete m.waiting;writeJson(manifestPath,m);}
    };
    if(mode==='status')return {status:manifest.waiting?'waiting':'recorded',wallElapsedMs:Date.now()-Date.parse(manifest.startedAt),...manifest};
    required(['run','revise','benchmark','sync'].includes(mode),'Use run|revise|benchmark|sync|status RUN_DIRECTORY');
    required(config.spreadsheetId,'Missing canonical spreadsheet ID');
    const requestedCount=config.requestedCount??5;
    required(Number.isInteger(requestedCount)&&requestedCount>=1,'requestedCount must be positive');
    const snapshot=read(path('snapshotPath'));fresh(snapshot);jobs(snapshot);
    const code={runner:fileDigest(join(scripts,'job-search-run.mjs')),render:fileDigest(join(scripts,'render-job-resumes.py')),
      checker:fileDigest(join(scripts,'check-resume-fit.mjs')),preflight:fileDigest(join(scripts,'job_search_preflight.py'))};
    // Controller-only edits must not invalidate previously checked PDFs.
    // Re-run the release gate only when rendering, evidence or preflight code changes.
    const evidenceCodeDigest=digest({render:code.render,checker:code.checker,preflight:code.preflight});
    let release;
    let remainingCount=0;
    if(mode==='run'||mode==='revise'||mode==='benchmark') {
      const policy=policyFor(dir,config);
      // Fail before font extraction/resume work if employer discovery cannot
      // cover the requested employer list. An empty source list is not
      // evidence that the labor market has zero suitable roles.
      if(mode==='run'&&!existsSync(path('shortlistPath'))) {
        const targets=config.targetEmployers||[];
        const leads=config.externalLeadsPath?read(path('externalLeadsPath')):(config.externalLeads||[]);
        const normalize=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
        const targetNames=targets.map(t=>typeof t==='string'?t:t.name);
        const targetKeys=new Set(targetNames.map(normalize));
        const configured=[...(config.sources||[]),...leads];
        if(!targets.length||!configured.length)return wait('source-configuration',{
          reason:!targets.length?'Supply an explicit ordered targetEmployers list from the approved employer scope.':
            'No verified employer ATS sources or dated external leads were configured.',
          targetEmployers:targetNames,sourceCount:(config.sources||[]).length,
          externalLeadCount:leads.length,
          instruction:'Configure verified official employer sources before discovery. Zero configured sources is NOT zero available jobs.'});
        const outside=configured.filter(x=>!targetKeys.has(normalize(x.company))).map(x=>x.company);
        required(!outside.length,'Discovery source outside current employer scope: '+outside.join(', '));
      }
      const shortlistPath=path('shortlistPath'),plansPath=path('plansPath'),packsPath=path('packsPath'),reviewsPath=path('reviewsPath');
      if(!existsSync(shortlistPath)) {
        required(mode!=='benchmark','Benchmark requires one existing role; discovery is disabled.');
        const discoveryPath=join(dir,'discovery.json');
        const externalLeads=config.externalLeadsPath?read(path('externalLeadsPath')):(config.externalLeads||[]);
        const sourceConfig={stateDir:resolve(dir,config.stateDir||'../../cache'),
          sources:config.sources||[],externalLeads,targetEmployers:config.targetEmployers||[],
          policy,requestedCount,
          maxBoardRequests:config.maxBoardRequests??12,maxDiscoveryPasses:config.maxDiscoveryPasses??2,
          sourceOffset:config.sourceOffset??0};
        await runStage(manifestPath,'discovery',{sources:sourceConfig.sources,
          targetEmployers:sourceConfig.targetEmployers,externalLeads,
          policy,maxBoardRequests:sourceConfig.maxBoardRequests,maxDiscoveryPasses:sourceConfig.maxDiscoveryPasses,
          sourceOffset:sourceConfig.sourceOffset,discoveryCode:fileDigest(join(scripts,'job-search-discovery.mjs')),
          jobs:digest(snapshot.jobs)},async()=>{
          writeJson(discoveryPath,await discover(sourceConfig,snapshot));return [discoveryPath];
        });
        const discovery=read(discoveryPath);
        return wait('shortlist',{path:discoveryPath,requestedCount,needed:requestedCount,
          leads:discovery.candidates.length,held:discovery.held.length,
          filtered:discovery.counts.filtered,duplicates:discovery.counts.duplicates,
          reasonCounts:discovery.counts.filteredReasons,sourceBudget:discovery.sourceBudget,
          audit:discovery.audit,dashboardSyncRequired:true,
          instruction:'Report exact attempted, failed, unconfigured and deferred employers. Check shortlisted official requisition and application form using the bounded application-path checker. A successful HTTP GET is not a verified apply form. Do not call zero leads a successful run.'});
      }
      // Discovery is independent from resume/font availability.
      // Only request the pinned master after a real shortlist exists.
      const master=config.master;
      required(master?.library_file_id&&master.version&&master.sha256,'Pin the current approved master metadata');
      required(fileDigest(master.local_path)===master.sha256,'Master hash differs');
      const candidates=read(shortlistPath);
      required(candidates.length>=1&&candidates.length<=requestedCount,
        'Provide 1..requestedCount verified roles, or report a zero-result discovery with its reason counts. Never pad or silently lower the target.');
      remainingCount=requestedCount-candidates.length;
      checkCandidateIdentity(candidates,snapshot,mode);
      required(candidates.every(c=>c.discoveryChannel!=='external'||c.sourceTrust==='declared-official'),
        'Third-party/unverified external lead cannot enter resume stage without a verified official employer source');
      if(mode==='run')required(candidates.every(c=>!c.releaseStatus||c.releaseStatus==='Ready to Submit'),
        'New-job run must not generate or release Found/held draft resumes');
      // Qualification and application evidence MUST pass before generating
      // authoring plans, extracting fonts or rendering any PDF.
      const preflightPath=join(dir,'preflight.json'),preflightResult=join(dir,'preflight-result.json');
      const payload={process_policy_version:2,
        run_mode:['revise','benchmark'].includes(mode)?'replacement':'normal',
        historical_benchmark:mode==='benchmark',requested_count:requestedCount,
        snapshot:{read_at:snapshot.readAt,jobs:snapshot.jobs},master,candidates};
      await runStage(manifestPath,'preflight',{payload,code:code.preflight},async()=>{
        writeJson(preflightPath,payload);
        const r=spawnSync(python,[join(scripts,'job_search_preflight.py'),preflightPath],
          {encoding:'utf8',maxBuffer:12_000_000,timeout:120_000});
        if(r.error)throw r.error;
        if(![0,2].includes(r.status))throw new Error('Preflight could not run: '+(r.stderr||r.stdout));
        let parsed;
        try{parsed=JSON.parse(r.stdout);}catch{throw new Error('Preflight output is invalid: '+(r.stderr||r.stdout));}
        writeJson(preflightResult,parsed);
        return [preflightPath,preflightResult];
      });
      const results=read(preflightResult);
      if(!Array.isArray(results)||results.some(r=>r.eligible_for_resume!==true))
        return wait('qualification-hold',{requestedCount,candidatesChecked:candidates.length,
          reasons:Array.isArray(results)?results.map(r=>({key:r.key,eligible:r.eligible_for_resume,
            reasons:r.reasons})):results,
          dashboardSyncRequired:true,
          instruction:'Do not write or render a resume. Resolve actual qualification/application evidence or remove rejected leads. Publish Found/held leads separately using sync with a fresh Jobs/Events snapshot.'});
      resolveWait('qualification-hold');
      const fontsFile=join(dir,'fonts.json');
      const fontInput=config.fonts?{fonts:hashFiles(Object.values(config.fonts))}:{source:fileDigest(config.fontSourcePath)};
      await runStage(manifestPath,'environment',{fontInput,master:master.sha256,code:code.render},async()=>{
        const fonts=config.fonts||JSON.parse(execute(python,[join(scripts,'render-job-resumes.py'),'fonts',config.fontSourcePath,join(resolve(dir,config.stateDir||'../../cache'),'fonts',digest(fontInput))]));
        writeJson(fontsFile,fonts);execute(python,[join(scripts,'render-job-resumes.py'),'check-fonts',fontsFile]);
        execute(python,[join(scripts,'render-job-resumes.py'),'check-master',master.local_path]);
        return [fontsFile,...Object.values(fonts)];
      });
      const plans=existsSync(plansPath)?read(plansPath):null,packs=existsSync(packsPath)?read(packsPath):null;
      if(!plans||!packs)return wait('authoring-inputs',{plansPath,packsPath});
      validateAuthoringPlans(plans,packs);
      if(mode==='revise'||mode==='benchmark') {
        if(mode==='benchmark')required(candidates.length===1,'Benchmark requires exactly one existing role.');
        required(config.revisionOf,'Revision mode must identify the prior package.');
        for(const c of candidates) {
          const existing=jobs(snapshot).find(r=>sameJob(c,{canonicalKey:r.record['Canonical Job Key'],url:r.record['Job URL']}));
          required(existing&&existing.record['Submission Confirmed']===false&&!existing.record['Applied At']&&!/^(Applied|Rejected|Interview|Offer)$/i.test(existing.record.Status),
            'Revision mode only permits an existing unsubmitted package; submitted snapshots are immutable.');
        }
      }
      const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      const employer=v=>norm(policy.employerAliases[v]||v);
      for(const candidate of candidates) {
        const similar=jobs(snapshot).filter(r=>!sameJob(candidate,{canonicalKey:r.record['Canonical Job Key'],url:r.record['Job URL']})&&employer(r.record.Company)===employer(candidate.company)&&norm(r.record.Position)===norm(candidate.position));
        if(similar.length) {
          const review=candidate.distinctRoleReview,pack=packs.find(p=>p.key===jobKey(candidate));
          required(review?.decision==='distinct'&&similar.some(r=>r.record['Canonical Job Key']===review.comparedKey)&&
            review.difference&&review.employerSource&&review.employerQuote&&pack?.jobDescriptionSnapshot?.text.includes(review.employerQuote),
          'Possible repost: a different ATS ID alone does not establish a new role. Resolve the employer/team/duties difference before authoring.');
        }
      }
      const boundSources=[...new Set(packs.flatMap(p=>(p.candidateEvidence||[]).map(ev=>{
        required(ev.localPath&&ev.sha256&&fileDigest(ev.localPath)===ev.sha256,'Bind candidate evidence to actual current source files');return ev.localPath;
      })))];
      const context=digest({evidenceCodeDigest,policy,master:master.sha256,fonts:hashFiles(Object.values(read(fontsFile))),candidates,plans,packs,
        sources:hashFiles(boundSources),reviews:existsSync(reviewsPath)?fileDigest(reviewsPath):null});
      const releasePath=join(dir,'release.json'),prior=readManifest(manifestPath).stages.release;
      if(prior?.inputDigest===digest(context)&&outputsValid(prior)) release=read(releasePath);
      else {
        // A completed release may resume uploads/sync without reauthoring. New
        // content always repeats the fresh duplicate gate before touching PDFs.
        resolveWait('shortlist','authoring-inputs',...(existsSync(reviewsPath)?['pdf-review']:[]));
        const reports=[];
        for(const candidate of candidates) {
          const key=jobKey(candidate),plan=plans.find(p=>p.key===key),pack=packs.find(p=>p.key===key);
          required(plan&&pack,'Missing role-specific plan/evidence for '+key);
          required(jobKey({url:pack.role?.requisitionOrJobUrl})===key,'Evidence pack belongs to a different requisition');
          required(pack.jobDescriptionSnapshot?.text?.length>=400&&pack.jobDescriptionSnapshot?.capturedAt,'Missing full dated employer JD');
          required(pack.primaryDuties?.length>=3&&pack.primaryDuties?.length<=5,'Extract distinct work duties before rendering');
          const stem=digest(key).slice(0,16),input=join(dir,stem+'-render.json'),report=join(dir,stem+'-render-report.json');
          const output=join(dir,'resumes','Misha-Semenov-'+stem+'.pdf');
          await runStage(manifestPath,'render:'+key,{code:code.render,master:master.sha256,fonts:fontInput,
            identity:{key,company:candidate.company,position:candidate.position},plan:renderPlan(plan)},async()=>{
            writeJson(input,{master,fonts:read(fontsFile),jobs:[{...plan,key,company:candidate.company,position:candidate.position,output}]});
            execute(python,[join(scripts,'render-job-resumes.py'),input,report]);
            const data=read(report)[0];return [report,data.localPath,data.previewPath,data.textPath];
          });
          reports.push(read(report)[0]);
        }
        if(!existsSync(reviewsPath))return wait('pdf-review',{reviewsPath,pdfs:reports.map(r=>({key:r.key,sha256:r.sha256,previewPath:r.previewPath,previewSha256:fileDigest(r.previewPath)}))});
        const reviews=read(reviewsPath);
        const sourceTextCache=new SourceTextCache(join(resolve(dir,config.stateDir||'../../cache'),'evidence-text'));
        await runStage(manifestPath,'release',context,async()=>{
          const files=[];
          for(const report of reports) {
            const pack=packs.find(p=>p.key===report.key),review=reviews.find(r=>r.key===report.key);
            required(review?.sha256===report.sha256&&review.previewSha256===fileDigest(report.previewPath),'Review does not match the final PDF/preview');
            required(review.reviewer&&review.renderedAndInspected===true&&review.extractedTextReviewed===true&&review.claimsFactChecked===true,'Complete actual PDF and claim review');
            const reviewed={...pack,resume:{masterSource:master.library_file_id+' v'+master.version,...report},
              qualityChecks:{masterLayoutPreserved:report.masterLayoutPreserved,contactLinksVerified:report.contactLinksVerified,
                renderedAndInspected:review.renderedAndInspected,extractedTextReviewed:review.extractedTextReviewed,claimsFactChecked:review.claimsFactChecked}};
            const packPath=join(dir,digest(report.key).slice(0,16)+'-reviewed-pack.json'),resultPath=packPath.replace('.json','-result.json');
            writeJson(packPath,reviewed);
            await runStage(manifestPath,'content:'+report.key,{code:code.checker,reviewed},async()=>{
              const result=auditResumeArtifact(reviewed,sourceTextCache);
              const candidate=candidates.find(c=>jobKey(c)===report.key);
              const heldDraft=permitsFitHeldRevision(mode,candidate,result);
              if(heldDraft)result.artifactDisposition='REVISED_DRAFT_FIT_HOLD';
              writeJson(resultPath,result);
              required(result.decision==='READY_FOR_HUMAN_REVIEW'||heldDraft,'Final content check held '+report.key+': '+result.blockers.join('; '));
              return [packPath,resultPath];
            });
            files.push(packPath,resultPath,report.localPath,report.previewPath,report.textPath);
          }
          writeJson(releasePath,{context,resumes:reports});return [releasePath,...files,...boundSources];
        });
        release=read(releasePath);
      }
      if(mode==='benchmark'){resolveWait();return {status:'complete',mode,changed:false,resumes:release.resumes.map(r=>({key:r.key,path:r.localPath,sha256:r.sha256})),manifest:manifestPath};}
      const uploadsPath=path('uploadsPath'),receipts=existsSync(uploadsPath)?read(uploadsPath):[];
      const pending=validateUploads(release,receipts);
      if(pending.length)return wait('uploads',{uploadsPath,pending:pending.map(r=>({key:r.key,path:r.localPath,sha256:r.sha256,missing:r.missing})),
        instruction:'Save only missing PDFs in one Library batch and bounded parallel Drive uploads. Record exact connector receipts; never upload a saved item again.'});
      resolveWait('uploads');
      await runStage(manifestPath,'uploads',{release:fileDigest(releasePath),receipts},async()=>[uploadsPath]);
      const readbackPath=path('readbackPath');
      if(!existsSync(readbackPath)) {
        const sheetPlan=join(dir,'ready-sheet-plan.json');
        await runStage(manifestPath,'sheet-plan',{snapshot,receipts,candidates},async()=>{writeJson(sheetPlan,readyPlan(snapshot,candidates,receipts,config.spreadsheetId));return [sheetPlan];});
        return wait('sheet-write',{sheetPlan,readbackPath,instruction:'Inspect target cell metadata, compare expectedBefore immediately before applying this batch, then save fresh Jobs/Events readback. Do not write stale row positions.'});
      }
      const readback=read(readbackPath);fresh(readback);
      for(const report of release.resumes) {
        const candidate=candidates.find(c=>jobKey(c)===report.key);
        const record=jobs(readback).find(r=>sameJob(candidate,{canonicalKey:r.record['Canonical Job Key'],url:r.record['Job URL']}))?.record;
        const receipt=receipts.find(r=>r.key===report.key);
        const expectedStatus=candidates.find(c=>jobKey(c)===report.key)?.releaseStatus||'Ready to Submit';
        required(record&&record['Tailored Resume']===receipt.drive_url&&
          (record.Status===expectedStatus||record['Submission Confirmed']===true),'Sheet readback does not contain the saved package');
      }
      resolveWait('sheet-write');
      await runStage(manifestPath,'sheet-readback',{readback,receipts},async()=>[readbackPath]);
    }
    const publishSnapshot=mode==='sync'?path('snapshotPath'):path('readbackPath');
    const proposalPath=join(dir,'publication-proposal.json'),syncResultPath=join(dir,'sync-result.json');
    const snapshotForPublish=read(publishSnapshot);fresh(snapshotForPublish);
    required(snapshotForPublish.events,'Include current Events in the publication snapshot');
    // Caller refreshes the checkout/base file once before this step. Blob lease
    // in the connector proposal prevents overwriting a concurrent monitor update.
    required(!config.baseDataPath||resolve(config.baseDataPath)===resolve(scripts,'../src/data/jobSearchData.js'),'Refresh this checkout’s base data file before publishing.');
    const previous=readManifest(manifestPath);
    const pendingPublication=['publish','verification'].includes(previous.waiting?.stage)&&existsSync(proposalPath)&&existsSync(syncResultPath)&&read(syncResultPath).changed;
    if(pendingPublication) {
      const expected=read(proposalPath).setFields?.sourceSnapshot?.sha256;
      const current=digest({jobs:snapshotForPublish.jobs,events:snapshotForPublish.events,outreach:snapshotForPublish.outreach||null});
      required(expected===current,'Canonical data changed during publication; verify the outstanding write before starting another publication.');
    } else {
      await runStage(manifestPath,'sync',{snapshot:snapshotForPublish,base:fileDigest(join(scripts,'../src/data/jobSearchData.js'))},async()=>{
        const result=JSON.parse(execute(process.execPath,[join(scripts,'sync-job-search.mjs'),publishSnapshot,'--proposal',proposalPath]));
        writeJson(syncResultPath,result);return result.changed?[proposalPath,syncResultPath]:[syncResultPath];
      });
    }
    const sync=read(syncResultPath);
    if(!sync.changed){resolveWait();return {status:mode==='sync'||!remainingCount?'complete':'partial',
      changed:false,requestedCount:mode==='sync'?undefined:requestedCount,
      preparedCount:mode==='sync'?undefined:requestedCount-remainingCount,
      remainingCount:mode==='sync'?undefined:remainingCount,manifest:manifestPath};}
    const publishedPath=path('publishedPath');
    if(!existsSync(publishedPath))return wait('publish',{proposalPath,publishedPath,
      instruction:'Apply compact proposal to the fresh GitHub fetch result with matching blob SHA. Commit once; record exact CI and production deployment proof.'});
    const published=read(publishedPath);
    required(published.proposalSha256===fileDigest(proposalPath),'Publication receipt belongs to another proposal');
    required(/^[a-f0-9]{40}$/.test(published.commit||''),'Missing exact publication commit; inspect the remote outcome before retrying.');
    required(!['failure','error','cancelled'].includes(published.ci),'Publication CI failed; resume verification/fix, do not recreate resumes.');
    if(published.ci!=='success'||published.deployment?.state!=='READY'||published.productionVerified!==true)
      return wait('verification',{commit:published.commit,publishedPath,instruction:'Update this receipt after exact CI success, matching production READY and live-route verification. Do not issue another commit.'});
    required(published.deployment?.state==='READY'&&published.deployment.commit===published.commit&&published.deployment.aliases?.includes('ai-portfolio-ruddy-nine.vercel.app'),'Production deployment differs from published commit');
    required(published.productionVerified===true,'Verify the production route before handoff');
    resolveWait();await runStage(manifestPath,'publish',{proposal:fileDigest(proposalPath),published},async()=>[publishedPath]);
    return {status:mode==='sync'||!remainingCount?'complete':'partial',changed:true,
      requestedCount:mode==='sync'?undefined:requestedCount,
      preparedCount:mode==='sync'?undefined:requestedCount-remainingCount,
      remainingCount:mode==='sync'?undefined:remainingCount,
      commit:published.commit,manifest:manifestPath};
  } finally {
    clearInterval(lease);if(fd!==undefined)closeSync(fd);
    if(existsSync(lock)&&readFileSync(lock,'utf8').includes(token))unlinkSync(lock);
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try{const [mode,dir,input]=process.argv.slice(2);required(dir,'Use job-search-run.mjs run|sync|status PRIVATE_RUN_DIRECTORY');
    console.log(JSON.stringify(mode==='checkpoint'?JSON.parse(execute(python,[join(scripts,'archive-job-search.py'),dir,input])):mode==='reject'?recordRejections(dir,read(input)):await run(dir,{mode}),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
