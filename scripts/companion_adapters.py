"""Paperclip companion profiles. Credentials remain in private runtime files."""
from pathlib import Path
from urllib.parse import urlsplit

def profiles(root, settings, models, hermes):
    root=Path(root).resolve()
    state=root/'.local/companions'
    provider=settings.get('defaultProvider')
    model=settings.get('defaultModel')
    endpoint=models.get('providers',{}).get(provider,{}).get('baseUrl')
    values=[provider,model,endpoint,hermes.get('model'),hermes.get('provider'),hermes.get('endpoint')]
    if not all(isinstance(x,str) and x.strip() for x in values):
        raise ValueError('Explicit provider, model and endpoint required for both agents')
    for value in [endpoint,hermes['endpoint']]:
        u=urlsplit(value)
        if u.scheme not in ('http','https') or not u.hostname or u.username or u.password or u.query or u.fragment:
            raise ValueError('Endpoint must be credential-free HTTP(S)')
    def entry(kind,cfg,url):
        return {'adapterType':kind,'adapterConfig':dict(cwd=str(root),timeoutSec=180,instructionsFilePath=str(root/'paperclip/agents/companion.md'),**cfg),'runtimeConfig':{'heartbeat':{'enabled':True,'intervalSec':0,'maxConcurrentRuns':1}},'routingEvidence':{'model':cfg['model'],'endpoint':url}}
    return {
        'pi':entry('pi_local',{'command':str(Path.home()/'.local/bin/pi'),'model':provider+'/'+model,'env':{'PI_CODING_AGENT_DIR':str(state/'pi')}},endpoint),
        'hermes':entry('hermes_local',{'hermesCommand':str(Path.home()/'.local/bin/hermes'),'provider':'auto','model':hermes['model'],'extraArgs':['--provider',hermes['provider']],'env':{'HERMES_HOME':str(state/'hermes')},'maxTurns':6,'quiet':True},hermes['endpoint'])
    }
