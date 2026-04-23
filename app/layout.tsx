import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import { SmoothScrollProvider } from "@/components/animations/SmoothScroll";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartStockSync } from "@/components/cart/CartStockSync";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { getExchangeRates } from "@/lib/exchange-rates";
import type { SupportedCurrency } from "@/lib/exchange-rates";
import "./globals.css";
import { PostHogPageView, PostHogProvider } from "@posthog/next";

const spaceGrotesk = Space_Grotesk({
	variable: "--font-display",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
	variable: "--font-body",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "ThreeD420 | Premium 3D Printed Grow Accessories",
	description:
		"Precision-engineered 3D printed accessories for grow tents. Elevate your growing experience with innovative, high-quality products.",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();
	const currencyCookie = cookieStore.get("threed4g_display_currency")?.value;
	const initialCurrency: SupportedCurrency =
		(currencyCookie as SupportedCurrency) ?? "AUD";
	const initialRates = await getExchangeRates();

	return (
		<html lang="en" className="font-sans">
			<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
			<body
				className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}
			>
				<PostHogProvider clientOptions={{ api_host: "/ingest" }}>
					<CurrencyProvider
						initialCurrency={initialCurrency}
						initialRates={initialRates}
					>
						<SmoothScrollProvider>
							<PostHogPageView />
							{/* Grain overlay for premium texture */}
							<div className="grain" aria-hidden="true" />

							{children}

							{/* Cart drawer - portal renders here */}
							<CartStockSync />
							<CartDrawer />
						</SmoothScrollProvider>
					</CurrencyProvider>
					<Analytics />
				</PostHogProvider>
			</body>
		</html>
	);
}
