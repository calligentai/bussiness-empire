"""Paperclip companion profiles. Credentials remain in private runtime files."""
from pathlib import Path
from urllib.parse import urlsplit


def profiles(root, settings, models, hermes, pi_model='freerouter/nvidia/nemotron-3-ultra-550b-a55b:free', pi_provider='freerouter'):
    """Build Paperclip adapter configs for the Hermes and Pi companions.

    The Hermes route is taken from the operator's live config. The Pi route is
    pinned to the standalone free-router (:8799): the operator's Pi default
    (ollama/minimax-m2.7:cloud) returns HTTP 402 from the Ollama Free plan, and
    the zen/ollama providers in the Pi catalog are dead or local-only.
    """
    root = Path(root).resolve()
    state = root / '.local' / 'companions'
    provider, model = pi_model.split('/', 1)
    if provider != pi_provider:
        raise ValueError('Pi provider prefix must match the pinned provider')
    pi_cfg = (models or {}).get('providers', {}).get(pi_provider, {})
    endpoint = pi_cfg.get('baseUrl')
    hermes_endpoint = hermes.get('endpoint')
    values = [provider, model, endpoint, hermes.get('model'), hermes.get('provider'), hermes_endpoint]
    if not all(isinstance(x, str) and x.strip() for x in values):
        raise ValueError('Explicit provider, model and endpoint required for both agents')
    for value in [endpoint, hermes_endpoint]:
        u = urlsplit(value)
        if u.scheme not in ('http', 'https') or not u.hostname or u.username or u.password or u.query or u.fragment:
            raise ValueError('Endpoint must be credential-free HTTP(S)')
    def entry(kind, cfg, url):
        return {'adapterType': kind, 'adapterConfig': dict(cwd=str(root), timeoutSec=180, instructionsFilePath=str(root / 'paperclip' / 'agents' / 'companion.md'), **cfg), 'runtimeConfig': {'heartbeat': {'enabled': True, 'intervalSec': 0, 'maxConcurrentRuns': 1}}, 'routingEvidence': {'model': cfg['model'], 'endpoint': url}}
    return {
        'pi': entry('pi_local', {'command': str(Path.home() / '.local' / 'bin' / 'pi'), 'model': pi_model, 'env': {'PI_CODING_AGENT_DIR': str(state / 'pi')}, 'extraArgs': ['--provider', pi_provider]}, endpoint),
        'hermes': entry('hermes_local', {'hermesCommand': str(Path.home() / '.local' / 'bin' / 'hermes'), 'provider': 'auto', 'model': hermes['model'], 'extraArgs': ['--provider', hermes['provider']], 'env': {'HERMES_HOME': str(state / 'hermes')}, 'maxTurns': 6, 'quiet': True}, hermes_endpoint),
    }