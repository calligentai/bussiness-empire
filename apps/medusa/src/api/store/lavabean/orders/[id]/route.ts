import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getCheckout, namespaceFrom } from "../../../../../lib/checkout";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const order = await getCheckout(req.scope, namespaceFrom(req.headers), req.params.id);
  if (!order) {
    res.status(404).json({ message: "Order not found", code: "order_not_found" });
    return;
  }
  res.status(200).json(order);
}
