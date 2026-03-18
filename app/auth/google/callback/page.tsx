"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { AuthUser } from "@/types/auth";

const ERROR_MESSAGES: Record<string, string> = {
	access_denied: "Google sign-in was cancelled.",
	google_not_configured: "Google sign-in is not configured yet. Please try again later.",
	invalid_state: "Google sign-in could not be verified. Please try again.",
	missing_code: "Google did not return an authorization code.",
	token_exchange_failed: "Unable to verify your Google account.",
	profile_fetch_failed: "Unable to load your Google profile.",
	oauth_callback_failed: "Google sign-in failed unexpectedly.",
};

export default function GoogleCallbackPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const result = useMemo(() => {
		const errorCode = searchParams.get("error");
		if (errorCode) {
			return {
				mode: "error" as const,
				error: ERROR_MESSAGES[errorCode] ?? "Unable to sign in with Google.",
				token: null,
				user: null as AuthUser | null,
				code: null as string | null,
				state: null as string | null,
			};
		}

		const code = searchParams.get("code");
		const state = searchParams.get("state");
		if (code) {
			return {
				mode: "exchange" as const,
				error: "",
				token: null,
				user: null as AuthUser | null,
				code,
				state,
			};
		}

		const token = searchParams.get("token");
		const userRaw = searchParams.get("user");

		if (!token || !userRaw) {
			return {
				mode: "error" as const,
				error: "Invalid Google sign-in response. Please try again.",
				token: null,
				user: null as AuthUser | null,
				code: null as string | null,
				state: null as string | null,
			};
		}

		try {
			const user = JSON.parse(userRaw) as AuthUser;
			return {
				mode: "success" as const,
				error: "",
				token,
				user,
				code: null as string | null,
				state: null as string | null,
			};
		} catch {
			return {
				mode: "error" as const,
				error: "Could not complete sign-in. Please try again.",
				token: null,
				user: null as AuthUser | null,
				code: null as string | null,
				state: null as string | null,
			};
		}
	}, [searchParams]);

	useEffect(() => {
		if (result.mode === "exchange" && result.code) {
			const exchangeQuery = new URLSearchParams({ code: result.code });
			if (result.state) {
				exchangeQuery.set("state", result.state);
			}

			window.location.replace(`/api/auth/google/callback?${exchangeQuery.toString()}`);
			return;
		}

		if (result.mode !== "success" || !result.token || !result.user) {
			return;
		}

		localStorage.setItem("authToken", result.token);
		localStorage.setItem("authUser", JSON.stringify(result.user));
		router.replace("/dashboard");
	}, [result, router]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
			<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
				<h1 className="text-xl font-semibold text-slate-900">Google Sign-In</h1>
				{result.mode === "error" ? (
					<div className="mt-4 space-y-3">
						<p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
							{result.error}
						</p>
						<Link
							href="/login"
							className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
						>
							Back to login
						</Link>
					</div>
				) : (
					<p className="mt-4 text-sm text-slate-600">Completing sign-in...</p>
				)}
			</div>
		</div>
	);
}
