"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { usePostHog } from "@posthog/next";
import { useCartStore } from "@/lib/store/cart";
import { useCurrency } from "@/components/CurrencyProvider";
import { Button, ButtonProps } from "@/components/ui/Button";

interface AddToCartButtonProps extends Omit<ButtonProps, "onClick"> {
	product: {
		id: number;
		name: string;
		price: number | null;
		image_url: string;
	};
	selectedVariant?: {
		id: number;
		name: string;
		price: number;
	};
	stockQuantity?: number;
	showPrice?: boolean;
}

export function AddToCartButton({
	product,
	selectedVariant,
	stockQuantity,
	showPrice = true,
	className,
	size = "md",
	variant,
	disabled,
	...props
}: AddToCartButtonProps) {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const posthog = usePostHog();
	const addItem = useCartStore((state) => state.addItem);
	const { formatPrice } = useCurrency();

	// Use variant price if available, otherwise product price
	const price = selectedVariant?.price ?? product.price;
	const normalizedStock = Number(stockQuantity ?? 0);
	const isSoldOut = Number.isFinite(normalizedStock) && normalizedStock <= 0;

	const handleClick = () => {
		if (price === null || price === undefined || isSoldOut) return;

		addItem({
			productId: product.id,
			variantId: selectedVariant?.id ?? null,
			variantName: selectedVariant?.name ?? null,
			name: product.name,
			price: Number(price),
			image_url: product.image_url,
			maxQuantity: normalizedStock,
		});

		posthog?.capture("product_added_to_cart", {
			product_id: product.id,
			product_name: product.name,
			variant_id: selectedVariant?.id ?? null,
			variant_name: selectedVariant?.name ?? null,
			price: Number(price),
			source_page:
				typeof window !== "undefined" ? window.location.pathname : null,
		});

		// Success animation
		if (buttonRef.current) {
			gsap.timeline()
				.to(buttonRef.current, {
					scale: 0.95,
					duration: 0.1,
				})
				.to(buttonRef.current, {
					scale: 1,
					duration: 0.4,
					ease: "elastic.out(1, 0.3)",
				});
		}
	};

	const hasPrice = price !== null && price !== undefined;
	const isDisabled = disabled || !hasPrice || isSoldOut;

	return (
		<Button
			ref={buttonRef}
			onClick={handleClick}
			className={className}
			size={size}
			variant={variant}
			disabled={isDisabled}
			{...props}
		>
			{isSoldOut ? (
				"Sold Out"
			) : hasPrice ? (
				<>
					<svg
						className="w-4 h-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
					{showPrice
						? `Add to Cart – ${formatPrice(Number(price))}`
						: "Add to Cart"}
				</>
			) : (
				"Price Coming Soon"
			)}
		</Button>
	);
}
