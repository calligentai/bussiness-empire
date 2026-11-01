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
export type SupplierTransport = (request: SupplierOrderRequest) => Promise<{ supplierOrderId: string }>;
export type OdooTransport = (invoice: OdooInvoiceDraft) => Promise<{ id: string }>;
export type ReconciliationStatus = "reconciled" | "supplier_offline" | "odoo_offline" | "offline" | "already_reconciled";
export type HumanRecoveryAction = "PLACE_SUPPLIER_ORDER_MANUALLY" | "VERIFY_AND_BOOK_JOURNAL" | "MANUAL_RECONCILIATION";
export interface ReconciliationOutcome {
  status: ReconciliationStatus;
  supplierOrderId: string | null;
  invoiceId: string | null;
  humanAction: HumanRecoveryAction | null;
}

export interface ReconciliationRecord {
  supplierOrderId: string | null;
  invoiceId: string | null;
  supplierState: "pending" | "complete" | "uncertain";
  odooState: "pending" | "complete" | "uncertain";
}
/**
 * The caller must supply storage whose atomicity and persistence match its retry
 * lifecycle. A durable store preserves the uncertainty marker across calls and
 * restarts; this interface alone does not make an implementation durable.
 * Uncertain transport outcomes require a named human reconciliation before the
 * caller resets the affected state to pending.
 */
export interface ReconciliationStore {
  claim(orderId: string): Promise<ReconciliationRecord>;
  read(orderId: string): Promise<ReconciliationRecord | null>;
  finalize(orderId: string, record: ReconciliationRecord): Promise<void>;
}

export async function runReconciliation(
  order: SandboxOrder,
  transports: { supplier: SupplierTransport; odoo: OdooTransport },
  store: ReconciliationStore,
): Promise<ReconciliationOutcome> {
  const invoiceDraft = mapPaidOrder(order);
  const lines = order.items.map(({ supplierSku, quantity }) => ({ supplierSku, quantity }));
  if (lines.some(({ supplierSku }) => !supplierSku?.trim())) throw new Error("Every order line requires a mapped supplier SKU before reconciliation");

  const record = await store.claim(order.id);
  const complete = await store.read(order.id);
  if (complete?.supplierState === "complete" && complete?.odooState === "complete") {
    return outcome("already_reconciled", complete.supplierOrderId, complete.invoiceId, null);
  }
  let { supplierOrderId, invoiceId, supplierState, odooState } = record;
  if (supplierState === "pending") {
    try {
      const placed = await transports.supplier({ orderId: order.id, idempotencyKey: order.id, lines });
      if (!placed?.supplierOrderId) throw new Error("Supplier transport returned no supplier order id");
      supplierOrderId = placed.supplierOrderId;
      supplierState = "complete";
    } catch {
      supplierState = "uncertain";
    }
    await store.finalize(order.id, { supplierOrderId, invoiceId, supplierState, odooState });
  }
  if (odooState === "pending") {
    try {
      const booked = await transports.odoo(invoiceDraft);
      if (!booked?.id) throw new Error("Odoo transport returned no invoice id");
      invoiceId = booked.id;
      odooState = "complete";
    } catch {
      odooState = "uncertain";
    }
    await store.finalize(order.id, { supplierOrderId, invoiceId, supplierState, odooState });
  }
  if (!supplierOrderId && !invoiceId) return outcome("offline", supplierOrderId, invoiceId, "MANUAL_RECONCILIATION");
  if (!invoiceId) return outcome("odoo_offline", supplierOrderId, invoiceId, "VERIFY_AND_BOOK_JOURNAL");
  if (!supplierOrderId) return outcome("supplier_offline", supplierOrderId, invoiceId, "PLACE_SUPPLIER_ORDER_MANUALLY");
  return outcome("reconciled", supplierOrderId, invoiceId, null);
}

function outcome(status: ReconciliationStatus, supplierOrderId: string | null, invoiceId: string | null, humanAction: HumanRecoveryAction | null): ReconciliationOutcome {
  return { status, supplierOrderId, invoiceId, humanAction };
}
