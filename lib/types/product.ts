// Product image type
export interface ProductImage {
	id: number;
	product_id: number;
	image_url: string;
	alt_text: string | null;
	sort_order: number;
	is_primary: boolean;
}

// Product variant type
export interface ProductVariant {
	id: number;
	product_id: number;
	name: string;
	sku: string | null;
	price: number;
	sort_order: number;
	in_stock: boolean;
	stock_quantity: number;
}

// Base product (database row)
export interface Product {
	id: number;
	name: string;
	description: string | null;
	image_url: string;
	category: string | null;
	featured: boolean;
	price: number | null;
	parcel_size: string | null;
	created_at?: string;
	updated_at?: string;
}

// Extended product with relations
export interface ProductWithDetails extends Product {
	images: ProductImage[];
	variants: ProductVariant[];
}

// Cart item with variant info
export interface CartItem {
	id: string; // Composite key: "productId" or "productId-variantId"
	productId: number;
	variantId: number | null;
	variantName: string | null;
	name: string;
	price: number;
	image_url: string;
	quantity: number;
	maxQuantity: number | null;
}

// Input types for creating/updating
export interface CreateProductImageInput {
	image_url: string;
	alt_text?: string;
	is_primary?: boolean;
	sort_order?: number;
}

export interface CreateProductVariantInput {
	name: string;
	price: number;
	sku?: string;
	sort_order?: number;
	in_stock?: boolean;
	stock_quantity?: number;
}

export interface CreateProductInput {
	name: string;
	description?: string;
	category?: string;
	featured?: boolean;
	images: CreateProductImageInput[];
	variants: CreateProductVariantInput[];
}
