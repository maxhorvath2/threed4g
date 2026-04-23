const RATES_URL =
	"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aud.json";

// Fallback URL if the primary CDN is down
const RATES_URL_FALLBACK =
	"https://latest.currency-api.pages.dev/v1/currencies/aud.json";

export type ExchangeRates = Record<string, number>;

export const SUPPORTED_CURRENCIES = ["AUD", "USD", "EUR", "GBP", "CAD", "NZD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Country code → display currency
export const COUNTRY_CURRENCY: Record<string, SupportedCurrency> = {
	// North America
	US: "USD",
	CA: "CAD",
	// UK
	GB: "GBP",
	// Eurozone
	AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR",
	FR: "EUR", DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR",
	LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", NL: "EUR",
	PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
	// Pacific
	NZ: "NZD",
	// Default (AU and everywhere else) → AUD, handled by fallback
};

export async function getExchangeRates(): Promise<ExchangeRates> {
	try {
		const res = await fetch(RATES_URL, { next: { revalidate: 3600 } });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		return (data.aud ?? {}) as ExchangeRates;
	} catch {
		// Try fallback
		try {
			const res = await fetch(RATES_URL_FALLBACK, {
				next: { revalidate: 3600 },
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			return (data.aud ?? {}) as ExchangeRates;
		} catch {
			// Return identity rate so prices still display in AUD
			return { aud: 1 };
		}
	}
}

export function convertFromAUD(
	audAmount: number,
	currency: SupportedCurrency,
	rates: ExchangeRates,
): number {
	if (currency === "AUD") return audAmount;
	const rate = rates[currency.toLowerCase()];
	if (!rate) return audAmount;
	return audAmount * rate;
}
