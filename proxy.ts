import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

	return NextResponse.next();
}

export const config = {
	matcher: ["/admin/:path*", "/login"],
};
