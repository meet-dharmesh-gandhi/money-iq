import type { LiveStock } from "@/types/dashboard";
import { useEffect, useState } from "react";

interface StocksSectionProps {
	paginatedStocks: LiveStock[];
	totalPages: number;
	stocksCurrentPage: number;
	setStocksCurrentPage: (page: number) => void;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
}

export default function StocksSection({
	paginatedStocks,
	totalPages,
	stocksCurrentPage,
	setStocksCurrentPage,
	searchQuery,
	setSearchQuery,
}: StocksSectionProps) {
	const [pageInput, setPageInput] = useState(String(stocksCurrentPage + 1));

	useEffect(() => {
		setPageInput(String(stocksCurrentPage + 1));
	}, [stocksCurrentPage]);

	const commitPageInput = (rawValue: string) => {
		if (!rawValue) {
			setPageInput(String(stocksCurrentPage + 1));
			return;
		}

		const nextPageNumber = Number(rawValue);
		if (Number.isNaN(nextPageNumber)) {
			setPageInput(String(stocksCurrentPage + 1));
			return;
		}

		const clampedPage = Math.min(totalPages, Math.max(1, nextPageNumber));
		setStocksCurrentPage(clampedPage - 1);
		setPageInput(String(clampedPage));
	};

	return (
		<section className="space-y-6">
			<div className="flex items-end justify-between">
				<div>
					<h2 className="text-3xl font-bold text-slate-900">Live Stocks</h2>
				</div>
				<div className="w-full max-w-sm">
					<input
						type="text"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder="Search stock names"
						className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
					/>
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

			{paginatedStocks.length === 0 && (
				<p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
					No stocks found for this name.
				</p>
			)}

			{/* Pagination Controls */}
			<div className="flex items-center justify-center space-x-4">
				<button
					onClick={() => setStocksCurrentPage(Math.max(0, stocksCurrentPage - 1))}
					disabled={stocksCurrentPage === 0}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					Previous
				</button>
				<div className="flex items-center gap-2 text-sm text-slate-600">
					<span>Page</span>
					<input
						type="text"
						inputMode="numeric"
						value={pageInput}
						onChange={(event) => {
							const digitsOnly = event.target.value.replace(/\D/g, "");
							setPageInput(digitsOnly);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								commitPageInput(pageInput);
							}
						}}
						onBlur={() => commitPageInput(pageInput)}
						className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-sm text-slate-700 outline-none transition focus:border-slate-400"
					/>
					<span>of {totalPages}</span>
				</div>
				<button
					onClick={() =>
						setStocksCurrentPage(Math.min(totalPages - 1, stocksCurrentPage + 1))
					}
					disabled={stocksCurrentPage >= totalPages - 1}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					Next
				</button>
			</div>
		</section>
	);
}
