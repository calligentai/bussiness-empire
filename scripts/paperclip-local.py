#!/usr/bin/env python3
import json,os,shutil,subprocess,sys,tomllib
from pathlib import Path
from paperclip_config import instance_config,routed_adapters,server_env

ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/'.local/paperclip'
def prepare():
    STATE.mkdir(parents=True,exist_ok=True,mode=0o700)
    os.chmod(STATE,0o700)
    codex=Path.home()/'.codex'
    opencode=Path.home()/'.config/opencode'
    c=tomllib.loads((codex/'config.toml').read_text())
    # OpenCode merges JSON then JSONC. Both existing files are strict JSON on this host.
    o={}
    for name in ['opencode.json','opencode.jsonc']:
        file=opencode/name
        if file.exists():
            value=json.loads(file.read_text())
            o.update({k:v for k,v in value.items() if k!='provider'})
            for key,value in value.get('provider',{}).items(): o.setdefault('provider',{}).setdefault(key,{}).update(value)
    adapters=routed_adapters(c,o,STATE)
    home=STATE/'codex-home'
    home.mkdir(exist_ok=True,mode=0o700)
    shutil.copyfile(codex/'config.toml',home/'config.toml')
    os.chmod(home/'config.toml',0o600)
    source_auth=codex/'auth.json'
    auth=home/'auth.json'
    if source_auth.exists() and not auth.exists(): auth.symlink_to(source_auth)
    for name,config in [('config.json',instance_config(STATE)),('adapters.json',adapters)]:
        path=STATE/name
        path.write_text(json.dumps(config,indent=2)+'\n')
        os.chmod(path,0o600)
    return adapters

def main():
    adapters=prepare()
    action=sys.argv[1] if len(sys.argv)>1 else 'prepare'
    if action=='prepare':
        print(json.dumps({k:v['routingEvidence'] for k,v in adapters.items()},indent=2))
        return
    if action!='start': raise SystemExit('Usage: paperclip-local.py [prepare|start]')
    source=ROOT/'vendor/paperclip'
    env=server_env(STATE,os.environ)
    os.chdir(source)
    os.execvpe('corepack',['corepack','pnpm@9.15.4','dev:server'],env)
if __name__=='__main__': main()
