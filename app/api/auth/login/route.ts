import { loginUser } from "@/lib/user-auth";
import type { LoginRequest } from "@/types/auth";
import {
	checkRateLimit,
	createRateLimitResponse,
	keyGenerators,
	rateLimitConfigs,
} from "@/lib/rate-limiter";
import { sanitizeRequestBody, validators } from "@/lib/input-sanitizer";

export async function POST(request: Request) {
	try {
		// Parse and sanitize request body
		const rawBody = await request.json();
		const body = sanitizeRequestBody(rawBody) as LoginRequest;

		// Validate required fields
		if (!body.username || !body.password) {
			return Response.json(
				{
					success: false,
					message: "Username and password are required.",
				},
				{ status: 400 },
			);
		}

		// Rate limiting by IP
		const ipRateLimit = await checkRateLimit(request, {
			...rateLimitConfigs.auth,
			keyGenerator: keyGenerators.byIP,
			message: "Too many login attempts from this IP. Please try again later.",
		});

		if (!ipRateLimit.allowed) {
			return createRateLimitResponse(ipRateLimit);
		}

		// Rate limiting by username
		const userRateLimit = await checkRateLimit(request, {
			...rateLimitConfigs.auth,
			keyGenerator: keyGenerators.byUsername(body.username),
			message: "Too many login attempts for this account. Please try again later.",
		});

		if (!userRateLimit.allowed) {
			return createRateLimitResponse(userRateLimit);
		}

		// Validate input format
		if (!validators.username(body.username)) {
			return Response.json(
				{
					success: false,
					message: "Invalid username format.",
				},
				{ status: 400 },
			);
		}

		const result = await loginUser(body);

		return Response.json(result, {
			status: result.success ? 200 : 401,
		});
	} catch (error) {
		console.error("Login API error:", error);
		return Response.json(
			{
				success: false,
				message: "An error occurred during login.",
			},
			{ status: 500 },
		);
	}
}
