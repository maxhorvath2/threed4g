import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { Resend } from "resend";

interface CheckoutItemInput {
	id: string;
	productId: number;
	variantId: number | null;
	quantity: number;
}

interface CheckoutLineItem {
	productId: number;
	variantId: number;
	productName: string;
	variantName: string;
	unitPrice: number;
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
		const paymentIntentId = String(body.paymentIntentId ?? "").trim();

		if (!customerName || !customerEmail) {
			return NextResponse.json(
				{ error: "Customer name and email are required" },
				{ status: 400 },
			);
		}

		if (!isValidEmail(customerEmail)) {
			return NextResponse.json(
				{ error: "Invalid email address" },
				{ status: 400 },
			);
		}

		if (!paymentIntentId) {
			return NextResponse.json(
				{ error: "paymentIntentId is required" },
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

		// Same stock resolution strategy as cart validation: explicit variant or product fallback.
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

		const unresolvedItems = requestedItems.filter((item) => {
			const resolved =
				item.variantId !== null
					? explicitById.get(item.variantId)
					: fallbackByProduct.get(item.productId);
			return !resolved;
		});

		if (unresolvedItems.length > 0) {
			return NextResponse.json(
				{
					error: "Some cart items no longer exist",
					unavailableItems: unresolvedItems.map((item) => item.id),
				},
				{ status: 409 },
			);
		}

		const resolvedLineItems: CheckoutLineItem[] = [];

		for (const item of requestedItems) {
			const resolved =
				item.variantId !== null
					? explicitById.get(item.variantId)
					: fallbackByProduct.get(item.productId);

			if (!resolved) {
				continue;
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
		const expectedAmountCents = Math.round(subtotal * 100);

		const paymentIntent =
			await stripe.paymentIntents.retrieve(paymentIntentId);

		if (paymentIntent.status !== "succeeded") {
			return NextResponse.json(
				{ error: "Payment has not completed" },
				{ status: 402 },
			);
		}

		if (
			paymentIntent.currency.toLowerCase() !== currency ||
			paymentIntent.amount !== expectedAmountCents
		) {
			return NextResponse.json(
				{ error: "Payment amount mismatch" },
				{ status: 409 },
			);
		}

		const existingOrder = await sql`
      SELECT id FROM orders WHERE stripe_payment_intent_id = ${paymentIntentId} LIMIT 1
    `;

		if (existingOrder.length > 0) {
			return NextResponse.json(
				{ error: "Order has already been submitted for this payment" },
				{ status: 409 },
			);
		}

		const variantDemand = new Map<number, number>();
		for (const item of requestedItems) {
			const resolved =
				item.variantId !== null
					? explicitById.get(item.variantId)
					: fallbackByProduct.get(item.productId);
			if (!resolved) {
				continue;
			}
			const current = variantDemand.get(resolved.id) ?? 0;
			variantDemand.set(resolved.id, current + item.quantity);
		}

		const orderedVariantIds = Array.from(variantDemand.keys());
		const orderedQuantities = orderedVariantIds.map(
			(variantId) => variantDemand.get(variantId) ?? 0,
		);

		if (orderedVariantIds.length === 0) {
			return NextResponse.json(
				{ error: "No valid checkout items found" },
				{ status: 400 },
			);
		}

		const checkoutResult = await sql`
      WITH requested AS (
        SELECT *
        FROM unnest(${orderedVariantIds}::int[], ${orderedQuantities}::int[]) AS t(variant_id, quantity)
      ),
      requested_detailed AS (
        SELECT
          r.variant_id,
          r.quantity,
          pv.product_id,
          p.name AS product_name,
          pv.name AS variant_name,
          pv.price AS unit_price,
          pv.stock_quantity AS current_stock
        FROM requested r
        JOIN product_variants pv ON pv.id = r.variant_id
        JOIN products p ON p.id = pv.product_id
      ),
      all_ok AS (
        SELECT
          COUNT(*) = (SELECT COUNT(*) FROM requested)
          AND COALESCE(BOOL_AND(current_stock >= quantity), false) AS ok
        FROM requested_detailed
      ),
      new_order AS (
				INSERT INTO orders (
					customer_name,
					customer_email,
					status,
					payment_status,
					stripe_payment_intent_id,
					currency,
					subtotal
				)
        SELECT
          ${customerName},
          ${customerEmail},
					'submitted',
					'paid',
					${paymentIntentId},
					${currency},
          COALESCE(SUM(unit_price * quantity), 0)
        FROM requested_detailed, all_ok
        WHERE all_ok.ok
        RETURNING id, subtotal, status, created_at
      ),
      updated_stock AS (
        UPDATE product_variants pv
        SET
          stock_quantity = pv.stock_quantity - rd.quantity,
          in_stock = (pv.stock_quantity - rd.quantity) > 0
        FROM requested_detailed rd, all_ok
        WHERE all_ok.ok AND pv.id = rd.variant_id
        RETURNING pv.id
      ),
      inserted_items AS (
        INSERT INTO order_items (
          order_id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          unit_price,
          quantity,
          line_total
        )
        SELECT
          no.id,
          rd.product_id,
          rd.variant_id,
          rd.product_name,
          rd.variant_name,
          rd.unit_price,
          rd.quantity,
          rd.unit_price * rd.quantity
        FROM new_order no
        JOIN requested_detailed rd ON true
        RETURNING id
      )
      SELECT
        (SELECT ok FROM all_ok) AS success,
        (SELECT id FROM new_order) AS order_id,
        (SELECT subtotal FROM new_order) AS subtotal,
        (SELECT status FROM new_order) AS status,
        (SELECT created_at FROM new_order) AS created_at
    `;

		const result = asRecord(checkoutResult[0]);
		const success = result.success === true;

		if (!success) {
			const latestStockRows = (await sql`
        SELECT pv.id, p.name AS product_name, pv.name, pv.stock_quantity
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE pv.id = ANY(${orderedVariantIds})
      `) as Array<{
				id: number;
				product_name: string;
				name: string;
				stock_quantity: number;
			}>;

			const latestStockByVariant = new Map<number, number>(
				latestStockRows.map((row) => [
					row.id,
					parsePositiveInt(row.stock_quantity, 0),
				]),
			);

			const shortages = orderedVariantIds
				.map((variantId) => {
					const requestedQuantity = variantDemand.get(variantId) ?? 0;
					const availableQuantity =
						latestStockByVariant.get(variantId) ?? 0;
					if (availableQuantity >= requestedQuantity) {
						return null;
					}

					const row = latestStockRows.find((r) => r.id === variantId);
					return {
						variantId,
						productName: row?.product_name ?? "Unknown product",
						variantName: row?.name ?? "Unknown variant",
						requestedQuantity,
						availableQuantity,
					};
				})
				.filter((item) => item !== null);

			return NextResponse.json(
				{
					error: "Insufficient stock for one or more items",
					shortages,
				},
				{ status: 409 },
			);
		}

		const resendApiKey = process.env.RESEND_API_KEY;
		const adminEmail = process.env.ORDER_ADMIN_EMAIL;
		const fromEmail =
			process.env.ORDER_FROM_EMAIL ??
			"ThreeD4G Orders <orders@contact.threed4g.com>";

		if (resendApiKey) {
			const resend = new Resend(resendApiKey);
			const lineItemsHtml = resolvedLineItems
				.map(
					(item) =>
						`<li>${item.productName} - ${item.variantName} x ${item.quantity} ($${item.unitPrice.toFixed(2)})</li>`,
				)
				.join("");

			void resend.emails.send({
				from: fromEmail,
				to: customerEmail,
				subject: `Order Confirmation #${parsePositiveInt(result.order_id, 0)}`,
				html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Thanks for your order, ${customerName}!</h2>
            <p>We have received your order and payment.</p>
            <p><strong>Order ID:</strong> #${parsePositiveInt(result.order_id, 0)}</p>
            <ul>${lineItemsHtml}</ul>
            <p><strong>Total:</strong> $${subtotal.toFixed(2)} ${currency.toUpperCase()}</p>
          </div>
        `,
			});

			if (adminEmail) {
				void resend.emails.send({
					from: fromEmail,
					to: adminEmail,
					subject: `New Order Submitted #${parsePositiveInt(result.order_id, 0)}`,
					html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>New order submitted</h2>
              <p><strong>Order ID:</strong> #${parsePositiveInt(result.order_id, 0)}</p>
              <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
              <ul>${lineItemsHtml}</ul>
              <p><strong>Total:</strong> $${subtotal.toFixed(2)} ${currency.toUpperCase()}</p>
            </div>
          `,
				});
			}
		}

		return NextResponse.json(
			{
				success: true,
				order: {
					id: parsePositiveInt(result.order_id, 0),
					status: String(result.status ?? "pending"),
					payment_status: "paid",
					stripe_payment_intent_id: paymentIntentId,
					currency,
					subtotal: Number(result.subtotal ?? 0),
					created_at: String(result.created_at ?? ""),
					customer_name: customerName,
					customer_email: customerEmail,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Checkout error:", error);
		return NextResponse.json(
			{ error: "Failed to complete checkout" },
			{ status: 500 },
		);
	}
}
