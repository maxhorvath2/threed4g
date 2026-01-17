"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Badge } from "@/components/ui/Badge";

interface Product {
	id: number;
	name: string;
	description: string | null;
	image_url: string;
	category: string | null;
	featured: boolean;
	price?: number | null;
}

interface ProductCardProps {
	product: Product;
	variant?: "default" | "featured";
	index?: number;
}

export default function ProductCard({ product, variant = "default" }: ProductCardProps) {
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

	const hasPrice = product.price !== null && product.price !== undefined;

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
				<div ref={imageRef} className="aspect-square relative overflow-hidden bg-[#0f0f0f]">
					<Image
						src={product.image_url}
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

					{/* Quick add button - appears on hover */}
					<div
						className={`absolute bottom-4 left-4 right-4 transition-all duration-300 z-20 ${
							isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
						}`}
						onClick={(e) => e.preventDefault()}
					>
						<AddToCartButton
							product={{
								id: product.id,
								name: product.name,
								price: product.price ?? null,
								image_url: product.image_url,
							}}
							size="sm"
							className="w-full backdrop-blur-sm"
							showPrice={false}
						/>
					</div>
				</div>
			</Link>

			{/* Content */}
			<Link href={`/product/${product.id}`} className="block p-5">
				<div className="flex items-start justify-between gap-3 mb-2">
					<h3 className="text-base font-semibold text-[#fafafa] line-clamp-1 group-hover:text-[#22c55e] transition-colors duration-300">
						{product.name}
					</h3>
					{hasPrice && <span className="text-[#22c55e] font-bold whitespace-nowrap">${Number(product.price).toFixed(2)}</span>}
				</div>

				{product.description && <p className="text-sm text-[#737373] line-clamp-2 mb-3 leading-relaxed">{product.description}</p>}

				{product.category && (
					<Badge variant="default" className="text-xs">
						{product.category}
					</Badge>
				)}
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
