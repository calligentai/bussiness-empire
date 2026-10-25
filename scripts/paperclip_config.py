from datetime import datetime, timezone
import json
import os
import secrets
from pathlib import Path
from urllib.parse import urlsplit

def agent_jwt_secret(root):
    """Persistent instance signing secret for run JWTs and GitHub broker tokens.

    The server refuses to mint agent run credentials or the runtime-tools
    broker token without it, so every run loses the managed GitHub identity
    and the git/gh launchers report capability_missing.
    """
    path=Path(root).resolve()/'agent-jwt-secret'
    if path.exists():
        value=path.read_text().strip()
        if value: return value
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    value=secrets.token_urlsafe(32)
    path.write_text(value+'\n')
    os.chmod(path,0o600)
    return value

def server_env(root, base=None):
    root=Path(root).resolve()
    env=dict(base if base is not None else os.environ)
    env.pop('DATABASE_URL',None)
    env.update(PAPERCLIP_HOME=str(root),PAPERCLIP_CONFIG=str(root/'config.json'),PAPERCLIP_INSTANCE_ID='business-empire',PORT='3110',HOST='127.0.0.1',PAPERCLIP_MIGRATION_AUTO_APPLY='true',PAPERCLIP_MIGRATION_PROMPT='never',PAPERCLIP_UI_DEV_MIDDLEWARE='true')
    env['PAPERCLIP_AGENT_JWT_SECRET']=agent_jwt_secret(root)
    return env

def instance_config(root, port=3110):
    root=root.resolve()
    return {
        '$meta':{'version':1,'updatedAt':datetime.now(timezone.utc).isoformat(),'source':'configure'},
        'database':{'mode':'embedded-postgres','embeddedPostgresDataDir':str(root/'db'),'embeddedPostgresPort':54339,'backup':{'enabled':True,'intervalMinutes':60,'retentionDays':7,'dir':str(root/'backups')}},
        'logging':{'mode':'file','logDir':str(root/'logs')},
        'server':{'deploymentMode':'local_trusted','exposure':'private','host':'127.0.0.1','port':port,'serveUi':True},
        'telemetry':{'enabled':False},
        'updates':{'checkEnabled':False},
        'storage':{'provider':'local_disk','localDisk':{'baseDir':str(root/'storage')}},
        'secrets':{'provider':'local_encrypted','localEncrypted':{'keyFilePath':str(root/'secrets/master.key')}}
    }

def workspace_policy(base_ref='lavabean', worktree_parent_dir=None):
    """One git worktree per issue, based on the integration branch.

    The plan requires one feature branch and one isolated worktree per issue.
    Without this policy every issue resolves to the shared project workspace,
    so two concurrent harnesses write into the same directory.
    """
    strategy={'type':'git_worktree','baseRef':base_ref,'branchTemplate':'feature/{{issue.identifier}}-{{slug}}'}
    if worktree_parent_dir: strategy['worktreeParentDir']=str(worktree_parent_dir)
    return {
        'enabled':True,
        'defaultMode':'isolated_workspace',
        'allowIssueOverride':True,
        'sharedWorkspaceConcurrency':'serialize',
        'workspaceStrategy':strategy,
    }

def routed_adapters(codex, opencode, root):
    model=codex.get('model')
    provider=codex.get('model_provider')
    route=codex.get('model_providers',{}).get(provider,{}).get('base_url')
    if not route and provider=='openai':
        # Codex overrides its built-in openai provider with the top-level
        # ``openai_base_url`` key, not a [model_providers.openai] table.
        route=codex.get('openai_base_url')
    other_model=opencode.get('model')
    other_provider=other_model.split('/',1)[0] if isinstance(other_model,str) else None
    other_route=opencode.get('provider',{}).get(other_provider,{}).get('options',{}).get('baseURL')
    if not all(isinstance(x,str) and x for x in [model,route,other_model,other_route]):
        raise ValueError('Existing Codex and OpenCode provider/model routes must both be explicit')
    for endpoint in [route,other_route]:
        u=urlsplit(endpoint)
        if u.scheme not in ('http','https') or not u.hostname or u.username or u.password or u.query:
            raise ValueError('Routing endpoint must not contain credentials or query parameters')
    def entry(adapter, chosen, env, endpoint):
        return {'adapterType':adapter,'adapterConfig':{'model':chosen,'env':env,'timeoutSec':1800},'runtimeConfig':{'heartbeat':{'enabled':False,'wakeOnDemand':True,'wakeOnAssignment':False,'maxConcurrentRuns':1}},'routingEvidence':{'endpoint':endpoint,'model':chosen}}
    opencode_env={}
    if other_provider=='opencode-go' and other_route.rstrip('/')=='http://127.0.0.1:8789/v1':
        key=other_model.split('/',1)[1]
        original=opencode.get('provider',{}).get(other_provider,{}).get('models',{}).get(key,{}).get('id',key)
        qualified=original if ':' in original else other_provider+':'+original
        opencode_env['OPENCODE_CONFIG_CONTENT']=json.dumps({'model':other_model,'provider':{other_provider:{'options':{'baseURL':other_route},'models':{key:{'id':qualified}}}}},separators=(',',':'))
    return {
        'codex':entry('codex_local',model,{'CODEX_HOME':str(root.resolve()/'codex-home')},route),
        'opencode':entry('opencode_local',other_model,opencode_env,other_route)
    }
