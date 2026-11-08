import {existsSync, readFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {jobKey,jobIdentityKeys} from '../src/lib/job-search-model.mjs';
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
    detailsCached:Boolean(j.content||j.descriptionHtml||j.descriptionPlain),
    descriptionSnippet:String(j.content||j.descriptionPlain||j.descriptionHtml||'')
      .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,1200),
    revision:j.updated_at||j.updatedAt||j.publishedAt||j.createdAt||null,
  })).filter(j=>j.url&&j.position);
}
// Use explicit posting metadata only. Missing facts stay for full-JD review;
// employer branding and inferred legal eligibility never satisfy this gate.
export function earlyMismatch(job,policy={}) {
  if(job.explicitCptOptRestriction===true)return 'Explicit CPT/OPT restriction';
  if(Number.isFinite(job.salaryMaxAnnual)&&job.salaryMaxAnnual<(policy.minimumBaseSalary??70000))return 'Base salary ceiling below preference';
  if(job.locationEligible===false)return 'Location mismatch';
  if(job.startTimingEligible===false)return 'Start/enrollment mismatch';
  if(job.mandatoryExperienceMet===false||job.seniorOwnershipRequired===true)return 'Mandatory experience/ownership mismatch';
  if(job.roleFamily?.startsWith('AI')&&job.aiDutiesRelevant===false)return 'AI branding without relevant AI work';
  return null;
}

// A verified, dated external discovery lead allows Workday, SuccessFactors and
// employer career portals to enter the SAME duplicate/eligibility pipeline.
// This is a lead, NOT a certified active posting or verified application form.
export function candidatesFromExternalLeads(leads=[]) {
  if(!Array.isArray(leads)) throw new Error('externalLeads must be an array of dated source records');
  return leads.map((lead,index)=>{
    if(!lead.company||!lead.position||!lead.url||!lead.evidenceUrl||!lead.observedAt)
      throw new Error('External lead '+index+' needs company, position, URL, evidenceUrl and observedAt');
    for(const name of ['url','evidenceUrl']) {
      let parsed;
      try { parsed=new URL(lead[name]); } catch { throw new Error('Invalid external lead '+name+': '+index); }
      if(!['https:','http:'].includes(parsed.protocol)) throw new Error('External lead URL must be HTTP(S): '+index);
    }
    if(!Number.isFinite(Date.parse(lead.observedAt)))throw new Error('Invalid external lead observedAt: '+index);
    return {company:lead.company,position:lead.position,url:lead.url,location:lead.location||'',
      source:lead.evidenceUrl,discoveryChannel:'external',observedAt:lead.observedAt,
      detailsCached:Boolean(lead.descriptionSnippet),descriptionSnippet:lead.descriptionSnippet||'',
      revision:lead.revision??null};
  });
}

export function discoverCandidates(sources,snapshot,policy,rejections={}) {
  const header=snapshot.jobs[0];
  const known=new Set(snapshot.jobs.slice(1).filter(r=>r[0]).flatMap(r=>jobIdentityKeys({canonicalKey:r[header.indexOf('Canonical Job Key')],url:r[header.indexOf('Job URL')]})));
  const context=digest({candidate:policy.candidateDigest,rules:policy.rulesDigest});
  const aliases={...EMPLOYER_ALIASES,...policy.employerAliases};
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const employer=v=>norm(aliases[v]||v);
  const knownTitles=new Set(snapshot.jobs.slice(1).filter(r=>r[0]).map(r=>employer(r[header.indexOf('Company')])+':'+norm(r[header.indexOf('Position')])));
  const accepted=[],held=[],seen=new Set();let duplicates=0,filtered=0;
  const filteredReasons={previouslySeen:0,withinBatchDuplicate:0,earlyMismatch:0,cachedRejection:0,
    excludedSeniorityOrSales:0,irrelevantTitle:0,outsideUS:0,ambiguousTitle:0};
  for(const job of sources) {
    const key=jobKey({...job,canonicalKey:undefined});
    if(seen.has(key)){duplicates++;filteredReasons.withinBatchDuplicate++;continue;}
    if(known.has(key)){duplicates++;filteredReasons.previouslySeen++;continue;}
    seen.add(key);
    if(earlyMismatch(job,policy)){filtered++;filteredReasons.earlyMismatch++;continue;}
    const rejected=rejections[key];
    if(rejected?.context===context&&rejected.expiresAt>Date.now()&&rejected.revision===(job.revision??null)){filtered++;filteredReasons.cachedRejection++;continue;}
    if(/\b(senior|sr\.?|lead|principal|staff|director|manager|sales|sdr|bdr)\b/i.test(job.position)||/business development|account executive/i.test(job.position)){
      filtered++;filteredReasons.excludedSeniorityOrSales++;continue;
    }
    if(/india|canada|united kingdom|london|europe|australia/i.test(job.location)&&
       !/new york|san francisco|charlotte|remote us|united states|usa/i.test(job.location)){
      filtered++;filteredReasons.outsideUS++;continue;
    }
    const entry={...job,key};
    // Broad entry-level titles need the actual duties checked; do not reject
    // every Associate/Specialist simply because its title lacks 'Analyst'.
    const direct=/analyst|analytics|data quality|data governance|business intelligence|ai evaluat|ai automation|consultant|implementation|reporting|research|insights|quality assurance|business systems|process improvement/i.test(job.position);
    const adjacent=/associate|specialist|coordinator|graduate|trainee|campus|operations|product/i.test(job.position);
    if(!direct&&!adjacent){filtered++;filteredReasons.irrelevantTitle++;continue;}
    if(!direct&&!/data|analytic|automation|AI\b|process|research|operations|business systems|quality/i.test(job.descriptionSnippet||'')){
      held.push({...entry,reason:'Ambiguous early-career title; review employer duties before advancing.'});
      filteredReasons.ambiguousTitle++;continue;
    }
    if(knownTitles.has(employer(job.company)+':'+norm(job.position)))held.push({...entry,reason:'Possible repost or employer alias; resolve before deep research.'});
    else accepted.push(entry);
  }
  return {candidates:accepted,held,counts:{duplicates,filtered,filteredReasons,accepted:accepted.length,held:held.length},context};
}

export function selectBudgetedSources(sources,maxBoardRequests=12,sourceOffset=0) {
  if(!Number.isInteger(maxBoardRequests)||maxBoardRequests<1||maxBoardRequests>24)
    throw new Error('maxBoardRequests must be an integer from 1 to 24.');
  const unique=[...new Map(sources.map(s=>[sourceUrl(s),s])).values()];
  if(!Number.isInteger(sourceOffset)||sourceOffset<0||sourceOffset>unique.length)
    throw new Error('sourceOffset must identify the next unsearched board.');
  const selected=unique.slice(sourceOffset,sourceOffset+maxBoardRequests);
  const nextOffset=sourceOffset+selected.length;
  return {selected,total:unique.length,offset:sourceOffset,nextOffset,
    deferred:unique.length-nextOffset,limit:maxBoardRequests};
}

export async function discover(config,snapshot) {
  const cache=new SourceCache(join(config.stateDir,'sources'),{fetcher:config.fetcher??fetch});
  const maxBoardRequests=config.maxBoardRequests??12;
  const maxDiscoveryPasses=config.maxDiscoveryPasses??2;
  const sourceOffset=config.sourceOffset??0;
  if(!Number.isInteger(maxDiscoveryPasses)||maxDiscoveryPasses<1||maxDiscoveryPasses>2)
    throw new Error('maxDiscoveryPasses must be 1 or 2.');
  const external=candidatesFromExternalLeads(config.externalLeads||[]);
  const rejectionPath=join(config.stateDir,'rejections.json');
  const rejections=existsSync(rejectionPath)?JSON.parse(readFileSync(rejectionPath,'utf8')):{};
  const results=[],passSummaries=[];let nextOffset=sourceOffset,remaining=0,total=0;
  // Pass 2 continues at the NEXT board, not the first 12 again.
  // A cheap metadata shortlist threshold avoids heavy full-JD work for weak leads.
  for(let pass=0;pass<maxDiscoveryPasses;pass++) {
    const batch=selectBudgetedSources(config.sources||[],maxBoardRequests,nextOffset);
    total=batch.total;remaining=batch.deferred;nextOffset=batch.nextOffset;
    if(!batch.selected.length)break;
    let cursor=0;const current=[];
    await Promise.all(Array.from({length:Math.min(4,batch.selected.length)},async()=>{
      while(cursor<batch.selected.length) {
        const source=batch.selected[cursor++];
        const response=await cache.get(sourceUrl(source));
        current.push({source,response});
      }
    }));
    results.push(...current);
    const leads=results.flatMap(r=>r.response.status===200?candidatesFrom(r.source,r.response.data):[]);
    const interim=discoverCandidates([...external,...leads],snapshot,config.policy,rejections);
    passSummaries.push({index:pass+1,offset:batch.offset,queried:current.length,
      nextOffset,leads:leads.length,accepted:interim.candidates.length,
      held:interim.held.length,errors:current.filter(r=>r.response.error).length});
    // Both inexpensive metadata passes are checked if more boards remain.
    // Stopping after a large unqualified title pool caused zero-result runs.
    if(!remaining)break;
  }
  const atsLeads=results.flatMap(r=>r.response.status===200?candidatesFrom(r.source,r.response.data):[]);
  const output=discoverCandidates([...external,...atsLeads],snapshot,config.policy,rejections);
  const sourceBudget={limit:maxBoardRequests,maxPasses:maxDiscoveryPasses,offset:sourceOffset,
    total,queried:results.length,nextOffset,deferred:remaining,passes:passSummaries.length};
  return {...output,requests:cache.stats,sourceBudget,passSummaries,
    externalLeads:external.length,rawAtsLeads:atsLeads.length,
    sources:results.map(({source,response})=>({provider:source.provider,board:source.board,
      status:response.status,cached:response.cached,checkedAt:response.checkedAt,
      expiresAt:response.expiresAt,error:response.error||null})),
    limits:'Discovery yields unqualified leads only. Deferred boards remain unsearched; an external lead needs full employer JD and application-path review.'};
}
