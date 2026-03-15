"use client";

import { useSyncExternalStore } from "react";
import { useCartStore } from "@/lib/store/cart";
import { MagneticButton } from "@/components/animations/MagneticButton";

export function CartButton() {
	const toggleCart = useCartStore((state) => state.toggleCart);
	const itemCount = useCartStore((state) => state.getItemCount());
	const isClient = useSyncExternalStore(
		() => () => {
			// No external subscription needed; this only provides a hydration-safe client flag.
		},
		() => true,
		() => false,
	);

	return (
		<MagneticButton strength={0.2}>
			<button
				onClick={toggleCart}
				className="relative p-2.5 hover:bg-white/5 rounded-xl transition-colors"
				aria-label="Open cart"
			>
				<svg
					className="w-5 h-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
					/>
				</svg>

				{isClient && itemCount > 0 && (
					<span className="absolute -top-1 -right-1 w-5 h-5 bg-[#22c55e] text-[#050505] text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
						{itemCount > 9 ? "9+" : itemCount}
					</span>
				)}
			</button>
		</MagneticButton>
	);
}
