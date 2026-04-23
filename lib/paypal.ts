const DEFAULT_SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com";
const DEFAULT_LIVE_BASE_URL = "https://api-m.paypal.com";

export interface PayPalCheckoutItem {
	name: string;
	quantity: number;
	unitPrice: number;
}

export interface PayPalCreateOrderInput {
	currency: string;
	totalAmount: number;
	subtotal: number;
	shippingAmount: number;
	tariffAmount: number;
	items: PayPalCheckoutItem[];
	description?: string;
}

function getPayPalEnvironment(): string {
	return String(process.env.PAYPAL_ENVIRONMENT ?? "sandbox")
		.trim()
		.toLowerCase();
}

export function getPayPalBaseUrl(): string {
	const configuredBaseUrl = String(process.env.PAYPAL_BASE_URL ?? "").trim();
	if (configuredBaseUrl) {
		return configuredBaseUrl;
	}

	return getPayPalEnvironment() === "live"
		? DEFAULT_LIVE_BASE_URL
		: DEFAULT_SANDBOX_BASE_URL;
}

export function getPayPalClientId(): string {
	return String(process.env.PAYPAL_CLIENT_ID ?? "").trim();
}

export function getPayPalClientSecret(): string {
	return String(process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
}

export function getPayPalPublicClientId(): string {
	return String(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "").trim();
}

export async function getPayPalAccessToken(): Promise<string> {
	const clientId = getPayPalClientId();
	const clientSecret = getPayPalClientSecret();

	if (!clientId || !clientSecret) {
		throw new Error("PayPal credentials are not configured");
	}

	const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: new URLSearchParams({
			grant_type: "client_credentials",
		}).toString(),
		cache: "no-store",
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`PayPal token request failed (${response.status}): ${errorText.slice(0, 180)}`,
		);
	}

	const data = (await response.json()) as { access_token?: string };
	if (!data.access_token) {
		throw new Error("PayPal access token was not returned");
	}

	return data.access_token;
}

export async function createPayPalOrder(
	input: PayPalCreateOrderInput,
): Promise<{ id: string }> {
	const accessToken = await getPayPalAccessToken();
	const currency = input.currency.trim().toUpperCase();
	const purchaseUnitItems = input.items.map((item) => ({
		name: item.name,
		quantity: String(item.quantity),
		unit_amount: {
			currency_code: currency,
			value: item.unitPrice.toFixed(2),
		},
	}));

	const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			Accept: "application/json",
			"PayPal-Request-Id": crypto.randomUUID(),
		},
		body: JSON.stringify({
			intent: "CAPTURE",
			purchase_units: [
				{
					description: input.description ?? "ThreeD420 checkout",
					amount: {
						currency_code: currency,
						value: input.totalAmount.toFixed(2),
						breakdown: {
							item_total: {
								currency_code: currency,
								value: input.subtotal.toFixed(2),
							},
							shipping: {
								currency_code: currency,
								value: input.shippingAmount.toFixed(2),
							},
							tax_total: {
								currency_code: currency,
								value: input.tariffAmount.toFixed(2),
							},
						},
					},
					items: purchaseUnitItems,
				},
			],
			application_context: {
				shipping_preference: "NO_SHIPPING",
			},
		}),
		cache: "no-store",
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`PayPal order creation failed (${response.status}): ${errorText.slice(0, 180)}`,
		);
	}

	const data = (await response.json()) as { id?: string };
	if (!data.id) {
		throw new Error("PayPal order id was not returned");
	}

	return { id: data.id };
}

export async function capturePayPalOrder(orderId: string): Promise<{
	id: string;
	status: string;
	captureId: string;
}> {
	const accessToken = await getPayPalAccessToken();
	const response = await fetch(
		`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
				Accept: "application/json",
				"PayPal-Request-Id": orderId,
			},
			cache: "no-store",
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`PayPal order capture failed (${response.status}): ${errorText.slice(0, 180)}`,
		);
	}

	const data = (await response.json()) as {
		id?: string;
		status?: string;
		purchase_units?: Array<{
			payments?: {
				captures?: Array<{ id?: string }>;
				capture?: { id?: string };
			};
		}>;
	};

	const captureId =
		data.purchase_units?.[0]?.payments?.captures?.[0]?.id ??
		data.purchase_units?.[0]?.payments?.capture?.id ??
		null;

	if (!data.id) {
		throw new Error("PayPal capture response did not include an order id");
	}

	if (!captureId) {
		throw new Error("PayPal capture response did not include a capture id");
	}

	return {
		id: data.id,
		status: data.status ?? "COMPLETED",
		captureId,
	};
}
