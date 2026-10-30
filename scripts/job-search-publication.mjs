// Self-contained so the connector runtime can apply a small reviewed proposal
// directly to its fresh GitHub fetch result without round-tripping full history.
export function applyPublicationProposal(current, proposal, currentBlobSha) {
  if (proposal.version !== 1 || proposal.baseBlobSha !== currentBlobSha)
    throw new Error('Stale publication base; refresh and reconcile, do not replay.');
  const allowed = new Set(['updatedAt','metrics','interviewEvents','outreachState','sourceSnapshot']);
  for (const key of Object.keys(proposal.setFields)) if (!allowed.has(key)) throw new Error('Unexpected public field: '+key);
  const keyOf = j => j.canonicalKey;
  const jobs = new Map(current.jobs.map(j => [keyOf(j), j]));
  for (const key of proposal.removeJobs) jobs.delete(key);
  for (const job of proposal.upsertJobs) {
    if (!job.canonicalKey || !job.company || !job.position) throw new Error('Incomplete public job');
    const old = jobs.get(job.canonicalKey);
    if (job.notes && job.notes !== (old?.notes || '')) throw new Error('New private notes cannot be published');
    jobs.set(job.canonicalKey,job);
  }
  const ordered = proposal.jobOrder ? proposal.jobOrder.map(key => {
    if (!jobs.has(key)) throw new Error('Unknown job in publication order');
    return jobs.get(key);
  }) : [...jobs.values()];
  if (ordered.length !== jobs.size || new Set(ordered.map(keyOf)).size !== jobs.size) throw new Error('Duplicate or omitted public job');
  const next = {...current, ...proposal.setFields, jobs:ordered};
  if (next.jobs.some(j => typeof j.submissionConfirmed !== 'boolean' || typeof j.inApplicationCohort !== 'boolean'))
    throw new Error('Submission flags must be booleans');
  if (next.metrics.applications !== next.jobs.filter(j => j.submissionConfirmed && j.inApplicationCohort).length ||
      next.metrics.lifetimeApplications !== next.jobs.filter(j => j.submissionConfirmed).length)
    throw new Error('Publication application totals differ from jobs');
  return next;
}
