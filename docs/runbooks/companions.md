# Hermes and Pi companions

These agents report to Business Empire Orchestrator. Local CLI installations are reused; credentials and mutable state stay in ignored, mode-0700 directories under this worktree's .local/companions. Credential/config copies are mode 0600. No credentials are committed. Existing copies are not overwritten on rerun.

## Setup

Inspect the active Hermes profile and Pi settings before running. This verified host uses Hermes profile pepperpotts: custom:deepseek-direct / deepseek-v4-flash at http://127.0.0.1:6022/v1. Pi uses ollama/minimax-m2.7:cloud at http://127.0.0.1:11434/v1.

Run from this feature worktree:
```sh
python3 scripts/paperclip-companions.py --hermes-home /Users/admin/.hermes/profiles/pepperpotts --hermes-model deepseek-v4-flash --hermes-provider custom:deepseek-direct --hermes-endpoint http://127.0.0.1:6022/v1 --approve-hires
```

Use --approve-hires only when the user has explicitly authorized these two hires. The company approval policy remains enabled. Existing agents are reused without overwriting their configuration. The script copies local configuration, registers native hermes_local and pi_local adapters and sets no periodic heartbeat. Hermes custom provider is explicitly passed through CLI arguments because this Paperclip version's provider enum does not enumerate custom provider names.

Hermes creates dependency state on first use of a new HERMES_HOME. Its first run returned the marker but Paperclip rejected an initial missing-httpx plugin warning; a second run succeeded after setup. External hindsight memory remains unavailable in this isolated profile; built-in memory works. No memory repair is included.

## Verification, 2026-10-21

- Hermes heartbeat 7d211e9e-fd46-4f8a-8311-f5e620241630 succeeded, exit 0, with EMPIRE_HERMES_OK.
- Pi discovery initially failed; CLI discovery confirmed the configured model, and a diagnostic retry reached the provider. Heartbeat 82cc5d3c-c9e7-47bf-9ce3-de13c450eed9 failed with HTTP 402: minimax-m2.7:cloud is not included in the current Ollama Free plan.
- Pi heartbeat is disabled pending the user's route choice. No subscription was upgraded and no alternative model was silently selected.
- Normal agent instructions were restored after smoke tests. The temporary Pi diagnostic launcher was removed.
- Six configuration tests pass. Two companion tests observed behavioral Red (missing profiles and missing rejection) before Green. The earlier import/setup failure is not counted as Red.
- Connectivity evidence does not establish autonomous task completion.

Run tests with python3 -m unittest discover -s tests -v. GitHub Actions has a pre-existing startup_failure; its current result must be checked on the PR. Explicit manual review is used; the debug-cycle runner lacks a configured executable review check.
