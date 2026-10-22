#!/usr/bin/env python3
import json,sys,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlsplit
from paperclip_config import workspace_policy

ROOT=Path(__file__).resolve().parents[1]
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:3110'
u=urlsplit(BASE)
if u.scheme!='http' or u.hostname!='127.0.0.1' or u.port!=3110 or u.path not in ('','/'):
    raise SystemExit('Bootstrap permits only the isolated loopback instance on port 3110')
def api(method,path,body=None):
    req=urllib.request.Request(BASE+'/api'+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers={'Content-Type':'application/json','Origin':BASE})
    try:
        with urllib.request.urlopen(req,timeout=45) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(str(e.code)+' '+e.read().decode()[:1200]) from None
def find(items,name): return next((v for v in items if v.get('name')==name),None)

def main():
    health=api('GET','/health')
    assert health.get('commit')=='41c18aa443fe791fa67b27eef28fd7239f5e9d5d','Unexpected server snapshot'
    company=find(api('GET','/companies'),'Business Empire HQ')
    if not company:
        company=api('POST','/companies',{'name':'Business Empire HQ','description':'Portfolio control plane. First venture LAVABEAN-PLATFORM. No automatic merge, production release or paid provider calls.','budgetMonthlyCents':0})
    cid=company['id']
    goals=api('GET',f'/companies/{cid}/goals')
    goal=next((g for g in goals if g.get('title')=='Deliver a verified LavaBean platform from A to Z'),None)
    if not goal:
        goal=api('POST',f'/companies/{cid}/goals',{'title':'Deliver a verified LavaBean platform from A to Z','level':'company','status':'active'})
    existing=api('GET',f'/companies/{cid}/agents')
    profiles=json.loads((ROOT/'.local/paperclip/adapters.json').read_text())
    agents={}
    for key,name,role,title,parent in [('codex','Business Empire Orchestrator','ceo','Orchestrator',None),('opencode','LavaBean Engineer','engineer','Implementation engineer','codex')]:
        agent=find(existing,name)
        if not agent:
            profile=profiles[key]
            config=profile['adapterConfig'].copy()
            config.update(cwd=str(ROOT),command='/Users/admin/.local/bin/codex' if key=='codex' else '/opt/homebrew/bin/opencode',instructionsFilePath=str(ROOT/'paperclip/agents'/('orchestrator.md' if key=='codex' else 'engineer.md')))
            body={'name':name,'role':role,'title':title,'adapterType':profile['adapterType'],'adapterConfig':config,'runtimeConfig':profile['runtimeConfig'],'budgetMonthlyCents':0}
            if parent: body['reportsTo']=agents[parent]['id']
            agent=api('POST',f'/companies/{cid}/agents',body)
        agents[key]=agent
    # The per-issue worktree policy is inert unless the instance enables isolated
    # workspaces; without this flag every issue resolves to the shared project
    # workspace and two harnesses write into one directory.
    api('PATCH','/instance/settings/experimental',{'enableIsolatedWorkspaces':True})
    policy=workspace_policy(worktree_parent_dir=str(ROOT.parent))
    projects=api('GET',f'/companies/{cid}/projects')
    project=find(projects,'LAVABEAN-PLATFORM')
    if not project:
        project=api('POST',f'/companies/{cid}/projects',{'name':'LAVABEAN-PLATFORM','description':'First Business Empire venture. GitHub is the source of truth for code/docs; Paperclip coordinates work and evidence.','status':'in_progress','goalIds':[goal['id']],'leadAgentId':agents['codex']['id'],'workspace':{'name':'bussiness-empire','cwd':str(ROOT),'repoUrl':'https://github.com/calligentai/bussiness-empire','repoRef':'lavabean'},'executionWorkspacePolicy':policy})
    elif project.get('executionWorkspacePolicy')!=policy:
        project=api('PATCH',f'/projects/{project["id"]}',{'executionWorkspacePolicy':policy})
    api('PATCH',f'/companies/{cid}',{'requireBoardApprovalForNewAgents':True,'feedbackDataSharingEnabled':False})
    issues=api('GET',f'/companies/{cid}/issues')
    for task,title,url,owner in [('BE-DOC-001','Centralize project source documents','https://github.com/calligentai/bussiness-empire/pull/1','opencode'),('BE-DEV-001','Establish development workflow and CI','https://github.com/calligentai/bussiness-empire/pull/2','opencode'),('BE-HQ-001','Install and verify Paperclip orchestration and routing','https://github.com/calligentai/bussiness-empire/issues/3','codex')]:
        full=task+': '+title
        if not next((i for i in issues if i.get('title')==full),None):
            api('POST',f'/companies/{cid}/issues',{'title':full,'description':'User-authorized bootstrap task. Evidence and acceptance: '+url+' . Do not mark done before actual verification. No automatic merge or paid requests.','status':'backlog','priority':'high','projectId':project['id'],'goalId':goal['id'],'assigneeAgentId':agents[owner]['id'],'idempotencyKey':'business-empire-bootstrap-'+task})
    result={'companyId':cid,'projectId':project['id'],'goalId':goal['id'],'agents':{k:v['id'] for k,v in agents.items()},'apiUrl':BASE}
    state=ROOT/'.local/paperclip/bootstrap.json'
    state.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
if __name__=='__main__': main()
