export interface LiveShippingOption {
	id: string;
	label: string;
	description: string;
	amount: number;
	serviceCode: string;
}

interface AusPostService {
	code?: unknown;
	name?: unknown;
	price?: unknown;
}

interface QuoteInput {
	countryCode: string;
	toPostcode: string;
	weightKg?: number;
	lengthCm?: number;
	widthCm?: number;
	heightCm?: number;
}

export interface AddressSuggestion {
	id: string;
	label: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

const API_BASE = "https://digitalapi.auspost.com.au";

function getApiKey(): string {
	return String(process.env.AUSPOST_API_KEY ?? "").trim();
}

function toUpper(value: string): string {
	return String(value ?? "")
		.trim()
		.toUpperCase();
}

function toArray<T>(value: T | T[] | undefined): T[] {
	if (!value) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

function parseServiceRows(payload: unknown): AusPostService[] {
	if (typeof payload !== "object" || payload === null) {
		return [];
	}

	const asRecord = payload as Record<string, unknown>;
	const services = asRecord.services;
	if (typeof services !== "object" || services === null) {
		return [];
	}

	const serviceValue = (services as Record<string, unknown>).service;
	return toArray(
		serviceValue as AusPostService | AusPostService[] | undefined,
	);
}

function asAmount(value: unknown): number {
	const parsed = Number.parseFloat(String(value ?? "0"));
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeOption(service: AusPostService): LiveShippingOption | null {
	const serviceCode = String(service.code ?? "").trim();
	const serviceName = String(service.name ?? "").trim();
	if (!serviceCode || !serviceName) {
		return null;
	}

	const amount = asAmount(service.price);
	if (amount <= 0) {
		return null;
	}

	return {
		id: `auspost_${serviceCode.toLowerCase()}`,
		label: `Australia Post ${serviceName}`,
		description: "Live quoted shipping",
		amount,
		serviceCode,
	};
}

function filterPreferredOptions(
	countryCode: string,
	options: LiveShippingOption[],
): LiveShippingOption[] {
	const country = toUpper(countryCode);

	if (country === "AU") {
		const standard = options.find((option) =>
			option.serviceCode.includes("AUS_PARCEL_REGULAR"),
		);
		const express = options.find((option) =>
			option.serviceCode.includes("AUS_PARCEL_EXPRESS"),
		);
		return [standard, express].filter(
			(option): option is LiveShippingOption => Boolean(option),
		);
	}

	const standard = options.find((option) =>
		option.serviceCode.includes("INT_PARCEL_STD"),
	);
	const express = options.find((option) =>
		option.serviceCode.includes("INT_PARCEL_EXP"),
	);
	const courier = options.find((option) =>
		option.serviceCode.includes("INT_PARCEL_COR"),
	);
	const economy = options.find((option) =>
		option.serviceCode.includes("INT_PARCEL_AIR"),
	);

	const preferred = [standard, express, courier, economy].filter(
		(option): option is LiveShippingOption => Boolean(option),
	);
	return preferred.length > 0 ? preferred : options;
}

async function fetchAusPostJson(url: string): Promise<unknown> {
	const apiKey = getApiKey();
	if (!apiKey) {
		throw new Error("AUSPOST_API_KEY is not configured");
	}

	const response = await fetch(url, {
		headers: {
			"auth-key": apiKey,
			accept: "application/json",
		},
		cache: "no-store",
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(
			`AusPost request failed (${response.status}): ${errorBody.slice(0, 180)}`,
		);
	}

	return response.json();
}

export async function getAusPostShippingOptions(
	input: QuoteInput,
): Promise<LiveShippingOption[]> {
	const countryCode = toUpper(input.countryCode);
	const toPostcode = String(input.toPostcode ?? "").trim();

	if (!countryCode || !toPostcode) {
		return [];
	}

	const weightKg =
		input.weightKg ?? Number(process.env.AUSPOST_DEFAULT_WEIGHT_KG ?? 1);
	const lengthCm =
		input.lengthCm ?? Number(process.env.AUSPOST_DEFAULT_LENGTH_CM ?? 22);
	const widthCm =
		input.widthCm ?? Number(process.env.AUSPOST_DEFAULT_WIDTH_CM ?? 16);
	const heightCm =
		input.heightCm ?? Number(process.env.AUSPOST_DEFAULT_HEIGHT_CM ?? 7);

	let url = "";
	if (countryCode === "AU") {
		const fromPostcode = String(
			process.env.AUSPOST_FROM_POSTCODE ?? "",
		).trim();
		if (!fromPostcode) {
			throw new Error(
				"AUSPOST_FROM_POSTCODE is required for domestic quotes",
			);
		}

		const params = new URLSearchParams({
			from_postcode: fromPostcode,
			to_postcode: toPostcode,
			length: String(lengthCm),
			width: String(widthCm),
			height: String(heightCm),
			weight: String(weightKg),
		});
		url = `${API_BASE}/postage/parcel/domestic/service.json?${params.toString()}`;
	} else {
		const params = new URLSearchParams({
			country_code: countryCode,
			weight: String(weightKg),
		});
		url = `${API_BASE}/postage/parcel/international/service.json?${params.toString()}`;
	}

	const payload = await fetchAusPostJson(url);
	const allOptions = parseServiceRows(payload)
		.map((service) => normalizeOption(service))
		.filter((option): option is LiveShippingOption => Boolean(option));

	const filtered = filterPreferredOptions(countryCode, allOptions);
	const deduped = Array.from(
		filtered.reduce((accumulator, option) => {
			if (!accumulator.has(option.id)) {
				accumulator.set(option.id, option);
			}
			return accumulator;
		}, new Map<string, LiveShippingOption>()),
	).map(([, option]) => option);

	return deduped;
}

export async function searchAusPostDomesticPostcodes(
	query: string,
): Promise<AddressSuggestion[]> {
	const trimmed = String(query ?? "").trim();
	if (!trimmed || trimmed.length < 2) {
		return [];
	}

	const params = new URLSearchParams({ q: trimmed });
	const url = `${API_BASE}/postcode/search.json?${params.toString()}`;
	const payload = await fetchAusPostJson(url);

	if (typeof payload !== "object" || payload === null) {
		return [];
	}

	const localities = (payload as Record<string, unknown>).localities;
	if (typeof localities !== "object" || localities === null) {
		return [];
	}

	const localityRaw = (localities as Record<string, unknown>).locality;
	const rows = toArray(
		localityRaw as
			| Record<string, unknown>
			| Record<string, unknown>[]
			| undefined,
	);

	return rows
		.map((row) => {
			const city = String(row.location ?? "").trim();
			const state = String(row.state ?? "").trim();
			const postalCode = String(row.postcode ?? "").trim();
			if (!city || !state || !postalCode) {
				return null;
			}

			return {
				id: `${postalCode}-${city}-${state}`,
				label: `${city}, ${state} ${postalCode}`,
				city,
				state,
				postalCode,
				country: "AU",
			} satisfies AddressSuggestion;
		})
		.filter((row): row is AddressSuggestion => Boolean(row))
		.slice(0, 8);
}
