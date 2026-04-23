"use client";

import {
	useCurrency,
	SUPPORTED_CURRENCIES,
} from "@/components/CurrencyProvider";
import type { SupportedCurrency } from "@/lib/exchange-rates";

const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
	AUD: "AUD $",
	USD: "USD $",
	EUR: "EUR €",
	GBP: "GBP £",
	CAD: "CAD $",
	NZD: "NZD $",
};

export function CurrencySelector({ className }: { className?: string }) {
	const { currency, setCurrency, isPending } = useCurrency();

	return (
		<select
			value={currency}
			onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
			disabled={isPending}
			aria-label="Select display currency"
			className={`bg-transparent border border-[#262626] hover:border-[#22c55e]/50 text-[#a3a3a3] hover:text-[#fafafa] text-xs rounded-lg px-2 py-1 cursor-pointer transition-colors focus:outline-none focus:border-[#22c55e]/50 disabled:opacity-50 ${className ?? ""}`}
		>
			{SUPPORTED_CURRENCIES.map((c) => (
				<option
					key={c}
					value={c}
					className="bg-[#0a0a0a] text-[#fafafa]"
				>
					{CURRENCY_LABELS[c]}
				</option>
			))}
		</select>
	);
}
