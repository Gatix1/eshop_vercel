export type CartItem = {
  key: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  image?: string | null;
  quantity: number;
};

export function cartItemKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? "base"}`;
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
