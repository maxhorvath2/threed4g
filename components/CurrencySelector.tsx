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

// Desktop: native <select>
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

// Mobile: inline pill buttons — no native dropdown, no positioning issues
export function CurrencySelectorInline() {
	const { currency, setCurrency, isPending } = useCurrency();

	return (
		<div className="flex flex-wrap gap-2">
			{SUPPORTED_CURRENCIES.map((c) => (
				<button
					key={c}
					type="button"
					disabled={isPending}
					onClick={() => setCurrency(c)}
					className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
						currency === c
							? "bg-[#22c55e]/15 border border-[#22c55e]/50 text-[#22c55e]"
							: "border border-[#262626] text-[#737373] hover:border-[#22c55e]/30 hover:text-[#a3a3a3]"
					}`}
				>
					{CURRENCY_LABELS[c]}
				</button>
			))}
		</div>
	);
}
