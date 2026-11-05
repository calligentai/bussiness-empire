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
  const leases = new Map<string, string>();
  let nextLease = 0;
  return {
    async claim(id) {
      const record = records.get(id) ?? { supplierOrderId: null, invoiceId: null, supplierState: "pending", odooState: "pending" };
      if (leases.has(id)) return { acquired: false, reason: "busy", record } as const;
      if (record.supplierState === "complete" && record.odooState === "complete") {
        return { acquired: false, reason: "complete", record } as const;
      }
      const leaseToken = `lease-${++nextLease}`;
      leases.set(id, leaseToken);
      records.set(id, record);
      return { acquired: true, leaseToken, record } as const;
    },
    async read(id) { return records.get(id) ?? null; },
    async finalize(id, leaseToken, record) {
      if (leases.get(id) !== leaseToken) throw new Error("reconciliation lease lost");
      records.set(id, record);
    },
    async release(id, leaseToken) {
      if (leases.get(id) === leaseToken) leases.delete(id);
    },
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
    expect(outcome.humanAction).toBe("VERIFY_SUPPLIER_ORDER");
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
    expect(outcome.humanAction).toBe("VERIFY_ODOO_JOURNAL");

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

  it("does not retry either transport automatically after a fully offline run", async () => {
    const persistence = store();
    await runReconciliation(order, { supplier: failing("supplier"), odoo: failing("odoo") }, persistence);

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
    expect(retry.humanAction).toBe(lostTransport === "supplier" ? "VERIFY_SUPPLIER_ORDER" : "VERIFY_ODOO_JOURNAL");
    expect(supplierEffects).toBe(1);
    expect(odooEffects).toBe(1);
    expect(retrySupplier).not.toHaveBeenCalled();
    if (lostTransport === "supplier") expect(retryOdoo).not.toHaveBeenCalled();
    else expect(retryOdoo).not.toHaveBeenCalled();
  });

  it("rejects writes from a released lease owner", async () => {
    const persistence = store();
    const previous = await persistence.claim(order.id);
    expect(previous.acquired).toBe(true);
    if (!previous.acquired) throw new Error("expected initial claim to acquire the order");

    await persistence.release(order.id, previous.leaseToken);
    const current = await persistence.claim(order.id);
    expect(current.acquired).toBe(true);
    if (!current.acquired) throw new Error("expected replacement claim to acquire the order");

    const record: ReconciliationRecord = {
      supplierOrderId: null,
      invoiceId: null,
      supplierState: "uncertain",
      odooState: "pending",
    };
    await expect(persistence.finalize(order.id, previous.leaseToken, record)).rejects.toThrow("lease lost");
    await persistence.finalize(order.id, current.leaseToken, record);
    await persistence.release(order.id, current.leaseToken);
  });

  it("allows only one overlapping reconciliation to reach the transports", async () => {
    const persistence = store();
    let releaseSupplier!: () => void;
    let markSupplierStarted!: () => void;
    const supplierGate = new Promise<void>((resolve) => { releaseSupplier = resolve; });
    const supplierStarted = new Promise<void>((resolve) => { markSupplierStarted = resolve; });
    const firstSupplier = vi.fn(async (request: { orderId: string }) => {
      markSupplierStarted();
      await supplierGate;
      return { supplierOrderId: `supplier_${request.orderId}` };
    });
    const firstOdoo = okOdoo();
    const first = runReconciliation(order, { supplier: firstSupplier, odoo: firstOdoo }, persistence);

    await supplierStarted;
    const secondSupplier = okSupplier();
    const secondOdoo = okOdoo();
    const second = await runReconciliation(order, { supplier: secondSupplier, odoo: secondOdoo }, persistence);
    expect(second.status).toBe("in_progress");
    expect(secondSupplier).not.toHaveBeenCalled();
    expect(secondOdoo).not.toHaveBeenCalled();

    releaseSupplier();
    expect((await first).status).toBe("reconciled");
  });

  it.each(["supplier", "odoo"] as const)("does not replay a %s side effect if completion persistence fails after the remote call", async (side) => {
    const base = store();
    let failCompletionWrite = true;
    const persistence: ReconciliationStore = {
      claim: (id) => base.claim(id),
      read: (id) => base.read(id),
      release: (id, leaseToken) => base.release(id, leaseToken),
      async finalize(id, leaseToken, record) {
        const isRemoteCompletion = side === "supplier"
          ? record.supplierState === "complete"
          : record.odooState === "complete";
        if (failCompletionWrite && isRemoteCompletion) {
          failCompletionWrite = false;
          throw new Error("simulated process crash before completion was persisted");
        }
        await base.finalize(id, leaseToken, record);
      },
    };
    let supplierEffects = 0;
    let odooEffects = 0;
    const supplier = vi.fn(async (request: { orderId: string }) => {
      supplierEffects += 1;
      return { supplierOrderId: `supplier_${request.orderId}` };
    });
    const odoo = vi.fn(async (invoice: OdooInvoiceDraft) => {
      odooEffects += 1;
      return { id: `invoice_${invoice.externalId}` };
    });

    await expect(runReconciliation(order, { supplier, odoo }, persistence))
      .rejects.toThrow("simulated process crash");

    await runReconciliation(order, { supplier, odoo }, persistence);
    expect(supplierEffects).toBe(1);
    expect(odooEffects).toBe(1);
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
