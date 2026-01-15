import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET single product
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const result = await sql`
      SELECT * FROM products WHERE id = ${id}
    `;

		if (result.length === 0) {
			return NextResponse.json({ error: "Product not found" }, { status: 404 });
		}

		return NextResponse.json(result[0]);
	} catch (error) {
		console.error("Error fetching product:", error);
		return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
	}
}

// PUT update product (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const { name, description, image_url, category, featured } = await request.json();

		const result = await sql`
      UPDATE products 
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        image_url = COALESCE(${image_url}, image_url),
        category = COALESCE(${category}, category),
        featured = COALESCE(${featured}, featured),
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
		return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
	}
}

// DELETE product (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const result = await sql`
      DELETE FROM products WHERE id = ${id} RETURNING *
    `;

		if (result.length === 0) {
			return NextResponse.json({ error: "Product not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting product:", error);
		return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
	}
}
