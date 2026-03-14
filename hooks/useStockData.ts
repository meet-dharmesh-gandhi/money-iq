import { useState, useCallback } from "react";
import type { LiveStock } from "@/types/dashboard";
import type { StockUpdate, HistoricalBatch } from "@/types/websocket";
import { generateFallbackStocks } from "@/utils/stockUtils";

export const useStockData = () => {
	const [stocks, setStocks] = useState<LiveStock[]>(() => generateFallbackStocks());
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
		lastRefresh,
		handleStockUpdate,
		handleHistoricalBatch,
	};
};
