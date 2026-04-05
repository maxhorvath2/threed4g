import { NextRequest, NextResponse } from "next/server";
import { searchAusPostDomesticPostcodes } from "@/lib/auspost";

export async function GET(request: NextRequest) {
	try {
		const query = request.nextUrl.searchParams.get("q") ?? "";
		const suggestions = await searchAusPostDomesticPostcodes(query);
		return NextResponse.json({ suggestions });
	} catch (error) {
		console.error("Error fetching address suggestions:", error);
		return NextResponse.json({ suggestions: [] }, { status: 200 });
	}
}
