"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

const stripePublishableKey =
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey
	? loadStripe(stripePublishableKey)
	: null;
const checkoutSessionStorageKey = "threed4g-checkout-session";

interface LineItem {
	productId: number;
	variantId: number;
	productName: string;
	variantName: string;
	unitPrice: number;
	quantity: number;
}

interface ShippingForm {
	name: string;
	phone: string;
	line1: string;
	line2: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

interface OrderResponse {
	success: boolean;
	order: {
		id: number;
		customer_name?: string;
		customer_email?: string;
		status: string;
		payment_status?: string;
		stripe_payment_intent_id?: string | null;
		subtotal: number;
		shipping_amount?: number;
		total_amount?: number;
		currency: string;
		created_at: string;
	};
}

interface SavedCheckoutSession {
	customerName: string;
	customerEmail: string;
	shipping: ShippingForm;
	shippingOptionId: string;
	shippingOptionLabel: string;
	clientSecret: string;
	paymentIntentId: string;
	lineItems: LineItem[];
	subtotal: number;
	shippingAmount: number;
	totalAmount: number;
	currency: string;
}

interface LiveShippingOption {
	id: string;
	label: string;
	description: string;
	amount: number;
	serviceCode: string;
}

interface AddressSuggestion {
	id: string;
	label: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

function defaultShipping(name = ""): ShippingForm {
	return {
		name,
		phone: "",
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "AU",
	};
}

function toShippingPayload(shipping: ShippingForm) {
	return {
		name: shipping.name,
		phone: shipping.phone || null,
		address: {
			line1: shipping.line1,
			line2: shipping.line2 || null,
			city: shipping.city,
			state: shipping.state,
			postal_code: shipping.postalCode,
			country: shipping.country,
		},
	};
}

function persistCheckoutSession(session: SavedCheckoutSession | null) {
	if (typeof window === "undefined") {
		return;
	}

	if (!session) {
		window.localStorage.removeItem(checkoutSessionStorageKey);
		return;
	}

	window.localStorage.setItem(
		checkoutSessionStorageKey,
		JSON.stringify(session),
	);
}

function loadSavedCheckoutSession(): SavedCheckoutSession | null {
	if (typeof window === "undefined") {
		return null;
	}

	const savedSession = window.localStorage.getItem(checkoutSessionStorageKey);
	if (!savedSession) {
		return null;
	}

	try {
		return JSON.parse(savedSession) as SavedCheckoutSession;
	} catch {
		window.localStorage.removeItem(checkoutSessionStorageKey);
		return null;
	}
}

function CheckoutPaymentForm({
	customerName,
	customerEmail,
	shipping,
	shippingOptionId,
	lineItems,
	paymentIntentId,
	onCancel,
	onSuccess,
}: {
	customerName: string;
	customerEmail: string;
	shipping: ShippingForm;
	shippingOptionId: string;
	lineItems: LineItem[];
	paymentIntentId: string;
	onCancel: () => Promise<void>;
	onSuccess: (order: OrderResponse["order"]) => void;
}) {
	const stripe = useStripe();
	const elements = useElements();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const handleElementLoadError = () => {
		setError(
			"Stripe payment form could not load. Please go back and continue to payment again.",
		);
	};

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
				shipping: toShippingPayload(shipping),
				shippingOptionId,
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

	const handleCancel = async () => {
		setSubmitting(true);
		setError(null);

		try {
			await onCancel();
		} catch (cancelError) {
			setError(
				cancelError instanceof Error
					? cancelError.message
					: "Failed to cancel checkout",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<PaymentElement onLoadError={handleElementLoadError} />
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
			<button
				type="button"
				onClick={handleCancel}
				disabled={submitting}
				className="w-full py-3 rounded-xl border border-[#262626] text-[#a3a3a3] font-semibold hover:text-[#fafafa] hover:border-[#404040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Cancel Checkout
			</button>
		</form>
	);
}

export default function CheckoutPage() {
	const { items, clearCart } = useCartStore();
	const [hasMounted, setHasMounted] = useState(false);
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [shipping, setShipping] = useState<ShippingForm>(defaultShipping());
	const [shippingOptionId, setShippingOptionId] = useState("");
	const [shippingOptionLabel, setShippingOptionLabel] = useState("Shipping");
	const [availableShippingOptions, setAvailableShippingOptions] = useState<
		LiveShippingOption[]
	>([]);
	const [loadingShippingOptions, setLoadingShippingOptions] = useState(false);
	const [addressLookupInput, setAddressLookupInput] = useState("");
	const [addressSuggestions, setAddressSuggestions] = useState<
		AddressSuggestion[]
	>([]);
	const [loadingAddressSuggestions, setLoadingAddressSuggestions] =
		useState(false);
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
	const [lineItems, setLineItems] = useState<LineItem[]>([]);
	const [subtotal, setSubtotal] = useState(0);
	const [shippingAmount, setShippingAmount] = useState(0);
	const [totalAmount, setTotalAmount] = useState(0);
	const [currency, setCurrency] = useState("usd");
	const [loadingIntent, setLoadingIntent] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [completedOrder, setCompletedOrder] = useState<
		OrderResponse["order"] | null
	>(null);
	const [checkoutStep, setCheckoutStep] = useState<
		"details" | "shipping" | "payment"
	>("details");

	useEffect(() => {
		setHasMounted(true);

		const savedSession = loadSavedCheckoutSession();
		if (!savedSession) {
			return;
		}

		setCustomerName(savedSession.customerName);
		setCustomerEmail(savedSession.customerEmail);
		setShipping(savedSession.shipping);
		setShippingOptionId(String(savedSession.shippingOptionId ?? ""));
		setShippingOptionLabel(
			String(savedSession.shippingOptionLabel ?? "Shipping"),
		);
		setClientSecret(savedSession.clientSecret);
		setPaymentIntentId(savedSession.paymentIntentId);
		setLineItems(savedSession.lineItems);
		setSubtotal(savedSession.subtotal);
		setShippingAmount(savedSession.shippingAmount);
		setTotalAmount(savedSession.totalAmount);
		setCurrency(savedSession.currency);
		setCheckoutStep(savedSession.clientSecret ? "payment" : "shipping");
	}, []);

	const hasItems = items.length > 0;
	const hasVisibleItems = hasMounted && hasItems;
	const shippingReady =
		shipping.name.trim() !== "" &&
		shipping.line1.trim() !== "" &&
		shipping.city.trim() !== "" &&
		shipping.state.trim() !== "" &&
		shipping.postalCode.trim() !== "" &&
		shipping.country.trim() !== "";
	const canContinueToShipping =
		customerName.trim() !== "" &&
		customerEmail.trim() !== "" &&
		shippingReady;
	const normalizedShippingOptionId = String(shippingOptionId ?? "").trim();
	const canInitializeCheckout =
		canContinueToShipping && normalizedShippingOptionId !== "";
	const selectedShippingOption = useMemo<LiveShippingOption | null>(
		() =>
			availableShippingOptions.find(
				(option) => option.id === normalizedShippingOptionId,
			) ?? null,
		[availableShippingOptions, normalizedShippingOptionId],
	);

	const itemCount = useMemo(
		() => items.reduce((total, item) => total + item.quantity, 0),
		[items],
	);
	const cartSubtotal = useMemo(
		() =>
			items.reduce(
				(total, item) => total + item.price * item.quantity,
				0,
			),
		[items],
	);

	const resetPreparedPayment = () => {
		setClientSecret(null);
		setPaymentIntentId(null);
		setLineItems([]);
		persistCheckoutSession(null);
	};

	const loadLiveShippingOptions = async () => {
		setLoadingShippingOptions(true);
		setError(null);

		try {
			const response = await fetch("/api/shipping/options", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					shipping: toShippingPayload(shipping),
				}),
			});

			const data = (await response.json()) as {
				options?: LiveShippingOption[];
				error?: string;
			};
			const options = data.options ?? [];

			if (!response.ok || options.length === 0) {
				setAvailableShippingOptions([]);
				setShippingOptionId("");
				setError(data.error ?? "No live shipping options available.");
				return false;
			}

			setAvailableShippingOptions(options);
			setShippingOptionId((current) => {
				if (
					current &&
					options.some((option) => option.id === current)
				) {
					return current;
				}
				return options[0]?.id ?? "";
			});
			return true;
		} catch {
			setAvailableShippingOptions([]);
			setShippingOptionId("");
			setError("Failed to load live shipping options.");
			return false;
		} finally {
			setLoadingShippingOptions(false);
		}
	};

	useEffect(() => {
		if (shipping.country !== "AU" || addressLookupInput.trim().length < 2) {
			setAddressSuggestions([]);
			return;
		}

		const controller = new AbortController();
		const timeout = window.setTimeout(async () => {
			try {
				setLoadingAddressSuggestions(true);
				const response = await fetch(
					`/api/shipping/address-suggest?q=${encodeURIComponent(addressLookupInput.trim())}`,
					{ signal: controller.signal },
				);
				const data = (await response.json()) as {
					suggestions?: AddressSuggestion[];
				};
				setAddressSuggestions(data.suggestions ?? []);
			} catch {
				setAddressSuggestions([]);
			} finally {
				setLoadingAddressSuggestions(false);
			}
		}, 250);

		return () => {
			window.clearTimeout(timeout);
			controller.abort();
		};
	}, [addressLookupInput, shipping.country]);

	const initializeCheckout = async () => {
		if (!hasItems || !canInitializeCheckout || !selectedShippingOption) {
			setError(
				"Please complete your details and choose a shipping option before continuing.",
			);
			return;
		}

		if (!stripePromise) {
			setError("Stripe is not configured.");
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
				shipping: toShippingPayload(shipping),
				shippingOptionId: selectedShippingOption.id,
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
			shippingOption?: LiveShippingOption;
			subtotal?: number;
			shippingAmount?: number;
			totalAmount?: number;
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
		setShippingAmount(Number(data.shippingAmount ?? 0));
		setTotalAmount(Number(data.totalAmount ?? 0));
		setCurrency(String(data.currency ?? "usd"));
		setShippingOptionLabel(
			String(data.shippingOption?.label ?? selectedShippingOption.label),
		);
		persistCheckoutSession({
			customerName,
			customerEmail,
			shipping,
			shippingOptionId: selectedShippingOption.id,
			shippingOptionLabel: String(
				data.shippingOption?.label ?? selectedShippingOption.label,
			),
			clientSecret: data.clientSecret,
			paymentIntentId: data.paymentIntentId,
			lineItems: data.items,
			subtotal: Number(data.subtotal ?? 0),
			shippingAmount: Number(data.shippingAmount ?? 0),
			totalAmount: Number(data.totalAmount ?? 0),
			currency: String(data.currency ?? "usd"),
		});
		setCheckoutStep("payment");
		setLoadingIntent(false);
	};

	const handleOrderSuccess = (order: OrderResponse["order"]) => {
		clearCart();
		persistCheckoutSession(null);
		setCompletedOrder(order);
		setClientSecret(null);
		setPaymentIntentId(null);
		setLineItems([]);
		setSubtotal(0);
		setShippingAmount(0);
		setTotalAmount(0);
		setShippingOptionId("");
		setShippingOptionLabel("Shipping");
		setCheckoutStep("details");
	};

	const handleCancelCheckout = async () => {
		if (!paymentIntentId) {
			return;
		}

		setCancelling(true);
		setError(null);

		const response = await fetch("/api/checkout/cancel", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ paymentIntentId }),
		});

		if (!response.ok) {
			const data = (await response.json()) as { error?: string };
			setError(data.error ?? "Failed to cancel checkout.");
			setCancelling(false);
			return;
		}

		persistCheckoutSession(null);
		setClientSecret(null);
		setPaymentIntentId(null);
		setLineItems([]);
		setSubtotal(0);
		setShippingAmount(0);
		setTotalAmount(0);
		setCurrency("usd");
		setShippingOptionLabel("Shipping");
		setCheckoutStep("details");
		setCancelling(false);
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
						Step 1: details. Step 2: shipping method. Step 3: secure
						payment.
					</p>

					{!stripePromise && (
						<div className="border border-[#7f1d1d] bg-[#7f1d1d]/20 rounded-2xl p-4 mb-6 text-sm text-[#fca5a5]">
							Stripe is not configured. Add your publishable and
							secret keys to enable checkout.
						</div>
					)}

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
							<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-6">
								<p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
									Step 1 · Customer & Shipping Details
								</p>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="md:col-span-2">
										<label className="block text-sm text-[#a3a3a3] mb-2">
											Full Name
										</label>
										<input
											type="text"
											autoComplete="name"
											value={customerName}
											onChange={(e) =>
												setCustomerName(e.target.value)
											}
											className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
										/>
									</div>
									<div className="md:col-span-2">
										<label className="block text-sm text-[#a3a3a3] mb-2">
											Email
										</label>
										<input
											type="email"
											autoComplete="email"
											value={customerEmail}
											onChange={(e) =>
												setCustomerEmail(e.target.value)
											}
											className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
										/>
									</div>
								</div>

								<div className="pt-2 border-t border-[#1f1f1f] space-y-4">
									<h2 className="text-lg font-semibold text-[#fafafa]">
										Shipping Address
									</h2>
									<div className="grid gap-4 md:grid-cols-2">
										<div className="md:col-span-2">
											<label className="block text-sm text-[#a3a3a3] mb-2">
												Recipient Name
											</label>
											<input
												type="text"
												autoComplete="shipping name"
												value={shipping.name}
												onChange={(e) =>
													setShipping((current) => ({
														...current,
														name: e.target.value,
													}))
												}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
											/>
										</div>
										<div>
											<label className="block text-sm text-[#a3a3a3] mb-2">
												Phone (optional)
											</label>
											<input
												type="tel"
												autoComplete="tel"
												value={shipping.phone}
												onChange={(e) =>
													setShipping((current) => ({
														...current,
														phone: e.target.value,
													}))
												}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
											/>
										</div>
										<div>
											<label className="block text-sm text-[#a3a3a3] mb-2">
												Country
											</label>
											<select
												value={shipping.country}
												onChange={(e) => {
													const nextCountry =
														e.target.value;
													setShipping((current) => ({
														...current,
														country: nextCountry,
													}));
													setAddressLookupInput("");
													setAddressSuggestions([]);
													setAvailableShippingOptions(
														[],
													);
													setShippingOptionId("");
													setShippingOptionLabel(
														"Shipping",
													);
													setCheckoutStep("details");
													resetPreparedPayment();
												}}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
											>
												<option value="AU">
													Australia
												</option>
												<option value="NZ">
													New Zealand
												</option>
												<option value="US">
													United States
												</option>
												<option value="GB">
													United Kingdom
												</option>
												<option value="CA">
													Canada
												</option>
												<option value="SG">
													Singapore
												</option>
												<option value="DE">
													Germany
												</option>
												<option value="FR">
													France
												</option>
												<option value="OTHER">
													Other
												</option>
											</select>
										</div>
										<div className="md:col-span-2">
											<label className="block text-sm text-[#a3a3a3] mb-2">
												Address Line 1
											</label>
											<input
												type="text"
												autoComplete="shipping address-line1"
												value={shipping.line1}
												onChange={(e) =>
													setShipping((current) => ({
														...current,
														line1: e.target.value,
													}))
												}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
											/>
										</div>
										<div className="md:col-span-2">
											<label className="block text-sm text-[#a3a3a3] mb-2">
												Address Line 2 (optional)
											</label>
											<input
												type="text"
												autoComplete="shipping address-line2"
												value={shipping.line2}
												onChange={(e) =>
													setShipping((current) => ({
														...current,
														line2: e.target.value,
													}))
												}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
											/>
										</div>
										<div>
											<label className="block text-sm text-[#a3a3a3] mb-2">
												City
											</label>
											<input
												type="text"
												autoComplete="shipping address-level2"
												value={shipping.city}
												onChange={(e) => {
													const value =
														e.target.value;
													setShipping((current) => ({
														...current,
														city: value,
													}));
													setAddressLookupInput(
														value,
													);
												}}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
											/>
										</div>
										<div>
											<label className="block text-sm text-[#a3a3a3] mb-2">
												State / Region
											</label>
											<input
												type="text"
												autoComplete="shipping address-level1"
												value={shipping.state}
												onChange={(e) =>
													setShipping((current) => ({
														...current,
														state: e.target.value,
													}))
												}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
											/>
										</div>
										<div>
											<label className="block text-sm text-[#a3a3a3] mb-2">
												Postal Code
											</label>
											<input
												type="text"
												autoComplete="shipping postal-code"
												value={shipping.postalCode}
												onChange={(e) => {
													const value =
														e.target.value;
													setShipping((current) => ({
														...current,
														postalCode: value,
													}));
													setAddressLookupInput(
														value,
													);
												}}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
											/>
										</div>
										{shipping.country === "AU" &&
											(loadingAddressSuggestions ||
												addressSuggestions.length >
													0) && (
												<div className="md:col-span-2 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-3 space-y-2">
													<p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
														Address Suggestions
													</p>
													{loadingAddressSuggestions ? (
														<p className="text-sm text-[#a3a3a3]">
															Searching Australia
															Post suburbs...
														</p>
													) : (
														<div className="flex flex-wrap gap-2">
															{addressSuggestions.map(
																(
																	suggestion,
																) => (
																	<button
																		key={
																			suggestion.id
																		}
																		type="button"
																		onClick={() => {
																			setShipping(
																				(
																					current,
																				) => ({
																					...current,
																					city: suggestion.city,
																					state: suggestion.state,
																					postalCode:
																						suggestion.postalCode,
																					country:
																						suggestion.country,
																				}),
																			);
																			setAddressLookupInput(
																				"",
																			);
																			setAddressSuggestions(
																				[],
																			);
																		}}
																		className="px-3 py-2 rounded-lg border border-[#262626] text-sm text-[#d4d4d4] hover:border-[#404040]"
																	>
																		{
																			suggestion.label
																		}
																	</button>
																),
															)}
														</div>
													)}
												</div>
											)}
									</div>
								</div>

								<div className="border-t border-[#1f1f1f] pt-4 space-y-2 text-sm text-[#a3a3a3]">
									<div className="flex items-center justify-between">
										<span>
											{hasMounted
												? `${itemCount} item(s)`
												: "0 item(s)"}
										</span>
										<span>
											$
											{hasMounted
												? cartSubtotal.toFixed(2)
												: "0.00"}
										</span>
									</div>
									<button
										type="button"
										onClick={async () => {
											if (
												!hasVisibleItems ||
												!canContinueToShipping
											) {
												setError(
													"Please complete your customer and shipping details before continuing.",
												);
												return;
											}
											const loaded =
												await loadLiveShippingOptions();
											if (!loaded) {
												return;
											}
											setError(null);
											setCheckoutStep("shipping");
										}}
										disabled={
											loadingShippingOptions ||
											!hasVisibleItems ||
											!canContinueToShipping ||
											!stripePromise
										}
										className="w-full py-3 rounded-xl bg-[#22c55e] text-[#0a0a0a] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{loadingShippingOptions
											? "Loading Live Shipping..."
											: "Continue To Shipping Options"}
									</button>
								</div>
							</div>

							{checkoutStep !== "details" && (
								<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-4">
									<p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
										Step 2 · Shipping Options
									</p>
									<div className="space-y-3">
										{availableShippingOptions.length ===
											0 && (
											<p className="text-sm text-[#a3a3a3]">
												No live shipping options loaded
												yet.
											</p>
										)}
										{availableShippingOptions.map(
											(option) => (
												<label
													key={option.id}
													className="block rounded-xl border border-[#262626] bg-[#0a0a0a] p-4 cursor-pointer"
												>
													<div className="flex items-start gap-3">
														<input
															type="radio"
															name="shipping-option"
															checked={
																shippingOptionId ===
																option.id
															}
															onChange={() => {
																setShippingOptionId(
																	option.id,
																);
																setShippingOptionLabel(
																	option.label,
																);
																resetPreparedPayment();
															}}
															className="mt-1"
														/>
														<div className="flex-1">
															<div className="flex items-center justify-between gap-3">
																<p className="text-[#fafafa] font-medium">
																	{
																		option.label
																	}
																</p>
																<p className="text-[#d4d4d4]">
																	$
																	{option.amount.toFixed(
																		2,
																	)}
																</p>
															</div>
															<p className="text-sm text-[#737373]">
																{
																	option.description
																}
															</p>
														</div>
													</div>
												</label>
											),
										)}
									</div>
									<div className="grid gap-3 md:grid-cols-2">
										<button
											type="button"
											onClick={() =>
												setCheckoutStep("details")
											}
											className="w-full py-3 rounded-xl border border-[#262626] text-[#a3a3a3] font-semibold hover:text-[#fafafa] hover:border-[#404040] transition-colors"
										>
											Back To Details
										</button>
										<button
											type="button"
											onClick={initializeCheckout}
											disabled={
												loadingShippingOptions ||
												loadingIntent ||
												!selectedShippingOption ||
												!stripePromise
											}
											className="w-full py-3 rounded-xl bg-[#22c55e] text-[#0a0a0a] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{loadingShippingOptions ||
											loadingIntent
												? "Preparing Checkout..."
												: "Continue To Payment"}
										</button>
									</div>
								</div>
							)}

							{error && (
								<p className="text-sm text-[#fca5a5] border border-[#7f1d1d] bg-[#7f1d1d]/20 rounded-lg px-3 py-2">
									{error}
								</p>
							)}

							{checkoutStep === "payment" &&
								clientSecret &&
								paymentIntentId && (
									<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-4">
										<p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
											Step 3 · Payment
										</p>
										<h2 className="text-xl text-[#fafafa] font-display">
											Payment Details
										</h2>
										<div className="rounded-xl border border-[#171717] bg-[#0a0a0a] p-4 space-y-2 text-sm text-[#a3a3a3]">
											<div className="flex items-center justify-between">
												<span>Subtotal</span>
												<span>
													${subtotal.toFixed(2)}{" "}
													{currency.toUpperCase()}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span>Shipping</span>
												<span>
													{selectedShippingOption?.label ??
														shippingOptionLabel}{" "}
													· $
													{shippingAmount.toFixed(2)}{" "}
													{currency.toUpperCase()}
												</span>
											</div>
											<div className="flex items-center justify-between text-[#fafafa] font-semibold border-t border-[#1f1f1f] pt-2 mt-2">
												<span>Total</span>
												<span>
													${totalAmount.toFixed(2)}{" "}
													{currency.toUpperCase()}
												</span>
											</div>
										</div>

										{lineItems.length > 0 && (
											<div className="space-y-2 rounded-xl border border-[#171717] bg-[#0a0a0a] p-4">
												<p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
													Order Items
												</p>
												<div className="space-y-2">
													{lineItems.map((item) => (
														<div
															key={`${item.productId}-${item.variantId}`}
															className="flex items-center justify-between gap-3 text-sm text-[#d4d4d4]"
														>
															<span className="truncate">
																{
																	item.productName
																}
																<span className="text-[#737373]">
																	{" "}
																	·{" "}
																	{
																		item.variantName
																	}
																</span>
															</span>
															<span className="shrink-0 text-[#a3a3a3]">
																x{item.quantity}
															</span>
														</div>
													))}
												</div>
											</div>
										)}

										{stripePromise ? (
											<Elements
												key={clientSecret}
												stripe={stripePromise}
												options={{ clientSecret }}
											>
												<CheckoutPaymentForm
													customerName={customerName}
													customerEmail={
														customerEmail
													}
													shipping={shipping}
													shippingOptionId={
														shippingOptionId
													}
													lineItems={lineItems}
													paymentIntentId={
														paymentIntentId
													}
													onCancel={
														handleCancelCheckout
													}
													onSuccess={
														handleOrderSuccess
													}
												/>
											</Elements>
										) : (
											<p className="text-sm text-[#a3a3a3]">
												Stripe is not configured yet.
											</p>
										)}
										{cancelling && (
											<p className="text-xs text-[#737373]">
												Cancelling checkout...
											</p>
										)}
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
