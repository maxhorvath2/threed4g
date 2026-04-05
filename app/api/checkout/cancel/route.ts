import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const paymentIntentId = String(body.paymentIntentId ?? "").trim();

		if (!paymentIntentId) {
			return NextResponse.json(
				{ error: "paymentIntentId is required" },
				{ status: 400 },
			);
		}

		if (!process.env.STRIPE_SECRET_KEY) {
			return NextResponse.json(
				{ error: "Stripe is not configured" },
				{ status: 500 },
			);
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
		await stripe.paymentIntents.cancel(paymentIntentId).catch(() => null);

		return NextResponse.json({ cancelled: true });
	} catch (error) {
		console.error("Error cancelling checkout:", error);
		return NextResponse.json(
			{ error: "Failed to cancel checkout" },
			{ status: 500 },
		);
	}
}
