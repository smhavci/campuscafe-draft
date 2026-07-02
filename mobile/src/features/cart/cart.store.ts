import { create } from 'zustand';
import type { CreateOrderInput } from '@/shared/types/api';

export interface CartItemOption {
  optionItemId: number;
  name: string;
  price: number;
}

export interface CartItem {
  /** Stable key = productId + sorted option ids (so identical configs stack). */
  key: string;
  productId: number;
  name: string;
  image: string | null;
  basePrice: number;
  unitPrice: number; // base + options
  starCost: number; // per-unit star cost (0 if not star-redeemable)
  quantity: number;
  note?: string;
  options: CartItemOption[];
}

interface CartState {
  cafeId: number | null;
  cafeName: string | null;
  items: CartItem[];
  /** Adds an item. Cart is single-cafe: adding from another cafe replaces it. */
  add: (cafe: { id: number; name: string }, item: Omit<CartItem, 'key'>) => void;
  setQty: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
  starTotal: () => number;
  allStarRedeemable: () => boolean;
  toOrderInput: (paymentMethod: CreateOrderInput['paymentMethod']) => CreateOrderInput;
}

const itemKey = (productId: number, options: CartItemOption[]): string =>
  `${productId}:${options.map((o) => o.optionItemId).sort((a, b) => a - b).join(',')}`;

export const useCartStore = create<CartState>((set, get) => ({
  cafeId: null,
  cafeName: null,
  items: [],

  add: (cafe, item) =>
    set((state) => {
      // Single-cafe lock: switching cafes empties the cart.
      const base = state.cafeId && state.cafeId !== cafe.id ? [] : state.items;
      const key = itemKey(item.productId, item.options);
      const existing = base.find((i) => i.key === key);
      const items = existing
        ? base.map((i) => (i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i))
        : [...base, { ...item, key }];
      return { items, cafeId: cafe.id, cafeName: cafe.name };
    }),

  setQty: (key, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        const items = state.items.filter((i) => i.key !== key);
        return items.length === 0 ? { items, cafeId: null, cafeName: null } : { items };
      }
      return { items: state.items.map((i) => (i.key === key ? { ...i, quantity } : i)) };
    }),

  remove: (key) =>
    set((state) => {
      const items = state.items.filter((i) => i.key !== key);
      return items.length === 0 ? { items, cafeId: null, cafeName: null } : { items };
    }),

  clear: () => set({ items: [], cafeId: null, cafeName: null }),

  count: () => get().items.reduce((n, i) => n + i.quantity, 0),

  subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  starTotal: () => get().items.reduce((sum, i) => sum + i.starCost * i.quantity, 0),

  allStarRedeemable: () => get().items.length > 0 && get().items.every((i) => i.starCost > 0),

  toOrderInput: (paymentMethod) => ({
    cafeId: get().cafeId ?? undefined,
    paymentMethod,
    items: get().items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      note: i.note,
      options: i.options.map((o) => o.optionItemId),
    })),
  }),
}));
