import type { LiveStock, AvailableStock } from "@/types/dashboard";

interface WatchlistManagerProps {
	showWatchlistDialog: boolean;
	setShowWatchlistDialog: (show: boolean) => void;
	watchlist: string[];
	watchlistStocks: LiveStock[];
	availableStocks: AvailableStock[];
	availableForSelection: AvailableStock[];
	selectedStockForWatchlist: string;
	setSelectedStockForWatchlist: (token: string) => void;
	addToWatchlist: (token: string) => void;
	removeFromWatchlist: (token: string) => void;
}

export default function WatchlistManager({
	showWatchlistDialog,
	setShowWatchlistDialog,
	watchlist,
	watchlistStocks,
	availableStocks,
	availableForSelection,
	selectedStockForWatchlist,
	setSelectedStockForWatchlist,
	addToWatchlist,
	removeFromWatchlist,
}: WatchlistManagerProps) {
	if (!showWatchlistDialog) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900">Manage Watchlist</h2>
					<button
						onClick={() => setShowWatchlistDialog(false)}
						className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
					>
						<svg
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="mt-4 space-y-4 text-black">
					{/* Add New Stock Section */}
					{watchlist.length < 3 && availableForSelection.length > 0 && (
						<div className="space-y-3">
							<p className="text-sm font-medium text-slate-700">
								Add Stock to Watchlist:
							</p>
							<div className="flex gap-2">
								<select
									value={selectedStockForWatchlist}
									onChange={(e) => setSelectedStockForWatchlist(e.target.value)}
									className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
								>
									<option value="">Select a stock...</option>
									{availableForSelection.map((stock) => (
										<option key={stock.token} value={stock.token}>
											{stock.symbol} - {stock.company}
										</option>
									))}
								</select>
								<button
									onClick={() =>
										selectedStockForWatchlist &&
										addToWatchlist(selectedStockForWatchlist)
									}
									disabled={!selectedStockForWatchlist}
									className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Add
								</button>
							</div>
						</div>
					)}

					{/* Watchlist Limit Message */}
					{watchlist.length >= 3 && (
						<div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
							<p className="text-sm text-blue-700">
								📊 Watchlist is full! Remove a stock to add new ones. (Max: 3
								stocks)
							</p>
						</div>
					)}

					{/* Current Watchlist */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium text-slate-700">Current Watchlist:</p>
							<span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
								{watchlist.length}/3
							</span>
						</div>

						{watchlist.length > 0 ? (
							<div className="space-y-2">
								{watchlist.map((token) => {
									const stockInfo = availableStocks.find(
										(s) => s.token === token,
									);
									const liveStock = watchlistStocks.find(
										(s) => s.symbol === stockInfo?.symbol,
									);

									return (
										<div
											key={token}
											className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-slate-50"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium text-slate-900">
														{stockInfo?.symbol || "Unknown"}
													</span>
													{liveStock && (
														<span className="text-sm font-semibold text-slate-700">
															₹{liveStock.ltp.toFixed(2)}
														</span>
													)}
												</div>
												<p className="text-xs text-slate-500 mt-1">
													{stockInfo?.company || "Unknown Company"}
												</p>
											</div>
											<button
												onClick={() => removeFromWatchlist(token)}
												className="ml-3 rounded-lg bg-red-100 p-2 text-red-600 transition hover:bg-red-200 hover:text-red-700"
												title="Remove from watchlist"
											>
												<svg
													className="h-4 w-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
													/>
												</svg>
											</button>
										</div>
									);
								})}
							</div>
						) : (
							<div className="text-center py-8">
								<p className="text-sm text-slate-500">Your watchlist is empty</p>
								<p className="text-xs text-slate-400 mt-1">
									Add up to 3 stocks to track them
								</p>
							</div>
						)}
					</div>

					<div className="flex gap-3 pt-6 border-t border-slate-200">
						<button
							onClick={() => {
								setSelectedStockForWatchlist("");
								setShowWatchlistDialog(false);
							}}
							className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
						>
							Close
						</button>
						<button
							onClick={() => {
								// Clear selection and close dialog
								setSelectedStockForWatchlist("");
								setShowWatchlistDialog(false);
							}}
							className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
						>
							Done
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
