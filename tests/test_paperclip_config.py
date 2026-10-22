import sys
import json
import shutil
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from paperclip_config import instance_config, routed_adapters, workspace_policy, agent_jwt_secret, server_env

class ConfigurationTests(unittest.TestCase):
    def test_instance_is_loopback_isolated_and_has_no_telemetry(self):
        c=instance_config(Path('/tmp/empire-test'))
        self.assertEqual(c.get('server',{}).get('host'),'127.0.0.1')
        self.assertEqual(c['server']['port'],3110)
        self.assertFalse(c['telemetry']['enabled'])
        self.assertEqual(c['database']['embeddedPostgresPort'],54339)
        self.assertTrue(c['database']['embeddedPostgresDataDir'].startswith(str(Path('/tmp/empire-test').resolve())+'/'))
    def test_adapters_preserve_routes_and_never_store_credentials(self):
        codex={'model':'existing-model','model_provider':'existing-provider','model_providers':{'existing-provider':{'base_url':'http://127.0.0.1:6000/v1'}},'api_key':'do-not-copy'}
        opencode={'model':'existing-route/existing-model','provider':{'existing-route':{'options':{'baseURL':'http://127.0.0.1:8789/v1','apiKey':'do-not-copy'}}}}
        a=routed_adapters(codex,opencode,Path('/tmp/empire-test'))
        self.assertEqual(a.get('codex',{}).get('adapterType'),'codex_local')
        self.assertEqual(a['codex']['adapterConfig']['model'],'existing-model')
        self.assertEqual(a['opencode']['adapterConfig']['model'],'existing-route/existing-model')
        self.assertNotIn('do-not-copy',str(a))
        self.assertEqual(a['codex']['adapterConfig']['env']['CODEX_HOME'],str(Path('/tmp/empire-test/codex-home').resolve()))
        self.assertFalse(a['codex']['runtimeConfig']['heartbeat']['enabled'])
    def test_opencode_gateway_pin_keeps_provider_model_and_endpoint(self):
        c={'model':'existing-model','model_provider':'tkr','model_providers':{'tkr':{'base_url':'http://127.0.0.1:6000/v1'}}}
        o={'model':'opencode-go/deepseek-v4-pro','provider':{'opencode-go':{'options':{'baseURL':'http://127.0.0.1:8789/v1'}}}}
        a=routed_adapters(c,o,Path('/tmp/empire-test'))['opencode']
        fragment=json.loads(a['adapterConfig']['env'].get('OPENCODE_CONFIG_CONTENT','{}'))
        self.assertEqual(fragment.get('provider',{}).get('opencode-go',{}).get('models',{}).get('deepseek-v4-pro',{}).get('id'),'opencode-go:deepseek-v4-pro')
        self.assertEqual(a['adapterConfig']['model'],'opencode-go/deepseek-v4-pro')
        self.assertEqual(a['routingEvidence']['endpoint'],'http://127.0.0.1:8789/v1')

    def test_workspace_policy_gives_every_issue_its_own_git_worktree(self):
        p=workspace_policy()
        self.assertTrue(p['enabled'])
        self.assertEqual(p['defaultMode'],'isolated_workspace')
        self.assertTrue(p['allowIssueOverride'])
        self.assertEqual(p['workspaceStrategy']['type'],'git_worktree')
        self.assertEqual(p['workspaceStrategy']['baseRef'],'lavabean')
        self.assertEqual(p['workspaceStrategy']['branchTemplate'],'feature/{{issue.identifier}}-{{slug}}')
    def test_missing_provider_route_fails_closed(self):
        with self.assertRaises(ValueError):
            routed_adapters({'model':'x','model_provider':'missing'}, {'model':'missing/model'},Path('/tmp/empire-test'))
    def test_instance_signing_secret_is_persistent_private_and_never_printed(self):
        root=Path('/tmp/empire-secret-test')
        shutil.rmtree(root,ignore_errors=True)
        first=agent_jwt_secret(root)
        second=agent_jwt_secret(root)
        self.assertEqual(first,second)
        self.assertGreaterEqual(len(first),32)
        self.assertEqual((root/'agent-jwt-secret').stat().st_mode & 0o777,0o600)
        self.assertNotIn(first,json.dumps(instance_config(root)))
    def test_server_env_carries_the_signing_secret_the_server_needs_for_run_credentials(self):
        root=Path('/tmp/empire-env-test')
        shutil.rmtree(root,ignore_errors=True)
        env=server_env(root,{'DATABASE_URL':'postgres://elsewhere/db','PATH':'/bin'})
        self.assertNotIn('DATABASE_URL',env)
        self.assertEqual(env['PAPERCLIP_AGENT_JWT_SECRET'],agent_jwt_secret(root))
        self.assertEqual(env['PORT'],'3110')
        self.assertEqual(env['PAPERCLIP_INSTANCE_ID'],'business-empire')

if __name__=='__main__': unittest.main()
