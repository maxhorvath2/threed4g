import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import {
	getAusPostShippingOptions,
	type LiveShippingOption,
} from "@/lib/auspost";
import {
	getCheckoutCurrency,
	isValidEmail,
	normalizeCheckoutItems,
	normalizeShippingAddress,
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

async function ensureOrderTables() {
	await sql`
		CREATE TABLE IF NOT EXISTS orders (
			id SERIAL PRIMARY KEY,
			customer_name VARCHAR(255) NOT NULL,
			customer_email VARCHAR(255) NOT NULL,
			shipping_name VARCHAR(255) NOT NULL,
			shipping_phone VARCHAR(50),
			shipping_address_line1 VARCHAR(255) NOT NULL,
			shipping_address_line2 VARCHAR(255),
			shipping_city VARCHAR(255) NOT NULL,
			shipping_state VARCHAR(255) NOT NULL,
			shipping_postal_code VARCHAR(50) NOT NULL,
			shipping_country VARCHAR(2) NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
			stripe_payment_intent_id VARCHAR(255) UNIQUE,
			currency VARCHAR(10) NOT NULL DEFAULT 'aud',
			subtotal DECIMAL(10, 2) NOT NULL,
			shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
			total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS order_items (
			id SERIAL PRIMARY KEY,
			order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
			product_id INTEGER NOT NULL REFERENCES products(id),
			variant_id INTEGER NOT NULL REFERENCES product_variants(id),
			product_name VARCHAR(255) NOT NULL,
			variant_name VARCHAR(255) NOT NULL,
			unit_price DECIMAL(10, 2) NOT NULL,
			quantity INTEGER NOT NULL,
			line_total DECIMAL(10, 2) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`;
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
		const paymentIntentId = String(body.paymentIntentId ?? "").trim();
		const rawCustomer = (body.customer ?? {}) as Record<string, unknown>;
		const customerName = String(rawCustomer.name ?? "").trim();
		const customerEmail = String(rawCustomer.email ?? "")
			.trim()
			.toLowerCase();

		if (!paymentIntentId) {
			return NextResponse.json(
				{ error: "paymentIntentId is required" },
				{ status: 400 },
			);
		}

		if (!customerName || !isValidEmail(customerEmail)) {
			return NextResponse.json(
				{ error: "Valid customer details are required" },
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
				{ error: "A shipping option is required" },
				{ status: 400 },
			);
		}

		const liveShippingOptions = await getAusPostShippingOptions({
			countryCode: shipping.address.country,
			toPostcode: shipping.address.postal_code,
		});
		const shippingOption =
			liveShippingOptions.find(
				(option) => option.id === shippingOptionId,
			) ?? null;
		if (!shippingOption) {
			return NextResponse.json(
				{ error: "Invalid shipping option for this destination" },
				{ status: 400 },
			);
		}

		const selectedShippingOption: LiveShippingOption = shippingOption;

		await ensureOrderTables();

		const rawItems = Array.isArray(body.items) ? body.items : [];
		const requestedItems = normalizeCheckoutItems(rawItems);
		if (requestedItems.length === 0) {
			return NextResponse.json(
				{ error: "At least one checkout item is required" },
				{ status: 400 },
			);
		}

		const existingOrder = await sql`
      SELECT id, customer_name, customer_email, status, payment_status, stripe_payment_intent_id, currency, subtotal, shipping_amount, total_amount, created_at
      FROM orders
      WHERE stripe_payment_intent_id = ${paymentIntentId}
      LIMIT 1
    `;
		if (existingOrder.length > 0) {
			return NextResponse.json(
				{ success: true, order: existingOrder[0] },
				{ status: 200 },
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

		const aggregatedByVariant = new Map<
			number,
			{
				productId: number;
				variantId: number;
				productName: string;
				variantName: string;
				unitPrice: number;
				quantity: number;
			}
		>();

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

			const existing = aggregatedByVariant.get(resolved.id);
			if (existing) {
				existing.quantity += item.quantity;
			} else {
				aggregatedByVariant.set(resolved.id, {
					productId: resolved.product_id,
					variantId: resolved.id,
					productName: resolved.product_name,
					variantName: resolved.name,
					unitPrice: Number(resolved.price),
					quantity: item.quantity,
				});
			}
		}

		const lineItems = Array.from(aggregatedByVariant.values());
		const subtotal = lineItems.reduce(
			(total, item) => total + item.unitPrice * item.quantity,
			0,
		);
		const shippingAmount = selectedShippingOption.amount;
		const totalAmount = subtotal + shippingAmount;
		const expectedAmountCents = Math.round(totalAmount * 100);
		const currency = getCheckoutCurrency();

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

		const orderVariantIds = lineItems.map((item) => item.variantId);
		const orderQuantities = lineItems.map((item) => item.quantity);
		const orderProductIds = lineItems.map((item) => item.productId);
		const orderProductNames = lineItems.map((item) => item.productName);
		const orderVariantNames = lineItems.map((item) => item.variantName);
		const orderUnitPrices = lineItems.map((item) => item.unitPrice);

		const checkoutResult = await sql`
      WITH requested AS (
        SELECT *
        FROM unnest(
          ${orderVariantIds}::int[],
          ${orderQuantities}::int[]
        ) AS t(variant_id, quantity)
      ),
      locked AS (
        SELECT
          pv.id AS variant_id,
          pv.stock_quantity,
          requested.quantity
        FROM requested
        JOIN product_variants pv ON pv.id = requested.variant_id
        FOR UPDATE OF pv
      ),
      all_ok AS (
        SELECT
          COUNT(*) = (SELECT COUNT(*) FROM requested)
          AND COALESCE(BOOL_AND(stock_quantity >= quantity), false) AS ok
        FROM locked
      ),
      new_order AS (
        INSERT INTO orders (
          customer_name,
          customer_email,
          shipping_name,
          shipping_phone,
          shipping_address_line1,
          shipping_address_line2,
          shipping_city,
          shipping_state,
          shipping_postal_code,
          shipping_country,
          status,
          payment_status,
          stripe_payment_intent_id,
          currency,
          subtotal,
          shipping_amount,
          total_amount
        )
        SELECT
          ${customerName},
          ${customerEmail},
          ${shipping.name},
          ${shipping.phone},
          ${shipping.address.line1},
          ${shipping.address.line2},
          ${shipping.address.city},
          ${shipping.address.state},
          ${shipping.address.postal_code},
          ${shipping.address.country},
          'submitted',
          'paid',
          ${paymentIntentId},
          ${currency},
          ${subtotal},
          ${shippingAmount},
          ${totalAmount}
        FROM all_ok
        WHERE all_ok.ok
        ON CONFLICT (stripe_payment_intent_id) DO NOTHING
        RETURNING id, customer_name, customer_email, status, payment_status, stripe_payment_intent_id, currency, subtotal, shipping_amount, total_amount, created_at
      ),
      updated_stock AS (
        UPDATE product_variants pv
        SET
          stock_quantity = pv.stock_quantity - locked.quantity,
          in_stock = (pv.stock_quantity - locked.quantity) > 0
        FROM locked, all_ok
        WHERE all_ok.ok AND pv.id = locked.variant_id
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
          new_order.id,
          line_item.product_id,
          line_item.variant_id,
          line_item.product_name,
          line_item.variant_name,
          line_item.unit_price,
          line_item.quantity,
          line_item.unit_price * line_item.quantity
        FROM new_order
        JOIN unnest(
          ${orderProductIds}::int[],
          ${orderVariantIds}::int[],
          ${orderProductNames}::text[],
          ${orderVariantNames}::text[],
          ${orderUnitPrices}::numeric[],
          ${orderQuantities}::int[]
        ) AS line_item(
          product_id,
          variant_id,
          product_name,
          variant_name,
          unit_price,
          quantity
        ) ON TRUE
        RETURNING id
      )
      SELECT
        (SELECT ok FROM all_ok) AS success,
        (SELECT id FROM new_order) AS order_id,
        (SELECT customer_name FROM new_order) AS customer_name,
        (SELECT customer_email FROM new_order) AS customer_email,
        (SELECT status FROM new_order) AS status,
        (SELECT payment_status FROM new_order) AS payment_status,
        (SELECT stripe_payment_intent_id FROM new_order) AS stripe_payment_intent_id,
        (SELECT currency FROM new_order) AS currency,
        (SELECT subtotal FROM new_order) AS subtotal,
        (SELECT shipping_amount FROM new_order) AS shipping_amount,
        (SELECT total_amount FROM new_order) AS total_amount,
        (SELECT created_at FROM new_order) AS created_at
    `;

		const result =
			(checkoutResult[0] as Record<string, unknown> | undefined) ?? {};

		if (result.success !== true || !result.order_id) {
			const existingAfterConflict = await sql`
        SELECT id, customer_name, customer_email, status, payment_status, stripe_payment_intent_id, currency, subtotal, shipping_amount, total_amount, created_at
        FROM orders
        WHERE stripe_payment_intent_id = ${paymentIntentId}
        LIMIT 1
      `;
			if (existingAfterConflict.length > 0) {
				return NextResponse.json(
					{ success: true, order: existingAfterConflict[0] },
					{ status: 200 },
				);
			}

			return NextResponse.json(
				{ error: "Insufficient stock for one or more items" },
				{ status: 409 },
			);
		}

		const finalizedOrder = {
			id: Number(result.order_id),
			customer_name: String(result.customer_name ?? customerName),
			customer_email: String(result.customer_email ?? customerEmail),
			status: String(result.status ?? "submitted"),
			payment_status: String(result.payment_status ?? "paid"),
			stripe_payment_intent_id: String(
				result.stripe_payment_intent_id ?? paymentIntentId,
			),
			currency: String(result.currency ?? currency),
			subtotal: Number(result.subtotal ?? subtotal),
			shipping_amount: Number(result.shipping_amount ?? shippingAmount),
			total_amount: Number(result.total_amount ?? totalAmount),
			created_at: String(result.created_at ?? ""),
		};

		const resendApiKey = process.env.RESEND_API_KEY;
		const adminEmail = process.env.ORDER_ADMIN_EMAIL;
		const fromEmail =
			process.env.ORDER_FROM_EMAIL ??
			"ThreeD4G Orders <orders@contact.threed4g.com>";

		if (resendApiKey) {
			const resend = new Resend(resendApiKey);
			const lineItemsHtml = lineItems
				.map(
					(item) =>
						`<li>${item.productName} - ${item.variantName} x ${item.quantity} ($${item.unitPrice.toFixed(2)})</li>`,
				)
				.join("");

			void resend.emails.send({
				from: fromEmail,
				to: customerEmail,
				subject: `Order Confirmation #${finalizedOrder.id}`,
				html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Thanks for your order, ${customerName}!</h2>
            <p>We have received your order and payment.</p>
            <p><strong>Order ID:</strong> #${finalizedOrder.id}</p>
            <ul>${lineItemsHtml}</ul>
            <p><strong>Subtotal:</strong> $${finalizedOrder.subtotal.toFixed(2)} ${currency.toUpperCase()}</p>
			<p><strong>Shipping:</strong> ${selectedShippingOption.label} - $${finalizedOrder.shipping_amount.toFixed(2)} ${currency.toUpperCase()}</p>
            <p><strong>Total:</strong> $${finalizedOrder.total_amount.toFixed(2)} ${currency.toUpperCase()}</p>
          </div>
        `,
			});

			if (adminEmail) {
				void resend.emails.send({
					from: fromEmail,
					to: adminEmail,
					subject: `New Order Submitted #${finalizedOrder.id}`,
					html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>New order submitted</h2>
              <p><strong>Order ID:</strong> #${finalizedOrder.id}</p>
              <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
              <p><strong>Ship To:</strong> ${shipping.name}, ${shipping.address.line1}, ${shipping.address.city}, ${shipping.address.state} ${shipping.address.postal_code}, ${shipping.address.country}</p>
							<p><strong>Shipping Method:</strong> ${selectedShippingOption.label}</p>
              <ul>${lineItemsHtml}</ul>
              <p><strong>Subtotal:</strong> $${finalizedOrder.subtotal.toFixed(2)} ${currency.toUpperCase()}</p>
              <p><strong>Shipping:</strong> $${finalizedOrder.shipping_amount.toFixed(2)} ${currency.toUpperCase()}</p>
              <p><strong>Total:</strong> $${finalizedOrder.total_amount.toFixed(2)} ${currency.toUpperCase()}</p>
            </div>
          `,
				});
			}
		}

		return NextResponse.json(
			{
				success: true,
				order: finalizedOrder,
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
