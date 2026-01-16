import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { GalleryContent } from "@/components/sections/GalleryContent";
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

async function getAllProducts(): Promise<Product[]> {
	try {
		const products = await sql`
			SELECT * FROM products
			ORDER BY created_at DESC
		`;
		return products as Product[];
	} catch (error) {
		console.error("Error fetching products:", error);
		return [];
	}
}

export default async function Gallery() {
	const products = await getAllProducts();

	return (
		<div className="min-h-screen bg-[#050505]">
			<Navigation />
			<GalleryContent products={products} />
			<Footer />
		</div>
	);
}
