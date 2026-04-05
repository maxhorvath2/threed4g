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
	shipping_name?: string;
	shipping_phone?: string | null;
	shipping_address_line1?: string;
	shipping_address_line2?: string | null;
	shipping_city?: string;
	shipping_state?: string;
	shipping_postal_code?: string;
	shipping_country?: string;
	tracking_number?: string | null;
	tracking_url?: string | null;
	shipped_at?: string | null;
	currency: string;
	subtotal: number;
	shipping_amount?: number;
	total_amount?: number;
	created_at: string;
	items: OrderItem[];
}

export interface OrderDetail extends OrderWithItems {
	total_amount: number;
	shipping_amount: number;
}
