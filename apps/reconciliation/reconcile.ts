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
export type ReconciliationStatus = "reconciled" | "supplier_offline" | "odoo_offline" | "offline" | "already_reconciled" | "in_progress";
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
  supplierState: "pending" | "in_flight" | "complete" | "uncertain";
  odooState: "pending" | "in_flight" | "complete" | "uncertain";
}

export type ReconciliationClaim =
  | { status: "acquired"; token: string; record: ReconciliationRecord }
  | { status: "busy"; record: ReconciliationRecord };

/**
 * A production store must atomically claim an order across every worker and
 * persist each state transition. With no stored record, claim returns a pending
 * record; an active claim returns busy. Claims stay held until release, and
 * finalize must verify the token. A stale in_flight state must be surfaced as
 * uncertain on the next claim rather than replayed.
 */
export interface ReconciliationStore {
  claim(orderId: string): Promise<ReconciliationClaim>;
  finalize(orderId: string, token: string, record: ReconciliationRecord): Promise<void>;
  release(orderId: string, token: string): Promise<void>;
}

export async function runReconciliation(
  order: SandboxOrder,
  transports: { supplier: SupplierTransport; odoo: OdooTransport },
  store: ReconciliationStore,
): Promise<ReconciliationOutcome> {
  const invoiceDraft = mapPaidOrder(order);
  const lines = order.items.map(({ supplierSku, quantity }) => ({ supplierSku, quantity }));
  if (lines.some(({ supplierSku }) => !supplierSku?.trim())) throw new Error("Every order line requires a mapped supplier SKU before reconciliation");

  const claim = await store.claim(order.id);
  if (claim.status === "busy") {
    return outcome("in_progress", claim.record.supplierOrderId, claim.record.invoiceId, null);
  }

  const { token } = claim;
  let { supplierOrderId, invoiceId, supplierState, odooState } = claim.record;
  try {
    // A process may have died after the remote side effect committed but before
    // it could persist the response. Never retry that side effect automatically.
    if (supplierState === "in_flight") supplierState = "uncertain";
    if (odooState === "in_flight") odooState = "uncertain";
    if (supplierState !== claim.record.supplierState || odooState !== claim.record.odooState) {
      await store.finalize(order.id, token, { supplierOrderId, invoiceId, supplierState, odooState });
    }

    if (supplierState === "complete" && odooState === "complete") {
      return outcome("already_reconciled", supplierOrderId, invoiceId, null);
    }

    if (supplierState === "pending") {
      supplierState = "in_flight";
      await store.finalize(order.id, token, { supplierOrderId, invoiceId, supplierState, odooState });
      try {
        const placed = await transports.supplier({ orderId: order.id, idempotencyKey: order.id, lines });
        if (!placed?.supplierOrderId) throw new Error("Supplier transport returned no supplier order id");
        supplierOrderId = placed.supplierOrderId;
        supplierState = "complete";
      } catch {
        supplierState = "uncertain";
      }
      await store.finalize(order.id, token, { supplierOrderId, invoiceId, supplierState, odooState });
    }

    if (odooState === "pending") {
      odooState = "in_flight";
      await store.finalize(order.id, token, { supplierOrderId, invoiceId, supplierState, odooState });
      try {
        const booked = await transports.odoo(invoiceDraft);
        if (!booked?.id) throw new Error("Odoo transport returned no invoice id");
        invoiceId = booked.id;
        odooState = "complete";
      } catch {
        odooState = "uncertain";
      }
      await store.finalize(order.id, token, { supplierOrderId, invoiceId, supplierState, odooState });
    }

    if (!supplierOrderId && !invoiceId) return outcome("offline", supplierOrderId, invoiceId, "MANUAL_RECONCILIATION");
    if (!invoiceId) return outcome("odoo_offline", supplierOrderId, invoiceId, "VERIFY_AND_BOOK_JOURNAL");
    if (!supplierOrderId) return outcome("supplier_offline", supplierOrderId, invoiceId, "PLACE_SUPPLIER_ORDER_MANUALLY");
    return outcome("reconciled", supplierOrderId, invoiceId, null);
  } finally {
    await store.release(order.id, token);
  }
}

function outcome(status: ReconciliationStatus, supplierOrderId: string | null, invoiceId: string | null, humanAction: HumanRecoveryAction | null): ReconciliationOutcome {
  return { status, supplierOrderId, invoiceId, humanAction };
}
