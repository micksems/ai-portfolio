// Record measured stage timings and outputs; never redo a matching completed stage.
import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
const [file,action,stage,inputDigest,outputRef='']=process.argv.slice(2);
if(!file||!['start','finish','fail','status'].includes(action))throw new Error('Usage: run-checkpoint.mjs manifest.json start|finish|fail|status stage inputDigest [outputRef]');
const m=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{version:1,startedAt:new Date().toISOString(),stages:{}};
if(action==='status'){console.log(JSON.stringify(m));process.exit(0);}
if(!stage||!inputDigest)throw new Error('Stage and input digest required');
const prior=m.stages[stage];
if(action==='start'&&prior?.status==='complete'&&prior.inputDigest===inputDigest){console.log(JSON.stringify({reuse:true,stage,outputRef:prior.outputRef}));process.exit(0);}
if(action==='start')m.stages[stage]={status:'running',inputDigest,startedAt:new Date().toISOString()};
else {if(!prior||prior.status!=='running'||prior.inputDigest!==inputDigest)throw new Error('No matching running stage');const end=Date.now();m.stages[stage]={...prior,status:action==='finish'?'complete':'failed',finishedAt:new Date(end).toISOString(),durationMs:end-Date.parse(prior.startedAt),outputRef};}
const temp=file+'.tmp';writeFileSync(temp,JSON.stringify(m,null,2)+'\n');renameSync(temp,file);console.log(JSON.stringify(m.stages[stage]));
