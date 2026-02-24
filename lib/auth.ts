import { createHmac } from "crypto";
import type { JWTPayload } from "@/types/auth";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-key-change-in-production";
const TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

export function encodeJWT(payload: Omit<JWTPayload, "iat" | "exp">): string {
	const now = Math.floor(Date.now() / 1000);
	const jwtPayload: JWTPayload = {
		...payload,
		iat: now,
		exp: now + TOKEN_EXPIRY,
	};

	const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
	const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString("base64url");

	const signature = createHMAC(`${header}.${encodedPayload}`);

	return `${header}.${encodedPayload}.${signature}`;
}

export function decodeJWT(token: string): JWTPayload | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;

		const [header, encodedPayload, signature] = parts;

		// Verify signature
		const expectedSignature = createHMAC(`${header}.${encodedPayload}`);
		if (signature !== expectedSignature) return null;

		// Decode payload
		const payload = JSON.parse(
			Buffer.from(encodedPayload, "base64url").toString("utf8"),
		) as JWTPayload;

		// Check expiration
		if (payload.exp < Math.floor(Date.now() / 1000)) return null;

		return payload;
	} catch {
		return null;
	}
}

function createHMAC(message: string): string {
	return createHmac("sha256", JWT_SECRET).update(message).digest("base64url");
}
