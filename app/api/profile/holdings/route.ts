import { getAuthenticatedUser } from "@/lib/api-auth";
import { sanitizeRequestBody, sanitizeString } from "@/lib/input-sanitizer";
import { PortfolioHolding } from "@/models/PortfolioHolding";

function unauthorizedResponse() {
	return Response.json(
		{
			success: false,
			message: "Unauthorized",
		},
		{ status: 401 },
	);
}

function normalizeNumber(value: unknown) {
	const asNumber = Number(value);
	return Number.isFinite(asNumber) && asNumber >= 0 ? asNumber : 0;
}

function normalizeTransactionType(value: unknown): "buy" | "sell" {
	const normalized = String(value ?? "buy")
		.trim()
		.toLowerCase();
	return normalized === "sell" ? "sell" : "buy";
}

export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return unauthorizedResponse();
		}

		const holdings = await PortfolioHolding.find({ userId: user._id }).sort({ createdAt: 1 });

		return Response.json({
			success: true,
			items: holdings.map((holding) => ({
				id: holding._id.toString(),
				symbol: holding.symbol,
				company: holding.company,
				transactionType: holding.transactionType,
				shares: holding.shares,
				avgPrice: holding.avgPrice,
				currentPrice: holding.currentPrice,
			})),
		});
	} catch (error) {
		console.error("Holdings GET API error:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to fetch holdings.",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return unauthorizedResponse();
		}

		const rawBody = await request.json();
		const body = sanitizeRequestBody(rawBody) as Record<string, unknown>;

		const symbol = sanitizeString(String(body.symbol ?? ""), {
			trim: true,
			toLowerCase: false,
			maxLength: 20,
			allowedCharacters: /a-zA-Z0-9._-/,
		}).toUpperCase();

		const company = sanitizeString(String(body.company ?? ""), {
			trim: true,
			maxLength: 120,
		});

		if (!symbol || !company) {
			return Response.json(
				{ success: false, message: "Symbol and company are required." },
				{ status: 400 },
			);
		}

		const created = await PortfolioHolding.create({
			userId: user._id,
			symbol,
			company,
			transactionType: normalizeTransactionType(body.transactionType),
			shares: normalizeNumber(body.shares),
			avgPrice: normalizeNumber(body.avgPrice),
			currentPrice: normalizeNumber(body.currentPrice),
		});

		return Response.json(
			{
				success: true,
				item: {
					id: created._id.toString(),
					symbol: created.symbol,
					company: created.company,
					transactionType: created.transactionType,
					shares: created.shares,
					avgPrice: created.avgPrice,
					currentPrice: created.currentPrice,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Holdings POST API error:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to create holding.",
			},
			{ status: 500 },
		);
	}
}
