import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { postHogMiddleware } from "@posthog/next";

const posthog = postHogMiddleware({ proxy: true });

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

	return posthog(request);
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
