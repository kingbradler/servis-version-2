export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  stock: number;
  status: string;
  store_name: string;
  store_slug: string;
}

export interface CartItem {
  id: string;
  product: CartProduct;
  quantity: number;
  line_total: string;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  items_count: number;
  total_amount: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
  created_at: string;
}

export interface OrderStoreRef {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  whatsapp?: string;
}

export interface OrderClientRef {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface Order {
  id: string;
  store: OrderStoreRef;
  store_name_snapshot: string;
  status: OrderStatus;
  total_amount: string;
  delivery_name?: string;
  delivery_phone?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  /** Present on seller order detail only */
  client?: OrderClientRef;
}

export interface CheckoutDelivery {
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  delivery_city?: string;
  delivery_notes?: string;
}

export interface CheckoutResponse {
  count: number;
  orders: Order[];
}

export interface PaginatedOrders {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
}
