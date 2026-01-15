import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Validate file type
		if (!file.type.startsWith("image/")) {
			return NextResponse.json({ error: "File must be an image" }, { status: 400 });
		}

		// Validate file size (max 10MB)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
		}

		const blob = await put(file.name, file, {
			access: "public",
			addRandomSuffix: true,
		});

		return NextResponse.json({ url: blob.url });
	} catch (error) {
		console.error("Error uploading file:", error);
		return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
	}
}
