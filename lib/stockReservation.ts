import { sql } from "@/lib/db";

export interface ReservationItemInput {
	variantId: number;
	quantity: number;
}

const RESERVATION_TTL_MINUTES = 20;

export async function ensureStockReservationTables() {
	await sql`
		CREATE TABLE IF NOT EXISTS checkout_stock_sessions (
			id VARCHAR(64) PRIMARY KEY,
			status VARCHAR(24) NOT NULL DEFAULT 'active',
			expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS checkout_stock_session_items (
			id SERIAL PRIMARY KEY,
			session_id VARCHAR(64) NOT NULL REFERENCES checkout_stock_sessions(id) ON DELETE CASCADE,
			variant_id INTEGER NOT NULL REFERENCES product_variants(id),
			quantity INTEGER NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE INDEX IF NOT EXISTS checkout_stock_sessions_status_expires_idx
		ON checkout_stock_sessions(status, expires_at)
	`;

	await sql`
		CREATE INDEX IF NOT EXISTS checkout_stock_session_items_session_idx
		ON checkout_stock_session_items(session_id)
	`;
}

export async function releaseExpiredReservations() {
	await ensureStockReservationTables();

	await sql`
		WITH expired_sessions AS (
			SELECT id
			FROM checkout_stock_sessions
			WHERE status = 'active' AND expires_at < NOW()
			FOR UPDATE
		),
		expired_items AS (
			SELECT variant_id, SUM(quantity)::int AS quantity
			FROM checkout_stock_session_items
			WHERE session_id IN (SELECT id FROM expired_sessions)
			GROUP BY variant_id
		),
		restored_stock AS (
			UPDATE product_variants pv
			SET
				stock_quantity = pv.stock_quantity + expired_items.quantity,
				in_stock = (pv.stock_quantity + expired_items.quantity) > 0
			FROM expired_items
			WHERE pv.id = expired_items.variant_id
			RETURNING pv.id
		)
		UPDATE checkout_stock_sessions
		SET status = 'expired', updated_at = NOW()
		WHERE id IN (SELECT id FROM expired_sessions)
	`;
}

export async function reserveStockForSession(
	items: ReservationItemInput[],
): Promise<{ sessionId: string; expiresAt: string }> {
	await ensureStockReservationTables();
	await releaseExpiredReservations();

	const normalizedItems = items
		.map((item) => ({
			variantId: Number(item.variantId),
			quantity: Number(item.quantity),
		}))
		.filter((item) => item.variantId > 0 && item.quantity > 0);
	if (normalizedItems.length === 0) {
		throw new Error("No valid reservation items were provided");
	}

	const aggregatedItems = Array.from(
		normalizedItems.reduce((accumulator, item) => {
			const existing = accumulator.get(item.variantId);
			if (existing) {
				existing.quantity += item.quantity;
				return accumulator;
			}

			accumulator.set(item.variantId, { ...item });
			return accumulator;
		}, new Map<number, { variantId: number; quantity: number }>()),
	).map(([, item]) => item);

	const sessionId = crypto.randomUUID();
	const variantIds = aggregatedItems.map((item) => item.variantId);
	const quantities = aggregatedItems.map((item) => item.quantity);

	const result = await sql`
		WITH requested AS (
			SELECT *
			FROM unnest(
				${variantIds}::int[],
				${quantities}::int[]
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
		updated_stock AS (
			UPDATE product_variants pv
			SET
				stock_quantity = pv.stock_quantity - locked.quantity,
				in_stock = (pv.stock_quantity - locked.quantity) > 0
			FROM locked, all_ok
			WHERE all_ok.ok AND pv.id = locked.variant_id
			RETURNING pv.id
		),
		new_session AS (
			INSERT INTO checkout_stock_sessions (
				id,
				status,
				expires_at
			)
			SELECT
				${sessionId},
				'active',
				NOW() + (${RESERVATION_TTL_MINUTES}::text || ' minutes')::interval
			FROM all_ok
			WHERE all_ok.ok
			RETURNING id, expires_at
		),
		inserted_items AS (
			INSERT INTO checkout_stock_session_items (
				session_id,
				variant_id,
				quantity
			)
			SELECT
				new_session.id,
				requested.variant_id,
				requested.quantity
			FROM new_session
			JOIN requested ON TRUE
			RETURNING id
		)
		SELECT
			(SELECT ok FROM all_ok) AS success,
			(SELECT id FROM new_session) AS session_id,
			(SELECT expires_at FROM new_session) AS expires_at
	`;

	const row =
		(result[0] as
			| {
					success?: boolean;
					session_id?: string;
					expires_at?: string;
			  }
			| undefined) ?? {};

	if (!row.success || !row.session_id) {
		throw new Error("Insufficient stock for one or more items");
	}

	return {
		sessionId: row.session_id,
		expiresAt: String(row.expires_at ?? ""),
	};
}

export async function releaseStockSession(
	sessionId: string,
): Promise<{ released: boolean }> {
	await ensureStockReservationTables();
	await releaseExpiredReservations();

	const result = await sql`
		WITH target_session AS (
			SELECT id
			FROM checkout_stock_sessions
			WHERE id = ${sessionId} AND status = 'active'
			FOR UPDATE
		),
		target_items AS (
			SELECT variant_id, SUM(quantity)::int AS quantity
			FROM checkout_stock_session_items
			WHERE session_id IN (SELECT id FROM target_session)
			GROUP BY variant_id
		),
		restored_stock AS (
			UPDATE product_variants pv
			SET
				stock_quantity = pv.stock_quantity + target_items.quantity,
				in_stock = (pv.stock_quantity + target_items.quantity) > 0
			FROM target_items
			WHERE pv.id = target_items.variant_id
			RETURNING pv.id
		),
		updated_session AS (
			UPDATE checkout_stock_sessions
			SET status = 'released', updated_at = NOW()
			WHERE id IN (SELECT id FROM target_session)
			RETURNING id
		)
		SELECT (SELECT COUNT(*) FROM updated_session) AS released_count
	`;

	const row =
		(result[0] as { released_count?: number | string } | undefined) ?? {};
	const releasedCount = Number(row.released_count ?? 0);

	return { released: releasedCount > 0 };
}

export async function completeStockSession(sessionId: string): Promise<void> {
	await ensureStockReservationTables();
	await sql`
		UPDATE checkout_stock_sessions
		SET status = 'completed', updated_at = NOW()
		WHERE id = ${sessionId} AND status = 'active'
	`;
}

export async function getSessionReservationQuantities(
	sessionId: string,
): Promise<Map<number, number>> {
	await ensureStockReservationTables();
	await releaseExpiredReservations();

	const rows = await sql`
		SELECT item.variant_id, item.quantity
		FROM checkout_stock_session_items item
		JOIN checkout_stock_sessions session ON session.id = item.session_id
		WHERE session.id = ${sessionId} AND session.status = 'active'
	`;

	const quantities = new Map<number, number>();
	for (const row of rows as Array<{
		variant_id?: number | string;
		quantity?: number | string;
	}>) {
		const variantId = Number(row.variant_id ?? 0);
		const quantity = Number(row.quantity ?? 0);
		if (variantId <= 0 || quantity <= 0) {
			continue;
		}

		const current = quantities.get(variantId) ?? 0;
		quantities.set(variantId, current + quantity);
	}

	return quantities;
}
