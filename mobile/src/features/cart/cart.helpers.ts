import type { Product } from '@/shared/types/api';
import type { CartItem, CartItemOption } from './cart.store';

/** Selected option-item ids keyed by option id. */
export type OptionSelection = Record<number, number[]>;

/** Live unit price = base price + selected option extras. */
export function computeUnitPrice(product: Product, selected: OptionSelection): number {
  const extra = (product.options ?? []).reduce((sum, o) => {
    const ids = selected[o.id] ?? [];
    return sum + o.items.filter((it) => ids.includes(it.id)).reduce((s, it) => s + it.extraPrice, 0);
  }, 0);
  return product.price + extra;
}

/** Returns the name of the first unsatisfied required option, or null if all good. */
export function missingRequiredOption(product: Product, selected: OptionSelection): string | null {
  for (const o of product.options ?? []) {
    if (o.isRequired && !(selected[o.id]?.length)) return o.name;
  }
  return null;
}

/** Assemble a cart item (without its key — the store derives that) from a product + selection. */
export function buildCartItem(product: Product, selected: OptionSelection, quantity: number): Omit<CartItem, 'key'> {
  const options: CartItemOption[] = (product.options ?? []).flatMap((o) =>
    (selected[o.id] ?? []).map((iid) => {
      const it = o.items.find((x) => x.id === iid)!;
      return { optionItemId: it.id, name: it.name, price: it.extraPrice };
    }),
  );
  return {
    productId: product.id,
    name: product.name,
    image: product.image,
    basePrice: product.price,
    unitPrice: computeUnitPrice(product, selected),
    starCost: product.starCost ?? 0,
    quantity,
    options,
  };
}
