import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('preflight accepts consolidated Jobs input and blocks a previously submitted requisition',()=>{
 const code=`import importlib.util,datetime,hashlib,tempfile
spec=importlib.util.spec_from_file_location('gate','scripts/job_search_preflight.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.NamedTemporaryFile() as f:
 f.write(b'master');f.flush()
 now=datetime.datetime.now(datetime.timezone.utc)
 p={'process_policy_version':2,'snapshot':{'read_at':now.isoformat(),'jobs':[['Canonical Job Key','Company','Position','Job URL','Status','Submission Confirmed'],['greenhouse:123','E','Analyst','https://job-boards.greenhouse.io/e/jobs/123','Closed',True]]},'candidates':[{'company':'E','position':'Analyst','url':'https://job-boards.greenhouse.io/e/jobs/123'}],'requested_count':1,'master':{'library_file_id':'test','version':2,'sha256':hashlib.sha256(b'master').hexdigest(),'local_path':f.name}}
 r=m.check(p,now);assert not r[0]['eligible_for_resume'];assert any('Already submitted' in x for x in r[0]['reasons'])
 # A smaller verified shortlist must be evaluated without silently reducing the goal.
 p['requested_count']=5
 partial=m.check(p,now)
 assert len(partial)==1 and any('Already submitted' in x for x in partial[0]['reasons'])
 p['candidates']=[]
 try:
  m.check(p,now)
  raise AssertionError('Empty shortlist must not be accepted')
 except ValueError as e:
  assert 'zero result' in str(e)
 print('ok')`;
 const r=spawnSync('python3',['-c',code],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/ok/);
});

test('form review and exact requisition are required even when other gates pass',()=>{
 const code=`import importlib.util,datetime,hashlib,tempfile
spec=importlib.util.spec_from_file_location('gate','scripts/job_search_preflight.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
now=datetime.datetime.now(datetime.timezone.utc)
with tempfile.NamedTemporaryFile() as f:
 f.write(b'master');f.flush()
 key='https://jobs.lever.co/example/11111111-1111-4111-8111-111111111111'
 gates={k:{'verdict':'pass','evidence':'Verified full employer JD and candidate source'} for k in m.GATES}
 gates['application_path']['checked_at']=now.isoformat()
 candidate={'company':'Example','position':'Data Analyst','url':key,'gates':gates,
   'selection':{'posting_date_basis':'original','posting_date_source':'official JD','start_window':'2027',
     'start_source':'employer','pursuit_rationale':'Role aligns to validated projects',
     'sponsorship_evidence':{'level':'unknown','source':'employer JD'},
     'requirement_map':[{'requirement':'r'+str(i),'evidence':'actual work',
       'source':'approved resume','limits':'limited scope'} for i in range(3)]}}
 p={'process_policy_version':2,'snapshot':{'read_at':now.isoformat(),
   'jobs':[['Canonical Job Key','Company','Position','Job URL','Status','Submission Confirmed','In Application Cohort']]},
   'candidates':[candidate],'requested_count':5,
   'master':{'library_file_id':'test','version':1,'sha256':hashlib.sha256(b'master').hexdigest(),'local_path':f.name}}
 blocked=m.check(p,now)[0]
 assert not blocked['eligible_for_resume']
 assert any('form' in reason.lower() for reason in blocked['reasons'])
 app=gates['application_path']
 app.update({'form_verified':True,'requisition_confirmed':True,'verification_method':'manual_form_review',
   'form_url':key,'form_evidence':'Saw active resume-upload field for the exact requisition',
   'reviewed_by':'human'})
 passed=m.check(p,now)[0]
 assert passed['eligible_for_resume'],passed['reasons']
 candidate['explicitCptOptRestriction']=True
 assert not m.check(p,now)[0]['eligible_for_resume']
 print('ok')`;
 const r=spawnSync('python3',['-c',code],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/ok/);
});
