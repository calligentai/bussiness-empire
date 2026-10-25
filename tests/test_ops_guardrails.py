import contextlib
import datetime as dt
import importlib.util
import io
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
OPS = ROOT / "scripts" / "ops"

def load_module(filename):
    spec = importlib.util.spec_from_file_location(filename.replace("-", "_"), OPS / f"{filename}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

class OperationalGuardTests(unittest.TestCase):
    def test_preflight_holds_projectless_open_issue(self):
        preflight = load_module("issue-preflight")
        preflight.DRY_RUN = True
        preflight.load_ledger = lambda: {}
        preflight.api = lambda method, path, payload=None: [
            {"id": "synthetic-1", "identifier": "TEST-1", "title": "A code task",
             "status": "todo", "projectId": None}
        ]
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(preflight.main(), 0)
        self.assertIn("TEST-1: held", output.getvalue())
        self.assertIn("missing project/worktree binding", output.getvalue())

    def test_quota_guard_counts_recent_unbound_runs(self):
        quota = load_module("quota-guard")
        now = dt.datetime.now(dt.timezone.utc)
        since = now - dt.timedelta(hours=5)
        quota.api = lambda method, path, payload=None, timeout=40: [
            {"startedAt": now.isoformat(),
             "usageJson": {"billingType": "subscription_included", "inputTokens": 12345}}
        ]
        self.assertEqual(quota.subscription_tokens(since), (12345, 1))

if __name__ == "__main__":
    unittest.main()
