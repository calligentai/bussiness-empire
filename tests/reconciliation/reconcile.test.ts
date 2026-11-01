import { describe, expect, it, vi } from "vitest";
import { runReconciliation, type ReconciliationOutcome, type SandboxOrder } from "../../apps/reconciliation/reconcile";
import type { OdooInvoiceDraft } from "../../packages/contracts/odoo/index";

const order: SandboxOrder = {
  id: "order_test_1",
  paymentId: "pay_test_1",
  currency: "EUR",
  status: "paid",
  items: [
    { supplierSku: "LV-SKU-1", name: "Virunga Washed", quantity: 2, unitPriceCents: 1850 },
    { supplierSku: "LV-SKU-2", name: "Kivu Natural", quantity: 1, unitPriceCents: 2100 },
  ],
};

function okSupplier() {
  return vi.fn(async (request: { idempotencyKey: string }) => ({
    supplierOrderId: `supplier_order_${request.idempotencyKey}`,
  }));
}

function okOdoo() {
  return vi.fn(async (invoice: OdooInvoiceDraft) => ({ id: `invoice_${invoice.externalId}`, ...invoice }));
}

function failing(fn: string) {
  return vi.fn(async () => {
    throw new Error(`${fn} unavailable`);
  });
}

describe("offline supplier/Odoo reconciliation", () => {
  it("reconciles a paid sandbox order to both supplier and Odoo", async () => {
    const supplier = okSupplier();
    const odoo = okOdoo();

    const first = await runReconciliation(order, { supplier, odoo });
    expect(first).toMatchObject({ status: "reconciled", supplierOrderId: "supplier_order_order_test_1", invoiceId: "invoice_order_test_1" });

    const replay = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, first);
    expect(replay.status).toBe("already_reconciled");
    expect(supplier).toHaveBeenCalledTimes(1);
    expect(odoo).toHaveBeenCalledTimes(1);
  });

  it("marks supplier-offline, leaves a named human action, and never invents a supplier order", async () => {
    const supplier = failing("supplier");
    const odoo = okOdoo();

    const outcome = await runReconciliation(order, { supplier, odoo });

    expect(outcome.status).toBe("supplier_offline");
    expect(outcome.supplierOrderId).toBeNull();
    expect(outcome.invoiceId).toBe("invoice_order_test_1");
    expect(outcome.humanAction).toBe("PLACE_SUPPLIER_ORDER_MANUALLY");
    expect(supplier).toHaveBeenCalledTimes(1);

    const recovered = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, outcome);
    expect(recovered.status).toBe("reconciled");
    expect(odoo).toHaveBeenCalledTimes(1);
  });

  it("marks Odoo-offline, never books a fake journal, and recovers without duplicating the supplier order", async () => {
    const supplier = okSupplier();
    const odoo = failing("odoo");

    const outcome = await runReconciliation(order, { supplier, odoo });
    expect(outcome.status).toBe("odoo_offline");
    expect(outcome.supplierOrderId).toBe("supplier_order_order_test_1");
    expect(outcome.invoiceId).toBeNull();
    expect(outcome.humanAction).toBe("VERIFY_AND_BOOK_JOURNAL");

    const recovered = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, outcome);
    expect(recovered.status).toBe("reconciled");
    expect(recovered.invoiceId).toBe("invoice_order_test_1");
    expect(supplier).toHaveBeenCalledTimes(1);

    const replay = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, recovered);
    expect(replay.status).toBe("already_reconciled");
    expect(supplier).toHaveBeenCalledTimes(1);
  });

  it("marks a fully offline run and halts both automations instead of fabricating success", async () => {
    const outcome = await runReconciliation(order, { supplier: failing("supplier"), odoo: failing("odoo") });

    expect(outcome.status).toBe("offline");
    expect(outcome.supplierOrderId).toBeNull();
    expect(outcome.invoiceId).toBeNull();
    expect(outcome.humanAction).toBe("MANUAL_RECONCILIATION");

    const stillOffline = await runReconciliation(order, { supplier: failing("supplier"), odoo: failing("odoo") }, outcome);
    expect(stillOffline.status).toBe("offline");
    expect(stillOffline.humanAction).toBe("MANUAL_RECONCILIATION");
  });

  it("recovery after a fully offline run creates exactly one supplier order and one journal entry", async () => {
    const offline = await runReconciliation(order, { supplier: failing("supplier"), odoo: failing("odoo") });

    const supplier = okSupplier();
    const odoo = okOdoo();
    const recovered = await runReconciliation(order, { supplier, odoo }, offline);
    expect(recovered.status).toBe("reconciled");
    expect(supplier).toHaveBeenCalledTimes(1);
    expect(odoo).toHaveBeenCalledTimes(1);

    const recoveredAgain = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, recovered);
    expect(recoveredAgain.status).toBe("already_reconciled");
  });

  it("passes a stable idempotency key derived from the paid order to the supplier transport", async () => {
    const supplier = okSupplier();
    await runReconciliation(order, { supplier, odoo: okOdoo() });
    expect(supplier.mock.calls[0]![0]).toMatchObject({ orderId: "order_test_1", idempotencyKey: "order_test_1" });
  });

  it("books the journal through the shared M4.3 mapping with Dutch VAT and balanced totals", async () => {
    const odoo = okOdoo();
    await runReconciliation(order, { supplier: okSupplier(), odoo });

    const invoice = odoo.mock.calls[0]![0];
    expect(invoice).toMatchObject({ externalId: "order_test_1", paymentId: "pay_test_1", currency: "EUR" });
    expect(invoice.totalNetCents + invoice.totalVatCents).toBe(invoice.totalCents);
    expect(invoice.totalCents).toBe(5800);
  });

  it("rejects order lines without a supplier SKU mapping before any side effect", async () => {
    const supplier = okSupplier();
    const withoutSku = { ...order, items: [{ supplierSku: "", name: "Virunga Washed", quantity: 1, unitPriceCents: 1850 }] };

    await expect(
      runReconciliation(withoutSku, { supplier, odoo: okOdoo() }, { status: "reconciled", supplierOrderId: null, invoiceId: null, humanAction: null } satisfies ReconciliationOutcome),
    ).resolves.toMatchObject({ status: "already_reconciled" });
    expect(supplier).not.toHaveBeenCalled();

    await expect(
      runReconciliation({ ...withoutSku, id: "order_test_2", paymentId: "pay_test_2" }, { supplier, odoo: okOdoo() }),
    ).rejects.toThrow("supplier SKU");
    expect(supplier).not.toHaveBeenCalled();
  });
});
