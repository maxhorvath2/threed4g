"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/animations/FadeIn";
import type { ProductWithDetails, ProductVariant } from "@/lib/types/product";

interface ProductDetailProps {
	product: ProductWithDetails;
}

export function ProductDetail({ product }: ProductDetailProps) {
	const imageContainerRef = useRef<HTMLDivElement>(null);
	const [isHovered, setIsHovered] = useState(false);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);
	const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
		product.variants.length === 1 ? product.variants[0] : null
	);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!imageContainerRef.current) return;

		const rect = imageContainerRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		const rotateX = (y - centerY) / 30;
		const rotateY = (centerX - x) / 30;

		gsap.to(imageContainerRef.current, {
			rotateX: rotateX,
			rotateY: rotateY,
			transformPerspective: 1000,
			duration: 0.3,
			ease: "power2.out",
		});

		imageContainerRef.current.style.setProperty("--mouse-x", `${x}px`);
		imageContainerRef.current.style.setProperty("--mouse-y", `${y}px`);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
		if (!imageContainerRef.current) return;

		gsap.to(imageContainerRef.current, {
			rotateX: 0,
			rotateY: 0,
			duration: 0.5,
			ease: "elastic.out(1, 0.5)",
		});
	};

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const currentImage = product.images[selectedImageIndex];
	const hasMultipleImages = product.images.length > 1;
	const hasMultipleVariants = product.variants.length > 1;

	// Get display price based on selection
	const getDisplayPrice = () => {
		if (selectedVariant) {
			return Number(selectedVariant.price).toFixed(2);
		}
		if (product.variants.length > 0) {
			const prices = product.variants.map((v) => Number(v.price));
			const minPrice = Math.min(...prices);
			const maxPrice = Math.max(...prices);
			if (minPrice === maxPrice) {
				return minPrice.toFixed(2);
			}
			return `${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
		}
		return product.price !== null ? Number(product.price).toFixed(2) : null;
	};

	const displayPrice = getDisplayPrice();
	const hasPrice = displayPrice !== null;

	return (
		<section className="pt-32 pb-20 px-6">
			<div className="max-w-7xl mx-auto">
				{/* Back button */}
				<FadeIn delay={0} duration={0.6}>
					<Link href="/gallery">
						<Button variant="ghost" size="sm" className="mb-8 gap-2">
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
									d="M15 19l-7-7 7-7"
								/>
							</svg>
							Back to Gallery
						</Button>
					</Link>
				</FadeIn>

				<div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
					{/* Image Section */}
					<FadeIn delay={0.1} duration={0.8} direction="left">
						<div className="space-y-4">
							{/* Main Image */}
							<div
								ref={imageContainerRef}
								className="group relative rounded-2xl border border-[#171717] bg-[#0a0a0a] overflow-hidden transition-all duration-300 hover:border-[#22c55e]/30"
								style={{ transformStyle: "preserve-3d" }}
								onMouseMove={handleMouseMove}
								onMouseLeave={handleMouseLeave}
								onMouseEnter={handleMouseEnter}
							>
								{/* Light reflection effect */}
								<div
									className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
									style={{
										background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(34, 197, 94, 0.06), transparent 40%)`,
									}}
								/>

								{/* Image */}
								<div className="aspect-square relative overflow-hidden bg-[#0f0f0f]">
									<Image
										src={currentImage?.image_url || product.image_url}
										alt={currentImage?.alt_text || product.name}
										fill
										className={`object-cover transition-transform duration-500 ${
											isHovered ? "scale-105" : "scale-100"
										}`}
										sizes="(max-width: 1024px) 100vw, 50vw"
										priority
									/>

									{/* Overlay gradient */}
									<div
										className={`absolute inset-0 bg-linear-to-t from-[#050505]/50 via-transparent to-transparent transition-opacity duration-300 ${
											isHovered ? "opacity-100" : "opacity-0"
										}`}
									/>
								</div>

								{/* Featured badge */}
								{product.featured && (
									<div className="absolute top-4 left-4 z-20">
										<Badge variant="primary">Featured</Badge>
									</div>
								)}

								{/* Bottom border glow on hover */}
								<div
									className={`absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#22c55e] to-transparent transition-opacity duration-300 ${
										isHovered ? "opacity-100" : "opacity-0"
									}`}
								/>
							</div>

							{/* Thumbnail Gallery */}
							{hasMultipleImages && (
								<div className="flex gap-3 overflow-x-auto pb-2">
									{product.images.map((img, index) => (
										<button
											key={img.id || index}
											onClick={() => setSelectedImageIndex(index)}
											className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
												selectedImageIndex === index
													? "border-[#22c55e]"
													: "border-[#262626] hover:border-[#404040]"
											}`}
										>
											<Image
												src={img.image_url}
												alt={img.alt_text || `${product.name} - Image ${index + 1}`}
												fill
												className="object-cover"
												sizes="80px"
											/>
										</button>
									))}
								</div>
							)}
						</div>
					</FadeIn>

					{/* Product Info Section */}
					<div className="flex flex-col">
						{/* Category badge */}
						{product.category && (
							<FadeIn delay={0.15} duration={0.6}>
								<Badge variant="default" className="w-fit mb-4">
									{product.category}
								</Badge>
							</FadeIn>
						)}

						{/* Title */}
						<FadeIn delay={0.2} duration={0.6}>
							<h1 className="text-headline font-bold text-[#fafafa] mb-4">
								{product.name}
							</h1>
						</FadeIn>

						{/* Price */}
						<FadeIn delay={0.25} duration={0.6}>
							<div className="mb-6">
								{hasPrice ? (
									<span className="text-3xl font-bold text-[#22c55e]">
										${displayPrice}
									</span>
								) : (
									<span className="text-xl text-[#737373]">
										Price Coming Soon
									</span>
								)}
							</div>
						</FadeIn>

						{/* Variant Selector */}
						{hasMultipleVariants && (
							<FadeIn delay={0.28} duration={0.6}>
								<div className="mb-8">
									<h2 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wider mb-3">
										Select Option
									</h2>
									<div className="flex flex-wrap gap-3">
										{product.variants.map((variant) => (
											<button
												key={variant.id}
												onClick={() => setSelectedVariant(variant)}
												disabled={!variant.in_stock}
												className={`px-4 py-3 rounded-lg border transition-all ${
													selectedVariant?.id === variant.id
														? "border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]"
														: variant.in_stock
															? "border-[#262626] hover:border-[#404040] text-[#fafafa]"
															: "border-[#262626] text-[#525252] cursor-not-allowed opacity-50"
												}`}
											>
												<div className="text-sm font-medium">{variant.name}</div>
												<div className="text-xs mt-1 opacity-75">
													${Number(variant.price).toFixed(2)}
												</div>
											</button>
										))}
									</div>
									{!selectedVariant && (
										<p className="text-sm text-[#737373] mt-2">
											Please select an option to add to cart
										</p>
									)}
								</div>
							</FadeIn>
						)}

						{/* Description */}
						{product.description && (
							<FadeIn delay={0.3} duration={0.6}>
								<div className="mb-8">
									<h2 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wider mb-3">
										Description
									</h2>
									<p className="text-[#a3a3a3] leading-relaxed text-lg">
										{product.description}
									</p>
								</div>
							</FadeIn>
						)}

						{/* Add to Cart Button */}
						<FadeIn delay={0.4} duration={0.6}>
							<div className="mt-auto pt-6 border-t border-[#171717]">
								<AddToCartButton
									product={{
										id: product.id,
										name: product.name,
										price: selectedVariant?.price ?? product.variants[0]?.price ?? product.price ?? null,
										image_url: currentImage?.image_url || product.image_url,
									}}
									selectedVariant={
										selectedVariant
											? {
													id: selectedVariant.id,
													name: selectedVariant.name,
													price: Number(selectedVariant.price),
												}
											: product.variants.length === 1
												? {
														id: product.variants[0].id,
														name: product.variants[0].name,
														price: Number(product.variants[0].price),
													}
												: undefined
									}
									size="lg"
									className="w-full sm:w-auto"
									showPrice={true}
									disabled={hasMultipleVariants && !selectedVariant}
								/>
								{hasMultipleVariants && !selectedVariant && (
									<p className="text-sm text-[#fca5a5] mt-2">
										Select an option above to add to cart
									</p>
								)}
							</div>
						</FadeIn>
					</div>
				</div>
			</div>
		</section>
	);
}
