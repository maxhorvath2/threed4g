import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
	id: number;
	name: string;
	price: number;
	image_url: string;
	quantity: number;
}

interface CartStore {
	items: CartItem[];
	isOpen: boolean;

	// Actions
	addItem: (product: Omit<CartItem, "quantity">) => void;
	removeItem: (id: number) => void;
	updateQuantity: (id: number, quantity: number) => void;
	clearCart: () => void;
	toggleCart: () => void;
	openCart: () => void;
	closeCart: () => void;

	// Computed
	getItemCount: () => number;
	getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
	persist(
		(set, get) => ({
			items: [],
			isOpen: false,

			addItem: (product) => {
				const items = get().items;
				const existingItem = items.find((item) => item.id === product.id);

				if (existingItem) {
					set({
						items: items.map((item) =>
							item.id === product.id
								? { ...item, quantity: item.quantity + 1 }
								: item
						),
					});
				} else {
					set({
						items: [...items, { ...product, quantity: 1 }],
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
