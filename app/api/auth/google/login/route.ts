import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function getBaseUrl(request: NextRequest): string {
	const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
	if (configured) {
		return configured.replace(/\/$/, "");
	}

	const forwardedProto = request.headers.get("x-forwarded-proto");
	const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

	if (forwardedHost) {
		return `${forwardedProto ?? "https"}://${forwardedHost}`;
	}

	return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
	const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
	if (!clientId) {
		const failUrl = new URL("/auth/google/callback", getBaseUrl(request));
		failUrl.searchParams.set("error", "google_not_configured");
		return NextResponse.redirect(failUrl);
	}

	const redirectUri =
		process.env.GOOGLE_REDIRECT_URI?.trim() ??
		`${getBaseUrl(request)}/api/auth/google/callback`;

	const state = randomUUID();

	const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
	authUrl.searchParams.set("client_id", clientId);
	authUrl.searchParams.set("redirect_uri", redirectUri);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("scope", "openid email profile");
	authUrl.searchParams.set("prompt", "select_account");
	authUrl.searchParams.set("state", state);

	const response = NextResponse.redirect(authUrl);
	response.cookies.set("google_oauth_state", state, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 10 * 60,
	});

	return response;
}
