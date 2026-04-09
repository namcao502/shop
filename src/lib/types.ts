export type PaymentMethod = "vietqr" | "momo";
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus = "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string;
  stock: number;
  isPublished: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  ward: string;
  province: string;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  slug: string;
}

export type NotificationType =
  | "order_placed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "payment_confirmed"
  | "address_updated"
  | "new_order"
  | "payment_received"
  | "cancel_requested"
  | "address_update_requested"
  | "order_deleted";

export interface Notification {
  id: string;           // Firestore doc id, added on read
  userId: string;       // Firebase UID or the literal string "admin"
  type: NotificationType;
  title: string;
  message: string;
  orderId: string | null;
  orderCode: string | null;
  read: boolean;
  createdAt: Date;
}
