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
export type HumanRecoveryAction = "VERIFY_SUPPLIER_ORDER" | "VERIFY_ODOO_JOURNAL" | "MANUAL_RECONCILIATION";
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
 * restarts; this interface alone does not make an implementation durable. A
 * successful claim must be persisted atomically and remain exclusive until its
 * matching release; a store must not silently expire/reassign an active lease.
 * A crashed owner therefore requires deliberate store-level recovery after
 * checking remote state. Uncertain transport outcomes require named human
 * reconciliation before resetting affected state to pending.
 */
export type ReconciliationClaim =
  | { acquired: true; leaseToken: string; record: ReconciliationRecord }
  | { acquired: false; reason: "busy" | "complete"; record: ReconciliationRecord };

export interface ReconciliationStore {
  /** Atomically acquire an exclusive per-order lease and return the authoritative record. */
  claim(orderId: string): Promise<ReconciliationClaim>;
  /** Read the durable record for diagnostics; it must not grant ownership. */
  read(orderId: string): Promise<ReconciliationRecord | null>;
  /** Persist a record only when the caller still owns the matching lease. */
  finalize(orderId: string, leaseToken: string, record: ReconciliationRecord): Promise<void>;
  /** Release the caller's lease; stale owners must not release a newer lease. */
  release(orderId: string, leaseToken: string): Promise<void>;
}

/** Reconcile a paid order while ensuring only one active caller can cause remote side effects. */
export async function runReconciliation(
  order: SandboxOrder,
  transports: { supplier: SupplierTransport; odoo: OdooTransport },
  store: ReconciliationStore,
): Promise<ReconciliationOutcome> {
  const invoiceDraft = mapPaidOrder(order);
  const lines = order.items.map(({ supplierSku, quantity }) => ({ supplierSku, quantity }));
  if (lines.some(({ supplierSku }) => !supplierSku?.trim())) throw new Error("Every order line requires a mapped supplier SKU before reconciliation");

  const claim = await store.claim(order.id);
  if (!claim.acquired) {
    if (claim.reason === "busy") return outcome("in_progress", claim.record.supplierOrderId, claim.record.invoiceId, null);
    return outcome("already_reconciled", claim.record.supplierOrderId, claim.record.invoiceId, null);
  }

  const { leaseToken } = claim;
  let { supplierOrderId, invoiceId, supplierState, odooState } = claim.record;
  try {
    if (supplierState === "pending") {
      // Persist uncertainty before the remote side effect. If the process stops after
      // the supplier accepts the order but before the success record is durable, a
      // retry must not place a second order automatically.
      supplierState = "uncertain";
      await store.finalize(order.id, leaseToken, { supplierOrderId, invoiceId, supplierState, odooState });
      try {
        const placed = await transports.supplier({ orderId: order.id, idempotencyKey: order.id, lines });
        if (!placed?.supplierOrderId) throw new Error("Supplier transport returned no supplier order id");
        supplierOrderId = placed.supplierOrderId;
        supplierState = "complete";
      } catch {
        // Keep the durable uncertainty marker. A transport error cannot prove the
        // supplier did not accept the order.
      }
      if (supplierState === "complete") {
        await store.finalize(order.id, leaseToken, { supplierOrderId, invoiceId, supplierState, odooState });
      }
    }
    if (odooState === "pending") {
      // Apply the same write-ahead uncertainty marker to the accounting side effect.
      odooState = "uncertain";
      await store.finalize(order.id, leaseToken, { supplierOrderId, invoiceId, supplierState, odooState });
      try {
        const booked = await transports.odoo(invoiceDraft);
        if (!booked?.id) throw new Error("Odoo transport returned no invoice id");
        invoiceId = booked.id;
        odooState = "complete";
      } catch {
        // Keep the durable uncertainty marker; do not blindly book the journal twice.
      }
      if (odooState === "complete") {
        await store.finalize(order.id, leaseToken, { supplierOrderId, invoiceId, supplierState, odooState });
      }
    }
    if (supplierState === "uncertain" && odooState === "uncertain") return outcome("offline", supplierOrderId, invoiceId, "MANUAL_RECONCILIATION");
    if (supplierState === "uncertain") return outcome("supplier_offline", supplierOrderId, invoiceId, "VERIFY_SUPPLIER_ORDER");
    if (odooState === "uncertain") return outcome("odoo_offline", supplierOrderId, invoiceId, "VERIFY_ODOO_JOURNAL");
    if (!supplierOrderId && !invoiceId) return outcome("offline", supplierOrderId, invoiceId, "MANUAL_RECONCILIATION");
    if (!invoiceId) return outcome("odoo_offline", supplierOrderId, invoiceId, "VERIFY_ODOO_JOURNAL");
    if (!supplierOrderId) return outcome("supplier_offline", supplierOrderId, invoiceId, "VERIFY_SUPPLIER_ORDER");
    return outcome("reconciled", supplierOrderId, invoiceId, null);
  } finally {
    await store.release(order.id, leaseToken);
  }
}

/** Create a normalized reconciliation result for UI and recovery handling. */
function outcome(status: ReconciliationStatus, supplierOrderId: string | null, invoiceId: string | null, humanAction: HumanRecoveryAction | null): ReconciliationOutcome {
  return { status, supplierOrderId, invoiceId, humanAction };
}
