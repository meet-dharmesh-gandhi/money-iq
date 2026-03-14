import { createHmac, randomBytes } from "crypto";
import type { JWTPayload } from "@/types/auth";

// Generate a strong development fallback secret that changes on each restart
const generateDevSecret = () => {
	return `dev-${randomBytes(32).toString("hex")}-${Date.now()}`;
};

const JWT_SECRET =
	process.env.JWT_SECRET ??
	(process.env.NODE_ENV === "production"
		? (() => {
				throw new Error("JWT_SECRET environment variable is required in production");
			})()
		: generateDevSecret());

const TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

// Warn in development if using fallback secret
if (process.env.NODE_ENV === "development" && !process.env.JWT_SECRET) {
	console.warn(
		"⚠️  Using auto-generated JWT secret in development. Set JWT_SECRET environment variable for production.",
	);
}

// Ensure production has secure secret
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
	throw new Error("JWT_SECRET environment variable is required in production for security");
}

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
