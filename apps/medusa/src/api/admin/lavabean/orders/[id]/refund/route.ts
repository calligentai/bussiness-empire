import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SandboxError, namespaceFrom, refundCheckout } from "../../../../../../lib/checkout";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const reason = typeof (req.body as { reason?: string } | undefined)?.reason === "string"
      ? (req.body as { reason: string }).reason
      : "customer_request";
    const result = await refundCheckout(req.scope, namespaceFrom(req.headers), req.params.id, reason);
    res.status(result.ok ? 200 : result.error === "order_not_found" ? 404 : 409).json(result);
  } catch (error) {
    if (error instanceof SandboxError) {
      res.status(error.status).json({ message: error.message, code: error.code });
      return;
    }
    const record = error as { message?: unknown };
    const message = typeof record?.message === "string" ? record.message : "Refund failed";
    res.status(500).json({ message, code: "refund_failed" });
  }
}
