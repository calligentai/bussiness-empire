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
- Pi route repaired (2026-10-21): `ollama/minimax-m2.7:cloud` returned HTTP 402 from the Ollama Free plan. The adapter config now pins `ollama/qwen3.6:latest` with `--provider ollama` on the same loopback endpoint `http://127.0.0.1:11434/v1`. Verified with `/Users/admin/.local/bin/pi --provider ollama --model qwen3.6:latest --no-tools --no-skills --no-extensions --no-context-files -p "Reply exactly: EMPIRE_PI_OK. Do not use tools."` -> exit 0, `EMPIRE_PI_OK`. `qwen3.6:latest` is pulled locally and is Free-plan; `gemma4:31b-cloud` returned 429 and the `tkr` gateway's `deepseek-v4-flash` returned Insufficient Balance, so neither was selected. The Ollama cloud id `qwen3.6:cloud` returns 404. No subscription was upgraded. The operator's own `~/.pi/agent/settings.json` was left untouched; only the Paperclip adapter config overrides the model for the Business Empire Pi agent.
- Corrected 2026-10-24: the live Business Empire Pi agent record (`0dccca7e-...`) has an **empty** `adapterConfig` and `runtimeConfig` (`paperclipai agent get 0dccca7e-... --json`), so it has no stored route at all. The `tkr/gpt-oss:20b` run was a manual CLI check, not an agent route. The `ollama/qwen3.6:latest` pin lives in `scripts/companion_adapters.py` and has **not** been applied to the live record yet; applying it is tracked as a routing decision and re-verified locally on 2026-10-24 (`EMPIRE_PI_OK`, exit 0).
- Normal agent instructions were restored after smoke tests. The temporary Pi diagnostic launcher was removed.
- Six configuration tests pass. Two companion tests observed behavioral Red (missing profiles and missing rejection) before Green. The earlier import/setup failure is not counted as Red.
- Connectivity evidence does not establish autonomous task completion.

Run tests with python3 -m unittest discover -s tests -v. GitHub Actions has a pre-existing startup_failure; its current result must be checked on the PR. Explicit manual review is used; the debug-cycle runner lacks a configured executable review check.
