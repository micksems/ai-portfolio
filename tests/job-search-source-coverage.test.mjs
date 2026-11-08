import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SourceCache,sourceUrl,workdayRequests,candidatesFrom,discover,
  candidatesFromExternalLeads,discoverCandidates} from '../scripts/job-search-discovery.mjs';
import {classifyApplicationPath,inspectApplicationPath} from '../scripts/job-search-application-path.mjs';

const snapshot=()=>({jobs:[['Canonical Job Key','Company','Position','Job URL']]});
const directory=t=>{const path=mkdtempSync(join(tmpdir(),'job-source-'));
  t.after(()=>rmSync(path,{recursive:true,force:true}));return path;};
const workday={provider:'workday',company:'Example Workday',
  host:'sample.wd5.myworkdayjobs.com',tenant:'sample',site:'External',
  searchTerms:['analyst','AI'],maxPagesPerTerm:1};

test('verified Workday careers requests use bounded public POST search',()=>{
 const requests=workdayRequests(workday);
 assert.equal(requests.length,2);
 assert.match(sourceUrl(workday),/sample\.wd5\.myworkdayjobs\.com\/wday\/cxs\/sample\/External\/jobs$/);
 const first=JSON.parse(requests[0].init.body);
 assert.deepEqual(first,{appliedFacets:{},limit:20,offset:0,searchText:'analyst'});
 assert.equal(requests[0].init.method,'POST');
 assert.throws(()=>workdayRequests({...workday,searchTerms:['a','b','c','d']}),/one to three/);
 assert.throws(()=>sourceUrl({...workday,host:'localhost'}),/public|Workday/);
 assert.throws(()=>sourceUrl({...workday,host:'fake.example.com'}),/Workday/);
});

test('workday results retain exact official URL and do not interpret relative posted text as date',()=>{
 const rows=candidatesFrom(workday,{jobPostings:[
  {title:'AI Data Analyst',externalPath:'/job/New-York/AI-Data-Analyst_R123',
   locationsText:'New York, NY',postedOn:'Posted 3 Days Ago',bulletFields:['R123']},
  {title:'Injected',externalPath:'https://another.example/job/a',locationsText:'India'}
 ]});
 assert.equal(rows.length,1);
 assert.equal(rows[0].url,'https://sample.wd5.myworkdayjobs.com/External/job/New-York/AI-Data-Analyst_R123');
 assert.equal(rows[0].revision,'Posted 3 Days Ago');
 assert.equal(rows[0].detailsCached,false);
});

test('POST cache fingerprints search term and offset, so different queries are not duplicates',async t=>{
 const dir=directory(t);let calls=0;
 const cache=new SourceCache(dir,{fetcher:async(_url,init)=>{
   calls++;
   return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({query:JSON.parse(init.body).searchText})};
 }});
 const list=workdayRequests(workday);
 assert.equal((await cache.get(list[0].url,list[0].init)).data.query,'analyst');
 assert.equal((await cache.get(list[1].url,list[1].init)).data.query,'AI');
 assert.equal((await cache.get(list[0].url,list[0].init)).cached,true);
 assert.equal(calls,2);
 assert.equal(cache.stats.cacheHits,1);
});

test('official Workday discovery records sources, missing targets and real network counts',async t=>{
 const dir=directory(t),calls=[];
 const cfg={stateDir:dir,policy:{},sources:[workday],externalLeads:[],
  targetEmployers:['Example Workday','Unconfigured Employer'],
  maxBoardRequests:12,maxDiscoveryPasses:2,
  fetcher:async(_url,init)=>{
    const search=JSON.parse(init.body).searchText;calls.push(search);
    return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({
      total:1,jobPostings:[{title:'AI Data Analyst',
        externalPath:'/job/New-York/AI-Data-Analyst_R123',locationsText:'New York, NY'}]})};
  }};
 const r=await discover(cfg,snapshot());
 assert.equal(r.candidates.length,1);
 assert.equal(r.counts.duplicates,1);
 assert.equal(r.sourceBudget.queried,1);
 assert.equal(r.requests.networkRequests,2);
 assert.deepEqual(calls,['analyst','AI']);
 assert.deepEqual(r.audit.unconfiguredEmployers,['Unconfigured Employer']);
 assert.equal(r.audit.coverageStatus,'incomplete');
 assert.equal(r.audit.acceptedLeads,1);
 assert.equal(r.audit.failedRequests,0);
});

test('official JSON feed must match verified host and output URLs cannot escape',()=>{
 const feed={provider:'official-json',company:'Example Employer',
   feedUrl:'https://careers.example.com/feed.json',officialHost:'careers.example.com'};
 assert.equal(sourceUrl(feed),feed.feedUrl);
 const jobs=candidatesFrom(feed,{jobs:[
   {id:1,title:'Data Analyst',url:'https://careers.example.com/job/1'},
   {id:2,title:'Data Analyst',url:'https://aggregator.example/job/2'}
 ]});
 assert.equal(jobs.length,1);
 assert.throws(()=>sourceUrl({...feed,officialHost:'thirdparty.example'}),/host must match/);
});

test('external aggregator lead stays held until official employer source has been tied to it',()=>{
 const lead={company:'Example',position:'Business Analyst',
   url:'https://jobs.example.com/job/123',evidenceUrl:'https://jobs.example.com/job/123',
   observedAt:new Date().toISOString(),descriptionSnippet:'Excel reporting'};
 const untrusted=discoverCandidates(candidatesFromExternalLeads([lead]),snapshot(),{});
 assert.equal(untrusted.candidates.length,0);
 assert.equal(untrusted.held[0].reason.includes('Unverified external source'),true);
 const official=discoverCandidates(candidatesFromExternalLeads([
   {...lead,officialEmployerHost:'jobs.example.com'}]),snapshot(),{});
 assert.equal(official.candidates.length,1);
});

test('application path checker blocks homepage redirects and authentication, never claims apply success',async()=>{
 const initial='https://careers.example.com/job/123';
 const home='https://careers.example.com/careers';
 const redirected=await inspectApplicationPath({url:initial,position:'Data Analyst',requisition:'123'},
   {fetcher:async url=>url===initial?
     {status:302,headers:{get:()=>home}}:
     {status:200,headers:{get:()=>null},text:async()=>'<html>Career page</html>'}});
 assert.equal(redirected.state,'hold');
 assert.match(redirected.reason,/general careers/);
 const gated=classifyApplicationPath({requestedUrl:initial,
   finalUrl:'https://careers.example.com/login',status:200,body:'Login'});
 assert.equal(gated.state,'hold');
 const exact=classifyApplicationPath({requestedUrl:initial,finalUrl:initial,status:200,
   position:'Data Analyst',requisition:'123',body:'Apply for Data Analyst (123)'});
 assert.equal(exact.state,'review');
 assert.equal(exact.humanReviewRequired,true);
 const offsite=classifyApplicationPath({requestedUrl:initial,finalUrl:'https://unknown.example/job/123',status:200});
 assert.equal(offsite.state,'hold');
});
