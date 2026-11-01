import type {
  OdooCreditNoteDraft,
  OdooInvoiceDraft,
  OdooSyncEvent,
} from "../../packages/contracts/odoo/index";

export interface OdooJournalClient {
  createInvoice(invoice: OdooInvoiceDraft): Promise<{ id: string } & OdooInvoiceDraft>;
  createCreditNote?(creditNote: OdooCreditNoteDraft): Promise<{ id: string } & OdooCreditNoteDraft>;
}

const VAT_RATE = 0.21;

export function mapPaidOrder(order: Extract<OdooSyncEvent, { type: "order.paid" }>['order']): OdooInvoiceDraft {
  if (order.status !== "paid" || !order.items.length) throw new Error("Only non-empty paid orders can be invoiced");
  if (!order.id || !order.paymentId || !order.currency) throw new Error("Paid order is missing accounting identifiers");
  let totalNetCents = 0;
  let totalVatCents = 0;
  const lines = order.items.map((item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents <= 0) {
      throw new Error("Order lines require positive integer quantities and prices in cents");
    }
    const grossCents = item.quantity * item.unitPriceCents;
    if (!Number.isSafeInteger(grossCents)) throw new Error("Order line exceeds safe cents precision");
    const netCents = Math.round(grossCents / (1 + VAT_RATE));
    const vatCents = grossCents - netCents;
    totalNetCents += netCents;
    totalVatCents += vatCents;
    return { description: item.name, quantity: item.quantity, netCents, vatCents, vatRate: VAT_RATE as 0.21 };
  });
  const totalCents = totalNetCents + totalVatCents;
  const orderTotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  if (totalCents !== orderTotal) throw new Error("Invoice totals do not balance to the paid order");
  return { externalId: order.id, paymentId: order.paymentId, currency: order.currency.toUpperCase(), lines, totalNetCents, totalVatCents, totalCents };
}

export function createOdooJournalSync(client: OdooJournalClient) {
  const processedEvents = new Set<string>();
  const invoicesByOrder = new Map<string, { id: string; currency: string; totalCents: number }>();
  const processedRefunds = new Set<string>();

  return {
    async handle(event: OdooSyncEvent) {
      if (processedEvents.has(event.id)) return { status: "duplicate" as const };
      if (event.type === "order.paid") {
        const invoiceDraft = mapPaidOrder(event.order);
        const existing = invoicesByOrder.get(event.order.id);
        if (existing) {
          processedEvents.add(event.id);
          return { status: "duplicate" as const, invoiceId: existing.id };
        }
        const invoice = await client.createInvoice(invoiceDraft);
        invoicesByOrder.set(event.order.id, { id: invoice.id, currency: invoice.currency, totalCents: invoice.totalCents });
        processedEvents.add(event.id);
        return { status: "booked" as const, invoiceId: invoice.id };
      }

      const invoice = invoicesByOrder.get(event.orderId);
      if (!invoice) throw new Error("Refund has no previously synced invoice");
      if (!Number.isSafeInteger(event.amountCents) || event.amountCents <= 0 || event.amountCents > invoice.totalCents) {
        throw new Error("Refund amount must be positive and cannot exceed the invoice total");
      }
      if (processedRefunds.has(event.refundId)) {
        processedEvents.add(event.id);
        return { status: "duplicate" as const, invoiceId: invoice.id };
      }
      if (!client.createCreditNote) throw new Error("Odoo credit note client is required to sync refunds");
      const creditNote = await client.createCreditNote({ externalId: event.refundId, invoiceId: invoice.id, amountCents: event.amountCents, currency: invoice.currency });
      processedRefunds.add(event.refundId);
      processedEvents.add(event.id);
      return { status: "refunded" as const, creditNoteId: creditNote.id, invoiceId: invoice.id };
    },
  };
}
