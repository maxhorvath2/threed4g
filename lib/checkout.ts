export interface CheckoutItemInput {
	id: string;
	productId: number;
	variantId: number | null;
	quantity: number;
}

export interface ResolvedCheckoutItem {
	productId: number;
	variantId: number;
	productName: string;
	variantName: string;
	unitPrice: number;
	quantity: number;
}

export interface ShippingAddress {
	name: string;
	phone: string | null;
	address: {
		line1: string;
		line2: string | null;
		city: string;
		state: string;
		postal_code: string;
		country: string;
	};
}

export interface ShippingOption {
	id: string;
	label: string;
	description: string;
	amount: number;
	countries: string[];
}

export type PaymentMethod = "stripe" | "paypal" | "beem" | "contact";

const SHIPPING_OPTIONS: ShippingOption[] = [
	{
		id: "auspost_standard",
		label: "Australia Post Parcel Post",
		description: "Estimated 2-6 business days",
		amount: 11.95,
		countries: ["AU"],
	},
	{
		id: "auspost_express",
		label: "Australia Post Express Post",
		description: "Estimated 1-2 business days",
		amount: 15.95,
		countries: ["AU"],
	},
	{
		id: "auspost_international_standard",
		label: "Australia Post International Standard",
		description: "Estimated 6-14 business days",
		amount: 24.95,
		countries: ["*"],
	},
	{
		id: "auspost_international_express",
		label: "Australia Post International Express",
		description: "Estimated 3-8 business days",
		amount: 39.95,
		countries: ["*"],
	},
];

function toRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: {};
}

function asString(value: unknown, fallback = ""): string {
	return String(value ?? fallback).trim();
}

export function parsePositiveInt(value: unknown, fallback = 0): number {
	const parsed = Number.parseInt(String(value ?? fallback), 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getCheckoutCurrency(): string {
	return String(process.env.STRIPE_CURRENCY ?? "aud").toLowerCase();
}

export function normalizeShippingAddress(
	value: unknown,
): ShippingAddress | null {
	const row = toRecord(value);
	const address = toRecord(row.address);

	const name = asString(row.name);
	const line1 = asString(address.line1);
	const city = asString(address.city);
	const state = asString(address.state);
	const postalCode = asString(address.postal_code);
	const country = asString(address.country).toUpperCase();

	if (!name || !line1 || !city || !state || !postalCode || !country) {
		return null;
	}

	return {
		name,
		phone: row.phone ? asString(row.phone) : null,
		address: {
			line1,
			line2: address.line2 ? asString(address.line2) : null,
			city,
			state,
			postal_code: postalCode,
			country,
		},
	};
}

export function calculateShippingAmount(countryCode: string): number {
	const country = String(countryCode ?? "")
		.trim()
		.toUpperCase();
	if (country === "AU") {
		return 12;
	}
	if (country === "NZ") {
		return 18;
	}
	return 25;
}

export function getShippingQuoteMultiplier(countryCode: string): number {
	const country = String(countryCode ?? "")
		.trim()
		.toUpperCase();
	return country === "US" ? 1 : 1;
}

export function adjustShippingQuote(
	amount: number,
	countryCode: string,
): number {
	return (
		Math.round(amount * getShippingQuoteMultiplier(countryCode) * 100) / 100
	);
}

export function calculateTariffAmount(
	subtotal: number,
	countryCode: string,
): number {
	const country = String(countryCode ?? "")
		.trim()
		.toUpperCase();
	if (country !== "US") {
		return 0;
	}

	return Math.round(subtotal * 0.1 * 100) / 100;
}

export function getShippingOptionsForCountry(
	countryCode: string,
): ShippingOption[] {
	const country = String(countryCode ?? "")
		.trim()
		.toUpperCase();
	if (country === "AU") {
		return SHIPPING_OPTIONS.filter((option) =>
			option.countries.includes("AU"),
		);
	}

	return SHIPPING_OPTIONS.filter((option) => option.countries.includes("*"));
}

export function getShippingOptionById(
	shippingOptionId: string,
	countryCode: string,
): ShippingOption | null {
	const options = getShippingOptionsForCountry(countryCode);
	return options.find((option) => option.id === shippingOptionId) ?? null;
}

export function normalizeCheckoutItems(
	rawItems: unknown[],
): CheckoutItemInput[] {
	return rawItems
		.map((item) => {
			const row = toRecord(item);
			return {
				id: asString(row.id),
				productId: parsePositiveInt(row.productId, 0),
				variantId:
					row.variantId === null || row.variantId === undefined
						? null
						: parsePositiveInt(row.variantId, 0),
				quantity: Math.max(1, parsePositiveInt(row.quantity, 1)),
			};
		})
		.filter((item) => item.id !== "" && item.productId > 0);
}
