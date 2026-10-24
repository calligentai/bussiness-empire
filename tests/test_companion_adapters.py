import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
try:
 from companion_adapters import profiles
except ImportError:
 profiles=None

class CompanionTests(unittest.TestCase):
 def build(self):
  self.assertIsNotNone(profiles,'Companion adapter builder is not implemented')
  return profiles(Path('/tmp/empire'),{'defaultProvider':'ollama','defaultModel':'minimax-m2.7:cloud'}, {'providers':{'ollama':{'baseUrl':'http://127.0.0.1:11434/v1','apiKey':'secret-do-not-copy'}}}, {'model':'deepseek-v4-flash','provider':'custom:deepseek-direct','endpoint':'http://127.0.0.1:6022/v1'})
 def test_routes_and_isolation(self):
  a=self.build()
  self.assertEqual(set(a),{'pi','hermes'})
  self.assertEqual(a['pi']['adapterConfig']['model'],'ollama/qwen3.6:latest')
  self.assertEqual(a['hermes']['adapterConfig']['extraArgs'],['--provider','custom:deepseek-direct'])
  self.assertEqual(a['hermes']['adapterConfig']['model'],'deepseek-v4-flash')
  self.assertEqual(a['pi']['routingEvidence']['endpoint'],'http://127.0.0.1:11434/v1')
  self.assertEqual(a['hermes']['routingEvidence']['endpoint'],'http://127.0.0.1:6022/v1')
  self.assertIn('/.local/companions/hermes',a['hermes']['adapterConfig']['env']['HERMES_HOME'])
  self.assertIn('/.local/companions/pi',a['pi']['adapterConfig']['env']['PI_CODING_AGENT_DIR'])
  self.assertNotIn('secret-do-not-copy',str(a))
  for v in a.values(): self.assertEqual(v['runtimeConfig']['heartbeat']['intervalSec'],0)
 def test_missing_route_rejected(self):
  self.assertIsNotNone(profiles,'Companion adapter builder is not implemented')
  with self.assertRaises(ValueError): profiles(Path('/tmp/x'),{}, {}, {})
