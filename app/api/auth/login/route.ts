import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { comparePassword } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
		}

		// Get admin from database
		const result = await sql`
      SELECT id, username, password_hash 
      FROM admins 
      WHERE username = ${username}
      LIMIT 1
    `;

		if (result.length === 0) {
			return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
		}

		const admin = result[0];
		const isValid = await comparePassword(password, admin.password_hash);

		if (!isValid) {
			return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
		}

		// Create session using verified username from database (not user-supplied)
		await createSession(admin.username);

		return NextResponse.json({ success: true, username: admin.username });
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
