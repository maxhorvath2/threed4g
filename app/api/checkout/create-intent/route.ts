import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";

interface CheckoutItemInput {
	id: string;
	productId: number;
	variantId: number | null;
	quantity: number;
}

interface ResolvedVariantRow {
	id: number;
	product_id: number;
	product_name: string;
	name: string;
	price: number;
	stock_quantity: number;
}

function asRecord(value: unknown): Record<string, unknown> {
	if (typeof value === "object" && value !== null) {
		return value as Record<string, unknown>;
	}
	return {};
}

function parsePositiveInt(value: unknown, fallback = 0): number {
	const parsed = Number.parseInt(String(value ?? fallback), 10);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return fallback;
	}
	return parsed;
}

function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
	try {
		if (!process.env.STRIPE_SECRET_KEY) {
			return NextResponse.json(
				{ error: "Stripe is not configured" },
				{ status: 500 },
			);
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
		const body = asRecord(await request.json());
		const rawCustomer = asRecord(body.customer);
		const customerName = String(rawCustomer.name ?? "").trim();
		const customerEmail = String(rawCustomer.email ?? "")
			.trim()
			.toLowerCase();

		if (!customerName || !customerEmail || !isValidEmail(customerEmail)) {
			return NextResponse.json(
				{ error: "Valid customer name and email are required" },
				{ status: 400 },
			);
		}

		const rawItems = Array.isArray(body.items)
			? (body.items as unknown[])
			: [];
		const requestedItems: CheckoutItemInput[] = rawItems
			.map((item): CheckoutItemInput => {
				const row = asRecord(item);
				return {
					id: String(row.id ?? ""),
					productId: parsePositiveInt(row.productId, 0),
					variantId:
						row.variantId === null || row.variantId === undefined
							? null
							: parsePositiveInt(row.variantId, 0),
					quantity: Math.max(1, parsePositiveInt(row.quantity, 1)),
				};
			})
			.filter((item) => item.id !== "" && item.productId > 0);

		if (requestedItems.length === 0) {
			return NextResponse.json(
				{ error: "At least one checkout item is required" },
				{ status: 400 },
			);
		}

		const variantIds = Array.from(
			new Set(
				requestedItems
					.map((item) => item.variantId)
					.filter((id): id is number => id !== null && id > 0),
			),
		);
		const fallbackProductIds = Array.from(
			new Set(
				requestedItems
					.filter((item) => item.variantId === null)
					.map((item) => item.productId),
			),
		);

		const [explicitVariantRows, fallbackVariantRows] = await Promise.all([
			variantIds.length > 0
				? sql`
          SELECT pv.id, pv.product_id, p.name AS product_name, pv.name, pv.price, pv.stock_quantity
          FROM product_variants pv
          JOIN products p ON p.id = pv.product_id
          WHERE pv.id = ANY(${variantIds})
        `
				: Promise.resolve([]),
			fallbackProductIds.length > 0
				? sql`
          SELECT DISTINCT ON (pv.product_id)
            pv.id,
            pv.product_id,
            p.name AS product_name,
            pv.name,
            pv.price,
            pv.stock_quantity
          FROM product_variants pv
          JOIN products p ON p.id = pv.product_id
          WHERE pv.product_id = ANY(${fallbackProductIds})
          ORDER BY pv.product_id, pv.sort_order ASC, pv.id ASC
        `
				: Promise.resolve([]),
		]);

		const explicitById = new Map<number, ResolvedVariantRow>(
			(explicitVariantRows as ResolvedVariantRow[]).map((row) => [
				row.id,
				row,
			]),
		);
		const fallbackByProduct = new Map<number, ResolvedVariantRow>(
			(fallbackVariantRows as ResolvedVariantRow[]).map((row) => [
				row.product_id,
				row,
			]),
		);

		const resolvedLineItems: Array<{
			productId: number;
			variantId: number;
			productName: string;
			variantName: string;
			unitPrice: number;
			quantity: number;
		}> = [];

		for (const item of requestedItems) {
			const resolved =
				item.variantId !== null
					? explicitById.get(item.variantId)
					: fallbackByProduct.get(item.productId);

			if (!resolved) {
				return NextResponse.json(
					{ error: "Some cart items no longer exist" },
					{ status: 409 },
				);
			}

			const stockQuantity = parsePositiveInt(resolved.stock_quantity, 0);
			if (stockQuantity < item.quantity) {
				return NextResponse.json(
					{
						error: "Insufficient stock for one or more items",
						variantId: resolved.id,
						availableQuantity: stockQuantity,
						requestedQuantity: item.quantity,
					},
					{ status: 409 },
				);
			}

			resolvedLineItems.push({
				productId: resolved.product_id,
				variantId: resolved.id,
				productName: resolved.product_name,
				variantName: resolved.name,
				unitPrice: Number(resolved.price),
				quantity: item.quantity,
			});
		}

		const subtotal = resolvedLineItems.reduce(
			(total, item) => total + item.unitPrice * item.quantity,
			0,
		);
		const currency = String(
			process.env.STRIPE_CURRENCY ?? "aud",
		).toLowerCase();
		const amount = Math.round(subtotal * 100);

		if (amount <= 0) {
			return NextResponse.json(
				{ error: "Checkout amount must be greater than zero" },
				{ status: 400 },
			);
		}

		const paymentIntent = await stripe.paymentIntents.create({
			amount,
			currency,
			automatic_payment_methods: { enabled: true },
			receipt_email: customerEmail,
			metadata: {
				customer_name: customerName,
				customer_email: customerEmail,
				item_count: String(resolvedLineItems.length),
			},
		});

		return NextResponse.json({
			clientSecret: paymentIntent.client_secret,
			paymentIntentId: paymentIntent.id,
			currency,
			subtotal,
			items: resolvedLineItems,
		});
	} catch (error) {
		console.error("Error creating payment intent:", error);
		return NextResponse.json(
			{ error: "Failed to create payment intent" },
			{ status: 500 },
		);
	}
}
