import test from 'node:test';
import assert from 'node:assert/strict';
import { auditResumeFit } from '../scripts/check-resume-fit.mjs';
const pack = () => ({
  role: {company:'Example',title:'Analyst',requisitionOrJobUrl:'https://example.org/jobs/1'},
  jobDescriptionSnapshot: {url:'https://example.org/jobs/1',capturedAt:'2026-10-26',text:'Analyst business statistics Excel SQL '.repeat(20)},
  candidateEvidence: [{id:'e1',description:'Built analytics dashboard',source:'verified master resume, role X',verified:true}],
  requirements: [{id:'r1',description:'Excel dashboard skills',critical:true,status:'met',evidenceIds:['e1'],resumeProof:'Built analytics dashboard'}],
  resume: {masterSource:'approved master version 1',text:'Built analytics dashboard. '.repeat(30)},
  seniorityAssessment: {status:'supported',postingRequirement:'0–2 years',actualEvidence:'Relevant internships and projects'},
  workAuthorization: {status:'unknown'},
  qualityChecks: {masterLayoutPreserved:true,renderedAndInspected:true,extractedTextReviewed:true,contactLinksVerified:true,claimsFactChecked:true}
});
test('evidence supported application is eligible for human review',()=>{
  const r=auditResumeFit(pack());assert.equal(r.decision,'READY_FOR_HUMAN_REVIEW');assert.equal(r.summary.criticalSupported,1);
});
test('unsupported critical requirement holds the package',()=>{
  const p=pack();p.requirements[0].status='partial';assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('keyword mention without resume proof fails',()=>{
  const p=pack();p.requirements[0].resumeProof='Owned enterprise SLA delivery';assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('seniority shortfall cannot be overridden by 99% score',()=>{
  const p=pack();p.fitScore=99;p.seniorityAssessment.status='gap';assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('unverified experience source blocks application readiness',()=>{
  const p=pack();p.candidateEvidence[0].verified=false;assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('no-sponsorship policy is a pursuit warning, not a hard filter',()=>{
  const p=pack();p.workAuthorization.status='explicit_restriction';
  const result=auditResumeFit(p);
  assert.equal(result.decision,'READY_FOR_HUMAN_REVIEW');
  assert.match(result.warnings.join(' '),/sponsorship restriction/i);
});
test('verified legal inability to work blocks the package',()=>{
  const p=pack();p.workAuthorization.status='legal_ineligible';
  assert.equal(auditResumeFit(p).decision,'HOLD');
});
