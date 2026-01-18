import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import type {
	Product,
	ProductImage,
	ProductVariant,
	ProductWithDetails,
	CreateProductInput,
} from "@/lib/types/product";

// Helper to fetch images and variants for products
async function getProductDetails(
	productIds: number[]
): Promise<Map<number, { images: ProductImage[]; variants: ProductVariant[] }>> {
	if (productIds.length === 0) {
		return new Map();
	}

	const [images, variants] = await Promise.all([
		sql`SELECT * FROM product_images WHERE product_id = ANY(${productIds}) ORDER BY sort_order ASC`,
		sql`SELECT * FROM product_variants WHERE product_id = ANY(${productIds}) ORDER BY sort_order ASC`,
	]);

	const detailsMap = new Map<
		number,
		{ images: ProductImage[]; variants: ProductVariant[] }
	>();

	for (const id of productIds) {
		detailsMap.set(id, { images: [], variants: [] });
	}

	for (const image of images) {
		detailsMap.get(image.product_id)?.images.push(image as ProductImage);
	}

	for (const variant of variants) {
		detailsMap.get(variant.product_id)?.variants.push(variant as ProductVariant);
	}

	return detailsMap;
}

// Normalize product to always have images and variants arrays
function normalizeProduct(
	product: Product,
	details?: { images: ProductImage[]; variants: ProductVariant[] }
): ProductWithDetails {
	const images =
		details?.images && details.images.length > 0
			? details.images
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

	const variants =
		details?.variants && details.variants.length > 0
			? details.variants
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
		images,
		variants,
	};
}

// GET all products
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const featured = searchParams.get("featured");
		const includeDetails = searchParams.get("include") !== "false";

		let products: Product[];
		if (featured === "true") {
			products = (await sql`
        SELECT * FROM products
        WHERE featured = true
        ORDER BY created_at DESC
      `) as Product[];
		} else {
			products = (await sql`
        SELECT * FROM products
        ORDER BY created_at DESC
      `) as Product[];
		}

		if (!includeDetails) {
			return NextResponse.json(products);
		}

		// Fetch images and variants for all products
		const productIds = products.map((p) => p.id);
		const detailsMap = await getProductDetails(productIds);

		const productsWithDetails: ProductWithDetails[] = products.map((product) =>
			normalizeProduct(product, detailsMap.get(product.id))
		);

		return NextResponse.json(productsWithDetails);
	} catch (error) {
		console.error("Error fetching products:", error);
		return NextResponse.json(
			{ error: "Failed to fetch products" },
			{ status: 500 }
		);
	}
}

// POST create new product (admin only)
export async function POST(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();

		// Support both legacy and new format
		const isLegacyFormat = "image_url" in body && !("images" in body);

		if (isLegacyFormat) {
			// Legacy format: { name, description, image_url, category, featured, price }
			const { name, description, image_url, category, featured, price } = body;

			if (!name || !image_url) {
				return NextResponse.json(
					{ error: "Name and image_url are required" },
					{ status: 400 }
				);
			}

			const result = await sql`
        INSERT INTO products (name, description, image_url, category, featured, price)
        VALUES (${name}, ${description || null}, ${image_url}, ${category || null}, ${featured || false}, ${price || null})
        RETURNING *
      `;

			return NextResponse.json(result[0], { status: 201 });
		}

		// New format with images and variants
		const { name, description, category, featured, images, variants } =
			body as CreateProductInput;

		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}

		if (!images || images.length === 0) {
			return NextResponse.json(
				{ error: "At least one image is required" },
				{ status: 400 }
			);
		}

		if (!variants || variants.length === 0) {
			return NextResponse.json(
				{ error: "At least one variant is required" },
				{ status: 400 }
			);
		}

		// Get primary image for legacy field
		const primaryImage =
			images.find((img) => img.is_primary) || images[0];
		// Get lowest price for legacy field
		const lowestPrice = Math.min(...variants.map((v) => v.price));

		// Insert product
		const productResult = await sql`
      INSERT INTO products (name, description, image_url, category, featured, price)
      VALUES (${name}, ${description || null}, ${primaryImage.image_url}, ${category || null}, ${featured || false}, ${lowestPrice})
      RETURNING *
    `;

		const product = productResult[0] as Product;

		// Insert images
		for (let i = 0; i < images.length; i++) {
			const img = images[i];
			await sql`
        INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
        VALUES (${product.id}, ${img.image_url}, ${img.alt_text || null}, ${img.sort_order ?? i}, ${img.is_primary ?? i === 0})
      `;
		}

		// Insert variants
		for (let i = 0; i < variants.length; i++) {
			const variant = variants[i];
			await sql`
        INSERT INTO product_variants (product_id, name, sku, price, sort_order, in_stock)
        VALUES (${product.id}, ${variant.name}, ${variant.sku || null}, ${variant.price}, ${variant.sort_order ?? i}, ${variant.in_stock ?? true})
      `;
		}

		// Fetch the complete product with details
		const detailsMap = await getProductDetails([product.id]);
		const productWithDetails = normalizeProduct(
			product,
			detailsMap.get(product.id)
		);

		return NextResponse.json(productWithDetails, { status: 201 });
	} catch (error) {
		console.error("Error creating product:", error);
		return NextResponse.json(
			{ error: "Failed to create product" },
			{ status: 500 }
		);
	}
}
