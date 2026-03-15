"use client";

import { useEffect } from "react";
import { CartValidationResult, useCartStore } from "@/lib/store/cart";

interface ValidateResponse {
	items?: CartValidationResult[];
}

export function CartStockSync() {
	useEffect(() => {
		let cancelled = false;

		const validateCartStock = async () => {
			const { items, syncItemsWithStock } = useCartStore.getState();
			if (items.length === 0) {
				return;
			}

			try {
				const response = await fetch("/api/cart/validate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						items: items.map((item) => ({
							id: item.id,
							productId: item.productId,
							variantId: item.variantId,
							quantity: item.quantity,
						})),
					}),
				});

				if (!response.ok) {
					return;
				}

				const data = (await response.json()) as ValidateResponse;
				if (cancelled || !Array.isArray(data.items)) {
					return;
				}

				syncItemsWithStock(data.items);
			} catch {
				// Ignore validation failures; checkout flow will validate server-side again.
			}
		};

		const runWhenHydrated = () => {
			void validateCartStock();
		};

		if (useCartStore.persist.hasHydrated()) {
			runWhenHydrated();
		}

		const unsubscribe = useCartStore.persist.onFinishHydration(() => {
			runWhenHydrated();
		});

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, []);

	return null;
}
