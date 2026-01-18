import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
	id: string; // Composite key: "productId" or "productId-variantId"
	productId: number;
	variantId: number | null;
	variantName: string | null;
	name: string;
	price: number;
	image_url: string;
	quantity: number;
}

// Input type for adding items to cart
export interface AddToCartInput {
	productId: number;
	variantId?: number | null;
	variantName?: string | null;
	name: string;
	price: number;
	image_url: string;
}

interface CartStore {
	items: CartItem[];
	isOpen: boolean;

	// Actions
	addItem: (product: AddToCartInput) => void;
	removeItem: (id: string) => void;
	updateQuantity: (id: string, quantity: number) => void;
	clearCart: () => void;
	toggleCart: () => void;
	openCart: () => void;
	closeCart: () => void;

	// Computed
	getItemCount: () => number;
	getTotal: () => number;
}

// Generate cart item ID from product and variant
function getCartItemId(productId: number, variantId?: number | null): string {
	return variantId ? `${productId}-${variantId}` : `${productId}`;
}

export const useCartStore = create<CartStore>()(
	persist(
		(set, get) => ({
			items: [],
			isOpen: false,

			addItem: (product) => {
				const items = get().items;
				const cartItemId = getCartItemId(product.productId, product.variantId);
				const existingItem = items.find((item) => item.id === cartItemId);

				if (existingItem) {
					set({
						items: items.map((item) =>
							item.id === cartItemId
								? { ...item, quantity: item.quantity + 1 }
								: item
						),
					});
				} else {
					set({
						items: [
							...items,
							{
								id: cartItemId,
								productId: product.productId,
								variantId: product.variantId ?? null,
								variantName: product.variantName ?? null,
								name: product.name,
								price: product.price,
								image_url: product.image_url,
								quantity: 1,
							},
						],
					});
				}

				// Auto-open cart when adding items
				set({ isOpen: true });
			},

			removeItem: (id) => {
				set({
					items: get().items.filter((item) => item.id !== id),
				});
			},

			updateQuantity: (id, quantity) => {
				if (quantity < 1) {
					get().removeItem(id);
					return;
				}

				set({
					items: get().items.map((item) =>
						item.id === id ? { ...item, quantity } : item
					),
				});
			},

			clearCart: () => set({ items: [] }),

			toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
			openCart: () => set({ isOpen: true }),
			closeCart: () => set({ isOpen: false }),

			getItemCount: () => {
				return get().items.reduce((total, item) => total + item.quantity, 0);
			},

			getTotal: () => {
				return get().items.reduce(
					(total, item) => total + Number(item.price) * item.quantity,
					0
				);
			},
		}),
		{
			name: "threed4g-cart",
		}
	)
);
