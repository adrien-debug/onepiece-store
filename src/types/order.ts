export type OrderId = string;

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderLine {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  title: string;
}

export interface Order {
  id: OrderId;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  lines: OrderLine[];
  totalCents: number;
  currency: string;
}
