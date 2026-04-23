import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { OrderDetail } from "@/lib/types/order";

interface UpdateOrderBody {
	tracking_number?: string | null;
	tracking_url?: string | null;
	mark_as_shipped?: boolean;
}

function toOrderId(value: string): number | null {
	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function ensureOrderTrackingColumns() {
	await sql`
		ALTER TABLE orders
		ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255)
	`;

	await sql`
		ALTER TABLE orders
		ADD COLUMN IF NOT EXISTS tracking_url TEXT
	`;

	await sql`
		ALTER TABLE orders
		ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE
	`;
}

async function fetchOrder(id: number): Promise<OrderDetail | null> {
	const orders = await sql`
    SELECT
      o.id,
      o.customer_name,
      o.customer_email,
      o.status,
      COALESCE(o.payment_status, 'unpaid') AS payment_status,
      o.stripe_payment_intent_id,
      o.shipping_name,
      o.shipping_phone,
      o.shipping_address_line1,
      o.shipping_address_line2,
      o.shipping_city,
      o.shipping_state,
      o.shipping_postal_code,
      o.shipping_country,
      o.tracking_number,
      o.tracking_url,
      o.shipped_at,
      COALESCE(o.currency, 'aud') AS currency,
      o.subtotal,
      o.shipping_amount,
      o.total_amount,
      o.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'variant_id', oi.variant_id,
            'product_name', oi.product_name,
            'variant_name', oi.variant_name,
            'unit_price', oi.unit_price,
            'quantity', oi.quantity,
            'line_total', oi.line_total,
            'created_at', oi.created_at
          )
          ORDER BY oi.id ASC
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = ${id}
    GROUP BY o.id
    LIMIT 1
  `;

	return (orders[0] as OrderDetail | undefined) ?? null;
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { id } = await params;
		const orderId = toOrderId(id);
		if (!orderId) {
			return NextResponse.json(
				{ error: "Invalid order id" },
				{ status: 400 },
			);
		}

		await ensureOrderTrackingColumns();

		const order = await fetchOrder(orderId);
		if (!order) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(order);
	} catch (error) {
		console.error("Error fetching order details:", error);
		return NextResponse.json(
			{ error: "Failed to fetch order details" },
			{ status: 500 },
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { id } = await params;
		const orderId = toOrderId(id);
		if (!orderId) {
			return NextResponse.json(
				{ error: "Invalid order id" },
				{ status: 400 },
			);
		}

		await ensureOrderTrackingColumns();

		const body = (await request.json()) as UpdateOrderBody;
		const trackingNumber = String(body.tracking_number ?? "").trim();
		const trackingUrl = String(body.tracking_url ?? "").trim();
		const markAsShipped = Boolean(body.mark_as_shipped);

		const existing = await fetchOrder(orderId);
		if (!existing) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 },
			);
		}

		if (markAsShipped && existing.payment_status !== "paid") {
			return NextResponse.json(
				{ error: "Only paid orders can be marked as shipped" },
				{ status: 409 },
			);
		}

		const effectiveTrackingNumber =
			trackingNumber || String(existing.tracking_number ?? "").trim();
		if (markAsShipped && !effectiveTrackingNumber) {
			return NextResponse.json(
				{
					error: "Tracking number is required before marking as shipped",
				},
				{ status: 409 },
			);
		}

		const effectiveTrackingUrl =
			trackingUrl || String(existing.tracking_url ?? "").trim();

		const shouldSetShippedAt =
			markAsShipped && existing.status !== "shipped";
		const nextStatus = markAsShipped ? "shipped" : existing.status;

		const updated = await sql`
      UPDATE orders
      SET
        tracking_number = ${effectiveTrackingNumber || null},
        tracking_url = ${effectiveTrackingUrl || null},
        shipped_at = ${shouldSetShippedAt ? new Date().toISOString() : (existing.shipped_at ?? null)},
        status = ${nextStatus}
      WHERE id = ${orderId}
      RETURNING id
    `;
		if (updated.length === 0) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 },
			);
		}

		const order = await fetchOrder(orderId);

		if (order && shouldSetShippedAt) {
			const resendApiKey = process.env.RESEND_API_KEY;
			if (resendApiKey) {
				const resend = new Resend(resendApiKey);
				const fromEmail =
					process.env.ORDER_FROM_EMAIL ??
					"ThreeD420 Orders <orders@contact.threed420.com>";

				const trackingLine = order.tracking_url
					? `<p><strong>Track your package:</strong> <a href="${order.tracking_url}">${order.tracking_url}</a></p>`
					: "";

				void resend.emails.send({
					from: fromEmail,
					to: order.customer_email,
					subject: `Your order #${order.id} has shipped`,
					html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your order is on the way</h2>
              <p>Hi ${order.customer_name}, your order has been marked as shipped.</p>
              <p><strong>Order ID:</strong> #${order.id}</p>
              <p><strong>Tracking Number:</strong> ${order.tracking_number ?? "N/A"}</p>
              ${trackingLine}
              <p>Thanks for shopping with ThreeD420.</p>
            </div>
          `,
				});
			}
		}

		return NextResponse.json(order);
	} catch (error) {
		console.error("Error updating order:", error);
		return NextResponse.json(
			{ error: "Failed to update order" },
			{ status: 500 },
		);
	}
}
