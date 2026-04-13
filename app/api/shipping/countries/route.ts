import { NextResponse } from "next/server";

interface CountryOption {
	code: string;
	label: string;
}

const FALLBACK_COUNTRIES: CountryOption[] = [
	{ code: "AU", label: "Australia" },
	{ code: "NZ", label: "New Zealand" },
	{ code: "US", label: "United States" },
	{ code: "GB", label: "United Kingdom" },
	{ code: "CA", label: "Canada" },
];

export async function GET() {
	try {
		const response = await fetch(
			"https://restcountries.com/v3.1/all?fields=cca2,name",
			{
				cache: "force-cache",
				next: { revalidate: 86400 },
			},
		);

		if (!response.ok) {
			return NextResponse.json({ countries: FALLBACK_COUNTRIES });
		}

		const payload = (await response.json()) as Array<{
			cca2?: string;
			name?: { common?: string };
		}>;

		const countries = payload
			.map((country) => ({
				code: String(country.cca2 ?? "")
					.trim()
					.toUpperCase(),
				label: String(country.name?.common ?? "").trim(),
			}))
			.filter(
				(country) =>
					/^[A-Z]{2}$/.test(country.code) && country.label.length > 0,
			)
			.sort((a, b) => a.label.localeCompare(b.label));

		if (countries.length === 0) {
			return NextResponse.json({ countries: FALLBACK_COUNTRIES });
		}

		return NextResponse.json({ countries });
	} catch {
		return NextResponse.json({ countries: FALLBACK_COUNTRIES });
	}
}
