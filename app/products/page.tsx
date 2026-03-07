import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { ProductsContent } from "@/components/sections/ProductsContent";
import { sql } from "@/lib/db";
import type {
	Product,
	ProductImage,
	ProductVariant,
	ProductWithDetails,
} from "@/lib/types/product";

export const dynamic = "force-dynamic";

async function getAllProducts(): Promise<ProductWithDetails[]> {
	try {
		const products = (await sql`
			SELECT * FROM products
			ORDER BY created_at DESC
		`) as Product[];

		if (products.length === 0) return [];

		const productIds = products.map((p) => p.id);

		const [images, variants] = await Promise.all([
			sql`SELECT * FROM product_images WHERE product_id = ANY(${productIds}) ORDER BY sort_order ASC`,
			sql`SELECT * FROM product_variants WHERE product_id = ANY(${productIds}) ORDER BY sort_order ASC`,
		]);

		const imagesMap = new Map<number, ProductImage[]>();
		const variantsMap = new Map<number, ProductVariant[]>();

		for (const id of productIds) {
			imagesMap.set(id, []);
			variantsMap.set(id, []);
		}

		for (const image of images as ProductImage[]) {
			imagesMap.get(image.product_id)?.push(image);
		}

		for (const variant of variants as ProductVariant[]) {
			variantsMap.get(variant.product_id)?.push(variant);
		}

		return products.map((product) => {
			const productImages = imagesMap.get(product.id) || [];
			const productVariants = variantsMap.get(product.id) || [];

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
									in_stock: true,
								},
							]
						: [];

			return {
				...product,
				images: normalizedImages,
				variants: normalizedVariants,
			};
		});
	} catch (error) {
		console.error("Error fetching products:", error);
		return [];
	}
}

export default async function Products() {
	const products = await getAllProducts();

	return (
		<div className="min-h-screen bg-[#050505]">
			<Navigation />
			<ProductsContent products={products} />
			<Footer />
		</div>
	);
}
