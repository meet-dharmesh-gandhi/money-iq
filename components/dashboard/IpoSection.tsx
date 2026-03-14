import { useMemo } from "react";
import { ipoWatchlist } from "@/data/dashboardData";

interface IpoSectionProps {
	ipoCurrentPage: number;
	setIpoCurrentPage: (page: number) => void;
}

const IPOS_PER_PAGE = 6;

export default function IpoSection({ ipoCurrentPage, setIpoCurrentPage }: IpoSectionProps) {
	const paginatedIpos = useMemo(() => {
		const ipoStart = ipoCurrentPage * IPOS_PER_PAGE;
		const ipoEnd = ipoStart + IPOS_PER_PAGE;
		return ipoWatchlist.slice(ipoStart, ipoEnd);
	}, [ipoCurrentPage]);

	const totalPages = Math.ceil(ipoWatchlist.length / IPOS_PER_PAGE);
	const ipoEnd = ipoCurrentPage * IPOS_PER_PAGE + IPOS_PER_PAGE;

	return (
		<section className="space-y-6">
			<div className="flex items-end justify-between">
				<div>
					<h2 className="text-3xl font-bold text-slate-900">IPO Radar</h2>
				</div>
				<span className="text-xs text-slate-500">Lot size incl. retail</span>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{paginatedIpos.map((ipo) => (
					<div
						key={ipo.name}
						className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
					>
						<div className="flex items-start justify-between">
							<div>
								<h3 className="text-lg font-semibold text-slate-900">{ipo.name}</h3>
								<p className="text-sm text-slate-600">{ipo.priceBand}</p>
							</div>
							<span
								className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
									ipo.stage === "Open"
										? "bg-green-100 text-green-800"
										: ipo.stage === "Upcoming"
											? "bg-blue-100 text-blue-800"
											: "bg-gray-100 text-gray-800"
								}`}
							>
								{ipo.stage}
							</span>
						</div>
						<div className="mt-4 space-y-2">
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">Subscription:</span>
								<span className="text-sm font-semibold text-slate-900">
									{ipo.subscription ? `${ipo.subscription.toFixed(2)}x` : "-"}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">Lot Size:</span>
								<span className="text-sm font-semibold text-slate-900">
									{ipo.lotSize.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">Closes:</span>
								<span className="text-sm font-semibold text-slate-900">
									{ipo.closesOn}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Pagination Controls */}
			<div className="flex items-center justify-center space-x-4">
				<button
					onClick={() => setIpoCurrentPage(Math.max(0, ipoCurrentPage - 1))}
					disabled={ipoCurrentPage === 0}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					Previous
				</button>
				<span className="text-sm text-slate-600">
					Page {ipoCurrentPage + 1} of {totalPages}
				</span>
				<button
					onClick={() => setIpoCurrentPage(Math.min(totalPages - 1, ipoCurrentPage + 1))}
					disabled={ipoEnd >= ipoWatchlist.length}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					Next
				</button>
			</div>
		</section>
	);
}
