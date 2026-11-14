import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SandboxError, namespaceFrom, placeCheckout } from "../../../../lib/checkout";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const order = await placeCheckout(req.scope, namespaceFrom(req.headers), (req.body ?? {}) as any);
    res.status(200).json(order);
  } catch (error) {
    if (error instanceof SandboxError) {
      res.status(error.status).json({ message: error.message, code: error.code });
      return;
    }
    const record = error as { message?: unknown };
    const message = typeof record?.message === "string" ? record.message : "Checkout failed";
    res.status(500).json({ message, code: "checkout_failed" });
  }
}
