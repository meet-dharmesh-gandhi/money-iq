import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { encodeJWT } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password-utils";
import { User } from "@/models/User";
import type { AuthUser } from "@/types/auth";

type GoogleTokenResponse = {
	access_token?: string;
	id_token?: string;
	expires_in?: number;
	token_type?: string;
	scope?: string;
	error?: string;
	error_description?: string;
};

type GoogleProfile = {
	sub: string;
	email?: string;
	email_verified?: boolean;
	name?: string;
	given_name?: string;
	family_name?: string;
	picture?: string;
};

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

function createFailureRedirect(request: NextRequest, errorCode: string) {
	const failUrl = new URL("/auth/google/callback", getBaseUrl(request));
	failUrl.searchParams.set("error", errorCode);
	return NextResponse.redirect(failUrl);
}

function normalizeUsername(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "")
		.slice(0, 24);
}

async function createUniqueUsername(seed: string): Promise<string> {
	const base = normalizeUsername(seed) || `user_${randomBytes(4).toString("hex")}`;
	let candidate = base;
	let attempt = 1;

	while (await User.findOne({ username: candidate })) {
		candidate = `${base.slice(0, Math.max(3, 24 - String(attempt).length))}${attempt}`;
		attempt += 1;
	}

	return candidate;
}

export async function GET(request: NextRequest) {
	const errorParam = request.nextUrl.searchParams.get("error");
	if (errorParam) {
		return createFailureRedirect(request, errorParam);
	}

	const state = request.nextUrl.searchParams.get("state");
	const stateCookie = request.cookies.get("google_oauth_state")?.value;
	if (!state || !stateCookie || state !== stateCookie) {
		return createFailureRedirect(request, "invalid_state");
	}

	const code = request.nextUrl.searchParams.get("code");
	if (!code) {
		return createFailureRedirect(request, "missing_code");
	}

	const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
	if (!clientId || !clientSecret) {
		return createFailureRedirect(request, "google_not_configured");
	}

	const redirectUri =
		process.env.GOOGLE_REDIRECT_URI?.trim() ??
		`${getBaseUrl(request)}/api/auth/google/callback`;

	try {
		const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: "authorization_code",
			}),
		});

		const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
		if (!tokenResponse.ok || !tokenData.access_token) {
			console.error("Google token exchange failed", tokenData);
			return createFailureRedirect(request, "token_exchange_failed");
		}

		const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
			headers: { Authorization: `Bearer ${tokenData.access_token}` },
		});

		const profile = (await profileResponse.json()) as GoogleProfile;
		if (!profileResponse.ok || !profile.email || profile.email_verified === false) {
			console.error("Google profile lookup failed", profile);
			return createFailureRedirect(request, "profile_fetch_failed");
		}

		await connectToDatabase();

		const normalizedEmail = profile.email.toLowerCase();
		let userRecord = await User.findOne({ email: normalizedEmail });

		if (!userRecord) {
			const seedUsername = profile.email.split("@")[0] ?? profile.name ?? "user";
			const username = await createUniqueUsername(seedUsername);
			const generatedPassword = randomBytes(32).toString("hex");
			const hashedPassword = await hashPassword(generatedPassword);

			userRecord = await User.create({
				name: (profile.name ?? username).trim(),
				email: normalizedEmail,
				username,
				password: hashedPassword,
				role: "user",
				emailVerified: true,
			});
		}

		const authUser: AuthUser = {
			id: userRecord._id.toString(),
			username: userRecord.username,
			role: userRecord.role,
		};

		const token = encodeJWT(authUser);

		const successUrl = new URL("/auth/google/callback", getBaseUrl(request));
		successUrl.searchParams.set("token", token);
		successUrl.searchParams.set("user", JSON.stringify(authUser));

		const response = NextResponse.redirect(successUrl);
		response.cookies.delete("google_oauth_state");
		return response;
	} catch (error) {
		console.error("Google OAuth callback error", error);
		return createFailureRedirect(request, "oauth_callback_failed");
	}
}
