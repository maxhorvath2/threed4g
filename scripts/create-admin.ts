import { hashPassword } from "../lib/auth";
import { sql } from "../lib/db";

async function createAdmin() {
	const username = process.argv[2];
	const password = process.argv[3];

	if (!username || !password) {
		console.error("Usage: npx tsx scripts/create-admin.ts <username> <password>");
		process.exit(1);
	}

	if (password.length < 6) {
		console.error("Password must be at least 6 characters long");
		process.exit(1);
	}

	try {
		// Check if username already exists
		const existing = await sql`
      SELECT id FROM admins WHERE username = ${username}
    `;

		if (existing.length > 0) {
			console.error(`Error: Username "${username}" already exists`);
			process.exit(1);
		}

		const passwordHash = await hashPassword(password);

		await sql`
      INSERT INTO admins (username, password_hash)
      VALUES (${username}, ${passwordHash})
    `;

		console.log(`✓ Admin user "${username}" created successfully!`);
		console.log(`You can now login at http://localhost:3000/login`);
	} catch (error) {
		console.error("Error creating admin:", error);
		process.exit(1);
	}

	process.exit(0);
}

createAdmin();
