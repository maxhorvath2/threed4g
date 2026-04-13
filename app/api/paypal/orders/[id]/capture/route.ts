import { NextRequest, NextResponse } from "next/server";
import {
	adjustShippingQuote,
	calculateTariffAmount,
	getCheckoutCurrency,
	isValidEmail,
	normalizeCheckoutItems,
	normalizeShippingAddress,
	type PaymentMethod,
} from "@/lib/checkout";
import { getAusPostShippingOptions } from "@/lib/auspost";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = (await request.json()) as Record<string, unknown>;
		const bodyOrderId = String(body.orderID ?? body.orderId ?? "").trim();
		const paymentMethod = String(body.paymentMethod ?? "paypal")
			.trim()
			.toLowerCase() as PaymentMethod;

		if (paymentMethod !== "paypal") {
			return NextResponse.json(
				{ error: "PayPal capture requires paymentMethod=paypal" },
				{ status: 400 },
			);
		}

		if (!bodyOrderId || bodyOrderId !== id) {
			return NextResponse.json(
				{ error: "PayPal order id mismatch" },
				{ status: 400 },
			);
		}

		const rawCustomer = (body.customer ?? {}) as Record<string, unknown>;
		const customerName = String(rawCustomer.name ?? "").trim();
		const customerEmail = String(rawCustomer.email ?? "")
			.trim()
			.toLowerCase();
		if (!customerName || !isValidEmail(customerEmail)) {
			return NextResponse.json(
				{ error: "Valid customer details are required" },
				{ status: 400 },
			);
		}

		const shipping = normalizeShippingAddress(body.shipping);
		if (!shipping) {
			return NextResponse.json(
				{ error: "A valid shipping address is required" },
				{ status: 400 },
			);
		}

		const shippingOptionId = String(body.shippingOptionId ?? "").trim();
		if (!shippingOptionId) {
			return NextResponse.json(
				{
					error: "A shipping option is required for PayPal checkout",
				},
				{ status: 400 },
			);
		}

		if (shippingOptionId !== "manual_contact") {
			const liveShippingOptions = await getAusPostShippingOptions({
				countryCode: shipping.address.country,
				toPostcode: shipping.address.postal_code,
			});
			const selectedShippingOption =
				liveShippingOptions.find(
					(option) => option.id === shippingOptionId,
				) ?? null;
			if (!selectedShippingOption) {
				return NextResponse.json(
					{ error: "Invalid shipping option for this destination" },
					{ status: 400 },
				);
			}
		}

		const rawItems = Array.isArray(body.items) ? body.items : [];
		const requestedItems = normalizeCheckoutItems(rawItems);
		if (requestedItems.length === 0) {
			return NextResponse.json(
				{ error: "At least one checkout item is required" },
				{ status: 400 },
			);
		}

		const capture = await capturePayPalOrder(id);
		if (capture.status !== "COMPLETED") {
			return NextResponse.json(
				{ error: "PayPal payment was not completed" },
				{ status: 402 },
			);
		}

		const finalizeResponse = await fetch(
			new URL("/api/checkout", request.url),
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					paymentMethod,
					paypalOrderId: capture.id,
					paypalCaptureId: capture.captureId,
					customer: {
						name: customerName,
						email: customerEmail,
					},
					shipping: {
						name: shipping.name,
						phone: shipping.phone,
						address: {
							line1: shipping.address.line1,
							line2: shipping.address.line2,
							city: shipping.address.city,
							state: shipping.address.state,
							postal_code: shipping.address.postal_code,
							country: shipping.address.country,
						},
					},
					shippingOptionId,
					items: requestedItems,
				}),
			},
		);

		const finalizeData = (await finalizeResponse.json()) as
			| { success: boolean; order: unknown }
			| { error: string };
		if (
			!finalizeResponse.ok ||
			!("success" in finalizeData) ||
			!finalizeData.success
		) {
			return NextResponse.json(
				{
					error:
						"error" in finalizeData && finalizeData.error
							? finalizeData.error
							: "Failed to finalize PayPal order",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(finalizeData, { status: 201 });
	} catch (error) {
		console.error("Error capturing PayPal order:", error);
		return NextResponse.json(
			{ error: "Failed to capture PayPal order" },
			{ status: 500 },
		);
	}
}
