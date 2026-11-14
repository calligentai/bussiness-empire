import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SandboxError, applyWebhook, namespaceFrom } from "../../../../lib/checkout";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const result = await applyWebhook(req.scope, namespaceFrom(req.headers), (req.body ?? {}) as any);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof SandboxError) {
      res.status(error.status).json({ message: error.message, code: error.code });
      return;
    }
    const message = error instanceof Error ? error.message : "Webhook failed";
    res.status(500).json({ message, code: "webhook_failed" });
  }
}
