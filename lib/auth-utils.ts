import { decodeJWT } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

export function useAuth() {
	// Client-side hook to check if user is logged in and get their data
	const getAuthUser = (): AuthUser | null => {
		if (typeof window === "undefined") return null;

		const userJson = localStorage.getItem("authUser");
		if (!userJson) return null;

		try {
			return JSON.parse(userJson) as AuthUser;
		} catch {
			return null;
		}
	};

	const getAuthToken = (): string | null => {
		if (typeof window === "undefined") return null;
		return localStorage.getItem("authToken");
	};

	const isLoggedIn = (): boolean => {
		const token = getAuthToken();
		const user = getAuthUser();
		return !!(token && user);
	};

	const logout = (): void => {
		if (typeof window === "undefined") return;
		localStorage.removeItem("authToken");
		localStorage.removeItem("authUser");
	};

	return {
		getAuthUser,
		getAuthToken,
		isLoggedIn,
		logout,
	};
}

// Server-side function to verify JWT token and get user
export function verifyJWT(token: string | null): AuthUser | null {
	if (!token) return null;

	const payload = decodeJWT(token);
	if (!payload) return null;

	return {
		id: payload.id,
		username: payload.username,
		role: payload.role,
	};
}

// Server-side function to extract token from headers
export function getTokenFromHeaders(headers: Headers): string | null {
	const authHeader = headers.get("authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
	return authHeader.slice(7);
}
