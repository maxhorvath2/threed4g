import Navigation from "@/components/Navigation";
import ProductCard from "@/components/ProductCard";

async function getAllProducts() {
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/products`, {
			cache: "no-store",
		});
		if (!res.ok) return [];
		return res.json();
	} catch (error) {
		console.error("Error fetching products:", error);
		return [];
	}
}

export default async function Gallery() {
	const products = await getAllProducts();

	return (
		<div className="min-h-screen bg-[#0a0a0a]">
			<Navigation />

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<div className="text-center mb-16">
					<h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[#fafafa]">Product Gallery</h1>
					<p className="text-[#a3a3a3] max-w-2xl mx-auto text-lg">
						Browse our complete collection of 3D printed grow tent accessories
					</p>
				</div>

				{products.length === 0 ? (
					<div className="text-center py-24">
						<p className="text-[#a3a3a3] text-xl mb-2">No products available yet.</p>
						<p className="text-[#737373]">Check back soon for new additions!</p>
					</div>
				) : (
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{products.map((product: any) => (
							<ProductCard key={product.id} product={product} />
						))}
					</div>
				)}
			</div>

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
