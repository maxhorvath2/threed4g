import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { ProductDetail } from "@/components/sections/ProductDetail";
import { sql } from "@/lib/db";
import type {
	Product,
	ProductImage,
	ProductVariant,
	ProductWithDetails,
} from "@/lib/types/product";

export const dynamic = "force-dynamic";

async function getProduct(id: string): Promise<ProductWithDetails | null> {
	try {
		const productId = parseInt(id);

		// Validate that id is a valid integer
		if (isNaN(productId)) {
			return null;
		}

		// Fetch product and its images/variants in parallel
		const [products, images, variants] = await Promise.all([
			sql`SELECT * FROM products WHERE id = ${productId}`,
			sql`SELECT * FROM product_images WHERE product_id = ${productId} ORDER BY sort_order ASC`,
			sql`SELECT * FROM product_variants WHERE product_id = ${productId} ORDER BY sort_order ASC`,
		]);

		if (products.length === 0) {
			return null;
		}

		const product = products[0] as Product;
		const productImages = images as ProductImage[];
		const productVariants = variants as ProductVariant[];

		// Normalize to always have images and variants arrays
		const normalizedImages: ProductImage[] =
			productImages.length > 0
				? productImages
				: product.image_url
					? [
							{
								id: 0,
								product_id: product.id,
								image_url: product.image_url,
								alt_text: null,
								sort_order: 0,
								is_primary: true,
							},
						]
					: [];

		const normalizedVariants: ProductVariant[] =
			productVariants.length > 0
				? productVariants
				: product.price !== null
					? [
							{
								id: 0,
								product_id: product.id,
								name: "Standard",
								sku: null,
								price: product.price,
								sort_order: 0,
								stock_quantity: 0,
								in_stock: false,
							},
						]
					: [];

		return {
			...product,
			images: normalizedImages,
			variants: normalizedVariants,
		};
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
