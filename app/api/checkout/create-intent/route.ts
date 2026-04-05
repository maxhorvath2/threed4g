import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
	getAusPostShippingOptions,
	type LiveShippingOption,
} from "@/lib/auspost";
import {
	getCheckoutCurrency,
	isValidEmail,
	normalizeCheckoutItems,
	normalizeShippingAddress,
	type ResolvedCheckoutItem,
} from "@/lib/checkout";
import { sql } from "@/lib/db";

interface ResolvedVariantRow {
	id: number;
	product_id: number;
	product_name: string;
	name: string;
	price: number;
	stock_quantity: number;
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
		const body = (await request.json()) as Record<string, unknown>;
		const rawCustomer = (body.customer ?? {}) as Record<string, unknown>;
		const customerName = String(rawCustomer.name ?? "").trim();
		const customerEmail = String(rawCustomer.email ?? "")
			.trim()
			.toLowerCase();

		if (!customerName || !isValidEmail(customerEmail)) {
			return NextResponse.json(
				{ error: "Valid customer name and email are required" },
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

		const liveShippingOptions = await getAusPostShippingOptions({
			countryCode: shipping.address.country,
			toPostcode: shipping.address.postal_code,
		});

		if (liveShippingOptions.length === 0) {
			return NextResponse.json(
				{
					error: "No live shipping options are available for this destination",
				},
				{ status: 409 },
			);
		}

		const shippingOptionId = String(body.shippingOptionId ?? "").trim();
		if (!shippingOptionId) {
			return NextResponse.json(
				{
					error: "A shipping option is required",
					shippingOptions: liveShippingOptions,
				},
				{ status: 400 },
			);
		}

		const shippingOption =
			liveShippingOptions.find(
				(option) => option.id === shippingOptionId,
			) ?? null;
		if (!shippingOption) {
			return NextResponse.json(
				{
					error: "Invalid shipping option for this destination",
					shippingOptions: liveShippingOptions,
				},
				{ status: 400 },
			);
		}

		const selectedShippingOption: LiveShippingOption = shippingOption;

		const rawItems = Array.isArray(body.items) ? body.items : [];
		const requestedItems = normalizeCheckoutItems(rawItems);

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

		const resolvedLineItems: ResolvedCheckoutItem[] = [];
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

			const stockQuantity = Number(resolved.stock_quantity ?? 0);
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

		const aggregatedItems = Array.from(
			resolvedLineItems.reduce((accumulator, item) => {
				const existing = accumulator.get(item.variantId);
				if (existing) {
					existing.quantity += item.quantity;
					return accumulator;
				}

				accumulator.set(item.variantId, { ...item });
				return accumulator;
			}, new Map<number, ResolvedCheckoutItem>()),
		).map(([, item]) => item);

		const subtotal = aggregatedItems.reduce(
			(total, item) => total + item.unitPrice * item.quantity,
			0,
		);
		const shippingAmount = selectedShippingOption.amount;
		const totalAmount = subtotal + shippingAmount;
		const currency = getCheckoutCurrency();
		const amount = Math.round(totalAmount * 100);

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
				item_count: String(aggregatedItems.length),
				shipping_country: shipping.address.country,
				shipping_option_id: selectedShippingOption.id,
				shipping_option_label: selectedShippingOption.label,
				shipping_option_service_code:
					selectedShippingOption.serviceCode,
			},
		});

		if (!paymentIntent.client_secret) {
			return NextResponse.json(
				{ error: "Failed to initialize payment session" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			clientSecret: paymentIntent.client_secret,
			paymentIntentId: paymentIntent.id,
			shippingOption: selectedShippingOption,
			currency,
			subtotal,
			shippingAmount,
			totalAmount,
			items: aggregatedItems,
		});
	} catch (error) {
		console.error("Error creating payment intent:", error);
		return NextResponse.json(
			{ error: "Failed to create payment intent" },
			{ status: 500 },
		);
	}
}
