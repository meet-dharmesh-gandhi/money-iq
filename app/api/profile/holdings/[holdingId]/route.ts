import { getAuthenticatedUser } from "@/lib/api-auth";
import { sanitizeRequestBody, sanitizeString } from "@/lib/input-sanitizer";
import { PortfolioHolding } from "@/models/PortfolioHolding";
import mongoose from "mongoose";

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

export async function PATCH(request: Request, context: { params: Promise<{ holdingId: string }> }) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return unauthorizedResponse();
		}

		const { holdingId } = await context.params;
		if (!mongoose.Types.ObjectId.isValid(holdingId)) {
			return Response.json(
				{ success: false, message: "Invalid holding ID." },
				{ status: 400 },
			);
		}

		const rawBody = await request.json();
		const body = sanitizeRequestBody(rawBody) as Record<string, unknown>;

		const updates: Record<string, string | number> = {};

		if (typeof body.symbol === "string") {
			updates.symbol = sanitizeString(body.symbol, {
				trim: true,
				maxLength: 20,
				allowedCharacters: /a-zA-Z0-9._-/,
			}).toUpperCase();
		}

		if (typeof body.company === "string") {
			updates.company = sanitizeString(body.company, {
				trim: true,
				maxLength: 120,
			});
		}

		if (body.transactionType !== undefined) {
			updates.transactionType = normalizeTransactionType(body.transactionType);
		}

		if (body.shares !== undefined) {
			updates.shares = normalizeNumber(body.shares);
		}

		if (body.avgPrice !== undefined) {
			updates.avgPrice = normalizeNumber(body.avgPrice);
		}

		if (body.currentPrice !== undefined) {
			updates.currentPrice = normalizeNumber(body.currentPrice);
		}

		const updated = await PortfolioHolding.findOneAndUpdate(
			{ _id: holdingId, userId: user._id },
			{ $set: updates },
			{ new: true },
		);

		if (!updated) {
			return Response.json(
				{ success: false, message: "Holding not found." },
				{ status: 404 },
			);
		}

		return Response.json({
			success: true,
			item: {
				id: updated._id.toString(),
				symbol: updated.symbol,
				company: updated.company,
				transactionType: updated.transactionType,
				shares: updated.shares,
				avgPrice: updated.avgPrice,
				currentPrice: updated.currentPrice,
			},
		});
	} catch (error) {
		console.error("Holdings PATCH API error:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to update holding.",
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: Request,
	context: { params: Promise<{ holdingId: string }> },
) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return unauthorizedResponse();
		}

		const { holdingId } = await context.params;
		if (!mongoose.Types.ObjectId.isValid(holdingId)) {
			return Response.json(
				{ success: false, message: "Invalid holding ID." },
				{ status: 400 },
			);
		}

		const deleted = await PortfolioHolding.findOneAndDelete({
			_id: holdingId,
			userId: user._id,
		});

		if (!deleted) {
			return Response.json(
				{ success: false, message: "Holding not found." },
				{ status: 404 },
			);
		}

		return Response.json({ success: true, message: "Holding deleted." });
	} catch (error) {
		console.error("Holdings DELETE API error:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to delete holding.",
			},
			{ status: 500 },
		);
	}
}
