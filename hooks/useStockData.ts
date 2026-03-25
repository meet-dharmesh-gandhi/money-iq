import { useState, useCallback, useEffect } from "react";
import type { LiveStock } from "@/types/dashboard";
import type { StockUpdate, HistoricalBatch } from "@/types/websocket";

const toComparableSymbol = (value: string) =>
	value.toUpperCase().replace(/\s+/g, "").replace(/-EQ$/i, "").replace(/\.NS$/i, "");

const createSeedPoints = (ltp: number) => {
	const basePrice = Number.isFinite(ltp) && ltp > 0 ? ltp : 1;
	const points = Array.from({ length: 20 }, (_, idx) => {
		const step = (idx - 19) * 0.0015;
		return Math.max(1, Number((basePrice * (1 + step)).toFixed(2)));
	});
	return points;
};

const mapUpdateToLiveStock = (stock: StockUpdate): LiveStock => {
	const ltp = Number.isFinite(stock.ltp) && stock.ltp > 0 ? stock.ltp : 1;

	return {
		symbol: stock.symbol,
		company: stock.tradingSymbol || stock.symbol,
		ltp: Number(ltp.toFixed(2)),
		percentChange: Number((stock.percentChange ?? 0).toFixed(2)),
		points: createSeedPoints(ltp),
	};
};

export const useStockData = (currentPage: number, pageSize = 6, searchQuery = "") => {
	const [allStocks, setAllStocks] = useState<LiveStock[]>([]);
	const [stocks, setStocks] = useState<LiveStock[]>([]);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
	const [totalPages, setTotalPages] = useState(1);

	useEffect(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();
		const filteredStocks = normalizedQuery
			? allStocks.filter(
					(stock) =>
						stock.symbol.toLowerCase().includes(normalizedQuery) ||
						stock.company.toLowerCase().includes(normalizedQuery),
				)
			: allStocks;

		const computedTotalPages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
		const pageIndex = Math.max(0, currentPage - 1);
		const safePageIndex = Math.min(pageIndex, computedTotalPages - 1);
		const start = safePageIndex * pageSize;

		setTotalPages(computedTotalPages);
		setStocks(filteredStocks.slice(start, start + pageSize));
	}, [allStocks, currentPage, pageSize, searchQuery]);

	// Handle real-time stock updates from WebSocket
	const handleStockUpdate = (update: StockUpdate[]) => {
		setAllStocks((prevStocks) => {
			const nextStocks = [...prevStocks];

			update.forEach((incoming) => {
				const incomingKey = toComparableSymbol(incoming.symbol);
				const index = nextStocks.findIndex(
					(stock) => toComparableSymbol(stock.symbol) === incomingKey,
				);

				if (index === -1) {
					nextStocks.push(mapUpdateToLiveStock(incoming));
					return;
				}

				const current = nextStocks[index];
				nextStocks[index] = {
					...current,
					ltp: incoming.ltp,
					percentChange: incoming.percentChange,
					company: current.company || incoming.tradingSymbol || incoming.symbol,
					points: [...current.points.slice(-19), incoming.ltp],
				};
			});

			return nextStocks;
		});
		setLastRefresh(new Date());
	};

	// Handle historical price data batch from WebSocket
	const handleHistoricalBatch = useCallback((batch: HistoricalBatch) => {
		setAllStocks((prevStocks) => {
			return prevStocks.map((stock) => {
				if (toComparableSymbol(stock.symbol) === toComparableSymbol(batch.symbol)) {
					// Replace points array with historical data for immediate sparkline population
					return {
						...stock,
						points: batch.prices.length > 0 ? batch.prices.slice(-20) : stock.points,
					};
				}
				return stock;
			});
		});
	}, []);

	return {
		stocks,
		totalPages,
		lastRefresh,
		handleStockUpdate,
		handleHistoricalBatch,
	};
};
