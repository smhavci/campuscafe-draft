/**
 * Shared API DTOs — mirror the backend response contracts.
 * Feature modules import these; keep them in sync with api/src/modules/*.
 */
export type Role = 'student' | 'teacher' | 'cafeOwner';
export type OrderStatus = 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'credit_card' | 'wallet' | 'stars';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  studentNumber: string | null;
  email: string | null;
  role: Role;
  cafeId: number | null;
  stars: number;
  cafeName?: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Cafe {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  rating: number;
  openHours: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  color: string;
}

export interface Category {
  id: number;
  name: string;
  displayName: string;
  icon: string;
  description: string;
}

export interface ProductOptionItem {
  id: number;
  name: string;
  extraPrice: number;
}
export interface ProductOption {
  id: number;
  name: string;
  type: 'radio' | 'checkbox';
  isRequired: boolean;
  items: ProductOptionItem[];
}
export interface Product {
  id: number;
  cafeId: number;
  name: string;
  category: string;
  price: number;
  description: string | null;
  image: string | null;
  calories?: number;
  allergens?: string[];
  ingredients?: string;
  starCost?: number;
  options?: ProductOption[];
}

export interface OrderItem {
  itemId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note: string;
  itemStatus: 'active' | 'cancelled';
  cancelReason: string;
  productName: string;
  productImage: string | null;
  options: { name: string | null; price: number }[];
}
export interface Order {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  starsSpent: number;
  pickupTime: string | null;
  paymentMethod: PaymentMethod;
  createdAt: string;
  cafeName: string | null;
  items: OrderItem[];
}

export interface CreateOrderItemInput {
  productId: number;
  quantity: number;
  options?: number[];
  note?: string;
}
export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  cafeId?: number;
  pickupTime?: string;
  paymentMethod: PaymentMethod;
}
