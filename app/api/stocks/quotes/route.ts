import { NextRequest, NextResponse } from "next/server";
import type { AngelOneQuoteResponse } from "@/types/stocks/api";
import {
	checkRateLimit,
	createRateLimitResponse,
	keyGenerators,
	rateLimitConfigs,
} from "@/lib/rate-limiter";

// Get Angel One configuration from server environment
const DEFAULT_API_URL = "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/";
const apiUrl = process.env.ANGELONE_API_URL ?? DEFAULT_API_URL;
const apiKey = process.env.ANGELONE_API_KEY;
const authToken = process.env.ANGELONE_AUTH_TOKEN;
const clientLocalIp = process.env.ANGELONE_CLIENT_LOCAL_IP;
const clientPublicIp = process.env.ANGELONE_CLIENT_PUBLIC_IP;
const macAddress = process.env.ANGELONE_MAC_ADDRESS;
const sourceId = process.env.ANGELONE_SOURCE_ID ?? "WEB";
const userType = process.env.ANGELONE_USER_TYPE ?? "USER";

export async function POST(request: NextRequest) {
	try {
		// Rate limiting
		const rateLimit = await checkRateLimit(request, {
			...rateLimitConfigs.api,
			keyGenerator: keyGenerators.byIP,
			message: "Too many stock price requests. Please try again later.",
		});

		if (!rateLimit.allowed) {
			return createRateLimitResponse(rateLimit);
		}

		// Check if Angel One is properly configured
		if (!apiKey || !authToken || !clientLocalIp || !clientPublicIp || !macAddress) {
			// Return error in production, fallback in development
			if (process.env.NODE_ENV === "production") {
				return NextResponse.json(
					{
						success: false,
						message: "Stock quotes service is not configured",
						error: "CONFIGURATION_ERROR",
					},
					{ status: 503 },
				);
			} else {
				// Development fallback
				return NextResponse.json(
					{
						success: false,
						message: "Angel One API not configured - use development fallback",
						error: "NO_CONFIGURATION",
						shouldUseFallback: true,
					},
					{ status: 503 },
				);
			}
		}

		// Parse request body
		const body = await request.json();
		const { exchange, tokens } = body;

		if (!exchange || !Array.isArray(tokens) || tokens.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message: "Invalid request: exchange and tokens array required",
				},
				{ status: 400 },
			);
		}

		// Make request to Angel One API
		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"X-PrivateKey": apiKey,
				"X-SourceID": `${sourceId}, ${sourceId}`,
				"X-ClientLocalIP": clientLocalIp,
				"X-ClientPublicIP": clientPublicIp,
				"X-MACAddress": macAddress,
				"X-UserType": userType,
				Authorization: `Bearer ${authToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				mode: "FULL",
				exchangeTokens: {
					[exchange]: tokens,
				},
			}),
		});

		if (!response.ok) {
			console.error("Angel One API error:", response.status, response.statusText);
			return NextResponse.json(
				{
					success: false,
					message: "Failed to fetch stock quotes",
					error: "API_ERROR",
				},
				{ status: 502 },
			);
		}

		const data = (await response.json()) as AngelOneQuoteResponse;

		// Validate response data
		if (!data.data?.fetched) {
			return NextResponse.json(
				{
					success: false,
					message: "No stock data received",
					error: "NO_DATA",
				},
				{ status: 502 },
			);
		}

		return NextResponse.json({
			success: true,
			data: data.data.fetched,
		});
	} catch (error) {
		console.error("Stock API proxy error:", error);

		return NextResponse.json(
			{
				success: false,
				message: "Internal server error while fetching stock quotes",
				error: "INTERNAL_ERROR",
			},
			{ status: 500 },
		);
	}
}
