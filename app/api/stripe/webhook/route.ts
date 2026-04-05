import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	try {
		const stripeSecret = process.env.STRIPE_SECRET_KEY;
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		if (!stripeSecret || !webhookSecret) {
			return NextResponse.json(
				{ error: "Stripe webhook is not configured" },
				{ status: 500 },
			);
		}

		const stripe = new Stripe(stripeSecret);
		const signature = request.headers.get("stripe-signature");
		if (!signature) {
			return NextResponse.json(
				{ error: "Missing Stripe signature" },
				{ status: 400 },
			);
		}

		const event = stripe.webhooks.constructEvent(
			await request.text(),
			signature,
			webhookSecret,
		);

		if (event.type === "payment_intent.succeeded") {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			console.info("Stripe payment_intent.succeeded", {
				paymentIntentId: paymentIntent.id,
			});
		}

		if (event.type === "payment_intent.payment_failed") {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			console.warn("Stripe payment_intent.payment_failed", {
				paymentIntentId: paymentIntent.id,
			});
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Stripe webhook error:", error);
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
	}
}
