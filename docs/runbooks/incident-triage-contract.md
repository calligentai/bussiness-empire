# Incident-to-issue triage contract (R8.1)

`scripts/incident_triage.py` defines a deterministic, side-effect-free contract. Integrations may use these values to propose issue records; this module does not create or mutate live incidents, issues, deployments, or harness jobs.

## Classification

Supported incident kinds map as follows: `test_failure` → `code_regression`, `service_unavailable` → `availability`, `budget_limit` → `budget_guardrail`, and `security_alert` → `security`. Every incident needs a non-empty stable ID. Unsupported kinds or malformed values fail closed. Classification returns its incident ID, category, and trimmed summary.

## Issue creation and duplicate suppression

An issue proposal carries its source incident ID and source/url provenance. An explicit `dedupeKey` is preferred; otherwise the contract derives one from source, category, and normalized summary. A matching existing key returns the existing issue unchanged, so repeated evidence does not create additional work. Callers must enforce uniqueness atomically when persisting proposals.

## Bounded escalation and approval

Harness retries are allowed only while `attempts < maxAttempts`; both counts must be non-negative integers. Reaching the cap denies another retry. Unknown actions fail closed. Force release, credential changes, and production deployment actions are denied and explicitly marked as requiring human approval. Approval must be obtained by an external human-controlled workflow; this contract cannot grant it.

This contract has no provider/model/endpoint routing behavior, credentials, paid API calls, force-release operation, production mutation, or merge/deploy behavior. Changes to those boundaries require separate reviewed work.
