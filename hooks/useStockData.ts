import { useState, useCallback, useEffect } from "react";
import type { LiveStock } from "@/types/dashboard";
import type { StockUpdate, HistoricalBatch } from "@/types/websocket";
import type { scripMasterStocks } from "@/types/stocks/scripMaster";

type StocksListApiResponse = {
	status: "success" | "error";
	totalPages: number;
	availableStocks: scripMasterStocks[];
};

const getSeedFromText = (text: string) => {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
	}
	return hash;
};

const mapScripToLiveStock = (stock: scripMasterStocks): LiveStock => {
	const seed = getSeedFromText(stock.symbol || stock.token || stock.name);
	const basePrice = 100 + (seed % 4900);
	const percentChange = (seed % 1001) / 100 - 5;
	const points = Array.from({ length: 20 }, (_, idx) => {
		const wave = ((seed >> (idx % 8)) % 15) - 7;
		return Math.max(1, basePrice + wave * 2 + idx * 0.35);
	});

	return {
		symbol: stock.symbol,
		company: stock.name || stock.symbol,
		ltp: Number(basePrice.toFixed(2)),
		percentChange: Number(percentChange.toFixed(2)),
		points,
	};
};

export const useStockData = (currentPage: number, pageSize = 6, searchQuery = "") => {
	const [stocks, setStocks] = useState<LiveStock[]>([]);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
	const [totalPages, setTotalPages] = useState(1);

	useEffect(() => {
		let mounted = true;
		const apiPage = Math.max(currentPage - 1, 0);
		const normalizedQuery = searchQuery.trim();

		const fetchStocks = async () => {
			try {
				const params = new URLSearchParams({
					limit: String(pageSize),
					page: String(apiPage),
				});

				if (normalizedQuery) {
					params.set("q", normalizedQuery);
				}

				const response = await fetch(`/api/stocks/list?${params.toString()}`, {
					cache: "no-store",
				});
				if (!response.ok) {
					throw new Error(`Failed to load stocks list (${response.status})`);
				}

				const payload = (await response.json()) as StocksListApiResponse;
				if (!mounted || payload.status !== "success") {
					return;
				}

				setTotalPages(Math.max(1, payload.totalPages || 1));
				setStocks(payload.availableStocks.map(mapScripToLiveStock));
				setLastRefresh(new Date());
			} catch (error) {
				console.error("Failed to load stock list:", error);
			}
		};

		void fetchStocks();

		return () => {
			mounted = false;
		};
	}, [currentPage, pageSize, searchQuery]);

	// Handle real-time stock updates from WebSocket
	const handleStockUpdate = (update: StockUpdate[]) => {
		console.log("handleStockUpdate Running...");
		setStocks((prevStocks) => {
			return prevStocks.map((stock) => {
				console.log(`map: ${stock.symbol}, ${JSON.stringify(update)}`);
				const updatedPoint = update.findIndex((ele) => ele.symbol === stock.symbol);
				if (updatedPoint != -1) {
					// Update the stock with new price data
					console.log("point updated");
					const updatedPoints = [...stock.points.slice(-19), update[updatedPoint].ltp];
					return {
						...stock,
						ltp: update[updatedPoint].ltp,
						percentChange: update[updatedPoint].percentChange,
						points: updatedPoints,
					};
				}
				return stock;
			});
		});
		setLastRefresh(new Date());
	};

	// Handle historical price data batch from WebSocket
	const handleHistoricalBatch = useCallback((batch: HistoricalBatch) => {
		setStocks((prevStocks) => {
			return prevStocks.map((stock) => {
				if (stock.symbol === batch.symbol && batch.prices.length > 1) {
					// Replace points array with historical data for immediate sparkline population
					return {
						...stock,
						points: batch.prices.slice(-20), // Use last 20 points for sparklines
					};
				}
				return stock;
			});
		});
		console.log(`📈 Historical data loaded for ${batch.symbol}: ${batch.prices.length} points`);
	}, []);

	return {
		stocks,
		totalPages,
		lastRefresh,
		handleStockUpdate,
		handleHistoricalBatch,
	};
};
