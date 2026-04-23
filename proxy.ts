import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { postHogMiddleware } from "@posthog/next";
import { COUNTRY_CURRENCY } from "@/lib/exchange-rates";
import type { SupportedCurrency } from "@/lib/exchange-rates";

const posthog = postHogMiddleware({ proxy: true });

const DISPLAY_CURRENCY_COOKIE = "threed4g_display_currency";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function proxy(request: NextRequest) {
	// Check if accessing admin routes
	if (request.nextUrl.pathname.startsWith("/admin")) {
		const session = request.cookies.get("threed4g_session");
		if (!session) {
			return NextResponse.redirect(new URL("/login", request.url));
		}
	}

	// Redirect from /login if already authenticated
	if (request.nextUrl.pathname === "/login") {
		const session = request.cookies.get("threed4g_session");
		if (session) {
			return NextResponse.redirect(new URL("/admin", request.url));
		}
	}

	const response = posthog(request);

	// Auto-set display currency from IP country if not already chosen by the user
	if (!request.cookies.get(DISPLAY_CURRENCY_COOKIE)) {
		const country = request.headers.get("x-vercel-ip-country") ?? "";
		const currency: SupportedCurrency = COUNTRY_CURRENCY[country] ?? "AUD";
		const res = response instanceof NextResponse ? response : NextResponse.next();
		res.cookies.set(DISPLAY_CURRENCY_COOKIE, currency, {
			path: "/",
			maxAge: COOKIE_MAX_AGE,
			sameSite: "lax",
		});
		return res;
	}

	return response;
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
