import json
import os
from pathlib import Path
import selectors
import subprocess
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = Path(__file__).resolve().parent
CONFIG_PATH = Path(os.environ.get("PAPERCLIP_CONTROL_CONFIG", str(HERE / "opencode-control.json")))
CONFIG = json.loads(CONFIG_PATH.read_text())["mcp"]["paperclip-control"]
AGENT = "38f3ba36-837c-49fa-9a47-56b840ba49a6"
COMPANY = "857eb467-866b-45a1-a84f-92308790b2e9"
RUN = "00000000-0000-4000-8000-000000000001"

class ControlMcpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.calls = []
        class Api(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def handle_request(self):
                size = int(self.headers.get("Content-Length", "0"))
                body = json.loads(self.rfile.read(size)) if size else None
                cls.calls.append((self.command, self.path, dict(self.headers), body))
                code = 403 if "denied" in self.path else 200
                data = {"error":"Not authorized"} if code == 403 else {"ok":True}
                raw = json.dumps(data).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
            do_GET = handle_request
            do_POST = handle_request
        cls.http = ThreadingHTTPServer(("127.0.0.1", 0), Api)
        threading.Thread(target=cls.http.serve_forever, daemon=True).start()
        env = dict(os.environ, **CONFIG["environment"],
            PAPERCLIP_API_URL="http://127.0.0.1:%d" % cls.http.server_port,
            PAPERCLIP_API_KEY="test-only-not-a-real-key", PAPERCLIP_COMPANY_ID=COMPANY,
            PAPERCLIP_AGENT_ID=AGENT, PAPERCLIP_RUN_ID=RUN)
        cls.process = subprocess.Popen(CONFIG["command"], stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)
        cls.sequence = 0
        cls.rpc("initialize", {"protocolVersion":"2024-11-05", "capabilities":{},
            "clientInfo":{"name":"test","version":"1"}})
        cls.process.stdin.write(json.dumps({"jsonrpc":"2.0","method":"notifications/initialized"})+"\n")
        cls.process.stdin.flush()

    @classmethod
    def rpc(cls, method, params):
        cls.sequence += 1
        cls.process.stdin.write(json.dumps({"jsonrpc":"2.0","id":cls.sequence,
            "method":method,"params":params})+"\n")
        cls.process.stdin.flush()
        selector = selectors.DefaultSelector()
        try:
            selector.register(cls.process.stdout, selectors.EVENT_READ)
            if not selector.select(10):
                raise RuntimeError("MCP response timeout")
            line = cls.process.stdout.readline()
            if not line:
                raise RuntimeError(cls.process.stderr.read()[:1000])
            return json.loads(line)
        finally:
            selector.close()

    @classmethod
    def tearDownClass(cls):
        cls.process.terminate()
        cls.process.wait(timeout=5)
        for stream in (cls.process.stdin, cls.process.stdout, cls.process.stderr):
            stream.close()
        cls.http.shutdown()
        cls.http.server_close()

    def setUp(self):
        self.calls.clear()

    def call(self, name, arguments):
        return self.rpc("tools/call", {"name":name, "arguments":arguments})

    def test_required_tools_are_exposed(self):
        names = {t["name"] for t in self.rpc("tools/list", {})["result"]["tools"]}
        self.assertTrue({"paperclipGetIssue","paperclipReadRunLog",
            "paperclipResolveIssueRecovery"}.issubset(names))
        self.assertNotIn("paperclipApprovalDecision", names)

    def test_issue_uses_authenticated_api(self):
        result = self.call("paperclipGetIssue", {"issueId":RUN})
        self.assertFalse(result["result"].get("isError", False))
        self.assertEqual(self.calls[0][1], "/api/issues/"+RUN)
        self.assertEqual(self.calls[0][2]["Authorization"], "Bearer test-only-not-a-real-key")

    def test_run_log_is_bounded(self):
        self.call("paperclipReadRunLog", {"runId":RUN, "offset":10, "limitBytes":512})
        self.assertEqual(self.calls[0][1], "/api/heartbeat-runs/"+RUN+"/log?offset=10&limitBytes=512")

    def test_resolution_retains_run_audit_and_action_identity(self):
        self.call("paperclipResolveIssueRecovery", {"issueId":RUN,"actionId":RUN,
            "outcome":"blocked","sourceIssueStatus":"blocked",
            "resolutionNote":"Test fixture evidence; no actual work changed"})
        method, uri, headers, body = self.calls[0]
        self.assertEqual(method, "POST")
        self.assertEqual(headers["X-Paperclip-Run-Id"], RUN)
        self.assertEqual(body["actionId"], RUN)
        self.assertTrue(uri.endswith("/recovery-actions/resolve"))

    def test_server_denial_is_not_replaced_with_success(self):
        result = self.call("paperclipGetIssue", {"issueId":"denied"})
        self.assertTrue(result["result"]["isError"])
        self.assertIn("403", result["result"]["content"][0]["text"])

    def test_human_only_outcome_never_reaches_api(self):
        result = self.call("paperclipResolveIssueRecovery", {"issueId":RUN,"actionId":RUN,
            "outcome":"false_positive","sourceIssueStatus":"in_review",
            "resolutionNote":"This must be rejected before any API mutation"})
        self.assertTrue("error" in result or result.get("result", {}).get("isError"))
        self.assertEqual(self.calls, [])

if __name__ == "__main__":
    unittest.main()
