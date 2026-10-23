# ADR-008: AI provider routing order

## Status

proposed

## Date

2026-10-23

## Deciders

Business Empire Pi, Business Empire Orchestrator, Company owner (human)

## Context

The plan fixes a preference order: first available free official APIs; then
existing subscription routes only through officially permitted interfaces; then
existing OpenAI Platform credits under hard budget limits. It forbids mandatory
local inference, a Google billing account, and OpenRouter/Kilo as providers, and
allows OpenCode Go only in its officially supported harness mode, not as an
assumed generic API (plan §1). Ollama Cloud, Meta and DeepSeek are to be tested
on actual endpoint access rather than assumed.

## Decision

Provider selection follows that order per capability, not per vendor. Each flow
declares the capability it needs and the routing layer picks the first available
route at that tier. Paid calls require explicit approval and a hard cap. A flow
that cannot be served at tier one degrades or defers; it does not silently fall
through to a paid provider.

## Consequences

- The commerce and booking paths never depend on AI availability (see ADR-001).
- Provider tests must record endpoint, model, cost and failure behaviour without
  exposing secrets.
- A provider disappearing changes routing configuration, not application code.
- "Assumed generic API" is not an acceptable basis: a route is usable only when
  its actual endpoint access has been tested.

## Validation

Not yet validated for all routes. Partially evidenced by the companion routing
affecting agent delivery, but per-provider capability is still open (ASM-08).
The test is INT-11: route one request per approved provider and record endpoint,
model and cost, then confirm refusal on a paid route without approval.

## References

- plan §1 (AI preference), §2 (AI gateway row), §7 billing gate
- `../03-integration-register.md` INT-11, INT-13
- `../05-dependency-register.md` DEP-10
- `../06-assumption-register.md` ASM-08
