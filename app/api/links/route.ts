import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Link, CreateLinkInput } from "@/lib/types/link";

// GET all links
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const activeOnly = searchParams.get("active") === "true";

		let links: Link[];
		if (activeOnly) {
			links = (await sql`
				SELECT * FROM links
				WHERE active = true
				ORDER BY sort_order ASC, created_at DESC
			`) as Link[];
		} else {
			links = (await sql`
				SELECT * FROM links
				ORDER BY sort_order ASC, created_at DESC
			`) as Link[];
		}

		return NextResponse.json(links);
	} catch (error) {
		console.error("Error fetching links:", error);
		return NextResponse.json(
			{ error: "Failed to fetch links" },
			{ status: 500 }
		);
	}
}

// POST create new link (admin only)
export async function POST(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json()) as CreateLinkInput;
		const { title, url, promo_code, description, sort_order, active } = body;

		if (!title || !url) {
			return NextResponse.json(
				{ error: "Title and URL are required" },
				{ status: 400 }
			);
		}

		// Auto-increment sort_order if not provided
		let finalSortOrder = sort_order;
		if (finalSortOrder === undefined || finalSortOrder === null) {
			const maxResult = await sql`
				SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM links
			`;
			finalSortOrder = maxResult[0].next_order;
		}

		const result = await sql`
			INSERT INTO links (title, url, promo_code, description, sort_order, active)
			VALUES (${title}, ${url}, ${promo_code || null}, ${description || null}, ${finalSortOrder}, ${active ?? true})
			RETURNING *
		`;

		return NextResponse.json(result[0], { status: 201 });
	} catch (error) {
		console.error("Error creating link:", error);
		return NextResponse.json(
			{ error: "Failed to create link" },
			{ status: 500 }
		);
	}
}
