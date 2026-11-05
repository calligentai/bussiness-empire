"""Pure incident triage contracts; callers own persistence and side effects."""

_KNOWN_KINDS = {
    'test_failure': 'code_regression',
    'service_unavailable': 'availability',
    'budget_limit': 'budget_guardrail',
    'security_alert': 'security',
}
_RISKY_ACTIONS = {'force_release', 'force_release_override', 'credential_change', 'production_deploy'}


def classify(incident):
    """Return a stable category and normalized incident identity, failing closed."""
    if not isinstance(incident, dict):
        raise ValueError('incident must be an object')
    incident_id, kind = incident.get('id'), incident.get('kind')
    if not isinstance(incident_id, str) or not incident_id.strip():
        raise ValueError('incident id is required')
    if kind not in _KNOWN_KINDS:
        raise ValueError('unsupported incident kind')
    summary = incident.get('summary', '')
    if not isinstance(summary, str):
        raise ValueError('incident summary must be text')
    return {'incidentId': incident_id, 'category': _KNOWN_KINDS[kind], 'summary': summary.strip()}


def create_issue(incident, classification, existing=()):
    """Create an actionable issue record or return the matching existing record."""
    if not isinstance(incident, dict) or not isinstance(classification, dict):
        raise ValueError('incident and classification objects required')
    dedupe_key = incident.get('dedupeKey') or f"{incident.get('source', 'unknown')}:{classification.get('category')}:{classification.get('summary', '').casefold()}"
    if not isinstance(dedupe_key, str) or not dedupe_key.strip():
        raise ValueError('dedupe key required')
    for issue in existing:
        if issue.get('dedupeKey') == dedupe_key:
            return issue
    return {
        'title': classification['summary'] or f"Incident {classification['incidentId']}",
        'status': 'open',
        'category': classification['category'],
        'sourceIncidentId': classification['incidentId'],
        'dedupeKey': dedupe_key,
        'provenance': {key: incident[key] for key in ('source', 'url') if isinstance(incident.get(key), str)},
    }


def escalation_decision(request):
    """Bound harness retries; risky actions are denied pending human approval."""
    if not isinstance(request, dict):
        raise ValueError('request must be an object')
    attempts, maximum, action = request.get('attempts'), request.get('maxAttempts'), request.get('action')
    if type(attempts) is not int or type(maximum) is not int or attempts < 0 or maximum < 0:
        raise ValueError('attempt counts must be non-negative integers')
    if not isinstance(action, str) or not action:
        raise ValueError('action required')
    if action in _RISKY_ACTIONS:
        return {'allowed': False, 'requiresApproval': True, 'reason': 'human_approval_required'}
    if action != 'retry_harness':
        raise ValueError('unsupported escalation action')
    if attempts >= maximum:
        return {'allowed': False, 'requiresApproval': False, 'reason': 'retry_limit_reached'}
    return {'allowed': True, 'requiresApproval': False, 'reason': 'within_retry_limit'}
