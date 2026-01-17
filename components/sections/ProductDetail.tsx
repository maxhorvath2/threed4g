"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/animations/FadeIn";

interface Product {
	id: number;
	name: string;
	description: string | null;
	image_url: string;
	category: string | null;
	featured: boolean;
	price: number | null;
	tags?: string[] | null;
}

interface ProductDetailProps {
	product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
	const imageContainerRef = useRef<HTMLDivElement>(null);
	const [isHovered, setIsHovered] = useState(false);

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

	const hasPrice = product.price !== null && product.price !== undefined;

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
									src={product.image_url}
									alt={product.name}
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
										${Number(product.price).toFixed(2)}
									</span>
								) : (
									<span className="text-xl text-[#737373]">
										Price Coming Soon
									</span>
								)}
							</div>
						</FadeIn>

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

						{/* Tags */}
						{product.tags && product.tags.length > 0 && (
							<FadeIn delay={0.35} duration={0.6}>
								<div className="mb-8">
									<h2 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wider mb-3">
										Tags
									</h2>
									<div className="flex flex-wrap gap-2">
										{product.tags.map((tag, index) => (
											<Badge key={index} variant="outline">
												{tag}
											</Badge>
										))}
									</div>
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
										price: product.price ?? null,
										image_url: product.image_url,
									}}
									size="lg"
									className="w-full sm:w-auto"
									showPrice={true}
								/>
							</div>
						</FadeIn>
					</div>
				</div>
			</div>
		</section>
	);
}
