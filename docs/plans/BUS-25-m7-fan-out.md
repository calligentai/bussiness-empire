# BUS-25 / M7 — fan-out and shared media contract

Milestone M7 is executed as four parallel child issues, one per R7.x, each on its own
feature branch and isolated worktree. This document is the shared reference the children
code against; it is the only place the media contract is defined.

## Why a written contract first

The four R7.x items touch one product surface (generated media + scored creative), but they
run in separate worktrees that are never merged automatically. A single canonical type
surface, copied verbatim, keeps the branches reconcilable without a shared mutable file.
Rule for every child: create `types/media.ts` from this document only if it is absent in
your worktree, byte for byte. Never edit it in a child branch; changes go back through
BUS-25.

## Canonical contract — `types/media.ts`

```ts
export type MediaKind = "image" | "video";

/** Source of an asset: a provider, an upload, or a prototype export. */
export interface AssetRef {
  id: string;
  kind: MediaKind;
  /** Provider-issued or content-addressed locator. Never a credential or signed URL. */
  locator: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export type ConsentBasis = "owner" | "licensed" | "written" | "none";

/** Recorded permission to depict a person, brand or trademark. */
export interface ConsentRecord {
  subject: string;
  basis: ConsentBasis;
  /** Contract, release or licence reference. Required unless basis is "none". */
  reference: string;
  recordedAt: string;
}

/** Where an asset came from and what it cost. Mandatory on every generated asset. */
export interface Provenance {
  providerId: string;
  modelId: string;
  generatedAt: string;
  /** Charged cost in USD cents. 0 for free options. */
  costCents: number;
  /** Null only when no person or brand is depicted. */
  consent: ConsentRecord | null;
  sourceAssetRefs: AssetRef[];
  promptHash: string;
}

export interface MediaAsset {
  ref: AssetRef;
  provenance: Provenance;
}

export interface MediaRequest {
  kind: MediaKind;
  prompt: string;
  seed?: number;
  sourceAssetRefs?: AssetRef[];
  aspectRatio?: string;
  /** Hard ceiling for this request in USD cents. 0 means free options only. */
  maxCostCents: number;
  /** True when the output depicts a person or a brand mark. */
  depictsPersonOrBrand: boolean;
}

export interface ProviderContext {
  /** Company ceiling for one run, USD cents. */
  budgetCapCents: number;
  /** Injected so tests never reach the network. */
  transport: MediaTransport;
  now: () => string;
}

/** Opaque network port. Implementations live in tests and in the real provider only. */
export interface MediaTransport {
  call(input: { url: string; method: "POST" | "GET"; body?: unknown }): Promise<unknown>;
}

export interface MediaProvider {
  id: string;
  supports(kind: MediaKind): boolean;
  /** Must return a number; must throw MediaBudgetError when the request exceeds the cap. */
  estimateCostCents(request: MediaRequest): number;
  generate(request: MediaRequest, ctx: ProviderContext): Promise<MediaAsset>;
}
```

Typed failures every child shares (defined once, in `server/media/errors.ts`, owned by R7.1):

- `MediaProviderNotFoundError` — unknown `providerId` or unsupported `kind`.
- `MediaProvenanceError` — an asset was produced without complete provenance, or with a
  missing consent record while `depictsPersonOrBrand` is true.
- `MediaBudgetError` — estimated cost exceeds `maxCostCents` or the company cap, or the
  provider is paid while paid spend is not approved.
- `MediaDisabledError` — capability switched off by policy (video before budget approval,
  provider without credentials).

## Work split

| Child | Scope | Owned paths |
| --- | --- | --- |
| R7.1 | One provider-independent media interface; registry; provenance and consent enforcement; inventory of the Pixshop / Product Mockup / Co-Creator / Omni-Veo prototypes | `types/media.ts`, `server/media/registry.ts`, `server/media/errors.ts`, `server/media/provenance.ts`, `docs/media/prototypes-inventory.md` |
| R7.2 | OpenAI image provider inside credits, free options first; budget policy; video gated on approved budget and a reachable endpoint | `server/media/providers/openai-image.ts`, `server/media/budget.ts`, `docs/media/budget-policy.md` |
| R7.3 | Video Analyzer, visual/SEO fact extraction, JEV structured scoring after multimodal analysis | `types/jev.ts`, `server/analysis/*`, `server/jev/*`, `docs/jev/scoring-rubric.md` |
| R7.4 | Buyer-persona trial harness comparing AI judgement with watch-time, scroll-stop, CTR and conversions | `types/persona.ts`, `server/persona/*`, `docs/persona/measurement-contract.md` |

R7.2 and R7.3 depend on the contract above, not on R7.1's branch. They do not hard-block:
each creates the contract file verbatim if missing and reports that in its PR.

R7.4 cannot complete: it needs real traffic measurement. It ships the harness, proves it on
fixtures, and then blocks on a named unblock owner (board: provide an analytics export).

## Non-negotiables carried into every child

- RED test first, then the smallest implementation that turns it green; focused
  `pnpm vitest run <path>` before hand-off, not the whole workspace.
- No network in tests. Every provider or analyzer takes an injected transport.
- No paid media generation, no video spend, no deploy, no merge. Budget approval is a
  separate human decision.
- No invented provider pricing, no invented product claims. A fact without a cited
  evidence span is dropped, not guessed.
- Simulated persona output is always labelled simulated and is never aggregated with real
  measurement.
- Never write secrets into code, tests, fixtures, logs or issue comments.

## Reconciliation

Each child finishes with: branch pushed, PR opened against `lavabean`, evidence (test
output, file list) linked on its issue. BUS-25 merges nothing and reviews nothing itself.
BUS-25 closes on the written contract/spike record below, not on four merged PRs.

## Re-baseline 2026-10-24 — contract/spike only

Board direction on BUS-25 (2026-10-24): M7 is reduced to contract and spike work at low
priority until M3 ships a working single-tenant purchase. No milestone completion claims,
no UI scaffolding, no media generation spend. Only files present in this repository count
as progress, so this section lists them by path and commit.

### Artifacts in the repo

| Artifact | Path | Commit |
| --- | --- | --- |
| Fan-out + canonical media contract | `docs/plans/BUS-25-m7-fan-out.md` | `54c0387` |
| Provider-independent media types | `types/media.ts` | this branch |
| Typed media errors | `server/media/errors.ts` | this branch |
| Budget/env gate (image + video) | `server/media/budget.ts` | this branch |
| OpenAI image provider spike | `server/media/providers/openai-image.ts` | this branch |
| Media test suite (12 tests) | `tests/media/budget.test.ts`, `tests/media/openai-image.test.ts` | this branch |
| Media budget policy + pricing citations | `docs/media/budget-policy.md` | this branch |
| Persona trial harness + report labelling | `types/persona.ts`, `server/persona/harness.ts`, `server/persona/report.ts`, `server/persona/labels.ts`, `server/persona/errors.ts` | `a7284e1` |
| Persona tests (12 tests) | `tests/persona/harness.test.ts`, `tests/persona/report.test.ts` | `a7284e1` |
| Measurement contract + unblock owner | `docs/persona/measurement-contract.md` | `a7284e1` |

The R7.3 spike (video analyzer, cited facts, JEV scoring, `docs/jev/scoring-rubric.md`)
lives on branch `feature/BUS-32-r7-3-video-analyzer-jev-scoring` at commit `563a601`. It is
not merged into this branch and is not claimed here.

### What this branch does not claim

- M7 is not a started product feature. No Nuxt page, route, component or story was added
  for content studio, media or personas.
- No provider request has ever been executed from this repo. No image or video was
  generated and no credits were spent; every provider and analyzer takes an injected
  transport and the suites run offline.
- No video endpoint, video budget or image budget has been approved.
  `MEDIA_BUDGET_CENTS` and `MEDIA_VIDEO_BUDGET_CENTS` are unset by design, so both paid
  paths refuse.
- No persona output is presented as viewer behaviour. Harness output on fixture data is
  labelled `SIMULATED - NOT PROVEN VIEWER BEHAVIOUR`, and no measurement data exists yet.
- R7.1 is incomplete: `server/media/provenance.ts` and `docs/media/prototypes-inventory.md`
  are not written here. R7.1 stays with its own child issue and branch.

### Resume condition

Full M7 execution resumes only when M3 ships a reproducible single-tenant Lava Bean
purchase. Until then the child issues stay contract/spike-only, and this document is the
honest state of the milestone: a written contract, three offline spikes, zero spend.
