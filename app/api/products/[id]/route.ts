import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import type {
	Product,
	ProductImage,
	ProductVariant,
	ProductWithDetails,
	CreateProductImageInput,
	CreateProductVariantInput,
} from "@/lib/types/product";

// Helper to fetch images and variants for a product
async function getProductDetails(productId: number): Promise<{
	images: ProductImage[];
	variants: ProductVariant[];
}> {
	const [images, variants] = await Promise.all([
		sql`SELECT * FROM product_images WHERE product_id = ${productId} ORDER BY sort_order ASC`,
		sql`SELECT * FROM product_variants WHERE product_id = ${productId} ORDER BY sort_order ASC`,
	]);

	return {
		images: images as ProductImage[],
		variants: variants as ProductVariant[],
	};
}

// Normalize product to always have images and variants arrays
function normalizeProduct(
	product: Product,
	details: { images: ProductImage[]; variants: ProductVariant[] }
): ProductWithDetails {
	const images =
		details.images.length > 0
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
		details.variants.length > 0
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

// GET single product
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const result = await sql`
      SELECT * FROM products WHERE id = ${id}
    `;

		if (result.length === 0) {
			return NextResponse.json({ error: "Product not found" }, { status: 404 });
		}

		const product = result[0] as Product;
		const details = await getProductDetails(product.id);
		const productWithDetails = normalizeProduct(product, details);

		return NextResponse.json(productWithDetails);
	} catch (error) {
		console.error("Error fetching product:", error);
		return NextResponse.json(
			{ error: "Failed to fetch product" },
			{ status: 500 }
		);
	}
}

// PUT update product (admin only)
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();

		// Check if using new format with images/variants
		const hasNewFormat = "images" in body || "variants" in body;

		if (hasNewFormat) {
			const { name, description, category, featured, images, variants } = body;

			// Update main product fields
			let imageUrl: string | undefined;
			let price: number | undefined;

			if (images && images.length > 0) {
				const primaryImage =
					(images as CreateProductImageInput[]).find((img) => img.is_primary) ||
					images[0];
				imageUrl = primaryImage.image_url;
			}

			if (variants && variants.length > 0) {
				price = Math.min(
					...(variants as CreateProductVariantInput[]).map((v) => v.price)
				);
			}

			const result = await sql`
        UPDATE products
        SET
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          image_url = COALESCE(${imageUrl}, image_url),
          category = COALESCE(${category}, category),
          featured = COALESCE(${featured}, featured),
          price = COALESCE(${price}, price),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

			if (result.length === 0) {
				return NextResponse.json(
					{ error: "Product not found" },
					{ status: 404 }
				);
			}

			const product = result[0] as Product;

			// Handle images update if provided
			if (images !== undefined) {
				// Delete existing images and insert new ones
				await sql`DELETE FROM product_images WHERE product_id = ${id}`;

				for (let i = 0; i < images.length; i++) {
					const img = images[i] as CreateProductImageInput;
					await sql`
            INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
            VALUES (${product.id}, ${img.image_url}, ${img.alt_text || null}, ${img.sort_order ?? i}, ${img.is_primary ?? i === 0})
          `;
				}
			}

			// Handle variants update if provided
			if (variants !== undefined) {
				// Delete existing variants and insert new ones
				await sql`DELETE FROM product_variants WHERE product_id = ${id}`;

				for (let i = 0; i < variants.length; i++) {
					const variant = variants[i] as CreateProductVariantInput;
					await sql`
            INSERT INTO product_variants (product_id, name, sku, price, sort_order, in_stock)
            VALUES (${product.id}, ${variant.name}, ${variant.sku || null}, ${variant.price}, ${variant.sort_order ?? i}, ${variant.in_stock ?? true})
          `;
				}
			}

			// Fetch updated product with details
			const details = await getProductDetails(product.id);
			const productWithDetails = normalizeProduct(product, details);

			return NextResponse.json(productWithDetails);
		}

		// Legacy format update
		const { name, description, image_url, category, featured, price } = body;

		const result = await sql`
      UPDATE products
      SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        image_url = COALESCE(${image_url}, image_url),
        category = COALESCE(${category}, category),
        featured = COALESCE(${featured}, featured),
        price = ${price},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

		if (result.length === 0) {
			return NextResponse.json({ error: "Product not found" }, { status: 404 });
		}

		return NextResponse.json(result[0]);
	} catch (error) {
		console.error("Error updating product:", error);
		return NextResponse.json(
			{ error: "Failed to update product" },
			{ status: 500 }
		);
	}
}

// DELETE product (admin only)
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;

		// Images and variants will be deleted automatically due to CASCADE
		const result = await sql`
      DELETE FROM products WHERE id = ${id} RETURNING *
    `;

		if (result.length === 0) {
			return NextResponse.json({ error: "Product not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting product:", error);
		return NextResponse.json(
			{ error: "Failed to delete product" },
			{ status: 500 }
		);
	}
}
