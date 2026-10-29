import { normalizeSnapshot } from './job-search-source.mjs';
// Pure, deterministic reconciliation. No external I/O, polling, or scheduling.
// The Google Sheet is canonical; the dashboard is a read-only published snapshot.
import { jobKey, calculateMetrics, validatePipeline } from './job-search-model.mjs';

export function sheetRows(matrix, name) {
  if (!Array.isArray(matrix) || !Array.isArray(matrix[0])) throw new Error('Missing sheet matrix: ' + name);
  const [header, ...body] = matrix;
  if (!header.length || new Set(header.filter(Boolean)).size !== header.filter(Boolean).length)
    throw new Error('Missing or duplicate headers in: ' + name);
  return body.filter((r) => Array.isArray(r) && r[0]).map((r) =>
    Object.fromEntries(header.map((h, i) => [h, r[i] ?? null])));
}

export function sheetDate(v) {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Google Sheets' date serial epoch is 1899-12-30; preserve date-only precision.
    return new Date(Math.floor(v) * 86400000 - 2209161600000).toISOString().slice(0, 10);
  }
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).slice(0, 10);
  // Ambiguous legacy dates remain literal; never invent a midnight/time zone.
  return String(v);
}

function canonicalOutreachKey(row) {
  const url = row.jobUrl ?? row['Job URL'];
  const company = row.company ?? row.Company;
  const position = row.position ?? row.Position;
  const contact = row.contact ?? row['Contact Name'];
  return jobKey({ url, company, position }) + '|' +
    String(contact || '').trim().toLocaleLowerCase('en-US');
}

function publishedState(data, storedMetrics) {
  const calculatedKeys = Object.keys(calculateMetrics(data));
  return JSON.stringify({
    jobs: data.jobs,
    interviewEvents: data.interviewEvents || [],
    outreachState: data.outreachState || [],
    metrics: Object.fromEntries(calculatedKeys.map((key) => [key, storedMetrics?.[key] ?? null])),
  });
}

export function reconcileJobSearch(current, snapshot) {
  snapshot = normalizeSnapshot(snapshot);
  if (!current || !Array.isArray(current.jobs)) throw new Error('Missing current dashboard jobs');
  const histories = sheetRows(snapshot.history, 'Application History');
  const trackers = sheetRows(snapshot.tracker, 'Job Tracker');
  const interviews = sheetRows(snapshot.interviews, 'Interview Prep');
  const outreach = snapshot.outreach == null ? null : sheetRows(snapshot.outreach, 'Outreach Queue');

  const before = publishedState(current, current.metrics);
  const next = { ...current };
  const byKey = new Map();
  for (const job of current.jobs) {
    const key = jobKey(job);
    const old = byKey.get(key);
    if (!old || (job.submissionConfirmed && !old.submissionConfirmed) ||
        (!old.resumeUrl && job.resumeUrl)) byKey.set(key, job);
  }

  // Index once; repeated tracker.find in the old loop was O(history x tracker).
  const trackerByKey = new Map();
  for (const row of trackers) {
    const key = jobKey({ url: row['Job URL'], company: row.Company, position: row.Position });
    if (trackerByKey.has(key)) throw new Error('Duplicate canonical Job Tracker row: ' + key);
    trackerByKey.set(key, row);
  }

  const historyByKey = new Map();
  for (const row of histories) {
    if (typeof row['Submission Confirmed'] !== 'boolean' ||
        typeof row['In Application Cohort'] !== 'boolean' || !row['Canonical Job Key'])
      throw new Error('Missing submission metadata in Application History: ' + (row['Application ID'] || '(unknown)'));
    const key = row['Canonical Job Key'];
    const expected = jobKey({url:row['Job URL'],company:row.Company,position:row.Position});
    if (key !== expected) throw new Error('Canonical key differs for ' + (row['Application ID'] || '(unknown)'));
    const prior = historyByKey.get(key);
    if (!prior || (row['Submission Confirmed'] && !prior['Submission Confirmed']))
      historyByKey.set(key, row);
    else if (prior['Submission Confirmed'] && row['Submission Confirmed']) {
      // If both are confirmed, preserve the last explicit outcome, not a blank duplicate.
      if (row['Final Outcome'] === 'Rejected' || row['Final Outcome'] === 'Offer')
        historyByKey.set(key, row);
    }
  }

  for (const [key, row] of historyByKey) {
    const tracked = trackerByKey.get(key);
    const existing = byKey.get(key) || {};
    const rejected = row['Final Outcome'] === 'Rejected';
    const offered = row['Final Outcome'] === 'Offer';
    const confirmed = row['Submission Confirmed'];
    let status = rejected || row['Current Stage'] === 'Closed' ||
      row['Current Stage'] === 'Rejected' ? 'Closed' :
      offered ? 'Offer' : tracked?.Status || row['Current Stage'] || existing.status || 'Archived';
    if (confirmed && ['Found','Ready to Submit','Archived','Submission Unverified'].includes(status))
      status = 'Applied';
    if (!confirmed && status === 'Applied') status = 'Submission Unverified';

    byKey.set(key, {
      ...existing,
      canonicalKey: key,
      company: row.Company, position: row.Position, url: row['Job URL'] || '',
      status,
      resumeUrl: tracked?.['Tailored Resume'] || existing.resumeUrl || '',
      firstSeenAt: existing.firstSeenAt || sheetDate(row['First Seen At']),
      appliedAt: sheetDate(row['Applied At']),
      submissionConfirmed: confirmed, inApplicationCohort: row['In Application Cohort'],
      finalOutcome: rejected ? 'Rejected' : row['Final Outcome'] || existing.finalOutcome || '',
      rejectionAt: sheetDate(row['Rejection At']), offerAt: sheetDate(row['Offer At']),
      // Prior published notes/history are preserved; private Sheet notes are NOT copied.
      notes: existing.notes || '',
    });
  }

  for (const [key, row] of trackerByKey) {
    if (historyByKey.has(key)) continue;
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        status: row.Status || existing.status,
        resumeUrl: row['Tailored Resume'] || existing.resumeUrl || '',
      });
    } else if (['Found','Ready to Submit'].includes(row.Status)) {
      byKey.set(key, {
        canonicalKey:key, company:row.Company, position:row.Position, url:row['Job URL'],
        status:row.Status, resumeUrl:row['Tailored Resume'] || '',
        submissionConfirmed:false, inApplicationCohort:false, finalOutcome:'',
      });
    }
  }
  next.jobs = [...byKey.values()];
  next.interviewEvents = interviews.map((row) => ({
    id:row['Interview ID'], company:row.Company, position:row.Position,
    stage:row['Interview Stage'], date:sheetDate(row['Interview Date / Time']),
    interviewer:row['Interviewer Name'],
  }));

  // Outreach is optional for compatibility; when present it is authoritative
  // for touched rows, while unrepresented historical contacts are retained.
  if (outreach) {
    const contacts = new Map();
    for (const entry of current.outreachState || []) contacts.set(canonicalOutreachKey(entry), entry);
    for (const row of outreach) {
      if (!row.Company || !row.Position || !row['Contact Name']) continue;
      const key = canonicalOutreachKey(row);
      const existing = contacts.get(key) || {};
      contacts.set(key, {
        ...existing,
        company:row.Company, position:row.Position, jobUrl:row['Job URL'] || '',
        contact:row['Contact Name'],
        status:row['Outreach Status'] || existing.status || 'New',
        lastResponseAt:sheetDate(row['Last Response At']),
      });
    }
    next.outreachState = [...contacts.values()];
  }

  const computed = calculateMetrics(next);
  next.metrics = { ...next.metrics, ...computed };
  const after = publishedState(next, next.metrics);
  const changed = before !== after;
  if (!changed) return {changed:false, data:current, scope:[]};

  next.updatedAt = new Intl.DateTimeFormat('en-US',{
    timeZone:'America/New_York',dateStyle:'long',
  }).format(new Date(snapshot.readAt));
  next.metrics.auditedAt = new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/New_York',
  }).format(new Date(snapshot.readAt));
  next.sourceSnapshot = {
    readAt:snapshot.readAt,
    sha256:snapshot.sourceHash || current.sourceSnapshot?.sha256 || '',
    historyRecords:histories.length,
    trackerRecords:trackers.length,
    uniqueHistoryRecords:historyByKey.size,
    ...(outreach ? {outreachRecords:outreach.length} : {}),
  };

  const errors = validatePipeline(next);
  if (errors.length) throw new Error(errors.join('\n'));
  return {
    changed:true, data:next,
    scope:[
      ...(JSON.stringify(current.jobs) !== JSON.stringify(next.jobs) ? ['jobs']:[]),
      ...(JSON.stringify(current.interviewEvents) !== JSON.stringify(next.interviewEvents) ? ['interviews']:[]),
      ...(JSON.stringify(current.outreachState) !== JSON.stringify(next.outreachState) ? ['outreach']:[]),
      ...(publishedState({...current, jobs:next.jobs, interviewEvents:next.interviewEvents,
        outreachState:next.outreachState}, current.metrics) !== after ? ['metrics']:[]),
    ],
  };
}

