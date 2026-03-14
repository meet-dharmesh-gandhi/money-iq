import type { LiveStock } from "@/types/dashboard";

interface StocksSectionProps {
	stocks: LiveStock[];
	paginatedStocks: LiveStock[];
	lastRefreshLabel: string;
	stocksCurrentPage: number;
	setStocksCurrentPage: (page: number) => void;
}

const STOCKS_PER_PAGE = 6;

export default function StocksSection({
	stocks,
	paginatedStocks,
	lastRefreshLabel,
	stocksCurrentPage,
	setStocksCurrentPage,
}: StocksSectionProps) {
	const totalPages = Math.ceil(stocks.length / STOCKS_PER_PAGE);
	const stockEnd = stocksCurrentPage * STOCKS_PER_PAGE + STOCKS_PER_PAGE;

	return (
		<section className="space-y-6">
			<div className="flex items-end justify-between">
				<div>
					<h2 className="text-3xl font-bold text-slate-900">Live Stocks</h2>
				</div>
				<div className="text-right">
					<span className="text-xs text-slate-500">{lastRefreshLabel}</span>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				{paginatedStocks.map((stock) => {
					const high = Math.max(...stock.points);
					const low = Math.min(...stock.points);
					const range = high - low || 1;

					return (
						<div
							key={stock.symbol}
							className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
						>
							<div className="flex flex-col items-start justify-between">
								<p className="text-xs uppercase tracking-[0.3em] text-slate-400">
									{stock.symbol}
								</p>
								<p className="text-base font-semibold text-slate-900">
									{stock.company}
								</p>
								<div
									className={`${
										stock.percentChange >= 0
											? "text-emerald-600"
											: "text-rose-600"
									} text-sm font-semibold`}
								>
									{stock.percentChange >= 0 ? "+" : ""}
									{stock.percentChange.toFixed(2)}%
								</div>
							</div>
							<div className="mt-4 flex items-end justify-between">
								<p className="text-3xl font-semibold text-slate-900">
									₹{stock.ltp.toFixed(2)}
								</p>
							</div>
							<div className="mt-4 h-16 w-full overflow-hidden border rounded-lg bg-slate-50">
								<span className="sr-only">Sparkline placeholder</span>
								<svg viewBox="0 0 200 64" className="h-full w-full text-slate-300">
									<polyline
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										points={stock.points
											.map((point, idx) => {
												const x = (idx / (stock.points.length - 1)) * 200;
												const normalized = (point - low) / range;
												const y = 64 - normalized * 64;
												return `${x},${Number.isFinite(y) ? y : 32}`;
											})
											.join(" ")}
									/>
								</svg>
							</div>
							<div className="py-2"></div>
							<div className="text-right text-xs text-slate-500 flex justify-around">
								<p className="shadow-md rounded-full px-2 py-1">
									52W High {high.toFixed(0)}
								</p>
								<p className="shadow-md rounded-full px-2 py-1">
									52W Low {low.toFixed(0)}
								</p>
							</div>
						</div>
					);
				})}
			</div>

			{/* Pagination Controls */}
			<div className="flex items-center justify-center space-x-4">
				<button
					onClick={() => setStocksCurrentPage(Math.max(0, stocksCurrentPage - 1))}
					disabled={stocksCurrentPage === 0}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					Previous
				</button>
				<span className="text-sm text-slate-600">
					Page {stocksCurrentPage + 1} of {totalPages}
				</span>
				<button
					onClick={() =>
						setStocksCurrentPage(Math.min(totalPages - 1, stocksCurrentPage + 1))
					}
					disabled={stockEnd >= stocks.length}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					Next
				</button>
			</div>
		</section>
	);
}
