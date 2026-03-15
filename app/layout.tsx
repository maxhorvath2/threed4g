import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SmoothScrollProvider } from "@/components/animations/SmoothScroll";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartStockSync } from "@/components/cart/CartStockSync";
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
	title: "ThreeD4G | Premium 3D Printed Grow Accessories",
	description:
		"Precision-engineered 3D printed accessories for grow tents. Elevate your growing experience with innovative, high-quality products.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<link rel="shortcut icon" href="favicon.ico" type="image/x-icon" />
			<body
				className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}
			>
				<PostHogProvider
					clientOptions={{ api_host: "/ingest" }}
					bootstrapFlags
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
					<Analytics />
				</PostHogProvider>
			</body>
		</html>
	);
}
