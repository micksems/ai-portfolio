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
 print('ok')`;
 const r=spawnSync('python3',['-c',code],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/ok/);
});
