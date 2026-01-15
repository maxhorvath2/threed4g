import { cookies } from "next/headers";

const SESSION_COOKIE = "threed4g_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

export async function createSession(username: string): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE, username, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: SESSION_DURATION,
	});
}

export async function getSession(): Promise<string | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE);
	return session?.value || null;
}

export async function deleteSession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(SESSION_COOKIE);
}
