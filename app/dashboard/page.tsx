"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TabNavigation from "@/components/dashboard/TabNavigation";
import StocksSection from "@/components/dashboard/StocksSection";
import IpoSection from "@/components/dashboard/IpoSection";
import MutualFundsSection from "@/components/dashboard/MutualFundsSection";
import Sidebar from "@/components/dashboard/Sidebar";
import WatchlistManager from "@/components/dashboard/WatchlistManager";
import WebSocketStatus from "@/components/debug/WebSocketStatus";
import { useStockData } from "@/hooks/useStockData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useMutualFunds } from "@/hooks/useMutualFunds";
import { usePageAwareWebSocket } from "@/hooks/usePageAwareWebSocket";
import { ipoWatchlist } from "@/data/dashboardData";
import type { AuthUser } from "@/types/auth";

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [activeSection, setActiveSection] = useState("stocks"); // Default to stocks
	const [showWatchlistDialog, setShowWatchlistDialog] = useState(false);
	const [stocksCurrentPage, setStocksCurrentPage] = useState(0);
	const [ipoCurrentPage, setIpoCurrentPage] = useState(0);
	const [mfCurrentPage, setMfCurrentPage] = useState(0);

	// Custom hooks
	const { stocks, lastRefresh, handleStockUpdate, handleHistoricalBatch } = useStockData();

	const {
		watchlist,
		watchlistStocks,
		availableForSelection,
		selectedStockForWatchlist,
		setSelectedStockForWatchlist,
		addToWatchlist,
		removeFromWatchlist,
	} = useWatchlist(stocks);

	const { mutualFunds, mfLoading, mfOffset, mfHasMore, loadMutualFunds } = useMutualFunds();

	// Calculate current page data for WebSocket subscriptions
	const STOCKS_PER_PAGE = 6;
	const IPOS_PER_PAGE = 6;

	const paginatedStocks = useMemo(() => {
		const stockStart = stocksCurrentPage * STOCKS_PER_PAGE;
		const stockEnd = stockStart + STOCKS_PER_PAGE;
		return stocks.slice(stockStart, stockEnd);
	}, [stocks, stocksCurrentPage]);

	const paginatedIpos = useMemo(() => {
		const ipoStart = ipoCurrentPage * IPOS_PER_PAGE;
		const ipoEnd = ipoStart + IPOS_PER_PAGE;
		return ipoWatchlist.slice(ipoStart, ipoEnd);
	}, [ipoCurrentPage]);

	// Page-aware WebSocket hook
	const { status: wsStatus } = usePageAwareWebSocket({
		activeSection: activeSection as "stocks" | "ipos" | "mutual-funds",
		paginatedStocks,
		onHistoricalBatch: handleHistoricalBatch,
		onStockUpdate: handleStockUpdate,
		paginatedIpos,
		onIpoUpdate: (update) => {
			console.log("IPO update:", update);
		},
		onError: (error) => {
			console.error("WebSocket error:", error);
		},
	});

	useEffect(() => {
		const stored = localStorage.getItem("authUser");
		if (!stored) {
			router.push("/login");
			return;
		}

		try {
			const authUser = JSON.parse(stored) as AuthUser;
			setUser(authUser);
		} catch {
			router.push("/login");
		} finally {
			setIsLoading(false);
		}
	}, [router]);

	const handleLogout = useCallback(() => {
		localStorage.removeItem("authToken");
		localStorage.removeItem("authUser");
		router.push("/");
	}, [router]);

	const switchSection = useCallback((sectionId: string) => {
		setActiveSection(sectionId);
	}, []);

	const lastRefreshLabel = useMemo(() => {
		if (!lastRefresh) {
			return "Loading...";
		}

		const timeStr = lastRefresh.toLocaleTimeString("en-IN", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});

		// Show WebSocket status
		if (wsStatus === "connected") {
			return `Live via WebSocket ${timeStr}`;
		}
		if (wsStatus === "connecting") {
			return `Connecting... ${timeStr}`;
		}
		if (wsStatus === "error") {
			return `Connection error ${timeStr}`;
		}

		return `Updated ${timeStr}`;
	}, [lastRefresh, wsStatus]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<p className="text-slate-600">Loading dashboard...</p>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<Navbar
				variant="solid"
				actions={[
					{
						type: "label",
						label: `Welcome, ${user.username}`,
						className: "text-sm text-slate-600",
					},
					{
						type: "button",
						label: "Logout",
						onClick: handleLogout,
					},
				]}
			/>

			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row">
				{/* Main Content Area */}
				<section className="flex-1 space-y-8">
					{/* Horizontal Navigation Tabs */}
					<TabNavigation activeSection={activeSection} switchSection={switchSection} />

					{/* Active Section Content */}
					{activeSection === "stocks" && (
						<StocksSection
							stocks={stocks}
							paginatedStocks={paginatedStocks}
							lastRefreshLabel={lastRefreshLabel}
							stocksCurrentPage={stocksCurrentPage}
							setStocksCurrentPage={setStocksCurrentPage}
						/>
					)}

					{activeSection === "ipos" && (
						<IpoSection
							ipoCurrentPage={ipoCurrentPage}
							setIpoCurrentPage={setIpoCurrentPage}
						/>
					)}

					{activeSection === "mutual-funds" && (
						<MutualFundsSection
							mutualFunds={mutualFunds}
							mfLoading={mfLoading}
							mfHasMore={mfHasMore}
							mfOffset={mfOffset}
							loadMutualFunds={loadMutualFunds}
							mfCurrentPage={mfCurrentPage}
							setMfCurrentPage={setMfCurrentPage}
						/>
					)}
				</section>

				{/* Right Sidebar - MoneyIQ Pulse + Fast Glance */}
				<Sidebar
					watchlistStocks={watchlistStocks}
					setShowWatchlistDialog={setShowWatchlistDialog}
				/>
			</main>

			{/* Watchlist Dialog */}
			<WatchlistManager
				showWatchlistDialog={showWatchlistDialog}
				setShowWatchlistDialog={setShowWatchlistDialog}
				watchlist={watchlist}
				watchlistStocks={watchlistStocks}
				availableForSelection={availableForSelection}
				selectedStockForWatchlist={selectedStockForWatchlist}
				setSelectedStockForWatchlist={setSelectedStockForWatchlist}
				addToWatchlist={addToWatchlist}
				removeFromWatchlist={removeFromWatchlist}
			/>

			{/* WebSocket Status (Dev Only) */}
			{/* <WebSocketStatus status={wsStatus} subscriptionInfo={subscriptionInfo} /> */}
		</div>
	);
}
