import { NextRequest, NextResponse } from "next/server";
import { getAusPostShippingOptions } from "@/lib/auspost";
import { adjustShippingQuote } from "@/lib/checkout";

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

		const adjustedOptions = options.map((option) => ({
			...option,
			amount: adjustShippingQuote(option.amount, countryCode),
		}));

		adjustedOptions.push({
			id: "manual_contact",
			label: "No postage - will be arranged separately",
			description:
				"We will confirm postage separately with an email once you submit a request.",
			amount: 0,
			serviceCode: "manual_contact",
		});

		if (adjustedOptions.length === 0) {
			return NextResponse.json(
				{ error: "No shipping options available for this destination" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ options: adjustedOptions });
	} catch (error) {
		console.error("Error fetching shipping options:", error);
		return NextResponse.json(
			{ error: "Failed to fetch live shipping options" },
			{ status: 500 },
		);
	}
}
