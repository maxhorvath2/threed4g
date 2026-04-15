import { NextRequest, NextResponse } from "next/server";
import { normalizeCheckoutItems } from "@/lib/checkout";
import { sql } from "@/lib/db";
import {
	releaseStockSession,
	reserveStockForSession,
	type ReservationItemInput,
} from "@/lib/stockReservation";

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

		const resolvedItems = requestedItems
			.map((item) => {
				const resolved =
					item.variantId !== null
						? explicitById.get(item.variantId)
						: fallbackByProduct.get(item.productId);
				if (!resolved) {
					return null;
				}

				return {
					productId: resolved.product_id,
					variantId: resolved.id,
					productName: resolved.product_name,
					variantName: resolved.name,
					unitPrice: Number(resolved.price),
					quantity: item.quantity,
				};
			})
			.filter((item): item is NonNullable<typeof item> => Boolean(item));

		if (resolvedItems.length !== requestedItems.length) {
			return NextResponse.json(
				{ error: "Some cart items no longer exist" },
				{ status: 409 },
			);
		}

		const reservationItems = Array.from(
			resolvedItems.reduce((accumulator, item) => {
				const existing = accumulator.get(item.variantId);
				if (existing) {
					existing.quantity += item.quantity;
					return accumulator;
				}

				accumulator.set(item.variantId, {
					variantId: item.variantId,
					quantity: item.quantity,
				});
				return accumulator;
			}, new Map<number, ReservationItemInput>()),
		).map(([, item]) => item);

		const reservation = await reserveStockForSession(reservationItems);

		return NextResponse.json({
			success: true,
			checkoutSessionId: reservation.sessionId,
			expiresAt: reservation.expiresAt,
			items: resolvedItems,
		});
	} catch (error) {
		console.error("Error reserving checkout stock:", error);
		return NextResponse.json(
			{ error: "Failed to reserve stock for checkout" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const checkoutSessionId = String(body.checkoutSessionId ?? "").trim();
		if (!checkoutSessionId) {
			return NextResponse.json(
				{ error: "checkoutSessionId is required" },
				{ status: 400 },
			);
		}

		const result = await releaseStockSession(checkoutSessionId);
		return NextResponse.json({ released: result.released });
	} catch (error) {
		console.error("Error releasing checkout stock:", error);
		return NextResponse.json(
			{ error: "Failed to release checkout stock" },
			{ status: 500 },
		);
	}
}
