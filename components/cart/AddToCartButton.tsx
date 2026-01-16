"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useCartStore } from "@/lib/store/cart";
import { Button, ButtonProps } from "@/components/ui/Button";

interface AddToCartButtonProps extends Omit<ButtonProps, "onClick"> {
	product: {
		id: number;
		name: string;
		price: number | null;
		image_url: string;
	};
	showPrice?: boolean;
}

export function AddToCartButton({
	product,
	showPrice = true,
	className,
	size = "md",
	...props
}: AddToCartButtonProps) {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const addItem = useCartStore((state) => state.addItem);

	const handleClick = () => {
		if (!product.price) return;

		addItem({
			id: product.id,
			name: product.name,
			price: Number(product.price),
			image_url: product.image_url,
		});

		// Success animation
		if (buttonRef.current) {
			gsap
				.timeline()
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

	const hasPrice = product.price !== null && product.price !== undefined;

	return (
		<Button
			ref={buttonRef}
			onClick={handleClick}
			className={className}
			size={size}
			disabled={!hasPrice}
			{...props}
		>
			{hasPrice ? (
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
					{showPrice ? `Add to Cart - $${Number(product.price).toFixed(2)}` : "Add to Cart"}
				</>
			) : (
				"Price Coming Soon"
			)}
		</Button>
	);
}
