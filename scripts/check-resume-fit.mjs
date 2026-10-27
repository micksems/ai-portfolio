import { readFileSync } from 'node:fs';

/**
 * Conservative pre-submission quality gate. Input is a reviewed evidence pack,
 * not raw AI guesses. The script deliberately does not calculate a fit percentage.
 * Usage: node scripts/check-resume-fit.mjs evidence-pack.json
 */
export function auditResumeFit(pack) {
  const blockers = [];
  const warnings = [];
  const role = pack?.role || {};
  const jd = pack?.jobDescriptionSnapshot || {};
  const resume = pack?.resume || {};
  const evidence = Array.isArray(pack?.candidateEvidence) ? pack.candidateEvidence : [];
  const requirements = Array.isArray(pack?.requirements) ? pack.requirements : [];
  const checks = pack?.qualityChecks || {};
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  if (!role.company || !role.title || !role.requisitionOrJobUrl) blockers.push('Role must identify employer, exact title and requisition/job URL.');
  if (!/^https?:\/\//.test(jd.url || '') || !jd.capturedAt || norm(jd.text).length < 400) {
    blockers.push('Missing complete, dated job-description snapshot from a verifiable URL (at least 400 characters).');
  }
  if (!resume.masterSource || norm(resume.text).length < 450) blockers.push('Missing master provenance or full extracted PDF text.');
  if (!requirements.length) blockers.push('Requirements-to-evidence matrix is empty.');
  if (!evidence.length) blockers.push('Candidate evidence ledger is empty.');

  const ids = new Set();
  for (const ev of evidence) {
    if (!ev.id || ids.has(ev.id)) blockers.push('Duplicate/missing candidate evidence ID: ' + (ev.id || '(empty)') + '.');
    if (!ev.source || !ev.description || ev.verified !== true) blockers.push('Evidence ' + (ev.id || '(empty)') + ' is unverified or lacks provenance.');
    ids.add(ev.id);
  }
  const reqIds = new Set();
  let coveredCritical = 0;
  let criticalTotal = 0;
  for (const req of requirements) {
    if (!req.id || reqIds.has(req.id)) blockers.push('Duplicate/missing requirement ID: ' + (req.id || '(empty)') + '.');
    reqIds.add(req.id);
    if (!req.description) blockers.push('Requirement ' + req.id + ' lacks the employer\'s wording.');
    if (!['met', 'partial', 'missing', 'unknown'].includes(req.status)) blockers.push('Requirement ' + req.id + ' lacks an evidence-based status.');
    if (req.critical) criticalTotal += 1;
    const linked = Array.isArray(req.evidenceIds) ? req.evidenceIds : [];
    for (const id of linked) if (!ids.has(id)) blockers.push('Requirement ' + req.id + ' cites nonexistent evidence ' + id + '.');
    if (req.status === 'met' && !linked.length) blockers.push('Requirement ' + req.id + ' is marked met with no verified evidence.');
    if (req.status === 'met' && (!req.resumeProof || !norm(resume.text).includes(norm(req.resumeProof)))) {
      blockers.push('Requirement ' + req.id + ' lacks literal proof in the submitted resume text.');
    }
    if (req.critical) {
      if (req.status !== 'met') blockers.push('Critical employer requirement ' + req.id + ' is ' + (req.status || 'unrated') + '; do not mark resume ready.');
      else if (linked.length && req.resumeProof && norm(resume.text).includes(norm(req.resumeProof))) coveredCritical += 1;
    } else if (req.status !== 'met') {
      warnings.push('Noncritical requirement ' + req.id + ' is ' + req.status + '; disclose the gap, do not invent it.');
    }
  }
  if (!criticalTotal) blockers.push('At least one employer requirement must be explicitly marked critical.');
  if (!Array.isArray(pack?.primaryDuties) || pack.primaryDuties.length < 3 || pack.primaryDuties.length > 5) {
    blockers.push('Provide the 3–5 primary duties independently extracted from the complete job posting.');
  } else {
    const seenDuties = new Set();
    for (const duty of pack.primaryDuties) {
      if (!duty.requirementId || seenDuties.has(duty.requirementId)) blockers.push('Missing or repeated primary duty ID.');
      seenDuties.add(duty.requirementId);
      const req = requirements.find(r => r.id === duty.requirementId);
      if (!req || !req.critical || req.status !== 'met' || !req.resumeProof ||
          !norm(resume.text).includes(norm(req.resumeProof))) {
        blockers.push('Primary duty is not supported by verified critical requirement and literal PDF proof: ' + (duty.requirementId || '(missing)'));
      }
    }
  }

  const seniority = pack?.seniorityAssessment || {};
  if (!seniority.postingRequirement || !seniority.actualEvidence || !['supported', 'borderline', 'gap', 'unknown'].includes(seniority.status)) {
    blockers.push('Seniority must be assessed explicitly against demonstrated experience, not inferred from title or score.');
  } else if (seniority.status !== 'supported') {
    blockers.push('Seniority is ' + seniority.status + ': needs explicit human review or an alternate role.');
  }

  const auth = pack?.workAuthorization || {};
  if (!['verified_permitted', 'unknown', 'explicit_restriction', 'legal_ineligible'].includes(auth.status)) {
    blockers.push('Work authorization must be verified_permitted, unknown, explicit_restriction, or legal_ineligible.');
  } else if (auth.status === 'legal_ineligible') {
    blockers.push('Verified legal work ineligibility for this position: hold until independently resolved.');
  } else if (auth.status === 'explicit_restriction') {
    // An employer's no-sponsorship policy is a pursuit risk, NOT proof of
    // current legal ineligibility (Agent Rules R-10, Scoring HF-03).
    warnings.push('Employer states a sponsorship restriction: disclose it and review actual work eligibility with the candidate.');
  } else if (auth.status === 'unknown') {
    warnings.push('Sponsorship/work authorization is unknown; do not imply approval.');
  }

  for (const k of ['masterLayoutPreserved', 'renderedAndInspected', 'extractedTextReviewed', 'contactLinksVerified', 'claimsFactChecked']) {
    if (checks[k] !== true) blockers.push('Missing final resume quality check: ' + k + '.');
  }
  if (pack?.fitScore != null) warnings.push('A percentage fit score is advisory only; it cannot override a blocker.');

  return {decision: blockers.length ? 'HOLD' : 'READY_FOR_HUMAN_REVIEW', blockers, warnings,
    summary: {requirements: requirements.length, criticalSupported: coveredCritical, criticalTotal}};
}

if (process.argv[1]?.endsWith('/check-resume-fit.mjs')) {
  try {
    const path = process.argv[2];
    if (!path) throw new Error('Usage: node scripts/check-resume-fit.mjs evidence-pack.json');
    const report = auditResumeFit(JSON.parse(readFileSync(path, 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    if (report.decision !== 'READY_FOR_HUMAN_REVIEW') process.exitCode = 1;
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
  }
}
