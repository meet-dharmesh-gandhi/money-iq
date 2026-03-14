import { signupUser } from "@/lib/user-signup";
import type { SignupRequest } from "@/lib/user-signup";
import {
	checkRateLimit,
	createRateLimitResponse,
	keyGenerators,
	rateLimitConfigs,
} from "@/lib/rate-limiter";
import { sanitizeRequestBody, validators } from "@/lib/input-sanitizer";

export async function POST(request: Request) {
	try {
		// Rate limiting for signup
		const signupRateLimit = await checkRateLimit(request, {
			...rateLimitConfigs.signup,
			keyGenerator: keyGenerators.byIP,
			message: "Too many signup attempts. Please try again later.",
		});

		if (!signupRateLimit.allowed) {
			return createRateLimitResponse(signupRateLimit);
		}

		// Parse and sanitize request body
		const rawBody = await request.json();
		const body = sanitizeRequestBody(rawBody) as SignupRequest;

		// Validate required fields
		if (
			!body.name ||
			!body.email ||
			!body.username ||
			!body.password ||
			!body.confirmPassword
		) {
			return Response.json(
				{
					success: false,
					message: "All fields are required.",
				},
				{ status: 400 },
			);
		}

		// Validate input formats
		if (!validators.email(body.email)) {
			return Response.json(
				{
					success: false,
					message: "Invalid email format.",
				},
				{ status: 400 },
			);
		}

		if (!validators.username(body.username)) {
			return Response.json(
				{
					success: false,
					message: "Invalid username format.",
				},
				{ status: 400 },
			);
		}

		if (!validators.name(body.name)) {
			return Response.json(
				{
					success: false,
					message: "Invalid name format.",
				},
				{ status: 400 },
			);
		}

		const result = await signupUser(body);

		return Response.json(result, {
			status: result.success ? 201 : result.requiresEmailVerification ? 202 : 400,
		});
	} catch (error) {
		console.error("Signup API error:", error);
		return Response.json(
			{
				success: false,
				message: "An error occurred during signup.",
			},
			{ status: 500 },
		);
	}
}
