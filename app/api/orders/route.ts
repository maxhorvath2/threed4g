import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { OrderWithItems } from "@/lib/types/order";

export async function GET() {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const orders = await sql`
      SELECT
        o.id,
        o.customer_name,
        o.customer_email,
        o.status,
        COALESCE(o.payment_status, 'unpaid') AS payment_status,
        COALESCE(o.payment_method, 'stripe') AS payment_method,
        o.stripe_payment_intent_id,
        o.shipping_name,
        o.shipping_phone,
        o.shipping_address_line1,
        o.shipping_address_line2,
        o.shipping_city,
        o.shipping_state,
        o.shipping_postal_code,
        o.shipping_country,
        COALESCE(o.currency, 'aud') AS currency,
        o.subtotal,
        COALESCE(o.shipping_amount, 0) AS shipping_amount,
        COALESCE(o.tariff_amount, 0) AS tariff_amount,
        COALESCE(o.total_amount, o.subtotal) AS total_amount,
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
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

		return NextResponse.json(orders as OrderWithItems[]);
	} catch (error) {
		console.error("Error fetching orders:", error);
		return NextResponse.json(
			{ error: "Failed to fetch orders" },
			{ status: 500 },
		);
	}
}
