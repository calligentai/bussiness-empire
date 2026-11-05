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
      { description: "Virunga Washed", quantity: 2, netCents: 3058, vatCents: 642, vatRate: 0.21 },
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

  it("serializes concurrent paid events for the same order", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const createInvoice = vi.fn(async (invoice) => {
      await gate;
      return { id: "invoice_1", ...invoice };
    });
    const sync = createOdooJournalSync({ createInvoice });
    const event = { id: "evt_paid_1", type: "order.paid" as const, order: paidOrder };

    const first = sync.handle(event);
    const duplicate = sync.handle({ ...event, id: "evt_paid_2" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createInvoice).toHaveBeenCalledTimes(1);
    release();
    const results = await Promise.all([first, duplicate]);
    expect(results.map((result) => result.status).sort()).toEqual(["booked", "duplicate"]);
  });

  it("does not create the same refund credit note concurrently twice", async () => {
    const createInvoice = vi.fn(async (invoice) => ({ id: "invoice_1", ...invoice }));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const createCreditNote = vi.fn(async (creditNote) => {
      await gate;
      return { id: "credit_1", ...creditNote };
    });
    const sync = createOdooJournalSync({ createInvoice, createCreditNote });
    await sync.handle({ id: "evt_paid_1", type: "order.paid", order: paidOrder });

    const refund = {
      id: "evt_refund_1",
      type: "order.refunded" as const,
      orderId: paidOrder.id,
      refundId: "refund_1",
      amountCents: 2000,
    };
    const first = sync.handle(refund);
    const duplicate = sync.handle({ ...refund, id: "evt_refund_2" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createCreditNote).toHaveBeenCalledTimes(1);
    release();
    const results = await Promise.all([first, duplicate]);
    expect(results.map((result) => result.status).sort()).toEqual(["duplicate", "refunded"]);
    expect(createCreditNote).toHaveBeenCalledTimes(1);
  });

  it("accepts multiple partial refunds within the invoice total", async () => {
    const createInvoice = vi.fn(async (invoice) => ({ id: "invoice_1", ...invoice }));
    const createCreditNote = vi.fn(async (creditNote) => ({ id: "credit_1", ...creditNote }));
    const sync = createOdooJournalSync({ createInvoice, createCreditNote });

    await sync.handle({ id: "evt_paid_1", type: "order.paid", order: paidOrder });
    const first = await sync.handle({
      id: "evt_refund_1", type: "order.refunded", orderId: paidOrder.id,
      refundId: "refund_1", amountCents: 3000,
    });
    const second = await sync.handle({
      id: "evt_refund_2", type: "order.refunded", orderId: paidOrder.id,
      refundId: "refund_2", amountCents: 2800,
    });

    expect([first.status, second.status]).toEqual(["refunded", "refunded"]);
    expect(createCreditNote).toHaveBeenCalledTimes(2);
    expect(createCreditNote.mock.calls.map(([creditNote]) => creditNote.amountCents)).toEqual([3000, 2800]);
  });

  it("caps concurrent partial refunds at the original invoice total", async () => {
    const createInvoice = vi.fn(async (invoice) => ({ id: "invoice_1", ...invoice }));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const createCreditNote = vi.fn(async (creditNote) => {
      await gate;
      return { id: "credit_1", ...creditNote };
    });
    const sync = createOdooJournalSync({ createInvoice, createCreditNote });
    await sync.handle({ id: "evt_paid_1", type: "order.paid", order: paidOrder });

    const first = sync.handle({
      id: "evt_refund_1", type: "order.refunded", orderId: paidOrder.id,
      refundId: "refund_1", amountCents: 4000,
    });
    const excess = sync.handle({
      id: "evt_refund_2", type: "order.refunded", orderId: paidOrder.id,
      refundId: "refund_2", amountCents: 2500,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createCreditNote).toHaveBeenCalledTimes(1);
    release();
    const results = await Promise.allSettled([first, excess]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(createCreditNote).toHaveBeenCalledTimes(1);
  });
});
