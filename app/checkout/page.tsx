"use client";

import { FormEvent, useMemo, useState } from "react";
import {
	Elements,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { useCartStore } from "@/lib/store/cart";

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

interface LineItem {
	productId: number;
	variantId: number;
	productName: string;
	variantName: string;
	unitPrice: number;
	quantity: number;
}

interface OrderResponse {
	success: boolean;
	order: {
		id: number;
		status: string;
		subtotal: number;
		currency: string;
		created_at: string;
	};
}

function CheckoutPaymentForm({
	customerName,
	customerEmail,
	lineItems,
	paymentIntentId,
	onSuccess,
}: {
	customerName: string;
	customerEmail: string;
	lineItems: LineItem[];
	paymentIntentId: string;
	onSuccess: (order: OrderResponse["order"]) => void;
}) {
	const stripe = useStripe();
	const elements = useElements();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!stripe || !elements) {
			return;
		}

		setSubmitting(true);
		setError(null);

		const confirmation = await stripe.confirmPayment({
			elements,
			redirect: "if_required",
			confirmParams: {
				payment_method_data: {
					billing_details: {
						name: customerName,
						email: customerEmail,
					},
				},
			},
		});

		if (confirmation.error) {
			setError(confirmation.error.message ?? "Payment failed");
			setSubmitting(false);
			return;
		}

		if (
			!confirmation.paymentIntent ||
			confirmation.paymentIntent.status !== "succeeded"
		) {
			setError("Payment did not complete. Please try again.");
			setSubmitting(false);
			return;
		}

		const submitRes = await fetch("/api/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				paymentIntentId,
				customer: {
					name: customerName,
					email: customerEmail,
				},
				items: lineItems.map((item) => ({
					id: `${item.productId}-${item.variantId}`,
					productId: item.productId,
					variantId: item.variantId,
					quantity: item.quantity,
				})),
			}),
		});

		const submitData = (await submitRes.json()) as
			| OrderResponse
			| { error: string };
		if (
			!submitRes.ok ||
			!("success" in submitData) ||
			!submitData.success
		) {
			setError(
				"Payment succeeded but order finalization failed. Please contact support.",
			);
			setSubmitting(false);
			return;
		}

		onSuccess(submitData.order);
		setSubmitting(false);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<PaymentElement />
			{error && (
				<p className="text-sm text-[#fca5a5] border border-[#7f1d1d] bg-[#7f1d1d]/20 rounded-lg px-3 py-2">
					{error}
				</p>
			)}
			<button
				type="submit"
				disabled={!stripe || !elements || submitting}
				className="w-full py-3 rounded-xl bg-[#22c55e] text-[#0a0a0a] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#16a34a] transition-colors"
			>
				{submitting ? "Processing..." : "Pay And Submit Order"}
			</button>
		</form>
	);
}

export default function CheckoutPage() {
	const { items, clearCart } = useCartStore();
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
	const [lineItems, setLineItems] = useState<LineItem[]>([]);
	const [subtotal, setSubtotal] = useState(0);
	const [currency, setCurrency] = useState("usd");
	const [loadingIntent, setLoadingIntent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [completedOrder, setCompletedOrder] = useState<
		OrderResponse["order"] | null
	>(null);

	const hasItems = items.length > 0;
	const canInitialize =
		customerName.trim() !== "" && customerEmail.trim() !== "";

	const itemCount = useMemo(
		() => items.reduce((total, item) => total + item.quantity, 0),
		[items],
	);

	const initializeCheckout = async () => {
		if (!hasItems || !canInitialize) {
			setError("Please add your name, email, and at least one item.");
			return;
		}

		setLoadingIntent(true);
		setError(null);

		const response = await fetch("/api/checkout/create-intent", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				customer: {
					name: customerName,
					email: customerEmail,
				},
				items: items.map((item) => ({
					id: item.id,
					productId: item.productId,
					variantId: item.variantId,
					quantity: item.quantity,
				})),
			}),
		});

		const data = (await response.json()) as {
			clientSecret?: string;
			paymentIntentId?: string;
			subtotal?: number;
			currency?: string;
			items?: LineItem[];
			error?: string;
		};

		if (
			!response.ok ||
			!data.clientSecret ||
			!data.paymentIntentId ||
			!data.items
		) {
			setError(data.error ?? "Failed to initialize checkout.");
			setLoadingIntent(false);
			return;
		}

		setClientSecret(data.clientSecret);
		setPaymentIntentId(data.paymentIntentId);
		setLineItems(data.items);
		setSubtotal(Number(data.subtotal ?? 0));
		setCurrency(String(data.currency ?? "usd"));
		setLoadingIntent(false);
	};

	const handleOrderSuccess = (order: OrderResponse["order"]) => {
		clearCart();
		setCompletedOrder(order);
	};

	return (
		<div className="min-h-screen bg-[#050505]">
			<Navigation />
			<main className="pt-32 pb-20 px-6">
				<div className="max-w-3xl mx-auto">
					<h1 className="text-4xl font-display font-bold text-[#fafafa] mb-3">
						Secure Checkout
					</h1>
					<p className="text-[#a3a3a3] mb-8">
						Pay with card using Stripe Elements and receive order
						confirmation by email.
					</p>

					{completedOrder ? (
						<div className="border border-[#22c55e]/40 bg-[#22c55e]/10 rounded-2xl p-6 space-y-3">
							<h2 className="text-2xl text-[#22c55e] font-display font-semibold">
								Order Submitted
							</h2>
							<p className="text-[#e5e5e5]">
								Order #{completedOrder.id} has been paid and
								submitted.
							</p>
							<p className="text-[#a3a3a3]">
								A confirmation email has been sent to{" "}
								{customerEmail}.
							</p>
						</div>
					) : (
						<div className="space-y-6">
							<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-4">
								<div>
									<label className="block text-sm text-[#a3a3a3] mb-2">
										Full Name
									</label>
									<input
										type="text"
										value={customerName}
										onChange={(e) =>
											setCustomerName(e.target.value)
										}
										className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
									/>
								</div>
								<div>
									<label className="block text-sm text-[#a3a3a3] mb-2">
										Email
									</label>
									<input
										type="email"
										value={customerEmail}
										onChange={(e) =>
											setCustomerEmail(e.target.value)
										}
										className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
									/>
								</div>
								<div className="flex items-center justify-between text-sm text-[#a3a3a3]">
									<span>{itemCount} item(s)</span>
									<span>
										$
										{useCartStore
											.getState()
											.getTotal()
											.toFixed(2)}
									</span>
								</div>
								<button
									type="button"
									onClick={initializeCheckout}
									disabled={
										!hasItems ||
										!canInitialize ||
										loadingIntent
									}
									className="w-full py-3 rounded-xl bg-[#22c55e] text-[#0a0a0a] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loadingIntent
										? "Preparing Checkout..."
										: "Continue To Payment"}
								</button>
							</div>

							{error && (
								<p className="text-sm text-[#fca5a5] border border-[#7f1d1d] bg-[#7f1d1d]/20 rounded-lg px-3 py-2">
									{error}
								</p>
							)}

							{clientSecret && paymentIntentId && (
								<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-3">
									<h2 className="text-xl text-[#fafafa] font-display">
										Payment Details
									</h2>
									<p className="text-sm text-[#a3a3a3]">
										Total: ${subtotal.toFixed(2)}{" "}
										{currency.toUpperCase()}
									</p>
									<Elements
										stripe={stripePromise}
										options={{ clientSecret }}
									>
										<CheckoutPaymentForm
											customerName={customerName}
											customerEmail={customerEmail}
											lineItems={lineItems}
											paymentIntentId={paymentIntentId}
											onSuccess={handleOrderSuccess}
										/>
									</Elements>
								</div>
							)}
						</div>
					)}
				</div>
			</main>
			<Footer />
		</div>
	);
}
