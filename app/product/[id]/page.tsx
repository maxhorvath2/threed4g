import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { ProductDetail } from "@/components/sections/ProductDetail";
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
	tags?: string[] | null;
}

async function getProduct(id: string): Promise<Product | null> {
	try {
		const products = await sql`
			SELECT * FROM products WHERE id = ${parseInt(id)}
		`;
		return products[0] as Product | null;
	} catch (error) {
		console.error("Error fetching product:", error);
		return null;
	}
}

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: PageProps) {
	const { id } = await params;
	const product = await getProduct(id);

	if (!product) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-[#050505]">
			<Navigation />
			<ProductDetail product={product} />
			<Footer />
		</div>
	);
}
