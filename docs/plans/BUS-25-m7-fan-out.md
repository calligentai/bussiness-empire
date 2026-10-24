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
output, file list) linked on its issue. BUS-25 stays open until the four PRs are reviewed;
it does not merge anything itself.
