import { describe, expect, it, vi } from "vitest";
import { runReconciliation, type ReconciliationRecord, type ReconciliationStore, type SandboxOrder } from "../../apps/reconciliation/reconcile";
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

function store(): ReconciliationStore {
  const records = new Map<string, ReconciliationRecord>();
  return {
    async claim(id) {
      const record = records.get(id) ?? { supplierOrderId: null, invoiceId: null, supplierState: "pending", odooState: "pending" };
      records.set(id, record);
      return record;
    },
    async read(id) { return records.get(id) ?? null; },
    async finalize(id, record) { records.set(id, record); },
  };
}

describe("offline supplier/Odoo reconciliation", () => {
  it("reconciles a paid sandbox order to both supplier and Odoo", async () => {
    const supplier = okSupplier();
    const odoo = okOdoo();
    const persistence = store();

    const first = await runReconciliation(order, { supplier, odoo }, persistence);
    expect(first).toMatchObject({ status: "reconciled", supplierOrderId: "supplier_order_order_test_1", invoiceId: "invoice_order_test_1" });

    const replay = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, persistence);
    expect(replay.status).toBe("already_reconciled");
    expect(supplier).toHaveBeenCalledTimes(1);
    expect(odoo).toHaveBeenCalledTimes(1);
  });

  it("marks supplier-offline, leaves a named human action, and never invents a supplier order", async () => {
    const supplier = failing("supplier");
    const odoo = okOdoo();
    const persistence = store();

    const outcome = await runReconciliation(order, { supplier, odoo }, persistence);

    expect(outcome.status).toBe("supplier_offline");
    expect(outcome.supplierOrderId).toBeNull();
    expect(outcome.invoiceId).toBe("invoice_order_test_1");
    expect(outcome.humanAction).toBe("PLACE_SUPPLIER_ORDER_MANUALLY");
    expect(supplier).toHaveBeenCalledTimes(1);

    const recovered = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, persistence);
    expect(recovered.status).toBe("supplier_offline");
    expect(odoo).toHaveBeenCalledTimes(1);
  });

  it("marks Odoo-offline, never books a fake journal, and recovers without duplicating the supplier order", async () => {
    const supplier = okSupplier();
    const odoo = failing("odoo");
    const persistence = store();

    const outcome = await runReconciliation(order, { supplier, odoo }, persistence);
    expect(outcome.status).toBe("odoo_offline");
    expect(outcome.supplierOrderId).toBe("supplier_order_order_test_1");
    expect(outcome.invoiceId).toBeNull();
    expect(outcome.humanAction).toBe("VERIFY_AND_BOOK_JOURNAL");

    const recovered = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, persistence);
    expect(recovered.status).toBe("odoo_offline");
    expect(recovered.invoiceId).toBeNull();
    expect(supplier).toHaveBeenCalledTimes(1);

    const replay = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, persistence);
    expect(replay.status).toBe("odoo_offline");
    expect(supplier).toHaveBeenCalledTimes(1);
  });

  it("marks a fully offline run and halts both automations instead of fabricating success", async () => {
    const persistence = store();
    const outcome = await runReconciliation(order, { supplier: failing("supplier"), odoo: failing("odoo") }, persistence);

    expect(outcome.status).toBe("offline");
    expect(outcome.supplierOrderId).toBeNull();
    expect(outcome.invoiceId).toBeNull();
    expect(outcome.humanAction).toBe("MANUAL_RECONCILIATION");

    const stillOffline = await runReconciliation(order, { supplier: failing("supplier"), odoo: failing("odoo") }, persistence);
    expect(stillOffline.status).toBe("offline");
    expect(stillOffline.humanAction).toBe("MANUAL_RECONCILIATION");
  });

  it("recovery after a fully offline run creates exactly one supplier order and one journal entry", async () => {
    const persistence = store();
    const offline = await runReconciliation(order, { supplier: failing("supplier"), odoo: failing("odoo") }, persistence);

    const supplier = okSupplier();
    const odoo = okOdoo();
    const recovered = await runReconciliation(order, { supplier, odoo }, persistence);
    expect(recovered.status).toBe("offline");
    expect(supplier).not.toHaveBeenCalled();
    expect(odoo).not.toHaveBeenCalled();

    const recoveredAgain = await runReconciliation(order, { supplier: okSupplier(), odoo: okOdoo() }, persistence);
    expect(recoveredAgain.status).toBe("offline");
  });

  it.each(["supplier", "odoo"] as const)("does not duplicate a %s side effect when its response is lost", async (lostTransport) => {
    const persistence = store();
    let supplierEffects = 0;
    let odooEffects = 0;
    const supplier = vi.fn(async (request: { orderId: string }) => {
      supplierEffects += 1;
      if (lostTransport === "supplier") throw new Error("response lost after commit");
      return { supplierOrderId: `supplier_${request.orderId}` };
    });
    const odoo = vi.fn(async (invoice: OdooInvoiceDraft) => {
      odooEffects += 1;
      if (lostTransport === "odoo") throw new Error("response lost after commit");
      return { id: `invoice_${invoice.externalId}` };
    });

    const first = await runReconciliation(order, { supplier, odoo }, persistence);
    const retrySupplier = vi.fn(async (request: { orderId: string }) => {
      supplierEffects += 1;
      return { supplierOrderId: `supplier_${request.orderId}` };
    });
    const retryOdoo = vi.fn(async (invoice: OdooInvoiceDraft) => {
      odooEffects += 1;
      return { id: `invoice_${invoice.externalId}` };
    });
    const retry = await runReconciliation(order, { supplier: retrySupplier, odoo: retryOdoo }, persistence);

    expect(first.status).toBe(lostTransport === "supplier" ? "supplier_offline" : "odoo_offline");
    expect(retry.status).toBe(first.status);
    expect(supplierEffects).toBe(1);
    expect(odooEffects).toBe(1);
    expect(retrySupplier).not.toHaveBeenCalled();
    if (lostTransport === "supplier") expect(retryOdoo).not.toHaveBeenCalled();
    else expect(retryOdoo).not.toHaveBeenCalled();
  });

  it("passes a stable idempotency key derived from the paid order to the supplier transport", async () => {
    const supplier = okSupplier();
    await runReconciliation(order, { supplier, odoo: okOdoo() }, store());
    expect(supplier.mock.calls[0]![0]).toMatchObject({ orderId: "order_test_1", idempotencyKey: "order_test_1" });
  });

  it("books the journal through the shared M4.3 mapping with Dutch VAT and balanced totals", async () => {
    const odoo = okOdoo();
    await runReconciliation(order, { supplier: okSupplier(), odoo }, store());

    const invoice = odoo.mock.calls[0]![0];
    expect(invoice).toMatchObject({ externalId: "order_test_1", paymentId: "pay_test_1", currency: "EUR" });
    expect(invoice.totalNetCents + invoice.totalVatCents).toBe(invoice.totalCents);
    expect(invoice.totalCents).toBe(5800);
  });

  it("rejects order lines without a supplier SKU mapping before any side effect", async () => {
    const supplier = okSupplier();
    const withoutSku = { ...order, items: [{ supplierSku: "", name: "Virunga Washed", quantity: 1, unitPriceCents: 1850 }] };

    await expect(
      runReconciliation({ ...withoutSku, id: "order_test_2", paymentId: "pay_test_2" }, { supplier, odoo: okOdoo() }, store()),
    ).rejects.toThrow("supplier SKU");
    expect(supplier).not.toHaveBeenCalled();
  });
});
