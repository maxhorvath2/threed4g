export interface OrderItem {
	id: number;
	order_id: number;
	product_id: number;
	variant_id: number;
	product_name: string;
	variant_name: string;
	unit_price: number;
	quantity: number;
	line_total: number;
	created_at: string;
}

export interface OrderWithItems {
	id: number;
	customer_name: string;
	customer_email: string;
	status: string;
	payment_status: string;
	stripe_payment_intent_id: string | null;
	currency: string;
	subtotal: number;
	created_at: string;
	items: OrderItem[];
}
