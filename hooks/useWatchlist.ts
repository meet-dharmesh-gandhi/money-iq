import { useState, useCallback, useMemo } from "react";
import type { LiveStock } from "@/types/dashboard";
import { availableStocks } from "@/utils/stockUtils";

export const useWatchlist = (stocks: LiveStock[]) => {
	const [watchlist, setWatchlist] = useState<string[]>(["99926000", "99926009", "99926037"]); // Default 3 stocks
	const [selectedStockForWatchlist, setSelectedStockForWatchlist] = useState("");

	// Watchlist management functions
	const addToWatchlist = useCallback(
		(stockToken: string) => {
			if (watchlist.length >= 3) {
				return; // Max 3 stocks allowed
			}
			if (!watchlist.includes(stockToken)) {
				setWatchlist((prev) => [...prev, stockToken]);
			}
			setSelectedStockForWatchlist("");
		},
		[watchlist],
	);

	const removeFromWatchlist = useCallback((stockToken: string) => {
		setWatchlist((prev) => prev.filter((token) => token !== stockToken));
	}, []);

	// Get watchlist stocks for display
	const watchlistStocks = useMemo(() => {
		return stocks.filter((stock) =>
			watchlist.some((token) => {
				const stockInfo = availableStocks.find((s) => s.token === token);
				return stockInfo && stock.symbol === stockInfo.symbol;
			}),
		);
	}, [stocks, watchlist]);

	// Get available stocks for dropdown (excluding already selected)
	const availableForSelection = useMemo(() => {
		return availableStocks.filter((stock) => !watchlist.includes(stock.token));
	}, [watchlist]);

	return {
		watchlist,
		watchlistStocks,
		availableForSelection,
		selectedStockForWatchlist,
		setSelectedStockForWatchlist,
		addToWatchlist,
		removeFromWatchlist,
	};
};
