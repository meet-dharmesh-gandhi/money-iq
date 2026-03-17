"use client";

import Navbar from "@/components/Navbar";
import IpoSection from "@/components/dashboard/IpoSection";
import MutualFundsSection from "@/components/dashboard/MutualFundsSection";
import Sidebar from "@/components/dashboard/Sidebar";
import StocksSection from "@/components/dashboard/StocksSection";
import TabNavigation from "@/components/dashboard/TabNavigation";
import WatchlistManager from "@/components/dashboard/WatchlistManager";
import { useIPOData } from "../../hooks/useIPOData";
import { useMutualFunds } from "@/hooks/useMutualFunds";
import { usePageAwareWebSocket } from "@/hooks/usePageAwareWebSocket";
import { useStockData } from "@/hooks/useStockData";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { AuthUser } from "@/types/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [activeSection, setActiveSection] = useState("stocks"); // Default to stocks
	const [stockSearchQuery, setStockSearchQuery] = useState("");
	const [showWatchlistDialog, setShowWatchlistDialog] = useState(false);
	const [stocksCurrentPage, setStocksCurrentPage] = useState(0);
	const [ipoCurrentPage, setIpoCurrentPage] = useState(0);
	const [mfCurrentPage, setMfCurrentPage] = useState(0);
	const [mfSearchQuery, setMfSearchQuery] = useState("");

	// Custom hooks
	const {
		stocks,
		totalPages: stocksTotalPages,
		handleStockUpdate,
		handleHistoricalBatch,
	} = useStockData(stocksCurrentPage + 1, 6, stockSearchQuery);

	const {
		watchlist,
		watchlistStocks,
		availableStocks,
		availableForSelection,
		selectedStockForWatchlist,
		setSelectedStockForWatchlist,
		addToWatchlist,
		removeFromWatchlist,
	} = useWatchlist(stocks);
	const {
		ipos,
		totalPages: iposTotalPages,
		handleIpoUpdate,
		filter: ipoFilter,
		setFilter: setIpoFilter,
	} = useIPOData(ipoCurrentPage + 1, 6);

	const { mutualFunds, mfLoading, mfOffset, mfHasMore, loadMutualFunds } = useMutualFunds();

	// Calculate current page data for WebSocket subscriptions
	const paginatedStocks = useMemo(() => stocks, [stocks]);
	const paginatedIpos = useMemo(() => ipos, [ipos]);

	// Page-aware WebSocket hook
	usePageAwareWebSocket({
		activeSection: activeSection as "stocks" | "ipos" | "mutual-funds",
		paginatedStocks,
		onHistoricalBatch: handleHistoricalBatch,
		onStockUpdate: handleStockUpdate,
		paginatedIpos,
		onIpoUpdate: handleIpoUpdate,
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

	useEffect(() => {
		setStocksCurrentPage(0);
	}, [stockSearchQuery]);

	useEffect(() => {
		setIpoCurrentPage(0);
	}, [ipoFilter]);

	useEffect(() => {
		setMfCurrentPage(0);
	}, [mfSearchQuery]);

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
							paginatedStocks={paginatedStocks}
							totalPages={stocksTotalPages}
							stocksCurrentPage={stocksCurrentPage}
							setStocksCurrentPage={setStocksCurrentPage}
							searchQuery={stockSearchQuery}
							setSearchQuery={setStockSearchQuery}
						/>
					)}

					{activeSection === "ipos" && (
						<IpoSection
							paginatedIpos={paginatedIpos}
							totalPages={iposTotalPages}
							ipoCurrentPage={ipoCurrentPage}
							setIpoCurrentPage={setIpoCurrentPage}
							filter={ipoFilter}
							setFilter={setIpoFilter}
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
							searchQuery={mfSearchQuery}
							setSearchQuery={setMfSearchQuery}
						/>
					)}
				</section>

				{/* Right Sidebar - MoneyIQ Pulse + Fast Glance */}
				<Sidebar />
			</main>

			{/* Watchlist Dialog */}
			<WatchlistManager
				showWatchlistDialog={showWatchlistDialog}
				setShowWatchlistDialog={setShowWatchlistDialog}
				watchlist={watchlist}
				watchlistStocks={watchlistStocks}
				availableStocks={availableStocks}
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
