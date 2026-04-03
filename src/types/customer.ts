export type CustomerId = string;

export interface Customer {
  id: CustomerId;
  email: string;
  name?: string;
  phone?: string;
  createdAt: string;
}
