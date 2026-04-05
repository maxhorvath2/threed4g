import { NextRequest, NextResponse } from "next/server";
import { getAusPostShippingOptions } from "@/lib/auspost";

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const shipping = (body.shipping ?? {}) as Record<string, unknown>;
		const address = (shipping.address ?? {}) as Record<string, unknown>;
		const countryCode = String(address.country ?? "")
			.trim()
			.toUpperCase();
		const postalCode = String(address.postal_code ?? "").trim();

		if (!countryCode || !postalCode) {
			return NextResponse.json(
				{ error: "Shipping country and postal code are required" },
				{ status: 400 },
			);
		}

		const options = await getAusPostShippingOptions({
			countryCode,
			toPostcode: postalCode,
		});

		if (options.length === 0) {
			return NextResponse.json(
				{ error: "No shipping options available for this destination" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ options });
	} catch (error) {
		console.error("Error fetching shipping options:", error);
		return NextResponse.json(
			{ error: "Failed to fetch live shipping options" },
			{ status: 500 },
		);
	}
}
