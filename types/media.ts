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
