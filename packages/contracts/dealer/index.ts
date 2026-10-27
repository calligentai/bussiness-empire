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
