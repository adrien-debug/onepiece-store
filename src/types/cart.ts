export interface CartLine {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  currency: string;
  updatedAt: string;
}
