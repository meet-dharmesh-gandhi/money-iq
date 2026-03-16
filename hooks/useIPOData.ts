import { useState, useCallback, useEffect } from "react";
import type { IpoSummary } from "@/types/dashboard";
import type { IpoUpdate } from "@/types/websocket";
import type { scripMasterStocks } from "@/types/stocks/scripMaster";

type StocksListApiResponse = {
	status: "success" | "error";
	totalPages: number;
	availableStocks: scripMasterStocks[];
};

const ipoStages: IpoSummary["stage"][] = ["Open", "Upcoming", "Listing"];

const getSeedFromText = (text: string) => {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
	}
	return hash;
};

const mapScripToIpo = (stock: scripMasterStocks, index: number): IpoSummary => {
	const seed = getSeedFromText(stock.symbol || stock.token || stock.name);
	const floorPrice = 80 + (seed % 700);
	const ceilingPrice = floorPrice + 5 + (seed % 45);
	const lotSize = Math.max(1, Number.parseInt(stock.lotSize, 10) || 10 + (seed % 190));
	const closesOn = new Date(Date.now() + (index + 2) * 24 * 60 * 60 * 1000);

	return {
		name: stock.name || stock.symbol,
		stage: ipoStages[index % ipoStages.length],
		priceBand: `Rs. ${floorPrice} - Rs. ${ceilingPrice}`,
		subscription: 0,
		closesOn: closesOn.toLocaleDateString("en-IN", {
			month: "short",
			day: "2-digit",
		}),
		lotSize,
	};
};

export const useIPOData = (currentPage: number, pageSize = 6) => {
	const [ipos, setIpos] = useState<IpoSummary[]>([]);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
	const [totalPages, setTotalPages] = useState(1);

	useEffect(() => {
		let mounted = true;
		const apiPage = Math.max(currentPage - 1, 0);

		const fetchIpos = async () => {
			try {
				const response = await fetch(`/api/stocks/list?limit=${pageSize}&page=${apiPage}`, {
					cache: "no-store",
				});
				if (!response.ok) {
					throw new Error(`Failed to load IPO list (${response.status})`);
				}

				const payload = (await response.json()) as StocksListApiResponse;
				if (!mounted || payload.status !== "success") {
					return;
				}

				setTotalPages(Math.max(1, payload.totalPages || 1));
				setIpos(payload.availableStocks.map(mapScripToIpo));
				setLastRefresh(new Date());
			} catch (error) {
				console.error("Failed to load IPO list:", error);
			}
		};

		void fetchIpos();

		return () => {
			mounted = false;
		};
	}, [currentPage, pageSize]);

	// Handle real-time IPO subscription updates from WebSocket
	const handleIpoUpdate = useCallback((update: IpoUpdate) => {
		setIpos((prevIpos) => {
			return prevIpos.map((ipo) => {
				if (ipo.name === update.id) {
					return {
						...ipo,
						subscription: update.subscription,
					};
				}
				return ipo;
			});
		});
		setLastRefresh(new Date());
	}, []);

	const setIpoList = useCallback((nextIpos: IpoSummary[]) => {
		setIpos(nextIpos);
		setLastRefresh(new Date());
	}, []);

	return {
		ipos,
		totalPages,
		lastRefresh,
		handleIpoUpdate,
		setIpoList,
	};
};
