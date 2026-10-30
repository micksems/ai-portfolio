import {existsSync, readFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {jobKey} from '../src/lib/job-search-model.mjs';
import {digest, writeJson} from './run-checkpoint.mjs';

const MINUTE=60_000;
export const EMPLOYER_ALIASES={Deploy:'Hive','Hive AI':'Hive'};
export function sourceUrl(source) {
  if (!/^[a-z0-9._-]+$/i.test(source.board || '')) throw new Error('Supply the verified ATS board slug');
  const board=encodeURIComponent(source.board);
  if (source.provider==='greenhouse') return `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`;
  if (source.provider==='lever') return `https://api.lever.co/v0/postings/${board}?mode=json`;
  if (source.provider==='ashby') return `https://api.ashbyhq.com/posting-api/job-board/${board}`;
  throw new Error('Unsupported ATS provider; use connected search for other employers');
}

export class SourceCache {
  constructor(directory,{fetcher=fetch,now=()=>Date.now(),timeoutMs=8000}={}) {
    this.directory=directory; this.fetcher=fetcher; this.now=now; this.timeoutMs=timeoutMs; this.inflight=new Map();
    mkdirSync(directory,{recursive:true});
    this.stats={networkRequests:0,cacheHits:0,errors:0};
  }
  async get(url) {
    if(this.inflight.has(url)) return this.inflight.get(url);
    const promise=this.read(url); this.inflight.set(url,promise);
    try{return await promise;}finally{this.inflight.delete(url);}
  }
  async read(url) {
    const key=digest(url), metaPath=join(this.directory,key+'.json');
    const meta=existsSync(metaPath)?JSON.parse(readFileSync(metaPath,'utf8')):null;
    if(meta && meta.expiresAt>this.now()) {
      this.stats.cacheHits++;
      const data=meta.bodyHash?JSON.parse(readFileSync(join(this.directory,meta.bodyHash+'.body'),'utf8')):null;
      if(meta.bodyHash&&digest(data)!==meta.bodyHash)throw new Error('Cached source body changed; inspect cache before reuse');
      return {...meta,data,cached:true};
    }
    this.stats.networkRequests++;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    let result;
    try {
      const response=await this.fetcher(url,{signal:controller.signal,headers:{Accept:'application/json'}});
      if(!response.ok) {
        const ttl=[404,410].includes(response.status)?24*60*MINUTE:[401,403,429].includes(response.status)?60*MINUTE:5*MINUTE;
        result={url,status:response.status,checkedAt:this.now(),expiresAt:this.now()+ttl,error:'HTTP '+response.status};
      } else {
        if(Number(response.headers?.get?.('content-length')||0)>8_000_000) throw new Error('ATS response exceeds 8MB limit');
        const text=await response.text();
        if(Buffer.byteLength(text)>8_000_000) throw new Error('ATS response exceeds 8MB limit');
        const data=JSON.parse(text); const bodyHash=digest(data);
        const bodyPath=join(this.directory,bodyHash+'.body');
        if(!existsSync(bodyPath)) writeJson(bodyPath,data);
        result={url,status:200,checkedAt:this.now(),expiresAt:this.now()+15*MINUTE,bodyHash,data};
      }
    } catch(error) {
      result={url,status:0,checkedAt:this.now(),expiresAt:this.now()+5*MINUTE,error:error.name==='AbortError'?'Request timed out':String(error.message)};
    } finally {clearTimeout(timer);}
    if(result.error)this.stats.errors++;
    const {data,...stored}=result;writeJson(metaPath,stored);
    return {...stored,data:data||null,cached:false};
  }
}

export function candidatesFrom(source,data) {
  const rows=Array.isArray(data)?data:data?.jobs||[];
  return rows.map(j=>({company:source.company||source.board,position:j.title||j.text||'',
    url:j.absolute_url||j.hostedUrl||j.jobUrl||'',
    location:j.categories?.allLocations?.join(' / ')||(typeof j.location==='string'?j.location:j.location?.name||j.categories?.location||''),
    source:sourceUrl(source),id:String(j.id),
    // Board metadata can select a lead, never certify a complete JD or a live form.
    detailsCached:Boolean(j.content||j.descriptionHtml||j.descriptionPlain),revision:j.updated_at||j.updatedAt||j.publishedAt||j.createdAt||null,
  })).filter(j=>j.url&&j.position);
}
export function discoverCandidates(sources,snapshot,policy,rejections={}) {
  const header=snapshot.jobs[0];
  const known=new Map(snapshot.jobs.slice(1).filter(r=>r[0]).map(r=>[r[header.indexOf('Canonical Job Key')],r]));
  const context=digest({candidate:policy.candidateDigest,rules:policy.rulesDigest});
  const aliases={...EMPLOYER_ALIASES,...policy.employerAliases};
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const employer=v=>norm(aliases[v]||v);
  const knownTitles=new Set(snapshot.jobs.slice(1).filter(r=>r[0]).map(r=>employer(r[header.indexOf('Company')])+':'+norm(r[header.indexOf('Position')])));
  const accepted=[],held=[],seen=new Set();let duplicates=0,filtered=0;
  for(const job of sources) {
    const key=jobKey(job);
    if(seen.has(key)||known.has(key)){duplicates++;continue;}seen.add(key);
    const rejected=rejections[key];
    if(rejected?.context===context&&rejected.expiresAt>Date.now()&&rejected.revision===(job.revision??null)){filtered++;continue;}
    if(/\b(senior|sr\.?|lead|principal|staff|director|manager|sales|sdr|bdr)\b/i.test(job.position)){filtered++;continue;}
    if(!/analyst|analytics|data quality|ai evaluation|consultant/i.test(job.position)){filtered++;continue;}
    if(/india|canada|united kingdom|london|europe|australia/i.test(job.location)&&
       !/new york|san francisco|charlotte|remote us|united states|usa/i.test(job.location)){filtered++;continue;}
    const entry={...job,key};
    if(knownTitles.has(employer(job.company)+':'+norm(job.position)))held.push({...entry,reason:'Possible repost or employer alias; resolve before deep research.'});
    else accepted.push(entry);
  }
  return {candidates:accepted,held,counts:{duplicates,filtered},context};
}

export async function discover(config,snapshot) {
  const cache=new SourceCache(join(config.stateDir,'sources'));
  const sources=[...new Map(config.sources.map(s=>[sourceUrl(s),s])).values()];
  const results=[];
  // Bound concurrency. A large board must not occupy the entire run.
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,sources.length)},async()=>{
    while(cursor<sources.length){const source=sources[cursor++];const response=await cache.get(sourceUrl(source));results.push({source,response});}
  }));
  const rejectionPath=join(config.stateDir,'rejections.json');
  const rejections=existsSync(rejectionPath)?JSON.parse(readFileSync(rejectionPath,'utf8')):{};
  const output=discoverCandidates(results.flatMap(r=>r.response.status===200?candidatesFrom(r.source,r.response.data):[]),snapshot,config.policy,rejections);
  return {...output,requests:cache.stats,sources:results.map(({source,response})=>({provider:source.provider,board:source.board,
    status:response.status,cached:response.cached,checkedAt:response.checkedAt,expiresAt:response.expiresAt,error:response.error||null})),
    limits:'Discovery leads only. Location, compensation, requirements and application path still require exact employer verification.'};
}
