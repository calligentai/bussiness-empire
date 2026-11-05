import { describe, expect, it, vi } from "vitest";
import { createOdooJournalSync } from "../../apps/odoo-sync/journal";
import type { PaidOrderEvent } from "../../packages/contracts/odoo/index";

const paidOrder: PaidOrderEvent = {
  id: "order_test_1",
  paymentId: "pay_test_1",
  currency: "EUR",
  status: "paid",
  items: [
    { name: "Virunga Washed", quantity: 2, unitPriceCents: 1850 },
    { name: "Kivu Natural", quantity: 1, unitPriceCents: 2100 },
  ],
};

describe("Odoo journal sync", () => {
  it("maps one paid order to a balanced journal with Dutch VAT", async () => {
    const createInvoice = vi.fn(async (invoice) => ({ id: "invoice_1", ...invoice }));
    const sync = createOdooJournalSync({ createInvoice });

    await sync.handle({ id: "evt_paid_1", type: "order.paid", order: paidOrder });

    expect(createInvoice).toHaveBeenCalledTimes(1);
    const invoice = createInvoice.mock.calls[0]![0];
    expect(invoice.externalId).toBe("order_test_1");
    expect(invoice.lines).toEqual([
      { description: "Virunga Washed", quantity: 2, netCents: 3364, vatCents: 736, vatRate: 0.21 },
      { description: "Kivu Natural", quantity: 1, netCents: 1736, vatCents: 364, vatRate: 0.21 },
    ]);
    expect(invoice.totalNetCents + invoice.totalVatCents).toBe(invoice.totalCents);
    expect(invoice.totalCents).toBe(5800);
  });

  it("creates one booking when the paid webhook is replayed", async () => {
    const createInvoice = vi.fn(async (invoice) => ({ id: "invoice_1", ...invoice }));
    const sync = createOdooJournalSync({ createInvoice });
    const event = { id: "evt_paid_1", type: "order.paid" as const, order: paidOrder };

    await sync.handle(event);
    await sync.handle(event);

    expect(createInvoice).toHaveBeenCalledTimes(1);
  });

  it("records refunds against the original invoice without creating a second booking", async () => {
    const createInvoice = vi.fn(async (invoice) => ({ id: "invoice_1", ...invoice }));
    const createCreditNote = vi.fn(async (creditNote) => ({ id: "credit_1", ...creditNote }));
    const sync = createOdooJournalSync({ createInvoice, createCreditNote });

    await sync.handle({ id: "evt_paid_1", type: "order.paid", order: paidOrder });
    const result = await sync.handle({
      id: "evt_refund_1", type: "order.refunded", orderId: paidOrder.id,
      refundId: "refund_1", amountCents: 5800,
    });

    expect(result).toMatchObject({ status: "refunded", creditNoteId: "credit_1" });
    expect(createCreditNote).toHaveBeenCalledWith({
      externalId: "refund_1", invoiceId: "invoice_1", amountCents: 5800, currency: "EUR",
    });
    expect(createInvoice).toHaveBeenCalledTimes(1);
  });
});
