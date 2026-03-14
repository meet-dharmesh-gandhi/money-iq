/**
 * Rate limiting utilities for API endpoints
 */

import { getRedisClient } from "./redis";
import type { RedisClientType } from "redis";

// Redis client cache
let redisClient: RedisClientType | null = null;

const getRateLimitRedisClient = async (): Promise<RedisClientType> => {
	if (!redisClient) {
		try {
			redisClient = await getRedisClient();
		} catch (error) {
			console.warn("Redis not available for rate limiting:", error);
			// In development or when Redis is unavailable, we'll handle this gracefully
			throw error;
		}
	}
	return redisClient;
};

export interface RateLimitResult {
	allowed: boolean;
	remainingRequests: number;
	resetTime: number;
	retryAfter?: number;
}

export interface RateLimitOptions {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
	keyGenerator: (request: Request) => Promise<string> | string; // Function to generate rate limit key
	message?: string; // Custom error message
	skipSuccessfulRequests?: boolean; // Don't count successful requests
}

/**
 * Check if request is rate limited
 */
export async function checkRateLimit(
	request: Request,
	options: RateLimitOptions,
): Promise<RateLimitResult> {
	// In development mode, optionally disable rate limiting
	if (process.env.NODE_ENV === "development" && process.env.DISABLE_RATE_LIMITING === "true") {
		return {
			allowed: true,
			remainingRequests: options.maxRequests,
			resetTime: Date.now() + options.windowMs,
		};
	}

	try {
		const redis = await getRateLimitRedisClient();
		const key = await options.keyGenerator(request);
		const window = Math.floor(Date.now() / options.windowMs);
		const redisKey = `rate_limit:${key}:${window}`;

		// Get current count
		const currentCount = await redis.get(redisKey);
		const count = currentCount ? parseInt(currentCount, 10) : 0;

		if (count >= options.maxRequests) {
			const resetTime = (window + 1) * options.windowMs;
			return {
				allowed: false,
				remainingRequests: 0,
				resetTime,
				retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
			};
		}

		// Increment counter
		const newCount = count + 1;
		await redis.setEx(redisKey, Math.ceil(options.windowMs / 1000), newCount.toString());

		return {
			allowed: true,
			remainingRequests: options.maxRequests - newCount,
			resetTime: (window + 1) * options.windowMs,
		};
	} catch (error) {
		console.error("Rate limiting error:", error);
		// On error, allow the request through (fail open)
		return {
			allowed: true,
			remainingRequests: options.maxRequests,
			resetTime: Date.now() + options.windowMs,
		};
	}
}

/**
 * Create a rate limit response
 */
export function createRateLimitResponse(
	result: RateLimitResult,
	message = "Too many requests",
): Response {
	const headers = new Headers({
		"X-RateLimit-Limit": result.remainingRequests.toString(),
		"X-RateLimit-Remaining": "0",
		"X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
	});

	if (result.retryAfter) {
		headers.set("Retry-After", result.retryAfter.toString());
	}

	return Response.json(
		{
			success: false,
			message,
			error: "RATE_LIMITED",
		},
		{
			status: 429,
			headers,
		},
	);
}

/**
 * Common rate limit key generators
 */
export const keyGenerators = {
	// Rate limit by IP address
	byIP: (request: Request) => {
		const forwarded = request.headers.get("x-forwarded-for");
		const ip = forwarded
			? forwarded.split(",")[0]
			: request.headers.get("x-real-ip") || "unknown";
		return `ip:${ip}`;
	},

	// Rate limit by IP + User agent
	byIPAndUserAgent: (request: Request) => {
		const ip = keyGenerators.byIP(request);
		const userAgent = request.headers.get("user-agent") || "unknown";
		return `${ip}:ua:${userAgent}`;
	},

	// Rate limit by username (for login attempts)
	byUsername: (username: string) => (request: Request) => {
		return `user:${username.toLowerCase()}`;
	},

	// Rate limit by IP + username (for login attempts)
	byIPAndUsername: (username: string) => (request: Request) => {
		const ip = keyGenerators.byIP(request);
		return `${ip}:user:${username.toLowerCase()}`;
	},
};

/**
 * Common rate limit configurations
 */
export const rateLimitConfigs = {
	// Strict limits for authentication
	auth: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 5, // 5 attempts per 15 minutes
	},

	// More lenient for general API usage
	api: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 60, // 60 requests per minute
	},

	// Signup rate limiting
	signup: {
		windowMs: 60 * 60 * 1000, // 1 hour
		maxRequests: 3, // 3 signups per hour
	},
};
