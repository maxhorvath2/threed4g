"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
	Elements,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { useCartStore } from "@/lib/store/cart";
import type { PaymentMethod } from "@/lib/checkout";

const stripePublishableKey =
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey
	? loadStripe(stripePublishableKey)
	: null;
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const defaultPayPalCurrency = String(
	process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ?? "aud",
)
	.trim()
	.toLowerCase();
const checkoutSessionStorageKey = "threed4g-checkout-session";

interface LineItem {
	productId: number;
	variantId: number | null;
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
	customCountry: string;
}

interface OrderResponse {
	success: boolean;
	order: {
		id: number;
		customer_name?: string;
		customer_email?: string;
		status: string;
		payment_status?: string;
		payment_method?: string;
		stripe_payment_intent_id?: string | null;
		subtotal: number;
		shipping_amount?: number;
		tariff_amount?: number;
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
	paymentMethod: PaymentMethod;
	clientSecret: string;
	paymentIntentId: string;
	lineItems: LineItem[];
	subtotal: number;
	shippingAmount: number;
	tariffAmount: number;
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

interface CountryOption {
	code: string;
	label: string;
}

const fallbackCountryOptions: CountryOption[] = [
	{ code: "AU", label: "Australia" },
	{ code: "NZ", label: "New Zealand" },
	{ code: "US", label: "United States" },
	{ code: "GB", label: "United Kingdom" },
	{ code: "CA", label: "Canada" },
	{ code: "OTHER", label: "Other" },
];

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
		customCountry: "",
	};
}

function resolveShippingCountry(shipping: ShippingForm): string {
	if (shipping.country !== "OTHER") {
		return shipping.country;
	}

	return shipping.customCountry;
}

function toShippingPayload(shipping: ShippingForm) {
	const country = resolveShippingCountry(shipping).trim().toUpperCase();

	return {
		name: shipping.name,
		phone: shipping.phone || null,
		address: {
			line1: shipping.line1,
			line2: shipping.line2 || null,
			city: shipping.city,
			state: shipping.state,
			postal_code: shipping.postalCode,
			country,
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

function toPaymentMethod(value: unknown): PaymentMethod {
	if (
		value === "stripe" ||
		value === "paypal" ||
		value === "beem" ||
		value === "contact"
	) {
		return value;
	}

	return "stripe";
}

function normalizeCheckoutCurrency(value: unknown): string {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase();

	if (normalized === defaultPayPalCurrency) {
		return normalized;
	}

	return defaultPayPalCurrency;
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
				paymentMethod: "stripe",
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

function PayPalCheckoutForm({
	customerName,
	customerEmail,
	shipping,
	shippingOptionId,
	lineItems,
	totalAmount,
	onSuccess,
}: {
	customerName: string;
	customerEmail: string;
	shipping: ShippingForm;
	shippingOptionId: string;
	lineItems: LineItem[];
	totalAmount: number;
	onSuccess: (order: OrderResponse["order"]) => void;
}) {
	const [error, setError] = useState<string | null>(null);

	const paypalOptions = useMemo(
		() => ({
			clientId: paypalClientId,
			"client-id": paypalClientId,
			currency: defaultPayPalCurrency.toUpperCase(),
			intent: "capture",
			components: "buttons",
			dataNamespace: `paypal_sdk_${defaultPayPalCurrency}`,
		}),
		[],
	);

	if (!paypalClientId) {
		return (
			<div className="rounded-xl border border-[#7f1d1d] bg-[#7f1d1d]/20 p-4 text-sm text-[#fca5a5]">
				PayPal is not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID to
				show the PayPal checkout buttons.
			</div>
		);
	}

	const buildOrderPayload = () => ({
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
	});

	const createOrder = async () => {
		setError(null);
		if (lineItems.length === 0) {
			throw new Error(
				"No checkout items were prepared for PayPal. Please go back and continue again.",
			);
		}
		const response = await fetch("/api/paypal/orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(buildOrderPayload()),
		});

		const data = (await response.json()) as { id?: string; error?: string };
		if (!response.ok || !data.id) {
			throw new Error(data.error ?? "Failed to create PayPal order.");
		}

		return data.id;
	};

	const handleApprove = async (data: { orderID: string }) => {
		setError(null);
		const response = await fetch(
			`/api/paypal/orders/${encodeURIComponent(data.orderID)}/capture`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orderID: data.orderID,
					paymentMethod: "paypal",
					...buildOrderPayload(),
				}),
			},
		);

		const result = (await response.json()) as
			| OrderResponse
			| { error?: string };
		if (!response.ok || !("success" in result) || !result.success) {
			throw new Error(
				"error" in result && result.error
					? result.error
					: "Failed to finalize PayPal payment.",
			);
		}

		onSuccess(result.order);
	};

	return (
		<PayPalScriptProvider
			key={`paypal-sdk-${defaultPayPalCurrency}`}
			options={paypalOptions}
		>
			<div className="space-y-4">
				<PayPalButtons
					style={{ layout: "vertical", label: "paypal" }}
					forceReRender={[
						defaultPayPalCurrency,
						totalAmount,
						shippingOptionId,
						totalAmount,
					]}
					createOrder={createOrder}
					onApprove={handleApprove}
					onCancel={() => setError("PayPal checkout was cancelled.")}
					onError={(paypalError) => {
						setError(
							paypalError instanceof Error
								? paypalError.message
								: "PayPal checkout failed.",
						);
					}}
				/>
				{error && (
					<p className="text-sm text-[#fca5a5] border border-[#7f1d1d] bg-[#7f1d1d]/20 rounded-lg px-3 py-2">
						{error}
					</p>
				)}
			</div>
		</PayPalScriptProvider>
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
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
	const [countryOptions, setCountryOptions] = useState<CountryOption[]>(
		fallbackCountryOptions,
	);
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
	const [currency, setCurrency] = useState(
		normalizeCheckoutCurrency(defaultPayPalCurrency),
	);
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
		setShipping((current) => ({
			...current,
			...savedSession.shipping,
			customCountry: String(savedSession.shipping.customCountry ?? ""),
		}));
		setShippingOptionId(String(savedSession.shippingOptionId ?? ""));
		setShippingOptionLabel(
			String(savedSession.shippingOptionLabel ?? "Shipping"),
		);
		const restoredPaymentMethod = toPaymentMethod(
			savedSession.paymentMethod,
		);
		setPaymentMethod(restoredPaymentMethod);
		setClientSecret(savedSession.clientSecret);
		setPaymentIntentId(savedSession.paymentIntentId);
		setLineItems(savedSession.lineItems);
		setSubtotal(savedSession.subtotal);
		setShippingAmount(savedSession.shippingAmount);
		setTotalAmount(savedSession.totalAmount);
		setCurrency(normalizeCheckoutCurrency(savedSession.currency));
		setCheckoutStep(
			restoredPaymentMethod === "paypal" || savedSession.clientSecret
				? "payment"
				: "shipping",
		);
	}, []);

	const hasItems = items.length > 0;
	const hasVisibleItems = hasMounted && hasItems;
	const resolvedShippingCountry = resolveShippingCountry(shipping)
		.trim()
		.toUpperCase();
	const shippingReady =
		shipping.name.trim() !== "" &&
		shipping.line1.trim() !== "" &&
		shipping.city.trim() !== "" &&
		shipping.state.trim() !== "" &&
		shipping.postalCode.trim() !== "" &&
		resolvedShippingCountry !== "";
	const canContinueToShipping =
		customerName.trim() !== "" &&
		customerEmail.trim() !== "" &&
		shippingReady;
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
	const normalizedShippingOptionId = String(shippingOptionId ?? "").trim();
	const usingManualShippingOption =
		normalizedShippingOptionId === "manual_contact";
	const tariffAmount = useMemo(
		() =>
			resolvedShippingCountry === "US"
				? Math.round(cartSubtotal * 0.1 * 100) / 100
				: 0,
		[cartSubtotal, resolvedShippingCountry],
	);
	const canInitializeCheckout =
		canContinueToShipping && normalizedShippingOptionId !== "";
	const selectedShippingOption = useMemo<LiveShippingOption | null>(
		() =>
			availableShippingOptions.find(
				(option) => option.id === normalizedShippingOptionId,
			) ?? null,
		[availableShippingOptions, normalizedShippingOptionId],
	);

	useEffect(() => {
		const controller = new AbortController();

		void (async () => {
			try {
				const response = await fetch("/api/shipping/countries", {
					signal: controller.signal,
					cache: "no-store",
				});
				if (!response.ok) {
					return;
				}

				const data = (await response.json()) as {
					countries?: CountryOption[];
				};
				const apiCountries = Array.isArray(data.countries)
					? data.countries
							.filter(
								(country) =>
									typeof country?.code === "string" &&
									typeof country?.label === "string",
							)
							.map((country) => ({
								code: country.code.toUpperCase(),
								label: country.label,
							}))
							.filter((country) =>
								/^[A-Z]{2}$/.test(country.code),
							)
					: [];

				if (apiCountries.length > 0) {
					setCountryOptions([
						...apiCountries,
						{ code: "OTHER", label: "Other" },
					]);
				}
			} catch {
				// Keep fallback country list when API is unavailable.
			}
		})();

		return () => {
			controller.abort();
		};
	}, []);

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
		if (
			resolvedShippingCountry !== "AU" ||
			addressLookupInput.trim().length < 2
		) {
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
	}, [addressLookupInput, resolvedShippingCountry]);

	const initializeCheckout = async () => {
		if (!hasItems || !canInitializeCheckout || !selectedShippingOption) {
			setError(
				"Please complete your details and choose a shipping option before continuing.",
			);
			return;
		}

		if (paymentMethod === "paypal") {
			const preparedLineItems: LineItem[] = items.map((item) => ({
				productId: item.productId,
				variantId: item.variantId,
				productName: item.name,
				variantName: item.variantName ?? item.name,
				unitPrice: item.price,
				quantity: item.quantity,
			}));
			const preparedShippingAmount = Number(
				selectedShippingOption.amount.toFixed(2),
			);
			const preparedCurrency = defaultPayPalCurrency;

			setLineItems(preparedLineItems);
			setSubtotal(cartSubtotal);
			setShippingAmount(preparedShippingAmount);
			setTotalAmount(
				cartSubtotal + preparedShippingAmount + tariffAmount,
			);
			setCurrency(preparedCurrency);
			setShippingOptionLabel(selectedShippingOption.label);
			setError(null);
			setCheckoutStep("payment");
			persistCheckoutSession({
				customerName,
				customerEmail,
				shipping,
				shippingOptionId: selectedShippingOption.id,
				shippingOptionLabel: selectedShippingOption.label,
				paymentMethod,
				clientSecret: "",
				paymentIntentId: "",
				lineItems: preparedLineItems,
				subtotal: cartSubtotal,
				shippingAmount: preparedShippingAmount,
				tariffAmount,
				totalAmount:
					cartSubtotal + preparedShippingAmount + tariffAmount,
				currency: preparedCurrency,
			});
			setLoadingIntent(false);
			return;
		}

		if (paymentMethod !== "stripe") {
			await submitManualCheckout();
			return;
		}

		if (usingManualShippingOption) {
			setError(
				"The no-postage option can only be used with PayPal, Beem, or contact checkout.",
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
			tariffAmount?: number;
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
		const resolvedCurrency = normalizeCheckoutCurrency(data.currency);
		setCurrency(resolvedCurrency);
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
			paymentMethod,
			clientSecret: data.clientSecret,
			paymentIntentId: data.paymentIntentId,
			lineItems: data.items,
			subtotal: Number(data.subtotal ?? 0),
			shippingAmount: Number(data.shippingAmount ?? 0),
			tariffAmount: Number(data.tariffAmount ?? tariffAmount),
			totalAmount: Number(data.totalAmount ?? 0),
			currency: resolvedCurrency,
		});
		setCheckoutStep("payment");
		setLoadingIntent(false);
	};

	const submitManualCheckout = async () => {
		if (!hasItems || !selectedShippingOption) {
			setError("Please choose a shipping option before submitting.");
			return;
		}

		setLoadingIntent(true);
		setError(null);

		try {
			const response = await fetch("/api/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					paymentMethod,
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

			const data = (await response.json()) as
				| OrderResponse
				| { error: string };
			if (!response.ok || !("success" in data) || !data.success) {
				throw new Error(
					"error" in data && data.error
						? data.error
						: "Failed to submit order request.",
				);
			}

			handleOrderSuccess(data.order);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Failed to submit order request.",
			);
		} finally {
			setLoadingIntent(false);
		}
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
		setPaymentMethod("stripe");
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
		setCurrency(defaultPayPalCurrency);
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
							Stripe card checkout is not configured. Manual
							PayPal, Beem, and contact-based checkout are still
							available.
						</div>
					)}

					{completedOrder ? (
						<div className="border border-[#22c55e]/40 bg-[#22c55e]/10 rounded-2xl p-6 space-y-3">
							<h2 className="text-2xl text-[#22c55e] font-display font-semibold">
								Order Submitted
							</h2>
							<p className="text-[#e5e5e5]">
								{completedOrder.payment_status === "paid"
									? `Order #${completedOrder.id} has been paid and submitted.`
									: `Order #${completedOrder.id} has been submitted. We’ll follow up with postage and payment details.`}
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
														customCountry:
															nextCountry ===
															"OTHER"
																? current.customCountry
																: "",
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
												{countryOptions.map(
													(option) => (
														<option
															key={option.code}
															value={option.code}
														>
															{option.label}
														</option>
													),
												)}
											</select>
										</div>
										{shipping.country === "OTHER" && (
											<div>
												<label className="block text-sm text-[#a3a3a3] mb-2">
													Country Code
												</label>
												<input
													type="text"
													placeholder="e.g. JP, NL, BR"
													value={
														shipping.customCountry
													}
													onChange={(e) =>
														setShipping(
															(current) => ({
																...current,
																customCountry:
																	e.target
																		.value,
															}),
														)
													}
													className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
												/>
												<p className="mt-2 text-xs text-[#737373]">
													Use a 2-letter ISO country
													code so live AusPost quotes
													can be returned.
												</p>
											</div>
										)}

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
									<div className="pt-2 border-t border-[#1f1f1f] space-y-3">
										<p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
											Payment Method
										</p>
										<div className="grid gap-3 md:grid-cols-2">
											{(
												[
													{
														id: "stripe",
														label: "Stripe",
														description:
															"Pay now with Stripe, Zip, or Klarna",
													},
													{
														id: "paypal",
														label: "PayPal",
														description:
															"Pay now with PayPal",
													},
													{
														id: "beem",
														label: "Beem",
														description:
															"We’ll confirm payment by email",
													},
													{
														id: "contact",
														label: "Contact / quote",
														description:
															"We'll confirm payment and postage details by email",
													},
												] as Array<{
													id: PaymentMethod;
													label: string;
													description: string;
												}>
											).map((method) => (
												<label
													key={method.id}
													className={`block rounded-xl border p-4 cursor-pointer transition-colors ${paymentMethod === method.id ? "border-[#22c55e] bg-[#22c55e]/10" : "border-[#262626] bg-[#0a0a0a]"}`}
												>
													<div className="flex items-start gap-3">
														<input
															type="radio"
															name="payment-method"
															checked={
																paymentMethod ===
																method.id
															}
															onChange={() => {
																setPaymentMethod(
																	method.id,
																);
																resetPreparedPayment();
															}}
															className="mt-1"
														/>
														<div>
															<p className="text-[#fafafa] font-medium">
																{method.label}
															</p>
															<p className="text-sm text-[#737373]">
																{
																	method.description
																}
															</p>
														</div>
													</div>
												</label>
											))}
										</div>
										{usingManualShippingOption &&
											paymentMethod === "stripe" && (
												<p className="text-sm text-[#fbbf24]">
													No-postage checkout requires
													PayPal, Beem, or contact
													mode.
												</p>
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
												(paymentMethod === "stripe" &&
													usingManualShippingOption &&
													!paymentIntentId)
											}
											className="w-full py-3 rounded-xl bg-[#22c55e] text-[#0a0a0a] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{loadingShippingOptions ||
											loadingIntent
												? "Preparing Checkout..."
												: paymentMethod === "stripe" ||
													  paymentMethod === "paypal"
													? "Continue to Payment"
													: "Submit Request"}
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
								paymentMethod === "stripe" &&
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
											{tariffAmount > 0 && (
												<div className="flex items-center justify-between">
													<span>US tariff</span>
													<span>
														$
														{tariffAmount.toFixed(
															2,
														)}{" "}
														{currency.toUpperCase()}
													</span>
												</div>
											)}
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

							{checkoutStep === "payment" &&
								paymentMethod === "paypal" && (
									<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-4">
										<p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
											Step 3 · PayPal
										</p>
										<h2 className="text-xl text-[#fafafa] font-display">
											Pay with PayPal
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
											{tariffAmount > 0 && (
												<div className="flex items-center justify-between">
													<span>US tariff</span>
													<span>
														$
														{tariffAmount.toFixed(
															2,
														)}{" "}
														{currency.toUpperCase()}
													</span>
												</div>
											)}
											<div className="flex items-center justify-between text-[#fafafa] font-semibold border-t border-[#1f1f1f] pt-2 mt-2">
												<span>Total</span>
												<span>
													${totalAmount.toFixed(2)}{" "}
													{currency.toUpperCase()}
												</span>
											</div>
										</div>
										<PayPalCheckoutForm
											customerName={customerName}
											customerEmail={customerEmail}
											shipping={shipping}
											shippingOptionId={shippingOptionId}
											lineItems={lineItems}
											totalAmount={totalAmount}
											onSuccess={handleOrderSuccess}
										/>
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
