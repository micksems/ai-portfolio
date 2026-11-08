import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// This gate identifies dead or misleading application links. It does NOT
// certify that a candidate can submit an application behind a login.
const publicHttps=value=>{
  let u;
  try {u=new URL(value);}catch{throw new Error('Application route needs an absolute URL');}
  if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||
    /^(localhost|.*\.local|.*\.localhost)$/i.test(u.hostname)||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname))
    throw new Error('Only public HTTPS application URLs are supported');
  return u;
};
const textMatch=(body,value)=>Boolean(value)&&body.toLowerCase().includes(String(value).toLowerCase());
export function classifyApplicationPath({requestedUrl,finalUrl,status,body='',position='',requisition='',redirects=[],
  permittedHosts=[]}) {
  const requested=publicHttps(requestedUrl),final=publicHttps(finalUrl||requestedUrl);
  const allowed=new Set([requested.hostname,...permittedHosts.map(h=>h.toLowerCase())]);
  const details={requestedUrl:requested.href,finalUrl:final.href,status,redirects,
    checkedAt:new Date().toISOString(),humanReviewRequired:true};
  if(!allowed.has(final.hostname))return {...details,state:'hold',reason:'Redirect to a host without verified application ownership'};
  if(status===401||status===403)return {...details,state:'hold',reason:'Application requires authentication or access verification'};
  if(status===404||status===410)return {...details,state:'hold',reason:'Employer link is missing or closed'};
  if(status!==200)return {...details,state:'hold',reason:'Employer page returned HTTP '+status};
  if(/\/(?:login|signin|sign-in|sso|auth|candidate-login)(?:\/|$)/i.test(final.pathname))
    return {...details,state:'hold',reason:'Sign-in gateway; application form beyond sign-in not verified'};
  if(/\/(?:careers?|search-jobs?|searchjobs|job-search|talentcommunity)(?:\/)?$/i.test(final.pathname))
    return {...details,state:'hold',reason:'Redirected to a general careers or talent-community page'};
  if(requisition&&!textMatch(body,requisition)&&!textMatch(final.href,requisition))
    return {...details,state:'hold',reason:'Expected requisition not found in final employer page'};
  if(position&&!textMatch(body,position)&&!textMatch(final.href,position.replace(/\s+/g,'-')))
    return {...details,state:'review',reason:'Employer page returned but position identity needs confirmation'};
  return {...details,state:'review',reason:'Specific employer job page appears accessible; verify the actual apply form and eligibility manually'};
}
export async function inspectApplicationPath(input,{fetcher=fetch,timeoutMs=8000,maxRedirects=4}={}) {
  let current=publicHttps(input.url||input.requestedUrl),redirects=[],status=0,body='';
  const requested=current.href;
  for(let step=0;step<=maxRedirects;step++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    let response;
    try {response=await fetcher(current.href,{method:'GET',redirect:'manual',signal:controller.signal,
      headers:{Accept:'text/html,application/xhtml+xml'}});}
    catch(err){return {requestedUrl:requested,finalUrl:current.href,state:'hold',
      reason:'Application page request failed: '+(err.name==='AbortError'?'timeout':err.message),
      redirects,humanReviewRequired:true,checkedAt:new Date().toISOString()};}
    finally{clearTimeout(timer);}
    status=response.status;
    if([301,302,303,307,308].includes(status)){
      const location=response.headers?.get?.('location');
      if(!location)break;
      const next=publicHttps(new URL(location,current).href);
      redirects.push({status,from:current.href,to:next.href});
      const permitted=new Set([new URL(requested).hostname,
        ...(input.permittedHosts||[]).map(h=>String(h).toLowerCase())]);
      if(!permitted.has(next.hostname))return {
        requestedUrl:requested,finalUrl:next.href,status,state:'hold',
        reason:'Redirected to an unverified host; no external request was made',
        redirects,humanReviewRequired:true,checkedAt:new Date().toISOString()};
      current=next;
      continue;
    }
    if(status===200){
      if(Number(response.headers?.get?.('content-length')||0)>1000000)
        return {requestedUrl:requested,finalUrl:current.href,status,state:'hold',
          reason:'Application page response too large to inspect safely',
          redirects,humanReviewRequired:true,checkedAt:new Date().toISOString()};
      const raw=await response.text();
      body=raw.slice(0,150000);
    }
    break;
  }
  if(redirects.length>maxRedirects)
    return {requestedUrl:requested,finalUrl:current.href,status,state:'hold',
      reason:'Too many application redirects',redirects,humanReviewRequired:true,
      checkedAt:new Date().toISOString()};
  return classifyApplicationPath({...input,requestedUrl:requested,finalUrl:current.href,status,body,redirects});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const file=process.argv[2];
    if(!file)throw new Error('Use node scripts/job-search-application-path.mjs PRIVATE_INPUT_JSON');
    const jobs=JSON.parse(readFileSync(file,'utf8'));
    if(!Array.isArray(jobs)||jobs.length>10)throw new Error('Supply an array of at most 10 shortlisted job URLs');
    const results=[];
    for(const job of jobs)results.push(await inspectApplicationPath(job));
    console.log(JSON.stringify(results,null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
