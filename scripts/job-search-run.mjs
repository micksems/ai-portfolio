// Manual run controller. Research/content judgement and connected writes remain
// explicit review boundaries; all local dependencies, timings and reuse are enforced.
import {readFileSync,writeFileSync,statSync,existsSync,mkdirSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {digest,fileDigest,writeJson,readManifest,runStage,outputsValid} from './run-checkpoint.mjs';
import {discover,EMPLOYER_ALIASES} from './job-search-discovery.mjs';
import {jobKey} from '../src/lib/job-search-model.mjs';
import {auditResumeArtifact} from './check-resume-fit.mjs';

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

export function validateUploads(release,receipts) {
  const seen=new Set();
  for(const receipt of receipts) {
    required(!seen.has(receipt.key),'Duplicate upload receipt');seen.add(receipt.key);
    const resume=release.resumes.find(r=>r.key===receipt.key);
    required(resume&&resume.sha256===receipt.sha256,'Upload receipt does not match released PDF');
    required(/^libfile_[a-z0-9]+$/i.test(receipt.library_file_id||''),'Missing successful Library receipt');
    const id=String(receipt.drive_url||'').match(/^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view(?:\?|$)/)?.[1];
    required(id&&id===receipt.drive_file_id,'Missing/mismatched Drive receipt');
  }
  return release.resumes.filter(r=>!seen.has(r.key));
}

export function readyPlan(snapshot,candidates,receipts,spreadsheetId) {
  fresh(snapshot);
  const header=snapshot.jobs[0], records=jobs(snapshot), byKey=new Map(records.map(r=>[r.record['Canonical Job Key'],r]));
  let nextRow=snapshot.jobs.reduce((last,row,index)=>row[0]?index+1:last,1);
  const requests=[],expectedBefore=[];
  for(const candidate of candidates) {
    const key=jobKey(candidate), upload=receipts.find(r=>r.key===key), existing=byKey.get(key);
    required(upload,'Missing upload for '+key);
    if(existing?.record['Submission Confirmed']===true) continue;
    if(existing) required(existing.record['Tailored Resume']===upload.drive_url,'Existing job is not this run’s uploaded artifact; reconcile before writing.');
    const row=header.map((_,i)=>existing?.row[i]??'');
    const fields={'Canonical Job Key':key,'Application ID':existing?.record['Application ID']||'APP-'+digest(key).slice(0,16),
      Company:candidate.company,Position:candidate.position,'Job URL':candidate.url,Status:'Ready to Submit',
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
    required(['run','sync'].includes(mode),'Use run|sync|status RUN_DIRECTORY');
    required(config.spreadsheetId,'Missing canonical spreadsheet ID');
    const snapshot=read(path('snapshotPath'));fresh(snapshot);jobs(snapshot);
    const code={runner:fileDigest(join(scripts,'job-search-run.mjs')),render:fileDigest(join(scripts,'render-job-resumes.py')),
      checker:fileDigest(join(scripts,'check-resume-fit.mjs')),preflight:fileDigest(join(scripts,'job_search_preflight.py'))};
    const codeDigest=digest(code);
    let release;
    if(mode==='run') {
      const policy=policyFor(dir,config);
      const master=config.master;
      required(master?.library_file_id&&master.version&&master.sha256,'Pin the current approved master metadata');
      required(fileDigest(master.local_path)===master.sha256,'Master hash differs');
      const fontsFile=join(dir,'fonts.json');
      const fontInput=config.fonts?{fonts:hashFiles(Object.values(config.fonts))}:{source:fileDigest(config.fontSourcePath)};
      await runStage(manifestPath,'environment',{fontInput,master:master.sha256,code:code.render},async()=>{
        const fonts=config.fonts||JSON.parse(execute(python,[join(scripts,'render-job-resumes.py'),'fonts',config.fontSourcePath,join(resolve(dir,config.stateDir||'../../cache'),'fonts',digest(fontInput))]));
        writeJson(fontsFile,fonts);execute(python,[join(scripts,'render-job-resumes.py'),'check-fonts',fontsFile]);
        execute(python,[join(scripts,'render-job-resumes.py'),'check-master',master.local_path]);
        return [fontsFile,...Object.values(fonts)];
      });
      const shortlistPath=path('shortlistPath'),plansPath=path('plansPath'),packsPath=path('packsPath'),reviewsPath=path('reviewsPath');
      if(!existsSync(shortlistPath)) {
        const discoveryPath=join(dir,'discovery.json');
        const sourceConfig={stateDir:resolve(dir,config.stateDir||'../../cache'),sources:config.sources||[],policy};
        await runStage(manifestPath,'discovery',{sources:sourceConfig.sources,policy,jobs:digest(snapshot.jobs),window:Math.floor(Date.now()/900_000)},async()=>{
          writeJson(discoveryPath,await discover(sourceConfig,snapshot));return [discoveryPath];
        });
        return wait('shortlist',{path:discoveryPath,needed:config.requestedCount||5,
          instruction:'Review exact employer JDs and application paths, add dated evidence packs and reviewed authoring plans. Discovery leads are not qualified jobs.'});
      }
      const candidates=read(shortlistPath),plans=existsSync(plansPath)?read(plansPath):null,packs=existsSync(packsPath)?read(packsPath):null;
      required(candidates.length===(config.requestedCount||5),'Continue discovery until the requested distinct eligible count is met; do not pad.');
      if(!plans||!packs)return wait('authoring-inputs',{plansPath,packsPath});
      const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      const employer=v=>norm(policy.employerAliases[v]||v);
      for(const candidate of candidates) {
        const similar=jobs(snapshot).filter(r=>r.record['Canonical Job Key']!==jobKey(candidate)&&employer(r.record.Company)===employer(candidate.company)&&norm(r.record.Position)===norm(candidate.position));
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
      const context=digest({codeDigest,policy,master:master.sha256,fonts:hashFiles(Object.values(read(fontsFile))),candidates,plans,packs,
        sources:hashFiles(boundSources),reviews:existsSync(reviewsPath)?fileDigest(reviewsPath):null});
      const releasePath=join(dir,'release.json'),prior=readManifest(manifestPath).stages.release;
      if(prior?.inputDigest===digest(context)&&outputsValid(prior)) release=read(releasePath);
      else {
        // A completed release may resume uploads/sync without reauthoring. New
        // content always repeats the fresh duplicate gate before touching PDFs.
        const preflightPath=join(dir,'preflight.json'),preflightResult=join(dir,'preflight-result.json');
        const payload={process_policy_version:2,run_mode:'normal',requested_count:config.requestedCount||5,
          snapshot:{read_at:snapshot.readAt,jobs:snapshot.jobs},master,candidates};
        await runStage(manifestPath,'preflight',{payload,code:code.preflight},async()=>{
          writeJson(preflightPath,payload);
          writeJson(preflightResult,JSON.parse(execute(python,[join(scripts,'job_search_preflight.py'),preflightPath])));
          return [preflightPath,preflightResult];
        });
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
            identity:{key,company:candidate.company,position:candidate.position},plan},async()=>{
            writeJson(input,{master,fonts:read(fontsFile),jobs:[{...plan,key,company:candidate.company,position:candidate.position,output}]});
            execute(python,[join(scripts,'render-job-resumes.py'),input,report]);
            const data=read(report)[0];return [report,data.localPath,data.previewPath,data.textPath];
          });
          reports.push(read(report)[0]);
        }
        if(!existsSync(reviewsPath))return wait('pdf-review',{reviewsPath,pdfs:reports.map(r=>({key:r.key,sha256:r.sha256,previewPath:r.previewPath,previewSha256:fileDigest(r.previewPath)}))});
        const reviews=read(reviewsPath);
        const sourceTextCache=new Map();
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
              writeJson(resultPath,result);
              required(result.decision==='READY_FOR_HUMAN_REVIEW','Final content check held '+report.key+': '+result.blockers.join('; '));
              return [packPath,resultPath];
            });
            files.push(packPath,resultPath,report.localPath,report.previewPath,report.textPath);
          }
          writeJson(releasePath,{context,resumes:reports});return [releasePath,...files,...boundSources];
        });
        release=read(releasePath);
      }
      const uploadsPath=path('uploadsPath'),receipts=existsSync(uploadsPath)?read(uploadsPath):[];
      const pending=validateUploads(release,receipts);
      if(pending.length)return wait('uploads',{uploadsPath,pending:pending.map(r=>({key:r.key,path:r.localPath,sha256:r.sha256})),
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
        const record=jobs(readback).find(r=>r.record['Canonical Job Key']===report.key)?.record;
        const receipt=receipts.find(r=>r.key===report.key);
        required(record&&record['Tailored Resume']===receipt.drive_url&&
          (record.Status==='Ready to Submit'||record['Submission Confirmed']===true),'Sheet readback does not contain the saved package');
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
    if(!sync.changed){resolveWait();return {status:'complete',changed:false,manifest:manifestPath};}
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
    return {status:'complete',changed:true,commit:published.commit,manifest:manifestPath};
  } finally {
    clearInterval(lease);if(fd!==undefined)closeSync(fd);
    if(existsSync(lock)&&readFileSync(lock,'utf8').includes(token))unlinkSync(lock);
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try{const [mode,dir,input]=process.argv.slice(2);required(dir,'Use job-search-run.mjs run|sync|status PRIVATE_RUN_DIRECTORY');
    console.log(JSON.stringify(mode==='reject'?recordRejections(dir,read(input)):await run(dir,{mode}),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
