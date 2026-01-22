import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Link, UpdateLinkInput } from "@/lib/types/link";

// GET single link
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const result = await sql`
			SELECT * FROM links WHERE id = ${id}
		`;

		if (result.length === 0) {
			return NextResponse.json({ error: "Link not found" }, { status: 404 });
		}

		return NextResponse.json(result[0] as Link);
	} catch (error) {
		console.error("Error fetching link:", error);
		return NextResponse.json(
			{ error: "Failed to fetch link" },
			{ status: 500 }
		);
	}
}

// PUT update link (admin only)
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
		const body = (await request.json()) as UpdateLinkInput;
		const { title, url, promo_code, description, sort_order, active } = body;

		const result = await sql`
			UPDATE links
			SET
				title = COALESCE(${title}, title),
				url = COALESCE(${url}, url),
				promo_code = ${promo_code === undefined ? sql`promo_code` : promo_code},
				description = ${description === undefined ? sql`description` : description},
				sort_order = COALESCE(${sort_order}, sort_order),
				active = COALESCE(${active}, active),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = ${id}
			RETURNING *
		`;

		if (result.length === 0) {
			return NextResponse.json({ error: "Link not found" }, { status: 404 });
		}

		return NextResponse.json(result[0] as Link);
	} catch (error) {
		console.error("Error updating link:", error);
		return NextResponse.json(
			{ error: "Failed to update link" },
			{ status: 500 }
		);
	}
}

// DELETE link (admin only)
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
		const result = await sql`
			DELETE FROM links WHERE id = ${id} RETURNING *
		`;

		if (result.length === 0) {
			return NextResponse.json({ error: "Link not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting link:", error);
		return NextResponse.json(
			{ error: "Failed to delete link" },
			{ status: 500 }
		);
	}
}
