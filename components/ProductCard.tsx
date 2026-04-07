"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { Badge } from "@/components/ui/Badge";
import type { ProductWithDetails } from "@/lib/types/product";

interface ProductCardProps {
	product: ProductWithDetails;
	variant?: "default" | "featured";
	index?: number;
}

export default function ProductCard({
	product,
	variant = "default",
}: ProductCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLDivElement>(null);
	const [isHovered, setIsHovered] = useState(false);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!cardRef.current) return;

		const rect = cardRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		const rotateX = (y - centerY) / 20;
		const rotateY = (centerX - x) / 20;

		gsap.to(cardRef.current, {
			rotateX: rotateX,
			rotateY: rotateY,
			transformPerspective: 1000,
			duration: 0.3,
			ease: "power2.out",
		});

		// Move light reflection
		if (cardRef.current) {
			cardRef.current.style.setProperty("--mouse-x", `${x}px`);
			cardRef.current.style.setProperty("--mouse-y", `${y}px`);
		}
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
		if (!cardRef.current) return;

		gsap.to(cardRef.current, {
			rotateX: 0,
			rotateY: 0,
			duration: 0.5,
			ease: "elastic.out(1, 0.5)",
		});
	};

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	// Get display price based on variants
	const getPriceDisplay = () => {
		if (product.variants && product.variants.length > 0) {
			const prices = product.variants.map((v) => Number(v.price));
			const minPrice = Math.min(...prices);
			const maxPrice = Math.max(...prices);

			if (minPrice === maxPrice) {
				return `$${minPrice.toFixed(2)}`;
			}
			return `From $${minPrice.toFixed(2)}`;
		}
		return product.price !== null && product.price !== undefined
			? `$${Number(product.price).toFixed(2)}`
			: null;
	};

	const priceDisplay = getPriceDisplay();
	const primaryImage =
		product.images?.find((img) => img.is_primary) || product.images?.[0];
	const imageUrl = primaryImage?.image_url || product.image_url;
	const hasMultipleVariants = product.variants && product.variants.length > 1;

	return (
		<div
			ref={cardRef}
			className="group relative rounded-2xl border border-[#171717] bg-[#0a0a0a] overflow-hidden transition-all duration-300 hover:border-[#22c55e]/30"
			style={{
				transformStyle: "preserve-3d",
			}}
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

			{/* Image container */}
			<Link href={`/product/${product.id}`} className="block">
				<div
					ref={imageRef}
					className="aspect-square relative overflow-hidden bg-[#0f0f0f]"
				>
					<Image
						src={imageUrl}
						alt={product.name}
						fill
						className={`object-cover transition-transform duration-500 ${isHovered ? "scale-110" : "scale-100"}`}
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					/>

					{/* Overlay gradient */}
					<div
						className={`absolute inset-0 bg-linear-to-t from-[#050505] via-transparent to-transparent transition-opacity duration-300 ${
							isHovered ? "opacity-80" : "opacity-0"
						}`}
					/>

					{/* Featured badge */}
					{product.featured && variant === "featured" && (
						<div className="absolute top-4 left-4">
							<Badge variant="primary">Featured</Badge>
						</div>
					)}

					{/* Multiple images indicator */}
					{product.images && product.images.length > 1 && (
						<div className="absolute bottom-4 right-4 px-2 py-1 bg-black/70 rounded text-xs text-white">
							+{product.images.length - 1}
						</div>
					)}

					{/* Hover overlay with "View Options" for multi-variant products */}
					<div
						className={`absolute bottom-4 left-4 right-4 transition-all duration-300 z-20 ${
							isHovered
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-4"
						}`}
					>
						<div className="w-full py-2 px-4 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-xl text-center text-sm backdrop-blur-sm">
							{hasMultipleVariants
								? "View Options"
								: "View Details"}
						</div>
					</div>
				</div>
			</Link>

			{/* Content */}
			<Link href={`/product/${product.id}`} className="block p-5">
				<div className="flex items-start justify-between gap-3 mb-2">
					<h3 className="text-base font-semibold text-[#fafafa] line-clamp-1 group-hover:text-[#22c55e] transition-colors duration-300">
						{product.name}
					</h3>
					{priceDisplay && (
						<span className="text-[#22c55e] font-bold whitespace-nowrap">
							{priceDisplay}
						</span>
					)}
				</div>

				{product.description && (
					<p className="text-sm text-[#737373] line-clamp-2 mb-3 leading-relaxed">
						{product.description}
					</p>
				)}

				<div className="flex flex-wrap gap-2">
					{product.category && (
						<Badge variant="default" className="text-xs">
							{product.category}
						</Badge>
					)}
					{hasMultipleVariants && (
						<Badge variant="outline" className="text-xs">
							{product.variants.length} options
						</Badge>
					)}
				</div>
			</Link>

			{/* Bottom border glow on hover */}
			<div
				className={`absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#22c55e] to-transparent transition-opacity duration-300 ${
					isHovered ? "opacity-100" : "opacity-0"
				}`}
			/>
		</div>
	);
}
