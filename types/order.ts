export interface CartItem {
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  dealerId?: string;
  items: CartItem[];
  totalCents: number;
  status: "pending" | "paid" | "failed" | "refunded";
  paymentId: string | null;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  error?: string;
}