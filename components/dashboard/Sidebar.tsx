import type { LiveStock } from "@/types/dashboard";

interface SidebarProps {
	watchlistStocks: LiveStock[];
	setShowWatchlistDialog: (show: boolean) => void;
}

export default function Sidebar({ watchlistStocks, setShowWatchlistDialog }: SidebarProps) {
	return (
		<aside className="lg:w-80">
			<div className="sticky top-5 space-y-6">
				{/* MoneyIQ Pulse Card */}
				<div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
					<p className="text-sm uppercase tracking-[0.2em] text-white/60">
						MoneyIQ Pulse
					</p>
					<h1 className="mt-3 text-3xl font-semibold">Market control center</h1>
					<p className="mt-2 text-sm text-white/70">
						Live feeds refresh every few seconds so you can react before the market
						does.
					</p>
				</div>

				{/* Fast Glance Section */}
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<h3 className="text-lg font-semibold text-slate-900">Fast glance</h3>
					<div className="mt-4 space-y-4">
						{watchlistStocks.slice(0, 3).map((stock) => (
							<div key={stock.symbol} className="flex items-center justify-between">
								<div>
									<p className="text-xs uppercase tracking-[0.3em] text-slate-400">
										{stock.symbol}
									</p>
									<p className="text-sm font-semibold text-slate-900">
										₹{stock.ltp.toFixed(2)}
									</p>
								</div>
								<span
									className={`${
										stock.percentChange >= 0
											? "text-emerald-600"
											: "text-rose-600"
									} text-sm font-semibold`}
								>
									{stock.percentChange >= 0 ? "+" : ""}
									{stock.percentChange.toFixed(2)}%
								</span>
							</div>
						))}
						{watchlistStocks.length === 0 && (
							<p className="text-sm text-slate-500 text-center py-4">
								No stocks in watchlist. Add some to get started!
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={() => setShowWatchlistDialog(true)}
						className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
					>
						Manage watchlist
					</button>
				</div>
			</div>
		</aside>
	);
}
