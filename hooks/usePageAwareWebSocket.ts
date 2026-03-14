import { useEffect, useMemo } from "react";
import { useWebSocket } from "./useWebSocket";
import type { LiveStock, IpoSummary } from "@/types/dashboard";
import type {
	StockUpdate,
	IpoUpdate,
	HistoricalBatch,
	WebSocketSubscription,
} from "@/types/websocket";

interface UsePageAwareWebSocketProps {
	activeSection: "stocks" | "ipos" | "mutual-funds";

	// For stocks section
	paginatedStocks?: LiveStock[];
	onStockUpdate?: (update: StockUpdate[]) => void;
	onHistoricalBatch?: (batch: HistoricalBatch) => void;

	// For IPOs section
	paginatedIpos?: IpoSummary[];
	onIpoUpdate?: (update: IpoUpdate) => void;

	// Error handling
	onError?: (error: Error) => void;
}

export const usePageAwareWebSocket = ({
	activeSection,
	paginatedStocks,
	onStockUpdate,
	onHistoricalBatch,
	paginatedIpos,
	onIpoUpdate,
	onError,
}: UsePageAwareWebSocketProps) => {
	const { status, subscribe, unsubscribe, currentSubscription } = useWebSocket({
		onStockUpdate,
		onIpoUpdate,
		onHistoricalBatch,
		onError,
	});

	// Calculate what subscription we need based on current page
	const requiredSubscription = useMemo((): WebSocketSubscription | null => {
		switch (activeSection) {
			case "stocks":
				if (paginatedStocks && paginatedStocks.length > 0) {
					return {
						section: "stocks",
						symbols: paginatedStocks.map((stock) => stock.symbol),
					};
				}
				break;

			case "ipos":
				if (paginatedIpos && paginatedIpos.length > 0) {
					return {
						section: "ipos",
						ipoIds: paginatedIpos.map((ipo) => ipo.name), // Using name as ID for now
					};
				}
				break;

			case "mutual-funds":
				// Just keepalive, no real subscription needed
				return {
					section: "mutual-funds",
				};
		}

		return null;
	}, [activeSection, paginatedStocks, paginatedIpos]);

	// Update subscription whenever requirements change
	useEffect(() => {
		if (!requiredSubscription) {
			unsubscribe();
			return;
		}

		// Check if current subscription matches required subscription
		const subscriptionChanged =
			!currentSubscription ||
			currentSubscription.section !== requiredSubscription.section ||
			JSON.stringify(currentSubscription.symbols) !==
				JSON.stringify(requiredSubscription.symbols) ||
			JSON.stringify(currentSubscription.ipoIds) !==
				JSON.stringify(requiredSubscription.ipoIds);

		if (subscriptionChanged) {
			subscribe(requiredSubscription);
		}
	}, [requiredSubscription, currentSubscription, subscribe, unsubscribe]);

	// Get visible symbols for debugging/status
	const visibleSymbols = useMemo(() => {
		switch (activeSection) {
			case "stocks":
				return paginatedStocks?.map((s) => s.symbol) || [];
			case "ipos":
				return paginatedIpos?.map((i) => i.name) || [];
			default:
				return [];
		}
	}, [activeSection, paginatedStocks, paginatedIpos]);

	const subscriptionInfo = useMemo(() => {
		if (!currentSubscription) {
			return `No subscription (${activeSection})`;
		}

		switch (currentSubscription.section) {
			case "stocks":
				return `Stocks: ${currentSubscription.symbols?.join(", ") || "none"}`;
			case "ipos":
				return `IPOs: ${currentSubscription.ipoIds?.join(", ") || "none"}`;
			case "mutual-funds":
				return "Mutual Funds: keepalive only";
			default:
				return "Unknown subscription";
		}
	}, [activeSection, currentSubscription]);

	return {
		status,
		visibleSymbols,
		subscriptionInfo,
		isSubscribedToCurrentPage:
			!!currentSubscription &&
			requiredSubscription &&
			currentSubscription.section === requiredSubscription.section,
	};
};
