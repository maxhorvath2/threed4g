"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import type { OrderDetail } from "@/lib/types/order";

interface OrderResponseError {
	error: string;
}

export default function OrderDetailPage() {
	const params = useParams<{ id: string }>();
	const orderId = useMemo(() => String(params?.id ?? "").trim(), [params]);
	const [order, setOrder] = useState<OrderDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [trackingNumber, setTrackingNumber] = useState("");
	const [trackingUrl, setTrackingUrl] = useState("");
	const [markingShipped, setMarkingShipped] = useState(false);

	useEffect(() => {
		if (!orderId) {
			setError("Invalid order id");
			setLoading(false);
			return;
		}

		const loadOrder = async () => {
			try {
				const response = await fetch(`/api/orders/${orderId}`);
				const data = (await response.json()) as
					| OrderDetail
					| OrderResponseError;

				if (!response.ok || !("id" in data)) {
					throw new Error(
						"error" in data ? data.error : "Failed to load order",
					);
				}

				setOrder(data);
				setTrackingNumber(data.tracking_number ?? "");
				setTrackingUrl(data.tracking_url ?? "");
			} catch (loadError) {
				setError(
					loadError instanceof Error
						? loadError.message
						: "Failed to load order",
				);
			} finally {
				setLoading(false);
			}
		};

		void loadOrder();
	}, [orderId]);

	const shippingAddress = order
		? [
				order.shipping_name,
				order.shipping_address_line1,
				order.shipping_address_line2,
				`${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal_code}`,
				order.shipping_country,
			].filter(Boolean)
		: [];
	const hasTrackingNumber = trackingNumber.trim() !== "";

	const handleSave = async (markAsShipped: boolean) => {
		if (!orderId) {
			return;
		}

		if (markAsShipped && !hasTrackingNumber) {
			setError(
				"Please input a tracking number before marking this order as shipped.",
			);
			return;
		}

		setSaving(true);
		setError(null);
		setMarkingShipped(markAsShipped);

		try {
			const response = await fetch(`/api/orders/${orderId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					tracking_number: trackingNumber.trim() || null,
					tracking_url: trackingUrl.trim() || null,
					mark_as_shipped: markAsShipped,
				}),
			});

			const data = (await response.json()) as
				| OrderDetail
				| OrderResponseError;
			if (!response.ok || !("id" in data)) {
				throw new Error(
					"error" in data ? data.error : "Failed to update order",
				);
			}

			setOrder(data);
			setTrackingNumber(data.tracking_number ?? trackingNumber);
			setTrackingUrl(data.tracking_url ?? trackingUrl);
		} catch (updateError) {
			setError(
				updateError instanceof Error
					? updateError.message
					: "Failed to update order",
			);
		} finally {
			setSaving(false);
			setMarkingShipped(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#050505]">
			<Navigation />
			<main className="pt-32 pb-20 px-6">
				<div className="max-w-5xl mx-auto space-y-6">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<div>
							<p className="text-xs uppercase tracking-[0.2em] text-[#737373] mb-2">
								Admin Order Detail
							</p>
							<h1 className="text-4xl font-display font-bold text-[#fafafa]">
								{order ? `Order #${order.id}` : "Order"}
							</h1>
						</div>
						<Link
							href="/admin"
							className="px-4 py-2 rounded-xl border border-[#262626] text-[#fafafa] hover:border-[#404040] hover:bg-[#1a1a1a] transition-colors"
						>
							Back to Admin
						</Link>
					</div>

					{loading ? (
						<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 text-[#a3a3a3]">
							Loading order...
						</div>
					) : error ? (
						<div className="border border-[#7f1d1d] bg-[#7f1d1d]/20 rounded-2xl p-6 text-[#fca5a5]">
							{error}
						</div>
					) : order ? (
						<div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
							<div className="space-y-6">
								<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-4">
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<p className="text-sm text-[#a3a3a3]">
												Customer
											</p>
											<p className="text-xl text-[#fafafa] font-semibold">
												{order.customer_name}
											</p>
											<p className="text-[#a3a3a3]">
												{order.customer_email}
											</p>
										</div>
										<div className="text-right">
											<p className="text-[#22c55e] font-bold text-2xl">
												$
												{Number(
													order.total_amount,
												).toFixed(2)}
											</p>
											<p className="text-xs text-[#a3a3a3] uppercase">
												{order.currency}
											</p>
											<p className="text-xs text-[#a3a3a3] mt-1">
												Status: {order.status}
											</p>
											<p className="text-xs text-[#a3a3a3]">
												Payment: {order.payment_status}
											</p>
										</div>
									</div>

									<div className="grid gap-3 md:grid-cols-3 text-sm text-[#d4d4d4] pt-2 border-t border-[#1f1f1f]">
										<div>
											<p className="text-xs uppercase tracking-[0.2em] text-[#737373] mb-1">
												Subtotal
											</p>
											<p>
												$
												{Number(order.subtotal).toFixed(
													2,
												)}
											</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-[0.2em] text-[#737373] mb-1">
												Shipping
											</p>
											<p>
												$
												{Number(
													order.shipping_amount ?? 0,
												).toFixed(2)}
											</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-[0.2em] text-[#737373] mb-1">
												Placed
											</p>
											<p>
												{new Date(
													order.created_at,
												).toLocaleString()}
											</p>
										</div>
									</div>
								</div>

								<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-3">
									<h2 className="text-xl text-[#fafafa] font-semibold">
										Items
									</h2>
									<div className="space-y-3">
										{order.items.map((item) => (
											<div
												key={item.id}
												className="flex items-start justify-between gap-4 border border-[#1f1f1f] rounded-xl p-4 bg-[#0a0a0a]"
											>
												<div>
													<p className="text-[#fafafa] font-medium">
														{item.product_name}
													</p>
													<p className="text-[#a3a3a3] text-sm">
														{item.variant_name}
													</p>
													<p className="text-xs text-[#737373] mt-1">
														Qty {item.quantity} · $
														{Number(
															item.unit_price,
														).toFixed(2)}{" "}
														each
													</p>
												</div>
												<p className="text-[#d4d4d4]">
													$
													{Number(
														item.line_total,
													).toFixed(2)}
												</p>
											</div>
										))}
									</div>
								</div>
							</div>

							<div className="space-y-6">
								<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-3">
									<h2 className="text-xl text-[#fafafa] font-semibold">
										Shipping Info
									</h2>
									<div className="space-y-2 text-sm text-[#d4d4d4]">
										{shippingAddress.map((line) => (
											<p key={line}>{line}</p>
										))}
									</div>
								</div>

								<div className="border border-[#262626] bg-[#111111] rounded-2xl p-6 space-y-4">
									<h2 className="text-xl text-[#fafafa] font-semibold">
										Tracking & Fulfillment
									</h2>
									<div className="space-y-3">
										<div>
											<label className="block text-sm text-[#a3a3a3] mb-2">
												Tracking Number
											</label>
											<input
												type="text"
												value={trackingNumber}
												onChange={(e) =>
													setTrackingNumber(
														e.target.value,
													)
												}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
												placeholder="Enter tracking number"
											/>
										</div>
										<div>
											<label className="block text-sm text-[#a3a3a3] mb-2">
												Tracking URL
											</label>
											<input
												type="url"
												value={trackingUrl}
												onChange={(e) =>
													setTrackingUrl(
														e.target.value,
													)
												}
												className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-[#fafafa]"
												placeholder="Optional tracking link"
											/>
										</div>
										{order.tracking_number && (
											<div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-3 text-sm text-[#d4d4d4] space-y-1">
												<p>
													Current tracking:{" "}
													{order.tracking_number}
												</p>
												{order.tracking_url && (
													<p className="break-all">
														{order.tracking_url}
													</p>
												)}
												{order.shipped_at && (
													<p>
														Shipped:{" "}
														{new Date(
															order.shipped_at,
														).toLocaleString()}
													</p>
												)}
											</div>
										)}
									</div>
									<div className="grid gap-3">
										<button
											type="button"
											disabled={saving}
											onClick={() =>
												void handleSave(false)
											}
											className="w-full py-3 rounded-xl border border-[#262626] text-[#fafafa] font-semibold hover:border-[#404040] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
										>
											{saving && !markingShipped
												? "Saving..."
												: "Save Tracking"}
										</button>
										<button
											type="button"
											disabled={
												saving || !hasTrackingNumber
											}
											onClick={() =>
												void handleSave(true)
											}
											className="w-full py-3 rounded-xl bg-[#22c55e] text-[#0a0a0a] font-semibold hover:bg-[#16a34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{saving && markingShipped
												? "Marking Shipped..."
												: "Mark as Shipped"}
										</button>
										{!hasTrackingNumber && (
											<p className="text-xs text-[#fca5a5]">
												Tracking number is required to
												mark as shipped.
											</p>
										)}
									</div>
									{order.status === "shipped" && (
										<p className="text-sm text-[#22c55e]">
											This order is marked as shipped.
										</p>
									)}
								</div>
							</div>
						</div>
					) : null}
				</div>
			</main>
			<Footer />
		</div>
	);
}
