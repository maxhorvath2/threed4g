// Link type (database row)
export interface Link {
	id: number;
	title: string;
	url: string;
	promo_code: string | null;
	description: string | null;
	sort_order: number;
	active: boolean;
	created_at?: string;
	updated_at?: string;
}

// Input types for creating/updating
export interface CreateLinkInput {
	title: string;
	url: string;
	promo_code?: string;
	description?: string;
	sort_order?: number;
	active?: boolean;
}

export interface UpdateLinkInput {
	title?: string;
	url?: string;
	promo_code?: string | null;
	description?: string | null;
	sort_order?: number;
	active?: boolean;
}
