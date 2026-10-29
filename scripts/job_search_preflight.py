"""Offline pre-resume gate. Usage: python job_search_preflight.py run.json

Reads an exported live snapshot; does not search, generate files, submit,
send messages, or schedule work. Exit 0 authorizes only the returned jobs.
The caller may set requested_count (default five). A no-sponsorship policy is a
pursuit caution, not an automatic hard filter. Actual legal work authorization
remains a mandatory separately evidenced gate.
"""
import datetime as dt
import hashlib
import json
import re
import sys
from urllib.parse import parse_qs, urlsplit

UTC = dt.timezone.utc
GATES = ('role_fit', 'location', 'experience', 'mandatory_requirements',
         'base_salary', 'authorization', 'start_timing', 'application_path')

def normalized(value):
    return re.sub(r'[^a-z0-9]', '', (value or '').lower())

def identity(record):
    raw_url = record.get('url') or ''
    if not raw_url:
        return 'named:' + normalized(record.get('company')) + ':' + normalized(record.get('position'))
    u = urlsplit(str(raw_url))
    path = u.path.rstrip('/').lower()
    query = parse_qs(u.query)
    if 'greenhouse.io' in (u.hostname or '') or 'gh_jid' in query:
        match = re.search(r'/jobs/(\d+)', path)
        key = match.group(1) if match else query.get('gh_jid', [''])[0]
        if key:
            return 'greenhouse:' + key
    if 'myworkdayjobs.com' in (u.hostname or ''):
        match = re.search(r'_([^/]+?)(?:/apply)?$', path)
        if match:
            return (u.hostname or '') + ':' + re.sub(r'-\d+$', '', match.group(1))
    if 'lever.co' in (u.hostname or '') or 'ashbyhq.com' in (u.hostname or ''):
        match = re.search(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}', path)
        if match:
            return (u.hostname or '') + ':' + match.group()
    if u.hostname == 'recruitingbypaycor.com' and query.get('clientId') and query.get('id'):
        return 'paycor:' + query['clientId'][0].lower() + ':' + query['id'][0].lower()
    for field in ('jk', 'jobId', 'jobid', 'requisitionId', 'req'):
        if query.get(field):
            return (u.hostname or '').lower() + path + '?' + field + '=' + query[field][0]
    return (u.hostname or '').lower() + path

def submitted(record):
    return bool(record.get('applied_at') or record.get('submission_confirmed') or
                record.get('status', '').lower() in ('applied', 'rejected', 'interview', 'offer'))

def stamp(value):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamp requires a timezone')
    return parsed.astimezone(UTC)

def check(payload, now=None):
    now = now or dt.datetime.now(UTC)
    if payload.get('process_policy_version') != 2:
        raise ValueError('process_policy_version=2 required; rebuild legacy payload with current selection evidence')
    snapshot = payload['snapshot']
    age = (now - stamp(snapshot['read_at'])).total_seconds()
    if not 0 <= age <= 1800:
        raise ValueError('Live snapshot is stale; reread before authoring')
    run_mode = payload.get('run_mode', 'normal')
    if run_mode not in ('normal', 'replacement'):
        raise ValueError('run_mode must be normal or replacement; unknown modes cannot bypass new-job checks')
    if 'jobs' in snapshot:
        header, *body = snapshot['jobs']
        required = ('Company', 'Position', 'Job URL', 'Submission Confirmed')
        if any(k not in header for k in required):
            raise ValueError('Missing canonical Jobs headers')
        rows = [dict(zip(header, r)) for r in body if r and r[0]]
        if any(not isinstance(r.get('Submission Confirmed'), bool) for r in rows):
            raise ValueError('Jobs submission flags must be native booleans')
        records = [{'company': r.get('Company'), 'position': r.get('Position'),
                    'url': r.get('Job URL'), 'status': r.get('Status', ''),
                    'applied_at': r.get('Applied At'),
                    'submission_confirmed': r['Submission Confirmed']} for r in rows]
    else:
        records = snapshot['tracker'] + snapshot['history']
    candidates = payload['candidates']
    requested_count = payload.get('requested_count', 5)
    if not isinstance(requested_count, int) or isinstance(requested_count, bool) or requested_count < 1:
        raise ValueError('requested_count must be a positive integer')
    if len(candidates) != requested_count:
        raise ValueError('Exactly the user-requested count is required; continue discovery before authoring')
    master = payload['master']
    if not all(master.get(k) for k in ('library_file_id', 'version', 'sha256', 'local_path')):
        raise ValueError('Approved master identity/version/hash/path are required')
    with open(master['local_path'], 'rb') as file:
        if hashlib.sha256(file.read()).hexdigest() != master['sha256']:
            raise ValueError('Master bytes differ from pinned approval')
    result, seen = [], set()
    for c in candidates:
        key = identity(c)
        reasons = []
        if not c.get('company') or not c.get('position') or not c.get('url'):
            reasons.append('Missing job identity')
        if key in seen:
            reasons.append('Duplicate within shortlist')
        seen.add(key)
        exact = [r for r in records if identity(r) == key]
        if re.search(r'\b(?:senior|sr\.?|lead)\b', c.get('position', ''), re.I):
            reasons.append('Senior/Sr/Lead title excluded, including campus graduate bands')
        if payload.get('run_mode', 'normal') == 'normal' and (exact or c.get('retained')):
            reasons.append('Normal runs require new jobs; retained/previously-seen roles do not fill requested slots')
        if any(submitted(r) for r in exact):
            reasons.append('Already submitted: resume generation forbidden')
        if not exact:
            similar = [r for r in records if
                       normalized(r.get('canonical_employer', r.get('company'))) ==
                       normalized(c.get('canonical_employer', c.get('company'))) and
                       normalized(r.get('position')) == normalized(c.get('position'))]
            if similar and not c.get('distinct_requisition_evidence'):
                reasons.append('Possible duplicate: resolve distinct requisition first')
        if not reasons:
            for gate in GATES:
                evidence = c.get('gates', {}).get(gate, {})
                if evidence.get('verdict') != 'pass' or not evidence.get('evidence'):
                    reasons.append('Preflight incomplete: ' + gate)
            app = c.get('gates', {}).get('application_path', {})
            if not app.get('checked_at') or not 0 <= (now-stamp(app['checked_at'])).total_seconds() <= 86400:
                reasons.append('Application evidence missing or stale')
            if payload.get('process_policy_version', 1) >= 2:
                selection = c.get('selection', {})
                for field in ('posting_date_basis', 'posting_date_source', 'start_window',
                              'start_source', 'pursuit_rationale'):
                    if not selection.get(field):
                        reasons.append('Selection evidence missing: ' + field)
                if selection.get('posting_date_basis') not in ('original', 'last_repost', 'unknown'):
                    reasons.append('Posting-date basis must not substitute first-seen date')
                sponsor = selection.get('sponsorship_evidence', {})
                if sponsor.get('level') not in ('role_confirmed', 'company_history', 'not_offered', 'unknown') or not sponsor.get('source'):
                    reasons.append('Sponsorship evidence must distinguish role support, history, denial and unknown')
                mapping = selection.get('requirement_map', [])
                if len(mapping) < 3 or any(not all(m.get(k) for k in ('requirement', 'evidence', 'source', 'limits')) for m in mapping):
                    reasons.append('Map three core requirements to verified evidence and explicit limits')
            # October 15, 2026 user preference: employer sponsorship is a
            # strong pursuit preference, NOT a resume/shortlist hard filter.
            # The separately evidenced authorization gate must evaluate actual
            # permission to work, not merely the employer's stated policy.
            # Preserve the stated policy as context for truthful user review.
        result.append({'key': key, 'company': c.get('company'), 'position': c.get('position'),
                       'eligible_for_resume': not reasons, 'reasons': reasons,
                       'previously_seen': bool(exact),
                       'process_policy_version': payload.get('process_policy_version', 1),
                       'required_font_family': 'Times New Roman',
                       'sponsorship_status': (c.get('sponsorship') or {}).get('status', 'unknown'),
                       'snapshot_sha256': hashlib.sha256(
                           json.dumps(snapshot, sort_keys=True).encode()).hexdigest()})
    return result

if __name__ == '__main__':
    try:
        with open(sys.argv[1]) as file:
            result = check(json.load(file))
        print(json.dumps(result, indent=2))
        sys.exit(0 if all(r['eligible_for_resume'] for r in result) else 2)
    except (ValueError, KeyError, IndexError, OSError) as error:
        print(json.dumps({'blocked': str(error)}))
        sys.exit(2)
