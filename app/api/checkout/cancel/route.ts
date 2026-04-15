import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { releaseStockSession } from "@/lib/stockReservation";

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const paymentIntentId = String(body.paymentIntentId ?? "").trim();
		const checkoutSessionId = String(body.checkoutSessionId ?? "").trim();

		if (!paymentIntentId && !checkoutSessionId) {
			return NextResponse.json(
				{
					error: "paymentIntentId or checkoutSessionId is required",
				},
				{ status: 400 },
			);
		}

		if (paymentIntentId && !process.env.STRIPE_SECRET_KEY) {
			return NextResponse.json(
				{ error: "Stripe is not configured" },
				{ status: 500 },
			);
		}

		if (paymentIntentId) {
			const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
			await stripe.paymentIntents
				.cancel(paymentIntentId)
				.catch(() => null);
		}

		if (checkoutSessionId) {
			await releaseStockSession(checkoutSessionId);
		}

		return NextResponse.json({ cancelled: true });
	} catch (error) {
		console.error("Error cancelling checkout:", error);
		return NextResponse.json(
			{ error: "Failed to cancel checkout" },
			{ status: 500 },
		);
	}
}
