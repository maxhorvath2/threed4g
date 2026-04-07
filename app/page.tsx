import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { FeaturedProductsSection } from "@/components/sections/FeaturedProductsSection";
import { CTASection } from "@/components/sections/CTASection";
import { sql } from "@/lib/db";
import type {
	Product,
	ProductImage,
	ProductVariant,
	ProductWithDetails,
} from "@/lib/types/product";
import { Marquee } from "@/components/ui/marquee";

export const dynamic = "force-dynamic";

async function getFeaturedProducts(): Promise<ProductWithDetails[]> {
	try {
		// First try to get featured products
		let products = (await sql`
      SELECT * FROM products
      WHERE featured = true
      ORDER BY created_at DESC
      LIMIT 6
    `) as Product[];

		// If no featured products, get the most recent products instead
		if (products.length === 0) {
			products = (await sql`
        SELECT * FROM products
        ORDER BY created_at DESC
        LIMIT 6
      `) as Product[];
		}

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
		});
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
			<div className="fixed top-20 left-0 right-0 z-40 border-y border-[#86efac]/50 bg-linear-to-r from-[#0f3f23] via-[#22c55e] to-[#0f3f23] shadow-[0_0_24px_rgba(34,197,94,0.35)]">
				<Marquee>
					<span className="text-xs md:text-sm font-extrabold uppercase tracking-[0.18em] text-[#031007] drop-shadow-[0_1px_0_rgba(255,255,255,0.18)]">
						BANGER BATH LAUNCH 4/20
					</span>
					<span className="text-xs md:text-sm font-extrabold uppercase tracking-[0.18em] text-[#031007] drop-shadow-[0_1px_0_rgba(255,255,255,0.18)]">
						BANGER BATH LAUNCH 4/20
					</span>
					<span className="text-xs md:text-sm font-extrabold uppercase tracking-[0.18em] text-[#031007] drop-shadow-[0_1px_0_rgba(255,255,255,0.18)]">
						BANGER BATH LAUNCH 4/20
					</span>
					<span className="text-xs md:text-sm font-extrabold uppercase tracking-[0.18em] text-[#031007] drop-shadow-[0_1px_0_rgba(255,255,255,0.18)]">
						BANGER BATH LAUNCH 4/20
					</span>
				</Marquee>
			</div>
			<div className="h-10" aria-hidden="true" />
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
