import Navigation from "@/components/Navigation";
import ProductCard from "@/components/ProductCard";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { FeaturedProductsSection } from "@/components/sections/FeaturedProductsSection";
import { CTASection } from "@/components/sections/CTASection";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Product {
	id: number;
	name: string;
	description: string | null;
	image_url: string;
	category: string | null;
	featured: boolean;
	price: number | null;
}

async function getFeaturedProducts(): Promise<Product[]> {
	try {
		// First try to get featured products
		const featuredProducts = await sql`
			SELECT * FROM products
			WHERE featured = true
			ORDER BY created_at DESC
			LIMIT 6
		`;

		// If no featured products, get the most recent products instead
		if (featuredProducts.length === 0) {
			const recentProducts = await sql`
				SELECT * FROM products
				ORDER BY created_at DESC
				LIMIT 6
			`;
			return recentProducts as Product[];
		}

		return featuredProducts as Product[];
	} catch (error) {
		console.error("Error fetching featured products:", error);
		return [];
	}
}

export default async function Home() {
	const featuredProducts = await getFeaturedProducts();

	return (
		<div className="min-h-screen bg-[#050505] overflow-hidden">
			<Navigation />

			{/* Hero Section */}
			<HeroSection />

			{/* Features Section */}
			<FeaturesSection />

			{/* Featured Products Section */}
			<FeaturedProductsSection products={featuredProducts} />

			{/* CTA Section */}
			<CTASection />

			{/* Footer */}
			<Footer />
		</div>
	);
}
