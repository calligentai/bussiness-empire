export type DealerRole = "dealer_owner" | "dealer_admin" | "dealer_staff" | "dealer_viewer";

export interface DealerTokenClaims {
  sub: string;
  dealerId: string;
  issuer: string;
  expiresAt: number;
}

export interface VerifiedPrincipal {
  userId: string;
  dealerId: string;
  verified: true;
}

export function createVerifiedPrincipal(
  claims: DealerTokenClaims,
  verification: { signatureValid: boolean; nowEpochSeconds: number },
): VerifiedPrincipal {
  if (
    !verification.signatureValid ||
    !claims.sub.trim() ||
    !claims.dealerId.trim() ||
    !claims.issuer.trim() ||
    claims.expiresAt <= verification.nowEpochSeconds
  ) {
    throw new Error("Invalid dealer token");
  }
  return { userId: claims.sub, dealerId: claims.dealerId, verified: true };
}
