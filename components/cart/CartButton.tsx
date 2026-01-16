"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart";
import { MagneticButton } from "@/components/animations/MagneticButton";

export function CartButton() {
	const { toggleCart, getItemCount } = useCartStore();
	const [mounted, setMounted] = useState(false);
	const [itemCount, setItemCount] = useState(0);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (mounted) {
			setItemCount(getItemCount());
		}
	}, [mounted, getItemCount]);

	// Subscribe to store changes
	useEffect(() => {
		if (!mounted) return;

		const unsubscribe = useCartStore.subscribe((state) => {
			setItemCount(state.getItemCount());
		});

		return () => unsubscribe();
	}, [mounted]);

	if (!mounted) {
		return (
			<button className="relative p-2.5 rounded-xl transition-colors" aria-label="Open cart">
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
			</button>
		);
	}

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

				{itemCount > 0 && (
					<span className="absolute -top-1 -right-1 w-5 h-5 bg-[#22c55e] text-[#050505] text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
						{itemCount > 9 ? "9+" : itemCount}
					</span>
				)}
			</button>
		</MagneticButton>
	);
}
