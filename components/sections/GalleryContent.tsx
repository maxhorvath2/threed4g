"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import ProductCard from "@/components/ProductCard";

interface Product {
	id: number;
	name: string;
	description: string | null;
	image_url: string;
	category: string | null;
	featured: boolean;
	price: number | null;
}

interface GalleryContentProps {
	products: Product[];
}

export function GalleryContent({ products }: GalleryContentProps) {
	const sectionRef = useRef<HTMLElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const [activeCategory, setActiveCategory] = useState<string | null>(null);

	// Get unique categories
	const categories = useMemo(() => {
		const cats = products
			.map((p) => p.category)
			.filter((c): c is string => c !== null);
		return Array.from(new Set(cats));
	}, [products]);

	// Filter products
	const filteredProducts = useMemo(() => {
		if (!activeCategory) return products;
		return products.filter((p) => p.category === activeCategory);
	}, [products, activeCategory]);

	useEffect(() => {
		const ctx = gsap.context(() => {
			// Animate header
			gsap.from(".gallery-header", {
				opacity: 0,
				y: 40,
				duration: 0.8,
				ease: "power3.out",
			});

			// Animate filter pills
			gsap.from(".filter-pill", {
				opacity: 0,
				y: 20,
				duration: 0.5,
				stagger: 0.05,
				ease: "power3.out",
				delay: 0.3,
			});
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	// Animate grid on filter change
	useEffect(() => {
		if (!gridRef.current) return;

		const cards = gridRef.current.children;
		gsap.fromTo(
			cards,
			{ opacity: 0, y: 30, scale: 0.95 },
			{
				opacity: 1,
				y: 0,
				scale: 1,
				duration: 0.5,
				stagger: 0.05,
				ease: "power3.out",
			}
		);
	}, [activeCategory]);

	return (
		<section ref={sectionRef} className="pt-32 pb-20">
			{/* Background elements */}
			<div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#22c55e]/5 blur-[150px] pointer-events-none" />

			<div className="max-w-7xl mx-auto px-6">
				{/* Header */}
				<div className="gallery-header text-center mb-16">
					<span className="inline-block text-[#22c55e] text-sm font-medium tracking-wider uppercase mb-4">
						Our Collection
					</span>
					<h1 className="text-headline text-[#fafafa] mb-6">
						Product <span className="text-[#22c55e]">Gallery</span>
					</h1>
					<p className="text-lg text-[#a3a3a3] max-w-2xl mx-auto">
						Browse our complete collection of precision-engineered 3D
						printed accessories for your grow tent setup.
					</p>
				</div>

				{/* Category Filter */}
				{categories.length > 0 && (
					<div className="flex flex-wrap justify-center gap-2 mb-12">
						<button
							onClick={() => setActiveCategory(null)}
							className={`filter-pill px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
								activeCategory === null
									? "bg-[#22c55e] text-[#050505]"
									: "bg-[#141414] text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#fafafa] border border-[#262626]"
							}`}
						>
							All Products
						</button>
						{categories.map((category) => (
							<button
								key={category}
								onClick={() => setActiveCategory(category)}
								className={`filter-pill px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
									activeCategory === category
										? "bg-[#22c55e] text-[#050505]"
										: "bg-[#141414] text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#fafafa] border border-[#262626]"
								}`}
							>
								{category}
							</button>
						))}
					</div>
				)}

				{/* Products Grid */}
				{filteredProducts.length === 0 ? (
					<div className="text-center py-24">
						<div className="w-20 h-20 rounded-full bg-[#141414] flex items-center justify-center mx-auto mb-6">
							<svg
								className="w-10 h-10 text-[#737373]"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
								/>
							</svg>
						</div>
						<p className="text-[#a3a3a3] text-xl mb-2">
							No products available yet.
						</p>
						<p className="text-[#737373]">
							Check back soon for new additions!
						</p>
					</div>
				) : (
					<div
						ref={gridRef}
						className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
					>
						{filteredProducts.map((product) => (
							<ProductCard key={product.id} product={product} />
						))}
					</div>
				)}

				{/* Product count */}
				{filteredProducts.length > 0 && (
					<div className="text-center mt-12 text-[#737373] text-sm">
						Showing {filteredProducts.length} of {products.length} products
					</div>
				)}
			</div>
		</section>
	);
}
