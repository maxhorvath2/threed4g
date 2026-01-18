import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SmoothScrollProvider } from "@/components/animations/SmoothScroll";
import { CartDrawer } from "@/components/cart/CartDrawer";
import "./globals.css";

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
				<SmoothScrollProvider>
					{/* Grain overlay for premium texture */}
					<div className="grain" aria-hidden="true" />

					{children}

					{/* Cart drawer - portal renders here */}
					<CartDrawer />
				</SmoothScrollProvider>
				<Analytics />
			</body>
		</html>
	);
}
