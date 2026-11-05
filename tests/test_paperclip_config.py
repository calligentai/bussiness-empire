import sys
import json
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from paperclip_config import instance_config, routed_adapters

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

    def test_missing_provider_route_fails_closed(self):
        with self.assertRaises(ValueError):
            routed_adapters({'model':'x','model_provider':'missing'}, {'model':'missing/model'},Path('/tmp/empire-test'))

if __name__=='__main__': unittest.main()
