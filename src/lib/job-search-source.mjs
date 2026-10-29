// One mutable Jobs table. Legacy matrices are accepted only for migration/tests.
export function normalizeSnapshot(snapshot) {
  if (!snapshot.jobs) return snapshot;
  const [header,...body]=snapshot.jobs;
  const required=['Canonical Job Key','Company','Position','Job URL','Status','Submission Confirmed','In Application Cohort'];
  if (!Array.isArray(header) || required.some(k=>!header.includes(k))) throw new Error('Incomplete Jobs headers');
  const rows=body.filter(r=>r[0]).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??null])));
  const seen=new Set();
  for(const row of rows){
    const key=row['Canonical Job Key'];
    if(seen.has(key))throw new Error('Duplicate canonical Jobs row: '+key);
    seen.add(key);
    if(typeof row['Submission Confirmed']!=='boolean'||typeof row['In Application Cohort']!=='boolean')throw new Error('Jobs submission flags must be native booleans: '+key);
  }
  const matrix=(fields)=>[fields,...rows.map(r=>fields.map(f=>f==='Current Stage'?r.Status:r[f]??null))];
  return {...snapshot,
    tracker:matrix(['Company','Position','Job URL','Status','Tailored Resume']),
    history:matrix(['Application ID','Company','Position','Job URL','Submission Confirmed','In Application Cohort','Canonical Job Key','Current Stage','Final Outcome','First Seen At','Applied At','Rejection At','Offer At']),
    interviews:snapshot.events,
  };
}
