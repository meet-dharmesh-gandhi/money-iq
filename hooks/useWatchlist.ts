import { useState, useCallback, useMemo, useEffect } from "react";
import type { LiveStock, AvailableStock } from "@/types/dashboard";

export const useWatchlist = (stocks: LiveStock[]) => {
	const [watchlist, setWatchlist] = useState<string[]>([]);
	const [selectedStockForWatchlist, setSelectedStockForWatchlist] = useState("");

	const availableStocks = useMemo<AvailableStock[]>(() => {
		return stocks.map((stock) => ({
			token: stock.symbol,
			symbol: stock.symbol,
			company: stock.company,
		}));
	}, [stocks]);

	useEffect(() => {
		if (watchlist.length === 0 && availableStocks.length > 0) {
			setWatchlist(availableStocks.slice(0, 3).map((stock) => stock.token));
		}
	}, [watchlist.length, availableStocks]);

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
		return stocks.filter((stock) => watchlist.includes(stock.symbol));
	}, [stocks, watchlist]);

	// Get available stocks for dropdown (excluding already selected)
	const availableForSelection = useMemo(() => {
		return availableStocks.filter((stock) => !watchlist.includes(stock.token));
	}, [availableStocks, watchlist]);

	return {
		watchlist,
		watchlistStocks,
		availableStocks,
		availableForSelection,
		selectedStockForWatchlist,
		setSelectedStockForWatchlist,
		addToWatchlist,
		removeFromWatchlist,
	};
};
