import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import {
	checkRateLimit,
	createRateLimitResponse,
	keyGenerators,
	rateLimitConfigs,
} from "@/lib/rate-limiter";

const MF_API_BASE = "https://api.mfapi.in/mf";
const CACHE_EXPIRY = 24 * 60 * 60; // 24 hours in seconds
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

interface MutualFundScheme {
	schemeCode: number;
	schemeName: string;
	isinGrowth?: string | null;
	isinDivReinvestment?: string | null;
}

interface MutualFundDetail {
	meta: {
		fund_house: string;
		scheme_type: string;
		scheme_category: string;
		scheme_code: number;
		scheme_name: string;
		isin_growth?: string | null;
		isin_div_reinvestment?: string | null;
	};
	data: Array<{
		date: string;
		nav: string;
	}>;
	status: string;
}

interface MutualFundResponse {
	schemeCode: number;
	schemeName: string;
	nav: number;
	date: string;
	fundHouse: string;
	category: string;
	type: string;
}

export async function GET(request: NextRequest) {
	try {
		// Rate limiting
		const rateLimit = await checkRateLimit(request, {
			...rateLimitConfigs.api,
			keyGenerator: keyGenerators.byIP,
			message: "Too many mutual fund requests. Please try again later.",
		});

		if (!rateLimit.allowed) {
			return createRateLimitResponse(rateLimit);
		}

		const searchParams = request.nextUrl.searchParams;
		const limit = parseInt(searchParams.get("limit") || DEFAULT_LIMIT.toString());
		const offset = parseInt(searchParams.get("offset") || DEFAULT_OFFSET.toString());

		// Validate parameters
		if (limit < 1 || limit > 100) {
			return NextResponse.json(
				{
					success: false,
					message: "Limit must be between 1 and 100",
				},
				{ status: 400 },
			);
		}

		if (offset < 0) {
			return NextResponse.json(
				{
					success: false,
					message: "Offset must be non-negative",
				},
				{ status: 400 },
			);
		}

		// Check cache first
		const cacheKey = `mf:list:${limit}:${offset}`;
		let cachedData: MutualFundResponse[] | null = null;

		try {
			const redis = await getRedisClient();
			const cached = await redis.get(cacheKey);
			if (cached) {
				cachedData = JSON.parse(cached);
			}
		} catch (error) {
			console.warn("Redis cache unavailable for mutual funds:", error);
			// Continue without cache
		}

		if (cachedData) {
			return NextResponse.json({
				success: true,
				data: cachedData,
				cached: true,
				pagination: {
					limit,
					offset,
					hasMore: cachedData.length === limit,
				},
			});
		}

		// Fetch from external API
		const listResponse = await fetch(`${MF_API_BASE}?limit=${limit}&offset=${offset}`);

		if (!listResponse.ok) {
			throw new Error(`Failed to fetch mutual fund list: ${listResponse.status}`);
		}

		const schemes: MutualFundScheme[] = await listResponse.json();

		if (!Array.isArray(schemes)) {
			throw new Error("Invalid response format from mutual fund API");
		}

		// Fetch details for each scheme (with some concurrency control)
		const detailPromises = schemes.slice(0, limit).map(async (scheme) => {
			try {
				// Check individual scheme cache first
				const schemeCacheKey = `mf:detail:${scheme.schemeCode}`;

				try {
					const redis = await getRedisClient();
					const cachedDetail = await redis.get(schemeCacheKey);
					if (cachedDetail) {
						return JSON.parse(cachedDetail) as MutualFundResponse;
					}
				} catch (error) {
					// Continue without cache
				}

				const detailResponse = await fetch(`${MF_API_BASE}/${scheme.schemeCode}/latest`);

				if (!detailResponse.ok) {
					console.warn(`Failed to fetch details for scheme ${scheme.schemeCode}`);
					return null;
				}

				const detail: MutualFundDetail = await detailResponse.json();

				if (detail.status !== "SUCCESS" || !detail.data || detail.data.length === 0) {
					console.warn(`No data for scheme ${scheme.schemeCode}`);
					return null;
				}

				const latestData = detail.data[0];
				const mutualFund: MutualFundResponse = {
					schemeCode: scheme.schemeCode,
					schemeName: scheme.schemeName,
					nav: parseFloat(latestData.nav),
					date: latestData.date,
					fundHouse: detail.meta.fund_house,
					category: detail.meta.scheme_category,
					type: detail.meta.scheme_type,
				};

				// Cache individual scheme
				try {
					const redis = await getRedisClient();
					await redis.setEx(schemeCacheKey, CACHE_EXPIRY, JSON.stringify(mutualFund));
				} catch (error) {
					// Continue without caching
				}

				return mutualFund;
			} catch (error) {
				console.error(`Error fetching scheme ${scheme.schemeCode}:`, error);
				return null;
			}
		});

		// Wait for all requests with timeout
		const results = await Promise.allSettled(detailPromises);
		const mutualFunds = results
			.filter(
				(result): result is PromiseFulfilledResult<MutualFundResponse> =>
					result.status === "fulfilled" && result.value !== null,
			)
			.map((result) => result.value);

		// Cache the final result
		try {
			const redis = await getRedisClient();
			await redis.setEx(cacheKey, CACHE_EXPIRY, JSON.stringify(mutualFunds));
		} catch (error) {
			// Continue without caching
		}

		return NextResponse.json({
			success: true,
			data: mutualFunds,
			cached: false,
			pagination: {
				limit,
				offset,
				hasMore: mutualFunds.length === limit,
			},
		});
	} catch (error) {
		console.error("Mutual fund API error:", error);

		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch mutual fund data",
				error: "INTERNAL_ERROR",
			},
			{ status: 500 },
		);
	}
}
