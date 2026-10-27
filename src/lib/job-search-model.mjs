export function jobKey(job) {
  if (job.canonicalKey) return job.canonicalKey;
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!job.url) return `named:${norm(job.company)}:${norm(job.position)}`;
  const u = new URL(job.url);
  const path = u.pathname.toLowerCase().replace(/\/(apply|application)\/?$/, '').replace(/\/$/, '');
  const gh = path.match(/\/jobs\/(\d+)/)?.[1] || u.searchParams.get('gh_jid');
  if ((u.hostname.endsWith('greenhouse.io') || u.searchParams.has('gh_jid')) && gh) return `greenhouse:${gh}`;
  const uuid = path.match(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/)?.[0];
  if (/^(jobs\.)?(lever\.co|ashbyhq\.com)$/.test(u.hostname) && uuid) return `${u.hostname}:${uuid}`;
  const wd = path.match(/_([^/]+)$/)?.[1];
  if (u.hostname.endsWith('myworkdayjobs.com') && wd) return `${u.hostname}:${wd.replace(/-\d+$/, '')}`;
  // Paycor reuses action URLs across tenants and requisitions. Both IDs matter;
  // source, language and application-step changes do not create a new job.
  if (u.hostname === 'recruitingbypaycor.com' && u.searchParams.get('clientId') && u.searchParams.get('id'))
    return `paycor:${u.searchParams.get('clientId').toLowerCase()}:${u.searchParams.get('id').toLowerCase()}`;
  for (const field of ['req', 'jk', 'jobId', 'jobid', 'requisitionId']) if (u.searchParams.has(field)) return `${u.hostname}${path}?${field}=${u.searchParams.get(field)}`;
  return u.hostname + path;
}
export function calculateMetrics(data) {
  const jobs = [...new Map(data.jobs.map((j) => [jobKey(j), j])).values()];
  const events = [...new Map((data.interviewEvents || []).map((e) => [e.id, e])).values()];
  return {
    applications: jobs.filter((j) => j.submissionConfirmed === true && j.inApplicationCohort === true).length,
    lifetimeApplications: jobs.filter((j) => j.submissionConfirmed === true).length,
    rejections: jobs.filter((j) => j.finalOutcome === 'Rejected').length,
    offers: jobs.filter((j) => j.finalOutcome === 'Offer' || j.offerAt).length,
    interviews: events.filter((e) => /^Completed — (Recruiter screen|Interview|In-person interview|Employer interview)/.test(e.stage)).length,
    scheduledInterviews: events.filter((e) => /^Scheduled —/.test(e.stage)).length,
    aiAssessments: events.filter((e) => /Completed.*AI assessment/i.test(e.stage)).length,
    onlineAssessments: events.filter((e) => /Completed.*Online assessment/i.test(e.stage)).length,
  };
}
export function validatePipeline(data) {
  const errors = [], seen = new Set(), events = new Set();
  for (const j of data.jobs) {
    const key = jobKey(j);
    if (seen.has(key)) errors.push(`Duplicate job: ${key}`);
    seen.add(key);
    if (j.inApplicationCohort && !j.submissionConfirmed) errors.push(`Unconfirmed cohort submission: ${key}`);
    if (j.submissionConfirmed && ['Found','Ready to Submit','Archived','Submission Unverified'].includes(j.status)) errors.push(`Submitted job in unsubmitted state: ${key}`);
    if (j.finalOutcome === 'Rejected' && !['Closed','Rejected'].includes(j.status)) errors.push(`Rejection status mismatch: ${key}`);
    if (j.status === 'Ready to Submit' && (!j.url || !j.resumeUrl)) errors.push(`Incomplete ready package: ${key}`);
  }
  for (const e of data.interviewEvents || []) {
    if (!e.id || events.has(e.id)) errors.push(`Missing/duplicate interview ID: ${e.id}`);
    events.add(e.id);
  }
  const actual = calculateMetrics(data);
  for (const [k,v] of Object.entries(actual)) if (data.metrics[k] !== v) errors.push(`Metric ${k}: stored ${data.metrics[k]}, calculated ${v}`);
  if (!data.sourceSnapshot?.sha256 || !data.sourceSnapshot?.readAt) errors.push('Missing source snapshot provenance');
  return errors;
}

