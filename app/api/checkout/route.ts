import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import {
	getAusPostShippingOptions,
	type LiveShippingOption,
} from "@/lib/auspost";
import {
	adjustShippingQuote,
	calculateTariffAmount,
	getCheckoutCurrency,
	isValidEmail,
	normalizeCheckoutItems,
	normalizeShippingAddress,
	type PaymentMethod,
} from "@/lib/checkout";
import {
	completeStockSession,
	ensureStockReservationTables,
	getSessionReservationQuantities,
} from "@/lib/stockReservation";
import { sql } from "@/lib/db";

interface ResolvedVariantRow {
	id: number;
	product_id: number;
	product_name: string;
	name: string;
	price: number;
	stock_quantity: number;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function formatMoney(amount: number, currency: string): string {
	return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
}

function renderLineItemsHtml(
	items: Array<{
		productName: string;
		variantName: string;
		quantity: number;
		unitPrice: number;
	}>,
	currency: string,
): string {
	return items
		.map(
			(item) => `
				<li style="margin-bottom: 12px;">
					<strong>${escapeHtml(item.productName)}</strong><br />
					<span>${escapeHtml(item.variantName)}</span><br />
					<span>Qty ${item.quantity} · ${formatMoney(item.unitPrice, currency)} each</span>
				</li>
			`,
		)
		.join("");
}

function renderOrderDetailsHtml(params: {
	orderId: number;
	customerName: string;
	customerEmail: string;
	shippingName: string;
	shippingPhone: string | null;
	shippingLine1: string;
	shippingLine2: string | null;
	shippingCity: string;
	shippingState: string;
	shippingPostalCode: string;
	shippingCountry: string;
	shippingMethod: string;
	paymentMethod: string;
	paymentIntentId: string;
	status: string;
	paymentStatus: string;
	currency: string;
	subtotal: number;
	shippingAmount: number;
	tariffAmount: number;
	totalAmount: number;
	lineItems: Array<{
		productName: string;
		variantName: string;
		quantity: number;
		unitPrice: number;
	}>;
}): string {
	const shippingAddressLine2 = params.shippingLine2
		? `<br />${escapeHtml(params.shippingLine2)}`
		: "";
	const shippingPhone = params.shippingPhone
		? `<p><strong>Phone:</strong> ${escapeHtml(params.shippingPhone)}</p>`
		: "";

	return `
		<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
			<h2 style="margin-bottom: 12px;">Order #${params.orderId}</h2>
			<p><strong>Customer:</strong> ${escapeHtml(params.customerName)} (${escapeHtml(params.customerEmail)})</p>
			<p><strong>Status:</strong> ${escapeHtml(params.status)} · <strong>Payment:</strong> ${escapeHtml(params.paymentStatus)}</p>
			<p><strong>Payment Method:</strong> ${escapeHtml(params.paymentMethod)}</p>
			<p><strong>Payment Intent:</strong> ${escapeHtml(params.paymentIntentId)}</p>
			<p><strong>Shipping Method:</strong> ${escapeHtml(params.shippingMethod)}</p>
			<p><strong>Ship To:</strong><br />${escapeHtml(params.shippingName)}<br />${escapeHtml(params.shippingLine1)}${shippingAddressLine2}<br />${escapeHtml(params.shippingCity)}, ${escapeHtml(params.shippingState)} ${escapeHtml(params.shippingPostalCode)}<br />${escapeHtml(params.shippingCountry)}</p>
			${shippingPhone}
			<h3 style="margin: 24px 0 12px;">Items</h3>
			<ul style="padding-left: 18px; margin: 0 0 24px;">${renderLineItemsHtml(params.lineItems, params.currency)}</ul>
			<p><strong>Subtotal:</strong> ${formatMoney(params.subtotal, params.currency)}</p>
			<p><strong>Shipping:</strong> ${formatMoney(params.shippingAmount, params.currency)}</p>
			<p><strong>Tariff:</strong> ${formatMoney(params.tariffAmount, params.currency)}</p>
			<p><strong>Total:</strong> ${formatMoney(params.totalAmount, params.currency)}</p>
		</div>
	`;
}

function renderCustomerConfirmationHtml(params: {
	customerName: string;
	orderId: number;
	currency: string;
	subtotal: number;
	shippingAmount: number;
	tariffAmount: number;
	totalAmount: number;
	shippingMethod: string;
	paymentMethod: string;
	confirmationMessage?: string;
	lineItems: Array<{
		productName: string;
		variantName: string;
		quantity: number;
		unitPrice: number;
	}>;
}): string {
	const confirmationMessage =
		params.confirmationMessage ??
		"We’ve received your payment and are preparing your order.";

	return `
		<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
			<h2 style="margin-bottom: 12px;">Thanks for your order, ${escapeHtml(params.customerName)}!</h2>
			<p>${escapeHtml(confirmationMessage)}</p>
			<p><strong>Order ID:</strong> #${params.orderId}</p>
			<p><strong>Shipping Method:</strong> ${escapeHtml(params.shippingMethod)}</p>
			<p><strong>Payment Method:</strong> ${escapeHtml(params.paymentMethod)}</p>
			<h3 style="margin: 24px 0 12px;">Items</h3>
			<ul style="padding-left: 18px; margin: 0 0 24px;">${renderLineItemsHtml(params.lineItems, params.currency)}</ul>
			<p><strong>Subtotal:</strong> ${formatMoney(params.subtotal, params.currency)}</p>
			<p><strong>Shipping:</strong> ${formatMoney(params.shippingAmount, params.currency)}</p>
			<p><strong>Tariff:</strong> ${formatMoney(params.tariffAmount, params.currency)}</p>
			<p><strong>Total:</strong> ${formatMoney(params.totalAmount, params.currency)}</p>
		</div>
	`;
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
			payment_method VARCHAR(50) NOT NULL DEFAULT 'stripe',
			stripe_payment_intent_id VARCHAR(255) UNIQUE,
			paypal_order_id VARCHAR(255),
			paypal_capture_id VARCHAR(255) UNIQUE,
			currency VARCHAR(10) NOT NULL DEFAULT 'aud',
			subtotal DECIMAL(10, 2) NOT NULL,
			shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
			tariff_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
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

	await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NOT NULL DEFAULT 'stripe'`;
	await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tariff_amount DECIMAL(10, 2) NOT NULL DEFAULT 0`;
	await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255)`;
	await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_capture_id VARCHAR(255) UNIQUE`;
}

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const paymentMethod = String(body.paymentMethod ?? "stripe")
			.trim()
			.toLowerCase() as PaymentMethod;
		const paymentIntentId = String(body.paymentIntentId ?? "").trim();
		const paypalOrderId = String(body.paypalOrderId ?? "").trim();
		const paypalCaptureId = String(body.paypalCaptureId ?? "").trim();
		const checkoutSessionId = String(body.checkoutSessionId ?? "").trim();
		const paymentReferenceId =
			paymentMethod === "paypal" ? paypalCaptureId : paymentIntentId;
		const rawCustomer = (body.customer ?? {}) as Record<string, unknown>;
		const customerName = String(rawCustomer.name ?? "").trim();
		const customerEmail = String(rawCustomer.email ?? "")
			.trim()
			.toLowerCase();

		if (paymentMethod === "stripe" && !paymentIntentId) {
			return NextResponse.json(
				{ error: "paymentIntentId is required" },
				{ status: 400 },
			);
		}

		if (
			paymentMethod === "paypal" &&
			(!paypalOrderId || !paypalCaptureId)
		) {
			return NextResponse.json(
				{ error: "paypalOrderId and paypalCaptureId are required" },
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
			shippingOptionId === "manual_contact"
				? null
				: (liveShippingOptions.find(
						(option) => option.id === shippingOptionId,
					) ?? null);
		if (shippingOptionId !== "manual_contact" && !shippingOption) {
			return NextResponse.json(
				{ error: "Invalid shipping option for this destination" },
				{ status: 400 },
			);
		}

		if (
			shippingOptionId === "manual_contact" &&
			paymentMethod === "stripe"
		) {
			return NextResponse.json(
				{
					error: "The no-postage contact option requires PayPal, Beem, or contact checkout.",
				},
				{ status: 400 },
			);
		}

		const selectedShippingOption: LiveShippingOption | null =
			shippingOption;
		const shippingMethodLabel =
			shippingOptionId === "manual_contact"
				? "No postage - arrange via contact form / Instagram"
				: (selectedShippingOption?.label ?? "Shipping");

		await ensureOrderTables();
		await ensureStockReservationTables();

		const rawItems = Array.isArray(body.items) ? body.items : [];
		const requestedItems = normalizeCheckoutItems(rawItems);
		if (requestedItems.length === 0) {
			return NextResponse.json(
				{ error: "At least one checkout item is required" },
				{ status: 400 },
			);
		}

		const reservationQuantities = checkoutSessionId
			? await getSessionReservationQuantities(checkoutSessionId)
			: new Map<number, number>();

		const existingOrder =
			paymentMethod === "paypal"
				? await sql`
			SELECT id, customer_name, customer_email, status, payment_status, payment_method, stripe_payment_intent_id, paypal_order_id, paypal_capture_id, currency, subtotal, shipping_amount, tariff_amount, total_amount, created_at
			FROM orders
			WHERE paypal_order_id = ${paypalOrderId} OR paypal_capture_id = ${paymentReferenceId}
			LIMIT 1
		`
				: await sql`
			SELECT id, customer_name, customer_email, status, payment_status, payment_method, stripe_payment_intent_id, paypal_order_id, paypal_capture_id, currency, subtotal, shipping_amount, tariff_amount, total_amount, created_at
			FROM orders
			WHERE stripe_payment_intent_id = ${paymentIntentId}
			LIMIT 1
		`;
		if (existingOrder.length > 0) {
			if (checkoutSessionId) {
				await completeStockSession(checkoutSessionId);
			}
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
				const reservedQuantity =
					reservationQuantities.get(resolved.id) ?? 0;
				if (stockQuantity + reservedQuantity >= item.quantity) {
					// The shortfall is covered by this checkout's active reservation.
				} else {
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
		const shippingAmount = selectedShippingOption
			? adjustShippingQuote(
					selectedShippingOption.amount,
					shipping.address.country,
				)
			: 0;
		const tariffAmount = calculateTariffAmount(
			subtotal,
			shipping.address.country,
		);
		const totalAmount = subtotal + shippingAmount + tariffAmount;
		const expectedAmountCents = Math.round(totalAmount * 100);
		const currency = getCheckoutCurrency();

		if (paymentMethod !== "stripe" && paymentMethod !== "paypal") {
			const orderVariantIds = lineItems.map((item) => item.variantId);
			const orderQuantities = lineItems.map((item) => item.quantity);
			const orderProductIds = lineItems.map((item) => item.productId);
			const orderProductNames = lineItems.map((item) => item.productName);
			const orderVariantNames = lineItems.map((item) => item.variantName);
			const orderUnitPrices = lineItems.map((item) => item.unitPrice);

			const checkoutResult = await sql`
				WITH new_order AS (
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
						payment_method,
						stripe_payment_intent_id,
						paypal_order_id,
						paypal_capture_id,
						currency,
						subtotal,
						shipping_amount,
						tariff_amount,
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
						${shippingOptionId === "manual_contact" ? "pending_quote" : "pending"},
						'pending',
						${paymentMethod},
						NULL,
						NULL,
						NULL,
						${currency},
						${subtotal},
						${shippingAmount},
						${tariffAmount},
						${totalAmount}
					RETURNING id, customer_name, customer_email, status, payment_status, payment_method, stripe_payment_intent_id, paypal_order_id, paypal_capture_id, currency, subtotal, shipping_amount, tariff_amount, total_amount, created_at
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
					(SELECT id FROM new_order) AS order_id,
					(SELECT customer_name FROM new_order) AS customer_name,
					(SELECT customer_email FROM new_order) AS customer_email,
					(SELECT status FROM new_order) AS status,
					(SELECT payment_status FROM new_order) AS payment_status,
					(SELECT payment_method FROM new_order) AS payment_method,
					(SELECT stripe_payment_intent_id FROM new_order) AS stripe_payment_intent_id,
					(SELECT paypal_order_id FROM new_order) AS paypal_order_id,
					(SELECT paypal_capture_id FROM new_order) AS paypal_capture_id,
					(SELECT currency FROM new_order) AS currency,
					(SELECT subtotal FROM new_order) AS subtotal,
					(SELECT shipping_amount FROM new_order) AS shipping_amount,
					(SELECT tariff_amount FROM new_order) AS tariff_amount,
					(SELECT total_amount FROM new_order) AS total_amount,
					(SELECT created_at FROM new_order) AS created_at
			`;

			const result =
				(checkoutResult[0] as Record<string, unknown> | undefined) ??
				{};
			if (!result.order_id) {
				return NextResponse.json(
					{ error: "Failed to create manual checkout order" },
					{ status: 500 },
				);
			}

			const finalizedOrder = {
				id: Number(result.order_id),
				customer_name: String(result.customer_name ?? customerName),
				customer_email: String(result.customer_email ?? customerEmail),
				status: String(result.status ?? "pending_quote"),
				payment_status: String(result.payment_status ?? "pending"),
				payment_method: String(result.payment_method ?? paymentMethod),
				stripe_payment_intent_id: null,
				paypal_order_id: null,
				paypal_capture_id: null,
				currency: String(result.currency ?? currency),
				subtotal: Number(result.subtotal ?? subtotal),
				shipping_amount: Number(
					result.shipping_amount ?? shippingAmount,
				),
				tariff_amount: Number(result.tariff_amount ?? tariffAmount),
				total_amount: Number(result.total_amount ?? totalAmount),
				created_at: String(result.created_at ?? ""),
			};

			const resendApiKey = process.env.RESEND_API_KEY;
			const notificationEmail =
				process.env.ORDER_NOTIFICATION_EMAIL ?? "contact@threed4g.com";
			const fromEmail =
				process.env.ORDER_FROM_EMAIL ??
				"ThreeD4G Orders <orders@contact.threed4g.com>";

			if (resendApiKey) {
				const resend = new Resend(resendApiKey);
				const paymentMethodLabel =
					paymentMethod === "beem" ? "Beem" : "Contact";
				const confirmationMessage =
					paymentMethod === "beem"
						? "We have received your order and will contact you about payment shortly."
						: "We have received your order request and will contact you about payment and shipping shortly.";
				const customerEmailHtml = renderCustomerConfirmationHtml({
					customerName,
					orderId: finalizedOrder.id,
					currency,
					subtotal: finalizedOrder.subtotal,
					shippingAmount: finalizedOrder.shipping_amount,
					tariffAmount: finalizedOrder.tariff_amount,
					totalAmount: finalizedOrder.total_amount,
					shippingMethod: shippingMethodLabel,
					paymentMethod: paymentMethodLabel,
					confirmationMessage,
					lineItems,
				});

				const notificationEmailHtml = renderOrderDetailsHtml({
					orderId: finalizedOrder.id,
					customerName,
					customerEmail,
					shippingName: shipping.name,
					shippingPhone: shipping.phone,
					shippingLine1: shipping.address.line1,
					shippingLine2: shipping.address.line2,
					shippingCity: shipping.address.city,
					shippingState: shipping.address.state,
					shippingPostalCode: shipping.address.postal_code,
					shippingCountry: shipping.address.country,
					shippingMethod: shippingMethodLabel,
					paymentMethod: paymentMethodLabel,
					paymentIntentId: "",
					status: finalizedOrder.status,
					paymentStatus: finalizedOrder.payment_status,
					currency,
					subtotal: finalizedOrder.subtotal,
					shippingAmount: finalizedOrder.shipping_amount,
					tariffAmount: finalizedOrder.tariff_amount,
					totalAmount: finalizedOrder.total_amount,
					lineItems,
				});

				void Promise.allSettled([
					resend.emails.send({
						from: fromEmail,
						to: customerEmail,
						subject: `Order request (Order ID #${finalizedOrder.id})`,
						html: customerEmailHtml,
					}),
					resend.emails.send({
						from: fromEmail,
						to: notificationEmail,
						subject: `New order request (Order ID #${finalizedOrder.id})`,
						html: notificationEmailHtml,
					}),
				]);
			}

			if (checkoutSessionId) {
				await completeStockSession(checkoutSessionId);
			}

			return NextResponse.json(
				{
					success: true,
					order: finalizedOrder,
				},
				{ status: 201 },
			);
		}

		if (paymentMethod === "stripe") {
			if (!process.env.STRIPE_SECRET_KEY) {
				return NextResponse.json(
					{ error: "Stripe is not configured" },
					{ status: 500 },
				);
			}
			const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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
		}

		const orderVariantIds = lineItems.map((item) => item.variantId);
		const orderQuantities = lineItems.map((item) => item.quantity);
		const orderReservedQuantities = lineItems.map(
			(item) => reservationQuantities.get(item.variantId) ?? 0,
		);
		const orderProductIds = lineItems.map((item) => item.productId);
		const orderProductNames = lineItems.map((item) => item.productName);
		const orderVariantNames = lineItems.map((item) => item.variantName);
		const orderUnitPrices = lineItems.map((item) => item.unitPrice);

		const checkoutResult = await sql`
      WITH requested AS (
        SELECT *
        FROM unnest(
          ${orderVariantIds}::int[],
		  ${orderQuantities}::int[],
		  ${orderReservedQuantities}::int[]
		) AS t(variant_id, quantity, reserved_quantity)
      ),
      locked AS (
        SELECT
          pv.id AS variant_id,
          pv.stock_quantity,
		  requested.quantity,
		  requested.reserved_quantity
        FROM requested
        JOIN product_variants pv ON pv.id = requested.variant_id
        FOR UPDATE OF pv
      ),
      all_ok AS (
        SELECT
          COUNT(*) = (SELECT COUNT(*) FROM requested)
		  AND COALESCE(BOOL_AND(stock_quantity + reserved_quantity >= quantity), false) AS ok
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
					payment_method,
          stripe_payment_intent_id,
				paypal_order_id,
				paypal_capture_id,
				currency,
          subtotal,
          shipping_amount,
					tariff_amount,
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
				${paymentMethod},
				${paymentMethod === "stripe" ? paymentReferenceId : null},
				${paymentMethod === "paypal" ? paypalOrderId : null},
				${paymentMethod === "paypal" ? paymentReferenceId : null},
          ${currency},
          ${subtotal},
          ${shippingAmount},
					${tariffAmount},
          ${totalAmount}
        FROM all_ok
        WHERE all_ok.ok
				ON CONFLICT (stripe_payment_intent_id) DO NOTHING
			RETURNING id, customer_name, customer_email, status, payment_status, payment_method, stripe_payment_intent_id, paypal_order_id, paypal_capture_id, currency, subtotal, shipping_amount, tariff_amount, total_amount, created_at
      ),
      updated_stock AS (
        UPDATE product_variants pv
        SET
		  stock_quantity = pv.stock_quantity - GREATEST(locked.quantity - locked.reserved_quantity, 0),
		  in_stock = (pv.stock_quantity - GREATEST(locked.quantity - locked.reserved_quantity, 0)) > 0
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
				(SELECT payment_method FROM new_order) AS payment_method,
				(SELECT stripe_payment_intent_id FROM new_order) AS stripe_payment_intent_id,
				(SELECT paypal_order_id FROM new_order) AS paypal_order_id,
				(SELECT paypal_capture_id FROM new_order) AS paypal_capture_id,
        (SELECT currency FROM new_order) AS currency,
        (SELECT subtotal FROM new_order) AS subtotal,
        (SELECT shipping_amount FROM new_order) AS shipping_amount,
		(SELECT tariff_amount FROM new_order) AS tariff_amount,
        (SELECT total_amount FROM new_order) AS total_amount,
        (SELECT created_at FROM new_order) AS created_at
    `;

		const result =
			(checkoutResult[0] as Record<string, unknown> | undefined) ?? {};

		if (result.success !== true || !result.order_id) {
			const existingAfterConflict = await sql`
			SELECT id, customer_name, customer_email, status, payment_status, payment_method, stripe_payment_intent_id, currency, subtotal, shipping_amount, tariff_amount, total_amount, created_at
        FROM orders
        WHERE stripe_payment_intent_id = ${paymentIntentId}
        LIMIT 1
      `;
			if (existingAfterConflict.length > 0) {
				if (checkoutSessionId) {
					await completeStockSession(checkoutSessionId);
				}
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
			payment_method: String(result.payment_method ?? "stripe"),
			stripe_payment_intent_id:
				paymentMethod === "stripe"
					? String(
							result.stripe_payment_intent_id ??
								paymentReferenceId,
						)
					: null,
			paypal_order_id:
				paymentMethod === "paypal"
					? String(result.paypal_order_id ?? paypalOrderId)
					: null,
			paypal_capture_id:
				paymentMethod === "paypal"
					? String(result.paypal_capture_id ?? paymentReferenceId)
					: null,
			currency: String(result.currency ?? currency),
			subtotal: Number(result.subtotal ?? subtotal),
			shipping_amount: Number(result.shipping_amount ?? shippingAmount),
			tariff_amount: Number(result.tariff_amount ?? tariffAmount),
			total_amount: Number(result.total_amount ?? totalAmount),
			created_at: String(result.created_at ?? ""),
		};

		const resendApiKey = process.env.RESEND_API_KEY;
		const notificationEmail =
			process.env.ORDER_NOTIFICATION_EMAIL ?? "contact@threed4g.com";
		const fromEmail =
			process.env.ORDER_FROM_EMAIL ??
			"ThreeD4G Orders <orders@contact.threed4g.com>";

		if (resendApiKey) {
			const resend = new Resend(resendApiKey);
			const paymentMethodLabel =
				paymentMethod === "paypal" ? "PayPal" : "Stripe";
			const customerEmailHtml = renderCustomerConfirmationHtml({
				customerName,
				orderId: finalizedOrder.id,
				currency,
				subtotal: finalizedOrder.subtotal,
				shippingAmount: finalizedOrder.shipping_amount,
				tariffAmount: finalizedOrder.tariff_amount,
				totalAmount: finalizedOrder.total_amount,
				shippingMethod: shippingMethodLabel,
				paymentMethod: paymentMethodLabel,
				lineItems,
			});

			const notificationEmailHtml = renderOrderDetailsHtml({
				orderId: finalizedOrder.id,
				customerName,
				customerEmail,
				shippingName: shipping.name,
				shippingPhone: shipping.phone,
				shippingLine1: shipping.address.line1,
				shippingLine2: shipping.address.line2,
				shippingCity: shipping.address.city,
				shippingState: shipping.address.state,
				shippingPostalCode: shipping.address.postal_code,
				shippingCountry: shipping.address.country,
				shippingMethod: shippingMethodLabel,
				paymentMethod: paymentMethodLabel,
				paymentIntentId:
					paymentMethod === "stripe"
						? paymentIntentId
						: paymentReferenceId,
				status: finalizedOrder.status,
				paymentStatus: finalizedOrder.payment_status,
				currency,
				subtotal: finalizedOrder.subtotal,
				shippingAmount: finalizedOrder.shipping_amount,
				tariffAmount: finalizedOrder.tariff_amount,
				totalAmount: finalizedOrder.total_amount,
				lineItems,
			});

			const emailResults = await Promise.allSettled([
				resend.emails.send({
					from: fromEmail,
					to: customerEmail,
					subject: `Order Confirmation #${finalizedOrder.id}`,
					html: customerEmailHtml,
				}),
				resend.emails.send({
					from: fromEmail,
					to: notificationEmail,
					subject: `New Order Submitted #${finalizedOrder.id}`,
					html: notificationEmailHtml,
				}),
			]);

			emailResults.forEach((result, index) => {
				if (result.status === "rejected") {
					const recipient =
						index === 0 ? customerEmail : notificationEmail;
					console.error("Order email failed", {
						orderId: finalizedOrder.id,
						recipient,
						error: result.reason,
					});
				}
			});
		}

		if (checkoutSessionId) {
			await completeStockSession(checkoutSessionId);
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
