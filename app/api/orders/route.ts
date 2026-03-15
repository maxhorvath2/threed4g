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
        o.stripe_payment_intent_id,
        COALESCE(o.currency, 'aud') AS currency,
        o.subtotal,
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
