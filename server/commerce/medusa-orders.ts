import { medusaAdminToken, medusaHeaders, medusaRuntime } from "./medusa-client";

export interface SandboxCallOptions {
  dataDir?: string;
}

const namespaceOf = (options: SandboxCallOptions = {}) => options.dataDir || "default";

export const refundSandboxOrder = async (id: string, reason: string, options: SandboxCallOptions = {}) => {
  const runtime = medusaRuntime();
  const token = await medusaAdminToken();
  const response = await fetch(`${runtime.backendUrl}/admin/lavabean/orders/${encodeURIComponent(id)}/refund`, {
    method: "POST",
    headers: {
      ...medusaHeaders(namespaceOf(options)),
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const body = (await response.json()) as { ok: boolean; status?: "refunded"; error?: string; refundedAt?: string };
  if (!response.ok && !body.error) {
    throw new Error(`Medusa refund failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
};

export const applySandboxWebhook = async (
  event: { id: string; orderId: string; status: "paid" | "failed"; paymentId: string },
  options: SandboxCallOptions = {},
) => {
  const runtime = medusaRuntime();
  const response = await fetch(`${runtime.backendUrl}/hooks/lavabean/payment`, {
    method: "POST",
    headers: medusaHeaders(namespaceOf(options)),
    body: JSON.stringify(event),
  });
  const body = (await response.json()) as { applied: boolean; error?: string };
  if (!response.ok && !body.error) {
    throw new Error(`Medusa webhook failed (${response.status})`);
  }
  return body;
};
