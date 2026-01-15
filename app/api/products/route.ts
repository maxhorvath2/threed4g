import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET all products
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const featured = searchParams.get("featured");

		let query;
		if (featured === "true") {
			query = sql`
        SELECT * FROM products 
        WHERE featured = true 
        ORDER BY created_at DESC
      `;
		} else {
			query = sql`
        SELECT * FROM products 
        ORDER BY created_at DESC
      `;
		}

		const products = await query;
		return NextResponse.json(products);
	} catch (error) {
		console.error("Error fetching products:", error);
		return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
	}
}

// POST create new product (admin only)
export async function POST(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { name, description, image_url, category, featured } = await request.json();

		if (!name || !image_url) {
			return NextResponse.json({ error: "Name and image_url are required" }, { status: 400 });
		}

		const result = await sql`
      INSERT INTO products (name, description, image_url, category, featured)
      VALUES (${name}, ${description || null}, ${image_url}, ${category || null}, ${featured || false})
      RETURNING *
    `;

		return NextResponse.json(result[0], { status: 201 });
	} catch (error) {
		console.error("Error creating product:", error);
		return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
	}
}
