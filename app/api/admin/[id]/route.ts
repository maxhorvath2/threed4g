import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

// DELETE admin (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;

		// Prevent deleting yourself - verify current admin exists first
		const currentAdmin = await sql`
      SELECT id FROM admins WHERE username = ${session}
    `;

		// If current admin doesn't exist, session is invalid
		if (currentAdmin.length === 0) {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 });
		}

		// Prevent deleting yourself
		if (currentAdmin[0].id.toString() === id) {
			return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
		}

		const result = await sql`
      DELETE FROM admins WHERE id = ${id} RETURNING id
    `;

		if (result.length === 0) {
			return NextResponse.json({ error: "Admin not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting admin:", error);
		return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
	}
}
