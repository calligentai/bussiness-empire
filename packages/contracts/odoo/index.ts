export interface PaidOrderEvent {
  id: string;
  paymentId: string;
  currency: string;
  status: "paid";
  items: Array<{
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
}

export interface OdooInvoiceLine {
  description: string;
  quantity: number;
  netCents: number;
  vatCents: number;
  vatRate: 0.21;
}

export interface OdooInvoiceDraft {
  externalId: string;
  paymentId: string;
  currency: string;
  lines: OdooInvoiceLine[];
  totalNetCents: number;
  totalVatCents: number;
  totalCents: number;
}

export interface OdooInvoice {
  id: string;
  externalId: string;
  paymentId: string;
  currency: string;
  lines: OdooInvoiceLine[];
  totalNetCents: number;
  totalVatCents: number;
  totalCents: number;
}

export interface OdooCreditNoteDraft {
  externalId: string;
  invoiceId: string;
  amountCents: number;
  currency: string;
}

export interface OdooCreditNote {
  id: string;
  externalId: string;
  invoiceId: string;
  amountCents: number;
  currency: string;
}

export type OdooSyncEvent =
  | { id: string; type: "order.paid"; order: PaidOrderEvent }
  | { id: string; type: "order.refunded"; orderId: string; refundId: string; amountCents: number };
