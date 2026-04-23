import { NextRequest, NextResponse } from "next/server";
import {
	adjustShippingQuote,
	calculateTariffAmount,
	getCheckoutCurrency,
	isValidEmail,
	normalizeCheckoutItems,
	normalizeShippingAddress,
} from "@/lib/checkout";
import { getAusPostShippingOptions } from "@/lib/auspost";
import { createPayPalOrder } from "@/lib/paypal";
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

		const shippingOptionId = String(body.shippingOptionId ?? "").trim();
		if (!shippingOptionId) {
			return NextResponse.json(
				{
					error: "A shipping option is required for PayPal checkout",
				},
				{ status: 400 },
			);
		}

		let resolvedShippingOption: {
			id: string;
			label: string;
			description: string;
			amount: number;
			serviceCode: string;
		} | null = null;

		if (shippingOptionId !== "manual_contact") {
			const options = await getAusPostShippingOptions({
				countryCode: shipping.address.country,
				toPostcode: shipping.address.postal_code,
			});
			resolvedShippingOption =
				options.find((option) => option.id === shippingOptionId) ??
				null;
		}

		if (shippingOptionId !== "manual_contact" && !resolvedShippingOption) {
			return NextResponse.json(
				{ error: "Invalid shipping option for this destination" },
				{ status: 400 },
			);
		}

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

		const lineItems = [] as Array<{
			productId: number;
			variantId: number;
			productName: string;
			variantName: string;
			unitPrice: number;
			quantity: number;
		}>;

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

			if (Number(resolved.stock_quantity ?? 0) < item.quantity) {
				return NextResponse.json(
					{ error: "Insufficient stock for one or more items" },
					{ status: 409 },
				);
			}

			lineItems.push({
				productId: resolved.product_id,
				variantId: resolved.id,
				productName: resolved.product_name,
				variantName: resolved.name,
				unitPrice: Number(resolved.price),
				quantity: item.quantity,
			});
		}

		const subtotal = lineItems.reduce(
			(total, item) => total + item.unitPrice * item.quantity,
			0,
		);
		const shippingAmount = resolvedShippingOption
			? adjustShippingQuote(
					resolvedShippingOption.amount,
					shipping.address.country,
				)
			: 0;
		const tariffAmount = calculateTariffAmount(
			subtotal,
			shipping.address.country,
		);
		const totalAmount = subtotal + shippingAmount + tariffAmount;
		const currency = getCheckoutCurrency();

		const order = await createPayPalOrder({
			currency,
			totalAmount,
			subtotal,
			shippingAmount,
			tariffAmount,
			items: lineItems.map((item) => ({
				name: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
				quantity: item.quantity,
				unitPrice: item.unitPrice,
			})),
			description: "ThreeD420 checkout",
		});

		return NextResponse.json({
			id: order.id,
			currency,
			subtotal,
			shippingAmount,
			tariffAmount,
			totalAmount,
		});
	} catch (error) {
		console.error("Error creating PayPal order:", error);
		return NextResponse.json(
			{ error: "Failed to create PayPal order" },
			{ status: 500 },
		);
	}
}
