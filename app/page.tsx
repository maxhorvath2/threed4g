import Navigation from "@/components/Navigation";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

async function getFeaturedProducts() {
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/products?featured=true`, {
			cache: "no-store",
		});
		if (!res.ok) return [];
		return res.json();
	} catch (error) {
		console.error("Error fetching featured products:", error);
		return [];
	}
}

export default async function Home() {
	const featuredProducts = await getFeaturedProducts();

	return (
		<div className="min-h-screen bg-[#0a0a0a]">
			<Navigation />

			{/* Hero Section */}
			<section className="border-b border-[#262626]">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
					<div className="text-center max-w-3xl mx-auto">
						<h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-[#fafafa] tracking-tight">
							3D Printed Accessories
						</h1>
						<p className="text-lg sm:text-xl text-[#a3a3a3] mb-10 leading-relaxed">
							Premium 3D printed accessories designed specifically for grow tents
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/gallery"
								className="px-6 py-3 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors"
							>
								View Gallery
							</Link>
							<Link
								href="/contact"
								className="px-6 py-3 border border-[#262626] text-[#fafafa] font-medium rounded-lg hover:bg-[#111111] transition-colors"
							>
								Get in Touch
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* About Section */}
			<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
				<div className="text-center mb-16">
					<h2 className="text-3xl sm:text-4xl font-bold mb-4 text-[#fafafa]">Custom Solutions for Your Grow Setup</h2>
					<p className="text-[#a3a3a3] max-w-2xl mx-auto text-lg">
						We specialize in creating high-quality 3D printed accessories tailored to enhance your grow tent environment. From
						organizers to mounting solutions, our products are designed with functionality and durability in mind.
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-6">
					<div className="p-6 rounded-lg border border-[#262626] bg-[#111111]">
						<div className="text-3xl mb-4">🎯</div>
						<h3 className="text-lg font-semibold text-[#fafafa] mb-2">Precision Design</h3>
						<p className="text-[#a3a3a3] text-sm leading-relaxed">
							Every product is carefully designed and tested for optimal performance in grow tent environments
						</p>
					</div>
					<div className="p-6 rounded-lg border border-[#262626] bg-[#111111]">
						<div className="text-3xl mb-4">🔧</div>
						<h3 className="text-lg font-semibold text-[#fafafa] mb-2">Durable Materials</h3>
						<p className="text-[#a3a3a3] text-sm leading-relaxed">
							Built to last with high-quality 3D printing materials that withstand the unique conditions of grow tents
						</p>
					</div>
					<div className="p-6 rounded-lg border border-[#262626] bg-[#111111]">
						<div className="text-3xl mb-4">⚡</div>
						<h3 className="text-lg font-semibold text-[#fafafa] mb-2">Custom Solutions</h3>
						<p className="text-[#a3a3a3] text-sm leading-relaxed">
							Need something specific? We can work with you to create custom solutions for your unique setup
						</p>
					</div>
				</div>
			</section>

			{/* Featured Products Section */}
			{featuredProducts.length > 0 && (
				<section className="border-t border-[#262626] py-20">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="text-center mb-12">
							<h2 className="text-3xl sm:text-4xl font-bold mb-4 text-[#fafafa]">Featured Products</h2>
							<p className="text-[#a3a3a3]">Check out some of our popular products</p>
						</div>

						<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{featuredProducts.slice(0, 6).map((product: any) => (
								<ProductCard key={product.id} product={product} />
							))}
						</div>

						<div className="text-center mt-12">
							<Link
								href="/gallery"
								className="inline-block px-6 py-3 border border-[#262626] text-[#fafafa] font-medium rounded-lg hover:bg-[#111111] transition-colors"
							>
								View All Products
							</Link>
						</div>
					</div>
				</section>
			)}

			{/* Footer */}
			<footer className="border-t border-[#262626] mt-20">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="text-center text-[#a3a3a3] text-sm">
						<p>&copy; {new Date().getFullYear()} ThreeD4G. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
