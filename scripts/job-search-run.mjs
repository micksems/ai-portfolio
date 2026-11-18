// Manual run controller. Research/content judgement and connected writes remain
// explicit review boundaries; all local dependencies, timings and reuse are enforced.
import {readFileSync,writeFileSync,statSync,existsSync,mkdirSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {digest,fileDigest,gitBlobSha,writeJson,readManifest,runStage,outputsValid} from './run-checkpoint.mjs';
import {discover,EMPLOYER_ALIASES,earlyMismatch,sourcesForTargets} from './job-search-discovery.mjs';
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

function screenShortlist(candidates,snapshot,mode) {
  const records=jobs(snapshot),seen=new Set();
  const eligible=[],held=[];
  for(const c of candidates){
    const key=jobKey({...c,canonicalKey:undefined});
    const matches=records.filter(r=>sameJob(c,{canonicalKey:r.record['Canonical Job Key'],url:r.record['Job URL'],company:r.record.Company,position:r.record.Position}));
    const reasons=[];
    const mismatch=earlyMismatch(c);
    if(mismatch)reasons.push(mismatch);
    if(c.canonicalKey&&c.canonicalKey!==key)reasons.push('New candidate key must match its full requisition URL');
    if(seen.has(key))reasons.push('Duplicate within shortlist');
    if(matches.some(r=>r.record['Submission Confirmed']===true||r.record['Applied At']||/^(Applied|Rejected|Interview|Offer)$/i.test(r.record.Status)))
      reasons.push('Already submitted: resume generation forbidden');
    if(mode==='run'&&(matches.length||c.retained))reasons.push('Previously seen roles cannot fill new-job slots');
    if(mode!=='run'&&matches.length!==1)reasons.push('Revision/benchmark must resolve one existing unsubmitted role');
    if(c.discoveryChannel==='external'&&c.sourceTrust!=='declared-official')reasons.push('External lead needs a verified official employer source');
    if(mode==='run'&&c.releaseStatus&&c.releaseStatus!=='Ready to Submit')reasons.push('A held role cannot fill a new-job slot');
    if(reasons.length)held.push({key,company:c.company,position:c.position,reasons});
    else {eligible.push(c);seen.add(key);}
  }
  return {eligible,held};
}
export function checkCandidateIdentity(candidates,snapshot,mode) {
  const {held}=screenShortlist(candidates,snapshot,mode);
  if(held.length)throw new Error(held[0].reasons.join('. '));
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

export function partitionPreflightDecisions(candidates,results) {
  required(Array.isArray(results)&&results.length===candidates.length,
    'Qualification validator did not return a complete candidate decision list');
  const index=new Map();
  for(const result of results) {
    required(result?.key&&!index.has(result.key),'Missing or duplicated preflight identity');
    index.set(result.key,result);
  }
  required(candidates.every(c=>index.has(jobKey(c))),
    'Preflight decisions do not match approved requisitions');
  return {eligible:candidates.filter(c=>index.get(jobKey(c)).eligible_for_resume===true),
    held:results.filter(r=>r.eligible_for_resume!==true)
      .map(r=>({key:r.key,company:r.company,position:r.position,reasons:r.reasons}))};
}

// A saved, reviewed PDF is a user deliverable. Do not hold its link hostage to
// a GitHub/Vercel dashboard publication. Missing uploads are reported separately.
export function savedPackageHandoff(release,receipts,candidates,requestedCount) {
  required(Array.isArray(release?.resumes),'Missing verified release');
  required(Array.isArray(receipts),'Missing upload receipts');
  required(Array.isArray(candidates),'Missing approved candidate shortlist');
  required(Number.isInteger(requestedCount)&&requestedCount>=1,'Invalid requested count');
  const pendingUploads=validateUploads(release,receipts);
  const pendingKeys=new Set(pendingUploads.map(item=>item.key));
  const deliverables=release.resumes.filter(r=>!pendingKeys.has(r.key)).map(r=>{
    const candidate=candidates.find(c=>jobKey(c)===r.key);
    const receipt=receipts.find(x=>x.key===r.key);
    required(candidate&&receipt?.drive_url,'Saved PDF lacks its approved role or Drive link: '+r.key);
    const form=candidate.gates?.application_path;
    const applicationUrl=form?.form_verified && form.requisition_confirmed && form.form_url?.startsWith('https://')
      ? form.form_url : candidate.url;
    return {key:r.key,company:candidate.company,position:candidate.position,
      applicationUrl,resumePdfUrl:receipt.drive_url,
      libraryFileId:receipt.library_file_id,sha256:r.sha256};
  });
  required(deliverables.length<=requestedCount,'Saved packages exceed original target');
  return {requestedCount,savedCount:deliverables.length,
    remainingCount:requestedCount-deliverables.length,deliverables,
    pendingUploads:pendingUploads.map(({key,missing})=>({key,missing}))};
}

function savedRowsPresent(snapshot,deliverables,candidates) {
  const records=jobs(snapshot);
  return deliverables.every(item=>{
    const candidate=candidates.find(c=>jobKey(c)===item.key);
    const matches=records.filter(({record:r})=>sameJob(candidate,{canonicalKey:r['Canonical Job Key'],
      url:r['Job URL'],company:r.Company,position:r.Position}));
    return matches.length===1 && matches[0].record['Tailored Resume']===item.resumePdfUrl &&
      (matches[0].record.Status===(candidate.releaseStatus||'Ready to Submit') || matches[0].record['Submission Confirmed']===true);
  });
}
function verifiedOutput(stage,path) {
  if(stage?.status!=='complete'||!existsSync(path))return false;
  const hash=fileDigest(path);
  return stage.outputs.some(output=>basename(output.path)===basename(path) && output.sha256===hash);
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

export async function run(directory,{mode='run',baseBlobSha}={}) {
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
    required(['run','revise','benchmark','sync','begin-publish','handoff'].includes(mode),
      'Use run|revise|benchmark|sync|begin-publish|handoff|status RUN_DIRECTORY');
    const proposalPath=join(dir,'publication-proposal.json'),publishedPath=path('publishedPath');
    if(mode==='begin-publish') {
      required(manifest.waiting?.stage==='publish' && outputsValid(manifest.stages.sync),
        'Prepare a current proposal with sync before starting the GitHub write.');
      const proposal=read(proposalPath);
      required(baseBlobSha && baseBlobSha===proposal.baseBlobSha,
        'GitHub base changed before the write. Refresh the checkout and run sync.');
      const source=read(path('snapshotPath'));fresh(source);
      const hash=digest({jobs:source.jobs,events:source.events,outreach:source.outreach||null});
      required(hash===(proposal.sourceHash||proposal.setFields.sourceSnapshot?.sha256),
        'Tracker changed before the write. Run sync to prepare the current proposal.');
      if(existsSync(publishedPath))return wait('verification',{publishedPath,
        instruction:'Inspect the recorded GitHub write before another attempt.'});
      writeJson(publishedPath,{proposalSha256:fileDigest(proposalPath),state:'attempting'});
      return {status:'ready-to-publish',baseBlobSha,proposalPath,publishedPath};
    }
    if(mode==='handoff') {
      const releaseFile=join(dir,'release.json'),shortlistFile=path('shortlistPath'),
        uploadsFile=path('uploadsPath');
      required(existsSync(releaseFile)&&existsSync(shortlistFile),
        'No released packages to recover; inspect the last waiting stage with status');
      const approved=read(shortlistFile),readback=path('readbackPath');
      const handoff=savedPackageHandoff(read(releaseFile),
        existsSync(uploadsFile)?read(uploadsFile):[],approved,
        config.requestedCount??5);
      return {status:handoff.savedCount?'recovered':'waiting',...handoff,
        trackerSyncPending:!(handoff.savedCount && verifiedOutput(manifest.stages['sheet-readback'],readback) &&
          savedRowsPresent(read(readback),handoff.deliverables,approved)),
        websiteSyncPending:true,manifest:manifestPath};
    }
    required(config.spreadsheetId,'Missing canonical spreadsheet ID');
    const requestedCount=config.requestedCount??5;
    required(Number.isInteger(requestedCount)&&requestedCount>=1,'requestedCount must be positive');
    const snapshot=read(path('snapshotPath'));fresh(snapshot);jobs(snapshot);
    let release;
    let remainingCount=0;
    if(mode==='run'||mode==='revise'||mode==='benchmark') {
      // A refreshed tracker after a successful write already contains these roles.
      // Finish that same run using its checked files and exact readback.
      if(mode==='run' && verifiedOutput(manifest.stages.release,join(dir,'release.json')) &&
          verifiedOutput(manifest.stages.uploads,path('uploadsPath')) && existsSync(path('shortlistPath'))) {
        const approved=read(path('shortlistPath'));
        const handoff=savedPackageHandoff(read(join(dir,'release.json')),read(path('uploadsPath')),approved,requestedCount);
        if(handoff.savedCount && !handoff.pendingUploads.length && savedRowsPresent(snapshot,handoff.deliverables,approved)) {
          const file=path('readbackPath');
          await runStage(manifestPath,'sheet-readback',{snapshot,packages:handoff.deliverables},async()=>{
            writeJson(file,snapshot);return [file];
          });
          resolveWait('uploads','sheet-write');
          return {status:handoff.remainingCount?'partial':'complete',...handoff,recovered:true,
            trackerUpdated:true,websiteSyncPending:true,manifest:manifestPath};
        }
      }
      const policy=policyFor(dir,config);
      // Fail before font extraction/resume work if employer discovery cannot
      // cover the requested employer list. An empty source list is not
      // evidence that the labor market has zero suitable roles.
      let sources=config.sources||[];
      if(mode==='run'&&!existsSync(path('shortlistPath'))) {
        const targets=config.targetEmployers||[];
        const catalog=read(resolve(scripts,'../config/verified-employer-career-sites.json'));
        sources=sourcesForTargets(targets,sources,catalog.employers);
        const leads=config.externalLeadsPath?read(path('externalLeadsPath')):(config.externalLeads||[]);
        const normalize=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
        const targetNames=targets.map(t=>typeof t==='string'?t:t.name);
        const targetKeys=new Set(targetNames.map(normalize));
        const configured=[...sources,...leads];
        if(!targets.length||!configured.length)return wait('source-configuration',{
          reason:!targets.length?'Supply an explicit ordered targetEmployers list from the approved employer scope.':
            'No verified employer ATS sources or dated external leads were configured.',
          targetEmployers:targetNames,sourceCount:sources.length,
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
          sources,externalLeads,targetEmployers:config.targetEmployers||[],
          policy,requestedCount,
          maxBoardRequests:config.maxBoardRequests??12,maxDiscoveryPasses:config.maxDiscoveryPasses??2,
          sourceOffset:config.sourceOffset??0};
        await runStage(manifestPath,'discovery',{sources:sourceConfig.sources,
          targetEmployers:sourceConfig.targetEmployers,externalLeads,
          policy,maxBoardRequests:sourceConfig.maxBoardRequests,maxDiscoveryPasses:sourceConfig.maxDiscoveryPasses,
          sourceOffset:sourceConfig.sourceOffset,discoveryCode:hashFiles(['job-search-discovery.mjs','read-job-feed.py'].map(f=>join(scripts,f))),
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
      const originalCandidates=read(shortlistPath);
      required(originalCandidates.length>=1&&originalCandidates.length<=requestedCount,
        'Provide 1..requestedCount verified roles, or report a zero-result discovery with its reason counts. Never pad or silently lower the target.');
      const screened=screenShortlist(originalCandidates,snapshot,mode);
      let candidates=screened.eligible;
      if(!candidates.length) {
        writeJson(join(dir,'qualification-holds.json'),{requestedCount,held:screened.held});
        return wait('qualification-hold',{requestedCount,candidatesChecked:originalCandidates.length,
          reasons:screened.held,dashboardSyncRequired:true});
      }
      const master=config.master;
      required(master?.library_file_id&&master.version&&master.sha256,'Pin the current approved master metadata');
      required(fileDigest(master.local_path)===master.sha256,'Master hash differs');
      const code={render:fileDigest(join(scripts,'render-job-resumes.py')),checker:fileDigest(join(scripts,'check-resume-fit.mjs')),
        preflight:fileDigest(join(scripts,'job_search_preflight.py'))};
      const evidenceCodeDigest=digest(code);
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
      const decisions=partitionPreflightDecisions(candidates,read(preflightResult));
      const qualificationHolds=[...screened.held,...decisions.held];
      if(qualificationHolds.length)writeJson(join(dir,'qualification-holds.json'),
        {requestedCount,held:qualificationHolds,checkedAt:new Date().toISOString()});
      candidates=decisions.eligible;
      if(!candidates.length)
        return wait('qualification-hold',{requestedCount,candidatesChecked:originalCandidates.length,
          reasons:qualificationHolds,dashboardSyncRequired:true,
          instruction:'No verified eligible applications. Report the exact blockers and save discovered Found leads separately; do not draft a resume.'});
      remainingCount=requestedCount-candidates.length;
      resolveWait('qualification-hold');
      const fontsFile=join(dir,'fonts.json');
      const fontInput=config.fonts?{fonts:hashFiles(Object.values(config.fonts))}:{source:fileDigest(config.fontSourcePath)};
      await runStage(manifestPath,'environment',{fontInput,master:master.sha256,code:code.render},async()=>{
        const fonts=config.fonts||JSON.parse(execute(python,[join(scripts,'render-job-resumes.py'),'fonts',config.fontSourcePath,join(resolve(dir,config.stateDir||'../../cache'),'fonts',digest(fontInput))]));
        writeJson(fontsFile,fonts);execute(python,[join(scripts,'render-job-resumes.py'),'check-fonts',fontsFile]);
        execute(python,[join(scripts,'render-job-resumes.py'),'check-master',master.local_path]);
        return [fontsFile,...Object.values(fonts)];
      });
      const keys=new Set(candidates.map(c=>jobKey(c)));
      const plans=existsSync(plansPath)?read(plansPath).filter(p=>keys.has(p.key)):null;
      const packs=existsSync(packsPath)?read(packsPath).filter(p=>keys.has(p.key)):null;
      if(!plans||!packs)return wait('authoring-inputs',{plansPath,packsPath,
        eligibleRoles:candidates.map(c=>({company:c.company,position:c.position,url:c.url})),
        skippedRoles:qualificationHolds,
        instruction:'Prepare role-specific inputs only for the eligible roles. Do not rewrite held candidates.'});
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
      if(pending.length) {
        const handoff=savedPackageHandoff(release,receipts,candidates,requestedCount);
        return wait('uploads',{uploadsPath,pending:pending.map(r=>({key:r.key,path:r.localPath,sha256:r.sha256,missing:r.missing})),
          ...handoff,deliverNow:handoff.savedCount>0,
          instruction:'Deliver links for already saved packages immediately; upload only missing PDFs. Do not redo a saved resume or make publication a prerequisite.'});
      }
      resolveWait('uploads');
      await runStage(manifestPath,'uploads',{release:fileDigest(releasePath),receipts},async()=>[uploadsPath]);
      const handoff=savedPackageHandoff(release,receipts,candidates,requestedCount);
      const readbackPath=path('readbackPath');
      if(!existsSync(readbackPath)) {
        const sheetPlan=join(dir,'ready-sheet-plan.json');
        await runStage(manifestPath,'sheet-plan',{snapshot,receipts,candidates},async()=>{writeJson(sheetPlan,readyPlan(snapshot,candidates,receipts,config.spreadsheetId));return [sheetPlan];});
        return wait('sheet-write',{sheetPlan,readbackPath,...handoff,deliverNow:true,
          trackerSyncPending:true,websiteSyncPending:true,
          instruction:'Deliver the saved role/PDF links to the user NOW. Sheet reconciliation continues separately; do not claim the tracker or website is updated yet.'});
      }
      const readback=read(readbackPath);fresh(readback);
      required(savedRowsPresent(readback,handoff.deliverables,candidates),'Sheet readback does not contain the saved package');
      resolveWait('sheet-write');
      await runStage(manifestPath,'sheet-readback',{readback,receipts},async()=>[readbackPath]);
      resolveWait();
      // The user receives a real package before GitHub publication. Sync is
      // independently repeatable and must not rerender or delay these links.
      return {status:remainingCount?'partial':'complete',...handoff,
        skippedRoles:qualificationHolds,trackerUpdated:true,websiteSyncPending:true,
        manifest:manifestPath};
    }
    const publishSnapshot=path('snapshotPath'),syncResultPath=join(dir,'sync-result.json');
    required(snapshot.events,'Include current Events in the publication snapshot');
    // Caller refreshes the checkout/base file once before this step. Blob lease
    // in the connector proposal prevents overwriting a concurrent monitor update.
    required(!config.baseDataPath||resolve(config.baseDataPath)===resolve(scripts,'../src/data/jobSearchData.js'),'Refresh this checkout’s base data file before publishing.');
    const basePath=join(scripts,'../src/data/jobSearchData.js');
    const baseText=readFileSync(basePath,'utf8'),baseSha=gitBlobSha(baseText);
    const receipt=existsSync(publishedPath)?read(publishedPath):null;
    const pending=['publish','verification'].includes(manifest.waiting?.stage) ||
      Boolean(receipt && !verifiedOutput(manifest.stages.publish,publishedPath));
    const proposed=pending?read(proposalPath):null;
    if(receipt)required(existsSync(proposalPath) && receipt.proposalSha256===fileDigest(proposalPath),
      'Publication receipt belongs to another proposal');
    if(receipt?.state==='not-written')required(!receipt.commit,'A committed write cannot be marked not-written');
    if(receipt?.commit && !pending && baseSha===read(proposalPath).baseBlobSha)
      return wait('refresh-base',{commit:receipt.commit,instruction:'Refresh the checkout to include the verified commit before reconciling another change.'});
    if(pending && !receipt) {
      // Older runs may have committed before they could store a receipt.
      const base=JSON.parse(baseText.replace(/^export const jobSearchData = /,'').replace(/;\s*$/,''));
      const expected=proposed.sourceHash || proposed.setFields.sourceSnapshot?.sha256;
      if(manifest.waiting.stage==='verification' || (baseSha!==proposed.baseBlobSha && expected && base.sourceSnapshot?.sha256===expected))
        return wait('verification',{proposalPath,publishedPath,
          instruction:'Locate the existing GitHub commit and record its proof. If the write never landed, record state=not-written with the proposal hash.'});
    }
    const keepReceipt=pending && receipt && receipt.state!=='not-written';
    if(!keepReceipt) {
      if(receipt) {
        required(receipt.state==='not-written' || verifiedOutput(manifest.stages.publish,publishedPath),
          'Verify the previous GitHub write before preparing another.');
        writeJson(join(dir,'publication-receipts',digest(receipt)+'.json'),receipt);
        unlinkSync(publishedPath);
      }
      await runStage(manifestPath,'sync',{snapshot,base:baseSha,
        syncCode:hashFiles(['scripts/sync-job-search.mjs','scripts/job-search-publication.mjs','src/lib/job-search-model.mjs',
          'src/lib/job-search-sync.mjs','src/lib/job-search-source.mjs'].map(f=>resolve(scripts,'..',f)))},async()=>{
        const result=JSON.parse(execute(process.execPath,[join(scripts,'sync-job-search.mjs'),publishSnapshot,'--proposal',proposalPath]));
        writeJson(syncResultPath,result);return result.changed?[proposalPath,syncResultPath]:[syncResultPath];
      });
    }
    const sync=read(syncResultPath);
    if(!sync.changed){resolveWait();return {status:'complete',changed:false,manifest:manifestPath};}
    if(!existsSync(publishedPath))return wait('publish',{proposalPath,publishedPath,
      baseBlobSha:sync.baseBlobSha,
      instruction:'Apply the proposal in memory to the fresh GitHub blob. Immediately before the write use begin-publish with that blob SHA, then record the returned commit.'});
    const published=read(publishedPath);
    if(!published.commit)return wait('verification',{proposalPath,publishedPath,
      instruction:'Inspect the previous GitHub write. Record its exact commit or a confirmed not-written outcome before retrying.'});
    required(/^[a-f0-9]{40}$/.test(published.commit||''),'Missing exact publication commit; inspect the remote outcome before retrying.');
    required(!['failure','error','cancelled'].includes(published.ci),'Publication CI failed; resume verification/fix, do not recreate resumes.');
    if(published.ci!=='success'||published.deployment?.state!=='READY'||published.productionVerified!==true)
      return wait('verification',{commit:published.commit,publishedPath,instruction:'Update this receipt after exact CI success, matching production READY and live-route verification. Do not issue another commit.'});
    required(published.deployment?.state==='READY'&&published.deployment.commit===published.commit&&published.deployment.aliases?.includes('ai-portfolio-ruddy-nine.vercel.app'),'Production deployment differs from published commit');
    required(published.productionVerified===true,'Verify the production route before handoff');
    resolveWait();await runStage(manifestPath,'publish',{proposal:fileDigest(proposalPath),published},async()=>[publishedPath]);
    const current=digest({jobs:snapshot.jobs,events:snapshot.events,outreach:snapshot.outreach||null});
    if((proposed.sourceHash||proposed.setFields.sourceSnapshot?.sha256)!==current)
      return wait('sync',{verifiedCommit:published.commit,instruction:'The previous commit is verified. Sync the newer tracker snapshot against the refreshed GitHub base.'});
    return {status:'complete',changed:true,commit:published.commit,manifest:manifestPath};
  } finally {
    clearInterval(lease);if(fd!==undefined)closeSync(fd);
    if(existsSync(lock)&&readFileSync(lock,'utf8').includes(token))unlinkSync(lock);
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try{const [mode,dir,input]=process.argv.slice(2);required(dir,'Use job-search-run.mjs run|sync|handoff|status PRIVATE_RUN_DIRECTORY');
    console.log(JSON.stringify(mode==='checkpoint'?JSON.parse(execute(python,[join(scripts,'archive-job-search.py'),dir,input])):mode==='reject'?recordRejections(dir,read(input)):await run(dir,{mode,baseBlobSha:input}),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
