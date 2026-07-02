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

export interface Campaign {
  id: number;
  title: string;
  description: string | null;
  discount: string | null;
  badge: string | null;
  validUntil: string | null;
  image: string | null;
  relatedProductIds: number[];
  targetRole: 'all' | 'student' | 'teacher';
  // Present on the global /campaigns feed; absent on /cafes/:slug/campaigns.
  cafeId?: number;
  cafeName?: string;
  cafeSlug?: string;
  starMultiplier?: number;
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

export interface Favorite {
  id: number;
  productId: number;
  createdAt: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  image: string | null;
  cafeId: number;
  cafeName: string;
  cafeSlug: string;
}

/** Product enriched with its cafe, as returned by /products/search. */
export interface SearchProduct extends Product {
  cafeName: string;
  cafeSlug: string;
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

export interface LoyaltyCard {
  id: number;
  stamps: number;
  totalRedeemed: number;
  cafeId: number;
  cafeName: string;
  cafeSlug: string;
  cafeImage: string | null;
  cafeColor: string;
  stampsRequired: number;
}
export interface LoyaltyStatus {
  stars: number;
  cards: { stamps: number; cafeName: string; cafeId: number }[];
  nextRewardThreshold: number;
}
export interface StarHistory {
  id: number;
  date: string;
  description: string;
  change: string;
  type: 'earn' | 'redeem';
}
export interface CoffeeOption {
  id: number;
  name: string;
  price: number;
  description: string | null;
  image: string | null;
}
export interface SavedDrink {
  id: number;
  name: string;
  selectedOptions: unknown;
  totalPrice: number;
  createdAt: string;
  productId: number;
  productName: string;
  productImage: string | null;
  basePrice: number;
  cafeName: string;
  cafeSlug: string;
}

// ── Cafe owner (dashboard + menu management) ────────────────
export interface DashboardItem {
  id: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note: string;
  status: 'active' | 'cancelled';
  cancelReason: string;
  productName: string;
  productImage: string | null;
  options: { name: string | null; price: number }[];
}
export interface DashboardOrder {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  pickupTime: string | null;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerRole: Role;
  items: DashboardItem[];
}
export interface Analytics {
  date: string;
  orderCount: number;
  totalRevenue: number;
  byStatus: { status: string; count: number }[];
  topProducts: { name: string; totalQty: number; totalSales: number }[];
}
export interface WeeklyPoint {
  date: string;
  orderCount: number;
  revenue: number;
}
export interface OwnerProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string | null;
  image: string | null;
  isAvailable: boolean;
}
export interface OwnerCampaign {
  id: number;
  title: string;
  description: string | null;
  discount: string | null;
  badge: string | null;
  validUntil: string | null;
  image: string | null;
  relatedProductIds: number[];
  targetRole: 'all' | 'student' | 'teacher';
  isActive: boolean;
  starMultiplier: number;
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
