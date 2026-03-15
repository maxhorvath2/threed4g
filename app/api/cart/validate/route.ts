import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

interface ValidateCartItemInput {
	id: string;
	productId: number;
	variantId: number | null;
	quantity: number;
}

interface VariantStockRow {
	id: number;
	product_id: number;
	name: string;
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

function getCartItemId(productId: number, variantId: number | null): string {
	return variantId ? `${productId}-${variantId}` : `${productId}`;
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const bodyRecord = asRecord(body);
		const rawItems = Array.isArray(bodyRecord.items)
			? (bodyRecord.items as unknown[])
			: [];

		const items: ValidateCartItemInput[] = rawItems
			.map((item): ValidateCartItemInput => {
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

		if (items.length === 0) {
			return NextResponse.json({ items: [] });
		}

		const variantIds = Array.from(
			new Set(
				items
					.map((item) => item.variantId)
					.filter((id): id is number => id !== null && id > 0),
			),
		);
		const fallbackProductIds = Array.from(
			new Set(
				items
					.filter((item) => item.variantId === null)
					.map((item) => item.productId),
			),
		);

		const [variantRows, fallbackRows] = await Promise.all([
			variantIds.length > 0
				? sql`
          SELECT id, product_id, name, stock_quantity
          FROM product_variants
          WHERE id = ANY(${variantIds})
        `
				: Promise.resolve([]),
			fallbackProductIds.length > 0
				? sql`
          SELECT DISTINCT ON (product_id) id, product_id, name, stock_quantity
          FROM product_variants
          WHERE product_id = ANY(${fallbackProductIds})
          ORDER BY product_id, sort_order ASC, id ASC
        `
				: Promise.resolve([]),
		]);

		const variantById = new Map<number, VariantStockRow>(
			(variantRows as VariantStockRow[]).map((variant) => [
				variant.id,
				variant,
			]),
		);
		const fallbackByProductId = new Map<number, VariantStockRow>(
			(fallbackRows as VariantStockRow[]).map((variant) => [
				variant.product_id,
				variant,
			]),
		);

		const validatedItems = items.map((item) => {
			const resolvedVariant =
				item.variantId !== null
					? variantById.get(item.variantId)
					: fallbackByProductId.get(item.productId);

			const availableQuantity = Math.max(
				0,
				parsePositiveInt(resolvedVariant?.stock_quantity ?? 0, 0),
			);
			const allowedQuantity = Math.min(item.quantity, availableQuantity);
			const resolvedVariantId = resolvedVariant?.id ?? null;

			return {
				id: item.id,
				resolvedItemId: getCartItemId(
					item.productId,
					resolvedVariantId,
				),
				resolvedVariantId,
				resolvedVariantName: resolvedVariant?.name ?? null,
				availableQuantity,
				allowedQuantity,
			};
		});

		return NextResponse.json({ items: validatedItems });
	} catch (error) {
		console.error("Error validating cart stock:", error);
		return NextResponse.json(
			{ error: "Failed to validate cart stock" },
			{ status: 500 },
		);
	}
}
