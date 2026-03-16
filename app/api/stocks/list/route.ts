import { scripMasterStocks } from "@/types/stocks/scripMaster";
import { NextRequest, NextResponse } from "next/server";

const SCRIP_MASTER_URL =
	process.env.SCRIP_MASTER ||
	"https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";
let availableStocks: scripMasterStocks[] = [];
let lastRefreshAt = 0;
let refreshPromise: Promise<void> | null = null;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const refreshStocksIfNeeded = async () => {
	const now = Date.now();
	if (availableStocks.length > 0 && now - lastRefreshAt < REFRESH_INTERVAL_MS) {
		return;
	}

	if (refreshPromise) {
		await refreshPromise;
		return;
	}

	refreshPromise = (async () => {
		const response = await fetch(SCRIP_MASTER_URL, { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`Failed to fetch Scrip Master: ${response.status}`);
		}

		const data = (await response.json()) as scripMasterStocks[];
		if (!Array.isArray(data)) {
			throw new Error("Invalid Scrip Master payload");
		}

		availableStocks = data;
		lastRefreshAt = Date.now();
	})();

	try {
		await refreshPromise;
	} finally {
		refreshPromise = null;
	}
};

const parseNumberParam = (value: string | null, fallback: number) => {
	if (!value) {
		return fallback;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return fallback;
	}

	return Math.floor(parsed);
};

const parseSearchQuery = (value: string | null) => value?.trim().toLowerCase() || "";

export async function GET(request: NextRequest) {
	try {
		await refreshStocksIfNeeded();

		const { searchParams } = request.nextUrl;
		const requestedLimit = parseNumberParam(searchParams.get("limit"), 100);
		const limit = Math.min(Math.max(requestedLimit, 1), 500);
		const page = parseNumberParam(searchParams.get("page"), 0);
		const searchQuery = parseSearchQuery(searchParams.get("q"));
		const filteredStocks = searchQuery
			? availableStocks.filter((stock) => stock.name?.toLowerCase().includes(searchQuery))
			: availableStocks;
		const total = filteredStocks.length;
		const totalPages = Math.max(1, Math.ceil(total / limit));
		const safePage = Math.min(page, Math.max(0, totalPages - 1));
		const start = safePage * limit;

		return NextResponse.json({
			status: "success",
			page: safePage,
			limit,
			total,
			totalPages,
			availableStocks: filteredStocks.slice(start, start + limit),
		});
	} catch (error) {
		return NextResponse.json(
			{
				status: "error",
				message: error instanceof Error ? error.message : "Unable to load stocks list",
			},
			{ status: 500 },
		);
	}
}
