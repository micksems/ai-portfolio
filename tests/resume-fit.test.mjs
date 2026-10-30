import test from 'node:test';
import assert from 'node:assert/strict';
import { auditResumeFit } from '../scripts/check-resume-fit.mjs';
const pack = () => ({
  schemaVersion:3,
  role: {company:'Example',title:'Analyst',requisitionOrJobUrl:'https://example.org/jobs/1'},
  jobDescriptionSnapshot: {url:'https://example.org/jobs/1',capturedAt:'2026-10-26',text:('Built analytics dashboard. Cleaned customer data. Evaluated model outputs. ').repeat(20)},
  candidateEvidence: [{id:'e1',description:'Built analytics dashboard',source:'verified master resume, role X',verified:true}],
  requirements: ['Built analytics dashboard','Cleaned customer data','Evaluated model outputs'].map((proof,i)=>({id:'r'+(i+1),description:proof,employerQuote:proof,kind:'task',requiredDepth:'applied',demonstratedDepth:'applied',sourceQuote:proof,sourceText:proof,reviewVerdict:'supported',evidenceRationale:'Direct executed task in verified internship; no independent production ownership implied.',gaps:'Different domain; no invented outcomes.',critical:true,status:'met',evidenceIds:['e1'],resumeProof:proof})),
  primaryDuties: [{requirementId:'r1'},{requirementId:'r2'},{requirementId:'r3'}],
  resume: {masterSource:'approved master version 1',text:'Built analytics dashboard. Cleaned customer data. Evaluated model outputs. '.repeat(30)},
  seniorityAssessment: {status:'supported',postingRequirement:'0–2 years',actualEvidence:'Relevant internships and projects'},
  workAuthorization: {status:'unknown'},
  qualityChecks: {masterLayoutPreserved:true,renderedAndInspected:true,extractedTextReviewed:true,contactLinksVerified:true,claimsFactChecked:true}
});
test('evidence supported application is eligible for human review',()=>{
  const r=auditResumeFit(pack());assert.equal(r.decision,'READY_FOR_HUMAN_REVIEW');assert.equal(r.summary.criticalSupported,3);
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

test('missing primary duties inventory blocks release',()=>{
  const p=pack();delete p.primaryDuties;assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('primary duty with unsupported responsibility blocks release',()=>{
  const p=pack();p.requirements[1].status='partial';assert.equal(auditResumeFit(p).decision,'HOLD');
});


test('course-title laundering cannot satisfy applied SQL work',()=>{
 const p=pack(); p.requirements[0].resumeProof='Data Management and SQL'; p.resume.text+=' Data Management and SQL';
 assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('different IDs cannot disguise duplicate primary duties',()=>{
 const p=pack(); Object.assign(p.requirements[1],{employerQuote:p.requirements[0].employerQuote,resumeProof:p.requirements[0].resumeProof});
 assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('a degree cannot be substituted for a primary duty',()=>{
 const p=pack();p.requirements[0].kind='education';assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('invented employer requirement absent from dated JD is blocked',()=>{
 const p=pack();p.requirements[0].employerQuote='Owned enterprise security SLAs';assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('coursework exposure cannot satisfy independent delivery',()=>{
 const p=pack();p.requirements[0].requiredDepth='independent';p.requirements[0].demonstratedDepth='exposure';assert.equal(auditResumeFit(p).decision,'HOLD');
});
test('old previously passing packs are held for migration',()=>{
 const p=pack();delete p.schemaVersion;assert.equal(auditResumeFit(p).decision,'HOLD');
});

test('an arbitrary string cannot stand in for the JD capture date',()=>{
 const p=pack();p.jobDescriptionSnapshot.capturedAt='reviewed';assert.equal(auditResumeFit(p).decision,'HOLD');
});

test('a genuine collaboration task is applied work, not a course label',()=>{
 const p=pack(),proof='Collaborated with a four-person team to research internal client needs';
 Object.assign(p.requirements[0],{employerQuote:proof,resumeProof:proof,sourceText:proof,sourceQuote:proof});
 p.jobDescriptionSnapshot.text+=' '+proof;p.resume.text+=' '+proof;
 assert.equal(auditResumeFit(p).decision,'READY_FOR_HUMAN_REVIEW');
});


test('verified applied stakeholder research is recognized without weakening course-title holds',()=>{
 const p=pack(); const proof='Researched stakeholder needs with a four-person team';
 Object.assign(p.requirements[0],{description:proof,employerQuote:proof,resumeProof:proof,sourceText:proof,sourceQuote:proof});
 p.jobDescriptionSnapshot.text+=' '+proof;p.resume.text+=' '+proof;
 assert.equal(auditResumeFit(p).decision,'READY_FOR_HUMAN_REVIEW');
 p.requirements[0].resumeProof='Stakeholder Research';p.resume.text+=' Stakeholder Research';
 assert.equal(auditResumeFit(p).decision,'HOLD');
});
