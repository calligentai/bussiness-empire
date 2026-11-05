#!/usr/bin/env python3
"""Install companions using explicitly inspected Hermes route metadata."""
import argparse,json,os,shutil,urllib.request,urllib.error
from pathlib import Path
from companion_adapters import profiles
ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:3110/api'
def api(method,path,data=None):
    req=urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Content-Type':'application/json','Origin':'http://127.0.0.1:3110'})
    try:
        with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(str(e.code)+' '+e.read().decode()[:800]) from None
def main():
    p=argparse.ArgumentParser()
    for name in ['hermes-home','hermes-model','hermes-provider','hermes-endpoint']:p.add_argument('--'+name,required=True)
    p.add_argument('--approve-hires',action='store_true',help='Use only with explicit user authorization for these two hires')
    args=p.parse_args()
    source=Path(args.hermes_home).expanduser().resolve()
    pi=Path.home()/'.pi/agent'
    settings=json.loads((pi/'settings.json').read_text())
    models=json.loads((pi/'models.json').read_text())
    configs=profiles(ROOT,settings,models,{'model':args.hermes_model,'provider':args.hermes_provider,'endpoint':args.hermes_endpoint})
    state=ROOT/'.local/companions'
    state.mkdir(parents=True,exist_ok=True,mode=0o700);os.chmod(state,0o700)
    for name,origin,files in [('hermes',source,['config.yaml','.env','auth.json']),('pi',pi,['models.json','settings.json','auth.json'])]:
        dest=state/name;dest.mkdir(exist_ok=True,mode=0o700);os.chmod(dest,0o700)
        for file in files:
            original=origin/file
            target=dest/file
            if original.exists() and not target.exists():
                shutil.copyfile(original,target);os.chmod(target,0o600)
    company=next(c for c in api('GET','/companies') if c['name']=='Business Empire HQ')
    cid=company['id']
    agents=api('GET','/companies/'+cid+'/agents')
    chief=next(a for a in agents if a['name']=='Business Empire Orchestrator')
    result={}
    for key,name in [('hermes','Business Empire Hermes'),('pi','Business Empire Pi')]:
        existing=next((a for a in agents if a['name']==name),None)
        cfg=configs[key]
        if existing is None:
            hire=api('POST','/companies/'+cid+'/agent-hires',{'name':name,'role':'engineer','title':key.title()+' companion','reportsTo':chief['id'],'adapterType':cfg['adapterType'],'adapterConfig':cfg['adapterConfig'],'runtimeConfig':cfg['runtimeConfig']})
            existing=hire['agent']
        if args.approve_hires and existing.get('status')=='pending_approval':
            existing=api('POST','/agents/'+existing['id']+'/approve',{})
        result[key]={'id':existing['id'],'routingEvidence':cfg['routingEvidence']}
    target=state/'agents.json';target.write_text(json.dumps(result,indent=2)+'\n');os.chmod(target,0o600)
    print(json.dumps(result))
if __name__=='__main__':main()
