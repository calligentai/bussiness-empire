#!/usr/bin/env python3
"""Install the control bridge and update only the named agent's MCP config path."""
import argparse
import json
from pathlib import Path
import shutil
import urllib.request

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--agent-id", required=True)
    parser.add_argument("--mcp-module", required=True, type=Path)
    parser.add_argument("--tsx-loader", required=True, type=Path)
    parser.add_argument("--node", default=shutil.which("node"))
    options = parser.parse_args()
    for file in (options.mcp_module, options.tsx_loader):
        if not file.is_file():
            raise SystemExit("Missing runtime dependency: " + str(file))
    if not options.node:
        raise SystemExit("Node.js is required")
    source = Path(__file__).resolve().with_name("control-mcp.mjs")
    installed = Path.home() / ".local/share/paperclip-control-tools" / options.agent_id
    installed.mkdir(parents=True, exist_ok=True)
    installed.chmod(0o700)
    shutil.copy2(source, installed / source.name)
    config = {"$schema":"https://opencode.ai/config.json", "mcp":{"paperclip-control":{
        "type":"local", "enabled":True,
        "command":[options.node,"--import",str(options.tsx_loader),str(installed/source.name)],
        "environment":{"PAPERCLIP_MCP_MODULE":str(options.mcp_module)}}}}
    config_path = installed / "opencode-control.json"
    config_path.write_text(json.dumps(config, indent=2)+"\n")
    # The server's agent update route preserves redacted environment placeholders.
    url = options.api_url.rstrip("/") + "/api/agents/" + options.agent_id
    with urllib.request.urlopen(url, timeout=15) as response:
        agent = json.load(response)
    adapter = agent["adapterConfig"]
    adapter["env"] = {**adapter.get("env", {}), "OPENCODE_CONFIG":str(config_path)}
    request = urllib.request.Request(url, data=json.dumps({"adapterConfig":adapter}).encode(),
        headers={"Content-Type":"application/json"}, method="PATCH")
    with urllib.request.urlopen(request, timeout=15) as response:
        saved = json.load(response)
    if "OPENCODE_CONFIG" not in saved["adapterConfig"].get("env", {}):
        raise SystemExit("Agent config verification failed")
    print("Installed control MCP for agent " + options.agent_id)
    print("Generated config: " + str(config_path))

if __name__ == "__main__":
    main()
