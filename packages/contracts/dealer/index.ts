import type { DealerRole } from "../auth";

export type DealerStatus = "active" | "suspended" | "closed";

export interface Dealer {
  dealerId: string;
  slug: string;
  legalName: string;
  displayName: string;
  status: DealerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DealerDomain {
  domainId: string;
  dealerId: string;
  hostname: string;
  verificationStatus: "pending" | "verified";
  verifiedAt?: string;
  isPrimary: boolean;
}

export interface DealerMembership {
  dealerId: string;
  userId: string;
  role: DealerRole;
}

export type SocialPlatform = "instagram" | "facebook" | "linkedin";

export interface DealerSocialSetup {
  dealerId: string;
  platform: SocialPlatform;
  connectionStatus: "disconnected";
}

export interface DealerSocialDraft {
  draftId: string;
  dealerId: string;
  platform: SocialPlatform;
  text: string;
  updatedAt: string;
}

/** Returns only the active dealer's local disconnected setup fixtures. */
export function readSocialSetupForDealer(
  setups: readonly DealerSocialSetup[],
  dealerId: string,
): DealerSocialSetup[] {
  if (!dealerId.trim()) return [];
  return setups
    .filter((setup) => setup.dealerId === dealerId && setup.connectionStatus === "disconnected")
    .map((setup) => ({ ...setup }));
}

/** Reads local drafts only; absent or cross-dealer ownership fails closed. */
export function readSocialDraftForDealer(
  drafts: readonly DealerSocialDraft[],
  draftId: string,
  dealerId: string,
): DealerSocialDraft | undefined {
  if (!draftId.trim() || !dealerId.trim()) return undefined;
  const matches = drafts.filter((draft) => draft.draftId === draftId && draft.dealerId === dealerId);
  if (matches.length > 1) throw new Error("Social draft is ambiguous");
  return matches[0] ? { ...matches[0] } : undefined;
}

/** Creates a local draft without invoking a provider or scheduling a post. */
export function createSocialDraft(input: DealerSocialDraft): DealerSocialDraft {
  if (!input.draftId.trim() || !input.dealerId.trim() || !input.text.trim()) {
    throw new Error("Social draft identity and text are required");
  }
  if (!Number.isFinite(Date.parse(input.updatedAt))) throw new Error("Social draft timestamp is invalid");
  if (!["instagram", "facebook", "linkedin"].includes(input.platform)) {
    throw new Error("Social platform is invalid");
  }
  return { ...input };
}

export type SeoPaidOperation = "keyword_lookup" | "serp_lookup" | "backlink_lookup";

/** Approved budget metadata. It is a contract only; it never enables paid dispatch. */
export interface SeoBudgetPolicy {
  dealerId: string;
  enabled: boolean;
  currency: string;
  periodStart: string;
  periodEnd: string;
  limitMinor: number;
  allowedOperations: readonly SeoPaidOperation[];
  approvalId: string;
  policyVersion: number;
}

export interface SeoSpendReservation {
  dealerId: string;
  requestId: string;
  amountMinor: number;
  periodStart: string;
  periodEnd: string;
  policyVersion: number;
}

export interface DealerSeoSettings<T = unknown> {
  dealerId: string;
  budgetPolicy?: SeoBudgetPolicy;
}

export function createSeoBudgetPolicy(input: SeoBudgetPolicy): SeoBudgetPolicy {
  const start = Date.parse(input.periodStart);
  const end = Date.parse(input.periodEnd);
  if (
    !input.dealerId.trim() || !/^[A-Z]{3}$/.test(input.currency) ||
    !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= end ||
    !Number.isSafeInteger(input.limitMinor) || input.limitMinor < 0 ||
    !input.approvalId.trim() || !Number.isInteger(input.policyVersion) || input.policyVersion < 1 ||
    !Array.isArray(input.allowedOperations) || input.allowedOperations.some((operation) =>
      !["keyword_lookup", "serp_lookup", "backlink_lookup"].includes(operation),
    )
  ) throw new Error("Invalid SEO budget policy");
  return { ...input, allowedOperations: [...input.allowedOperations] };
}

export function readSeoBudgetPolicyForDealer(
  policies: readonly SeoBudgetPolicy[], dealerId: string,
): SeoBudgetPolicy | undefined {
  if (!dealerId.trim()) return undefined;
  const matches = policies.filter((policy) => policy.dealerId === dealerId);
  if (matches.length > 1) throw new Error("SEO budget policy is ambiguous");
  const policy = matches[0];
  return policy ? { ...policy, allowedOperations: [...policy.allowedOperations] } : undefined;
}

/** Pure reservation contract; persistence must apply this atomically per dealer/period. */
export function reserveSeoSpend(
  reservations: readonly SeoSpendReservation[],
  input: {
    dealerId: string; requestId: string; estimateMinor: number; policy: SeoBudgetPolicy;
    now: string; operation?: SeoPaidOperation;
  },
): SeoSpendReservation {
  const { policy } = input;
  if (!policy.enabled || policy.dealerId !== input.dealerId || !policy.approvalId.trim()) {
    throw new Error("No approved budget for dealer");
  }
  const now = Date.parse(input.now);
  if (!Number.isSafeInteger(now) || now < Date.parse(policy.periodStart) || now >= Date.parse(policy.periodEnd)) {
    throw new Error("Budget is not active");
  }
  if (input.operation && !policy.allowedOperations.includes(input.operation)) throw new Error("Operation is not approved");
  if (!input.requestId.trim() || !Number.isSafeInteger(input.estimateMinor) || input.estimateMinor <= 0) {
    throw new Error("Invalid SEO spend reservation");
  }
  const existing = reservations.find((reservation) => reservation.dealerId === input.dealerId && reservation.requestId === input.requestId);
  if (existing) {
    if (existing.amountMinor !== input.estimateMinor || existing.policyVersion !== policy.policyVersion) {
      throw new Error("Idempotency key conflicts with existing reservation");
    }
    return { ...existing };
  }
  const reserved = reservations.filter((reservation) =>
    reservation.dealerId === input.dealerId && reservation.periodStart === policy.periodStart && reservation.periodEnd === policy.periodEnd,
  ).reduce((total, reservation) => total + reservation.amountMinor, 0);
  if (reserved + input.estimateMinor > policy.limitMinor) throw new Error("Budget limit exceeded");
  return {
    dealerId: input.dealerId, requestId: input.requestId, amountMinor: input.estimateMinor,
    periodStart: policy.periodStart, periodEnd: policy.periodEnd, policyVersion: policy.policyVersion,
  };
}

export function resolveDealerSeoSettings<T>(
  settings: readonly DealerSeoSettings[], dealerId: string, centralTemplate: T,
): T & { budgetPolicy?: SeoBudgetPolicy } {
  if (!dealerId.trim()) throw new Error("Dealer context is required");
  const matching = settings.filter((entry) => entry.dealerId === dealerId);
  if (matching.length > 1) throw new Error("Dealer SEO settings are ambiguous");
  const policy = matching[0]?.budgetPolicy;
  return { ...centralTemplate, ...(policy ? { budgetPolicy: { ...policy, allowedOperations: [...policy.allowedOperations] } } : {}) };
}

/** Paid provider execution stays hard-disabled until separately authorized and implemented. */
export async function requestPaidDataForSeo<T>(input: {
  dealerId: string; operation: SeoPaidOperation; now: string;
  dispatch: () => Promise<T>;
}): Promise<{ status: "refused"; reason: "no_approved_budget" }> {
  void input;
  return { status: "refused", reason: "no_approved_budget" };
}

export interface BrandTemplate {
  templateId: string;
  version: number;
  values: Readonly<Record<string, string>>;
}

export interface DealerBrandOverride {
  dealerId: string;
  templateId: string;
  values: Readonly<Record<string, string>>;
}

export function createBrandTemplate(input: BrandTemplate): BrandTemplate {
  if (!input.templateId.trim() || !Number.isInteger(input.version) || input.version < 1) {
    throw new Error("Invalid brand template identity or version");
  }
  return { ...input, values: { ...input.values } };
}

export function publishBrandTemplate(
  current: BrandTemplate,
  values: Readonly<Record<string, string>>,
): BrandTemplate {
  return createBrandTemplate({
    templateId: current.templateId,
    version: current.version + 1,
    values: { ...current.values, ...values },
  });
}

export function createDealerBrandOverride(
  existing: readonly DealerBrandOverride[],
  input: DealerBrandOverride,
): DealerBrandOverride {
  if (!input.dealerId.trim() || !input.templateId.trim()) throw new Error("Dealer brand override identity is required");
  if (existing.some((entry) => entry.dealerId === input.dealerId && entry.templateId === input.templateId)) {
    throw new Error("Dealer brand override already exists");
  }
  return { ...input, values: { ...input.values } };
}

export function resolveDealerBrand(
  template: BrandTemplate,
  overrides: readonly DealerBrandOverride[],
  dealerId: string,
): { templateVersion: number; values: Record<string, string> } {
  if (!dealerId.trim()) throw new Error("Dealer context is required");
  const matching = overrides.filter((entry) => entry.dealerId === dealerId && entry.templateId === template.templateId);
  if (matching.length > 1) throw new Error("Dealer brand override is ambiguous");
  const override = matching[0];
  return { templateVersion: template.version, values: { ...template.values, ...(override?.values ?? {}) } };
}

export interface CustomerRecord {
  customerId: string;
  dealerId?: string;
  name: string;
}

export interface OrderRecord {
  orderId: string;
  dealerId?: string;
  customerId: string;
}

export interface VerifiedDealerToken {
  verified: boolean;
  dealerId: string;
}

export function resolveDealerFromVerifiedToken(token: VerifiedDealerToken): string {
  if (!token.verified || !token.dealerId.trim()) throw new Error("Invalid dealer token");
  return token.dealerId;
}

export function createDealer(input: {
  dealerId: string;
  slug: string;
  legalName: string;
  displayName: string;
  status?: DealerStatus;
  now?: string;
}): Dealer {
  if (![input.dealerId, input.slug, input.legalName, input.displayName].every((value) => value?.trim())) {
    throw new Error("Dealer identity fields are required");
  }
  const now = input.now ?? new Date().toISOString();
  return {
    dealerId: input.dealerId,
    slug: input.slug.trim().toLowerCase(),
    legalName: input.legalName.trim(),
    displayName: input.displayName.trim(),
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function createDealerDomain(
  existing: readonly DealerDomain[],
  input: { domainId: string; dealerId: string; hostname: string; isPrimary?: boolean },
): DealerDomain {
  const hostname = normalizeHostname(input.hostname);
  if (!input.domainId.trim() || !input.dealerId.trim() || !hostname) {
    throw new Error("Dealer domain fields are required");
  }
  if (existing.some((domain) => normalizeHostname(domain.hostname) === hostname)) {
    throw new Error("Hostname is already assigned to a dealer");
  }
  return {
    domainId: input.domainId,
    dealerId: input.dealerId,
    hostname,
    verificationStatus: "pending",
    isPrimary: input.isPrimary ?? false,
  };
}

export function resolveDealerForHostname(
  domains: readonly DealerDomain[],
  hostname: string,
): string | undefined {
  const normalizedHostname = normalizeHostname(hostname);
  if (!normalizedHostname) return undefined;
  const matches = domains.filter((domain) => normalizeHostname(domain.hostname) === normalizedHostname);
  if (matches.length > 1) throw new Error("Hostname ownership is ambiguous");
  const domain = matches[0];
  return domain?.verificationStatus === "verified" ? domain.dealerId : undefined;
}

export function readCustomerForDealer<T extends { customerId: string; dealerId?: string }>(
  customers: readonly T[],
  customerId: string,
  dealerId: string,
): T | undefined {
  if (!dealerId.trim()) return undefined;
  return customers.find((customer) => customer.customerId === customerId && customer.dealerId === dealerId);
}

export function readOrderForDealer<T extends { orderId: string; dealerId?: string }>(
  orders: readonly T[],
  orderId: string,
  dealerId: string,
): T | undefined {
  if (!dealerId.trim()) return undefined;
  return orders.find((order) => order.orderId === orderId && order.dealerId === dealerId);
}

export function grantDealerRole(
  _existing: readonly DealerMembership[],
  input: DealerMembership & { actorDealerId: string; actorRole: DealerRole },
): DealerMembership {
  if (input.dealerId !== input.actorDealerId) throw new Error("Cannot grant roles outside the active dealer");
  if (input.actorRole !== "dealer_owner" && input.actorRole !== "dealer_admin") {
    throw new Error("Not authorized to manage dealer roles");
  }
  if (!input.dealerId.trim() || !input.userId.trim()) throw new Error("Dealer membership fields are required");
  return { dealerId: input.dealerId, userId: input.userId, role: input.role };
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}
