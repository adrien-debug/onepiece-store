export type ProductId = string;

export interface Product {
  id: ProductId;
  slug: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  images: string[];
  categoryId?: string;
  inStock: boolean;
  metadata?: Record<string, string>;
}
