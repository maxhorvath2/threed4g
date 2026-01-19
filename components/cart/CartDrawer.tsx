"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { useCartStore } from "@/lib/store/cart";
import posthog from "posthog-js";

// useSyncExternalStore pattern for hydration-safe mounting detection
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function CartDrawer() {
	const { items, isOpen, closeCart, removeItem, updateQuantity, getTotal, getItemCount } = useCartStore();
	const drawerRef = useRef<HTMLDivElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);
	const itemsRef = useRef<HTMLDivElement>(null);
	const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

	useEffect(() => {
		if (!mounted || !drawerRef.current || !overlayRef.current) return;

		if (isOpen) {
			// Prevent body scroll
			document.body.style.overflow = "hidden";

			// Animate in
			gsap.to(overlayRef.current, {
				opacity: 1,
				duration: 0.3,
				ease: "power2.out",
			});

			gsap.to(drawerRef.current, {
				x: 0,
				duration: 0.5,
				ease: "power3.out",
			});

			// Stagger items
			if (itemsRef.current && itemsRef.current.children.length > 0) {
				gsap.fromTo(
					itemsRef.current.children,
					{ x: 50, opacity: 0 },
					{
						x: 0,
						opacity: 1,
						duration: 0.4,
						stagger: 0.05,
						ease: "power2.out",
						delay: 0.2,
					}
				);
			}
		} else {
			// Restore body scroll
			document.body.style.overflow = "";

			// Animate out
			gsap.to(overlayRef.current, {
				opacity: 0,
				duration: 0.2,
				ease: "power2.in",
			});

			gsap.to(drawerRef.current, {
				x: "100%",
				duration: 0.3,
				ease: "power2.in",
			});
		}

		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen, mounted]);

	if (!mounted) return null;

	const itemCount = getItemCount();
	const total = getTotal();

	return (
		<>
			{/* Overlay */}
			<div
				ref={overlayRef}
				className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-100 opacity-0 ${
					isOpen ? "pointer-events-auto" : "pointer-events-none"
				}`}
				onClick={closeCart}
			/>

			{/* Drawer */}
			<div
				ref={drawerRef}
				className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-[#171717] z-101 translate-x-full"
			>
				<div className="flex flex-col h-full">
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-[#171717]">
						<h2 className="text-xl font-semibold font-display">
							Cart
							{itemCount > 0 && <span className="ml-2 text-[#22c55e]">({itemCount})</span>}
						</h2>
						<button onClick={closeCart} className="p-2 hover:bg-white/5 rounded-xl transition-colors" aria-label="Close cart">
							<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					{/* Items */}
					<div ref={itemsRef} className="flex-1 overflow-y-auto p-6 space-y-4">
						{items.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center">
								<div className="w-16 h-16 rounded-full bg-[#171717] flex items-center justify-center mb-4">
									<svg className="w-8 h-8 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.5}
											d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
										/>
									</svg>
								</div>
								<p className="text-[#a3a3a3] mb-2">Your cart is empty</p>
								<p className="text-sm text-[#737373]">Add some products to get started</p>
							</div>
						) : (
							items.map((item) => (
								<div key={item.id} className="flex gap-4 p-4 bg-[#0f0f0f] rounded-2xl border border-[#171717]">
									<div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#171717]">
										<Image src={item.image_url} alt={item.name} fill className="object-cover" />
									</div>

									<div className="flex-1 min-w-0">
										<h3 className="font-medium truncate">{item.name}</h3>
										{/* Show variant name if present */}
										{item.variantName && (
											<p className="text-sm text-[#737373] truncate">{item.variantName}</p>
										)}
										<p className="text-[#22c55e] font-semibold mt-1">${Number(item.price).toFixed(2)}</p>

										<div className="flex items-center gap-2 mt-3">
											<button
												onClick={() => updateQuantity(item.id, item.quantity - 1)}
												className="w-8 h-8 rounded-lg border border-[#262626] hover:border-[#22c55e] flex items-center justify-center transition-colors text-sm"
											>
												-
											</button>
											<span className="w-8 text-center text-sm">{item.quantity}</span>
											<button
												onClick={() => updateQuantity(item.id, item.quantity + 1)}
												className="w-8 h-8 rounded-lg border border-[#262626] hover:border-[#22c55e] flex items-center justify-center transition-colors text-sm"
											>
												+
											</button>

											<button
												onClick={() => removeItem(item.id)}
												className="ml-auto text-[#737373] hover:text-red-400 transition-colors p-1"
												aria-label="Remove item"
											>
												<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={1.5}
														d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
													/>
												</svg>
											</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>

					{/* Footer */}
					{items.length > 0 && (
						<div className="p-6 border-t border-[#171717] space-y-4 bg-[#0a0a0a]">
							<div className="flex justify-between items-center">
								<span className="text-[#a3a3a3]">Subtotal</span>
								<span className="text-2xl font-display font-bold text-[#22c55e]">${total.toFixed(2)}</span>
							</div>

							{/* Temporary order instructions */}
							<div className="p-4 rounded-xl bg-[#22c55e]/5 border border-[#22c55e]/20">
								<p className="text-sm text-[#a3a3a3] mb-3">
									To place an order, please contact us via:
								</p>
								<div className="flex flex-col gap-2">
									<Link
										href="/contact"
										onClick={closeCart}
										className="flex items-center gap-2 text-sm text-[#22c55e] hover:text-[#4ade80] transition-colors"
									>
										<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
										</svg>
										Contact Form
									</Link>
									<a
										href="https://www.instagram.com/threed4g/"
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 text-sm text-[#22c55e] hover:text-[#4ade80] transition-colors"
										onClick={() =>
											posthog.capture("cart_instagram_link_clicked", {
												url: "https://www.instagram.com/threed4g/",
											})
										}
									>
										<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
											<path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
										</svg>
										Instagram @threed4g
									</a>
								</div>
							</div>

							<p className="text-center text-xs text-[#737373]">Online checkout coming soon</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
