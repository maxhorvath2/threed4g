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
	maxQuantity: number | null;
}

// Input type for adding items to cart
export interface AddToCartInput {
	productId: number;
	variantId?: number | null;
	variantName?: string | null;
	name: string;
	price: number;
	image_url: string;
	maxQuantity?: number | null;
}

export interface CartValidationResult {
	id: string;
	resolvedItemId: string;
	resolvedVariantId: number | null;
	resolvedVariantName: string | null;
	availableQuantity: number;
	allowedQuantity: number;
}

interface CartStore {
	items: CartItem[];
	isOpen: boolean;

	// Actions
	addItem: (product: AddToCartInput) => void;
	removeItem: (id: string) => void;
	updateQuantity: (id: string, quantity: number) => void;
	syncItemsWithStock: (validatedItems: CartValidationResult[]) => void;
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
				const parsedMaxQuantity = Number(product.maxQuantity ?? 0);
				const maxQuantity =
					Number.isFinite(parsedMaxQuantity) && parsedMaxQuantity > 0
						? Math.floor(parsedMaxQuantity)
						: 0;

				if (maxQuantity <= 0) {
					return;
				}

				const cartItemId = getCartItemId(
					product.productId,
					product.variantId,
				);
				const existingItem = items.find(
					(item) => item.id === cartItemId,
				);

				if (existingItem) {
					const existingMax =
						existingItem.maxQuantity && existingItem.maxQuantity > 0
							? existingItem.maxQuantity
							: maxQuantity;
					const effectiveMax = Math.min(existingMax, maxQuantity);
					set({
						items: items.map((item) =>
							item.id === cartItemId
								? {
										...item,
										quantity: Math.min(
											item.quantity + 1,
											effectiveMax,
										),
										maxQuantity: effectiveMax,
									}
								: item,
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
								maxQuantity,
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
						item.id === id
							? {
									...item,
									quantity:
										item.maxQuantity && item.maxQuantity > 0
											? Math.min(
													quantity,
													item.maxQuantity,
												)
											: quantity,
								}
							: item,
					),
				});
			},

			syncItemsWithStock: (validatedItems) => {
				if (validatedItems.length === 0) {
					return;
				}

				const currentItems = get().items;
				const currentItemsById = new Map(
					currentItems.map((item) => [item.id, item]),
				);
				const nextItemsById = new Map<string, CartItem>();

				for (const validated of validatedItems) {
					const existingItem = currentItemsById.get(validated.id);
					if (!existingItem) {
						continue;
					}

					if (validated.allowedQuantity <= 0) {
						continue;
					}

					const targetId = validated.resolvedItemId || validated.id;
					const clampedQuantity = Math.min(
						existingItem.quantity,
						validated.allowedQuantity,
					);

					const nextItem: CartItem = {
						...existingItem,
						id: targetId,
						variantId: validated.resolvedVariantId,
						variantName:
							validated.resolvedVariantName ??
							existingItem.variantName,
						quantity: clampedQuantity,
						maxQuantity: validated.availableQuantity,
					};

					const duplicateTarget = nextItemsById.get(targetId);
					if (duplicateTarget) {
						nextItemsById.set(targetId, {
							...duplicateTarget,
							quantity: Math.min(
								duplicateTarget.quantity + nextItem.quantity,
								nextItem.maxQuantity ??
									duplicateTarget.quantity,
							),
							maxQuantity: nextItem.maxQuantity,
						});
						continue;
					}

					nextItemsById.set(targetId, nextItem);
				}

				const nextItems = Array.from(nextItemsById.values());
				const currentSerialized = JSON.stringify(currentItems);
				const nextSerialized = JSON.stringify(nextItems);

				if (currentSerialized !== nextSerialized) {
					set({ items: nextItems });
				}
			},

			clearCart: () => set({ items: [] }),

			toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
			openCart: () => set({ isOpen: true }),
			closeCart: () => set({ isOpen: false }),

			getItemCount: () => {
				return get().items.reduce(
					(total, item) => total + item.quantity,
					0,
				);
			},

			getTotal: () => {
				return get().items.reduce(
					(total, item) => total + Number(item.price) * item.quantity,
					0,
				);
			},
		}),
		{
			name: "threed4g-cart",
		},
	),
);
