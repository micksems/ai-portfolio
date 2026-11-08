import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {auditResumeFit} from '../scripts/check-resume-fit.mjs';
import {earlyMismatch,discoverCandidates} from '../scripts/job-search-discovery.mjs';

const jobURL='https://jobs.lever.co/example/11111111-1111-4111-8111-111111111111';
const now=new Date().toISOString();
const specs=[
 {id:'r1',quote:'Analyze and validate business records',source:'Validated 20,000 video analytics records and investigated label errors.',
  proof:'Validated 20,000 video analytics records and investigated label errors.'},
 {id:'r2',quote:'Prepare actionable stakeholder reports',source:'Prepared weekly stakeholder summaries from operational records.',
  proof:'Prepared weekly stakeholder summaries from operational records.'},
 {id:'r3',quote:'Develop production AI automation workflows',source:'Built internal Copilot Studio workflows and documented stakeholder needs.',
  proof:'Built internal Copilot Studio workflows and documented stakeholder needs.'}
];
function fixture() {
 const jd=specs.map(s=>s.quote+'.').join(' ')+
   ' Working with analysts, reviewing data, documenting requirements and supporting stakeholders. '.repeat(7);
 const proof=specs.map(s=>s.proof).join(' ')+
   ' Skills: SQL, Power BI, Python, Excel. Education: MS Business Analytics. '.repeat(8);
 const reqs=specs.map((q,i)=>({
   id:q.id,description:q.quote,employerQuote:q.quote,critical:true,kind:'task',
   status:i===2?'partial':'met',
   requiredDepth:i===2?'production':'applied',
   demonstratedDepth:'applied',
   sourceQuote:q.source,sourceText:q.source,
   evidenceIds:['e'+(i+1)],evidenceRationale:'The cited task demonstrates directly applicable analytical work.',
   gaps:i===2?'No production deployment ownership':'No claimed unsupported duties',
   reviewVerdict:i===2?'transferable':'supported',
   resumeProof:q.proof,
   workExample:{context:'internship',actionQuote:q.source,outputQuote:q.proof},
   ...(i===2?{transferBridge:{
     jobDuty:q.quote,candidateEvidence:q.source,
     evidenceSource:'Approved evidence e3 from United Nations internship',
     resumeAngle:q.proof,
     limits:'Internal workflow prototype, not a production engineering deployment'
   }}:{})
 }));
 return {schemaVersion:3,role:{company:'Example',title:'Junior AI Business Analyst',requisitionOrJobUrl:jobURL},
   jobDescriptionSnapshot:{url:jobURL,capturedAt:now,text:jd},
   resume:{masterSource:'approved resume',text:proof},
   candidateEvidence:specs.map((s,i)=>({id:'e'+(i+1),source:'approved project evidence',
     description:s.quote,verified:true})),
   requirements:reqs,primaryDuties:specs.map(s=>({requirementId:s.id})),
   seniorityAssessment:{status:'borderline',postingRequirement:'Early-career preferred',
     actualEvidence:'UN internship and applied coursework'},
   workAuthorization:{status:'unknown'},
   qualityChecks:{masterLayoutPreserved:true,renderedAndInspected:true,extractedTextReviewed:true,
     contactLinksVerified:true,claimsFactChecked:true}};
}
test('real transferable intern/project work supports stretch junior roles without claiming production ownership',()=>{
 const result=auditResumeFit(fixture());
 assert.equal(result.decision,'READY_FOR_HUMAN_REVIEW',result.blockers.join('; '));
 assert.equal(result.summary.criticalSupported,2);
 assert.equal(result.summary.criticalTransferable,1);
 assert.ok(result.warnings.some(x=>x.includes('Transferable match')));
 assert.ok(result.warnings.some(x=>x.includes('Stretch depth gap')));
});
test('a claimed bridge cannot replace missing evidence, PDF proof, or a nontransferable credential',()=>{
 const p=fixture();
 delete p.requirements[2].transferBridge;
 assert.equal(auditResumeFit(p).decision,'HOLD');
 p.requirements[2].transferBridge=fixture().requirements[2].transferBridge;
 p.requirements[2].resumeProof='Claimed company-wide production deployment';
 assert.equal(auditResumeFit(p).decision,'HOLD');
 p.requirements[2].resumeProof=fixture().requirements[2].resumeProof;
 p.requirements[2].nonTransferable=true;
 assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('senior titles remain excluded even if transferable bridge exists',()=>{
 const p=fixture();
 p.role.title='Senior AI Business Analyst';
 assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('discovery retains experience-stretch analyst but rejects independent senior ownership',()=>{
 assert.equal(earlyMismatch({mandatoryExperienceMet:false}),null);
 assert.match(earlyMismatch({seniorOwnershipRequired:true}),/Senior/);
 const header=['Canonical Job Key','Company','Position','Job URL'];
 const job={company:'Example',position:'Business Analyst',
  url:jobURL,mandatoryExperienceMet:false};
 const r=discoverCandidates([job],{jobs:[header]},{}); 
 assert.equal(r.candidates.length,1);
 assert.equal(r.candidates[0].stretchReasons.length,1);
});
test('preflight allows documented transferable fit, not unchecked self-claims or licensing gaps',()=>{
 const script=`import importlib.util,datetime,hashlib,tempfile
spec=importlib.util.spec_from_file_location('gate','scripts/job_search_preflight.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
now=datetime.datetime.now(datetime.timezone.utc)
with tempfile.NamedTemporaryFile() as f:
 f.write(b'master');f.flush()
 gates={k:{'verdict':'pass','evidence':'Verified source'} for k in m.GATES}
 app=gates['application_path'];app.update({'checked_at':now.isoformat(),'form_verified':True,
  'requisition_confirmed':True,'verification_method':'manual_form_review',
  'form_url':'https://jobs.lever.co/example/11111111-1111-4111-8111-111111111111',
  'form_evidence':'Observed official form for specific requisition','reviewed_by':'reviewer'})
 bridge={'jobDuty':'Build analytical reports','candidateEvidence':'Validated data and developed UN dashboards',
  'evidenceSource':'Approved portfolio project','resumeAngle':'Built and validated analytical reports',
  'limits':'Coursework/internship work, not independent production ownership'}
 gates['experience']={'verdict':'transferable','evidence':'UN projects, AI evaluator tasks',
  'transferBridge':bridge}
 candidate={'company':'Example','position':'Business Analyst','url':app['form_url'],'gates':gates,
  'selection':{'posting_date_basis':'original','posting_date_source':'official ATS',
   'start_window':'2027','start_source':'employer','pursuit_rationale':'Relevant analytical work',
   'sponsorship_evidence':{'level':'unknown','source':'official employer JD'},
   'requirement_map':[{'requirement':'r'+str(i),'evidence':'actual work','source':'approved resume',
     'limits':'not production ownership'} for i in range(3)]}}
 p={'process_policy_version':2,'snapshot':{'read_at':now.isoformat(),
   'jobs':[['Canonical Job Key','Company','Position','Job URL','Status','Submission Confirmed','In Application Cohort']]},
  'candidates':[candidate],'requested_count':5,
  'master':{'library_file_id':'approved','version':1,'sha256':hashlib.sha256(b'master').hexdigest(),
  'local_path':f.name}}
 ready=m.check(p,now)[0];assert ready['eligible_for_resume'],ready['reasons'];assert ready['stretch']
 del bridge['limits']
 assert not m.check(p,now)[0]['eligible_for_resume']
 bridge['limits']='Related work, not direct production ownership'
 candidate['requiredLicenseMissing']=True
 assert not m.check(p,now)[0]['eligible_for_resume']
 print('ok')`;
 const py=spawnSync('python3',['-c',script],{encoding:'utf8'});
 assert.equal(py.status,0,py.stderr||py.stdout);assert.match(py.stdout,/ok/);
});
