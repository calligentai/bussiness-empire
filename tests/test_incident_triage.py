"""Contract tests for deterministic, bounded incident triage."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from incident_triage import classify, create_issue, escalation_decision


class IncidentTriageTests(unittest.TestCase):
    def test_classification_is_deterministic_and_preserves_provenance(self):
        incident = {'id': 'evt-17', 'kind': 'test_failure', 'summary': 'unit tests failed', 'source': 'ci', 'url': 'https://ci.example/run/17'}
        first = classify(incident)
        self.assertEqual(first, classify(incident))
        self.assertEqual(first['category'], 'code_regression')
        issue = create_issue(incident, first)
        self.assertEqual(issue['sourceIncidentId'], 'evt-17')
        self.assertEqual(issue['provenance'], {'source': 'ci', 'url': 'https://ci.example/run/17'})

    def test_duplicate_incidents_collapse_to_one_actionable_issue(self):
        incident = {'id': 'evt-18', 'dedupeKey': 'ci:commit-abc:test-suite', 'kind': 'test_failure', 'summary': 'failed', 'source': 'ci'}
        issue = create_issue(incident, classify(incident))
        duplicate = create_issue({**incident, 'id': 'evt-19'}, classify(incident), existing=[issue])
        self.assertEqual(duplicate, issue)
        self.assertEqual(duplicate['status'], 'open')

    def test_escalation_is_bounded_and_risky_actions_need_human_approval(self):
        safe = escalation_decision({'attempts': 0, 'maxAttempts': 2, 'action': 'retry_harness'})
        self.assertEqual(safe, {'allowed': True, 'requiresApproval': False, 'reason': 'within_retry_limit'})
        capped = escalation_decision({'attempts': 2, 'maxAttempts': 2, 'action': 'retry_harness'})
        self.assertFalse(capped['allowed'])
        risky = escalation_decision({'attempts': 0, 'maxAttempts': 2, 'action': 'force_release'})
        self.assertEqual(risky, {'allowed': False, 'requiresApproval': True, 'reason': 'human_approval_required'})

    def test_invalid_inputs_fail_closed(self):
        with self.assertRaises(ValueError): classify({'id': 'x', 'kind': 'unknown'})
        with self.assertRaises(ValueError): escalation_decision({'attempts': -1, 'maxAttempts': 2, 'action': 'retry_harness'})


if __name__ == '__main__':
    unittest.main()
