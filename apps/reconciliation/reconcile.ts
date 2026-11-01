import type { OdooInvoiceDraft, PaidOrderEvent } from "../../packages/contracts/odoo/index";
import { mapPaidOrder } from "../odoo-sync/journal";

export interface SandboxOrder extends Omit<PaidOrderEvent, "items"> {
  items: Array<PaidOrderEvent["items"][number] & { supplierSku: string }>;
}

export interface SupplierOrderRequest {
  orderId: string;
  idempotencyKey: string;
  lines: Array<{ supplierSku: string; quantity: number }>;
}

export type SupplierTransport = (
  request: SupplierOrderRequest,
) => Promise<{ supplierOrderId: string }>;

export type OdooTransport = (invoice: OdooInvoiceDraft) => Promise<{ id: string }>;

export type ReconciliationStatus =
  | "reconciled"
  | "supplier_offline"
  | "odoo_offline"
  | "offline"
  | "already_reconciled";

export type HumanRecoveryAction =
  | "PLACE_SUPPLIER_ORDER_MANUALLY"
  | "VERIFY_AND_BOOK_JOURNAL"
  | "MANUAL_RECONCILIATION";

export interface ReconciliationOutcome {
  status: ReconciliationStatus;
  supplierOrderId: string | null;
  invoiceId: string | null;
  humanAction: HumanRecoveryAction | null;
}

const ALREADY_RECONCILED: ReconciliationStatus = "already_reconciled";

/**
 * Runs one reconciliation pass over a paid sandbox order.
 *
 * Duplicate protection keys on the recorded outcome: a recorded
 * supplierOrderId or invoiceId short-circuits that side effect on every
 * retry. The supplier transport always receives the stable idempotencyKey
 * (the paid order id) and Odoo receives externalId = order id, so a real
 * transport can additionally dedupe a success whose response was lost.
 * ponytail: no durable store here — recovery handoff is the returned
 * outcome record; add persistence when a runtime owns retry loops.
 */
export async function runReconciliation(
  order: SandboxOrder,
  transports: { supplier: SupplierTransport; odoo: OdooTransport },
  prior?: ReconciliationOutcome,
): Promise<ReconciliationOutcome> {
  if (prior?.status === "reconciled" || prior?.status === ALREADY_RECONCILED) {
    return { status: ALREADY_RECONCILED, supplierOrderId: prior.supplierOrderId, invoiceId: prior.invoiceId, humanAction: null };
  }

  // Validate and build the accounting draft before any side effect so a
  // malformed order can never half-commit. Missing supplier SKUs equally
  // halt procurement without contacting either transport.
  const invoiceDraft = mapPaidOrder(order);
  const lines = order.items.map((item) => ({ supplierSku: item.supplierSku, quantity: item.quantity }));
  if (lines.some((line) => !line.supplierSku || !line.supplierSku.trim())) {
    throw new Error("Every order line requires a mapped supplier SKU before reconciliation");
  }

  let supplierOrderId = prior?.supplierOrderId ?? null;
  let invoiceId = prior?.invoiceId ?? null;

  if (supplierOrderId === null) {
    try {
      const placed = await transports.supplier({ orderId: order.id, idempotencyKey: order.id, lines });
      if (!placed?.supplierOrderId) throw new Error("Supplier transport returned no supplier order id");
      supplierOrderId = placed.supplierOrderId;
    } catch {
      // Supplier offline or refused: the pass records it instead of retrying inline.
    }
  }

  if (invoiceId === null) {
    try {
      const booked = await transports.odoo(invoiceDraft);
      if (!booked?.id) throw new Error("Odoo transport returned no invoice id");
      invoiceId = booked.id;
    } catch {
      // Odoo offline or refused: never fabricate a booking.
    }
  }

  if (supplierOrderId === null && invoiceId === null) {
    return { status: "offline", supplierOrderId, invoiceId, humanAction: "MANUAL_RECONCILIATION" };
  }
  if (invoiceId === null) {
    return { status: "odoo_offline", supplierOrderId, invoiceId, humanAction: "VERIFY_AND_BOOK_JOURNAL" };
  }
  if (supplierOrderId === null) {
    return { status: "supplier_offline", supplierOrderId, invoiceId, humanAction: "PLACE_SUPPLIER_ORDER_MANUALLY" };
  }
  return { status: "reconciled", supplierOrderId, invoiceId, humanAction: null };
}
