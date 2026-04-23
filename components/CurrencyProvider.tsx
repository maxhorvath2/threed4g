"use client";

import {
	createContext,
	useCallback,
	useContext,
	useState,
	useTransition,
} from "react";
import type { ExchangeRates, SupportedCurrency } from "@/lib/exchange-rates";
import { SUPPORTED_CURRENCIES, convertFromAUD } from "@/lib/exchange-rates";

interface CurrencyContextValue {
	currency: SupportedCurrency;
	rates: ExchangeRates;
	formatPrice: (audAmount: number) => string;
	setCurrency: (currency: SupportedCurrency) => void;
	isPending: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const CURRENCY_LOCALE: Record<SupportedCurrency, string> = {
	AUD: "en-AU",
	USD: "en-US",
	EUR: "de-DE",
	GBP: "en-GB",
	CAD: "en-CA",
	NZD: "en-NZ",
};

const COOKIE_NAME = "threed4g_display_currency";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function persistCurrency(currency: SupportedCurrency) {
	if (typeof document === "undefined") return;
	document.cookie = `${COOKIE_NAME}=${currency}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function CurrencyProvider({
	children,
	initialCurrency,
	initialRates,
}: {
	children: React.ReactNode;
	initialCurrency: SupportedCurrency;
	initialRates: ExchangeRates;
}) {
	const [currency, setCurrencyState] = useState<SupportedCurrency>(initialCurrency);
	const [rates] = useState<ExchangeRates>(initialRates);
	const [isPending, startTransition] = useTransition();

	const setCurrency = useCallback((next: SupportedCurrency) => {
		persistCurrency(next);
		startTransition(() => setCurrencyState(next));
	}, []);

	const formatPrice = useCallback(
		(audAmount: number): string => {
			const converted = convertFromAUD(audAmount, currency, rates);
			const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
				style: "currency",
				currency,
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(converted);
			return `${formatted} ${currency}`;
		},
		[currency, rates],
	);

	return (
		<CurrencyContext.Provider
			value={{ currency, rates, formatPrice, setCurrency, isPending }}
		>
			{children}
		</CurrencyContext.Provider>
	);
}

export function useCurrency(): CurrencyContextValue {
	const ctx = useContext(CurrencyContext);
	if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
	return ctx;
}

export { SUPPORTED_CURRENCIES };
