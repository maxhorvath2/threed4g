import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

// GET all admins (admin only)
export async function GET() {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const admins = await sql`
      SELECT id, username, created_at 
      FROM admins 
      ORDER BY created_at DESC
    `;

		return NextResponse.json(admins);
	} catch (error) {
		console.error("Error fetching admins:", error);
		return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
	}
}

// POST create new admin (admin only)
export async function POST(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { username, password } = await request.json();

		if (!username || !password) {
			return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
		}

		if (password.length < 6) {
			return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
		}

		// Check if username already exists
		const existing = await sql`
      SELECT id FROM admins WHERE username = ${username}
    `;

		if (existing.length > 0) {
			return NextResponse.json({ error: "Username already exists" }, { status: 400 });
		}

		const passwordHash = await hashPassword(password);

		const result = await sql`
      INSERT INTO admins (username, password_hash)
      VALUES (${username}, ${passwordHash})
      RETURNING id, username, created_at
    `;

		return NextResponse.json(result[0], { status: 201 });
	} catch (error) {
		console.error("Error creating admin:", error);
		return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
	}
}
