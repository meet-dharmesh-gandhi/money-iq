import { useMemo } from "react";
import type { MutualFundResponse } from "@/types/dashboard";

interface MutualFundsSectionProps {
	mutualFunds: MutualFundResponse[];
	mfLoading: boolean;
	mfHasMore: boolean;
	mfOffset: number;
	loadMutualFunds: (offset?: number, reset?: boolean) => Promise<void>;
	mfCurrentPage: number;
	setMfCurrentPage: (page: number) => void;
}

const MF_PER_PAGE = 6;

export default function MutualFundsSection({
	mutualFunds,
	mfLoading,
	mfHasMore,
	mfOffset,
	loadMutualFunds,
	mfCurrentPage,
	setMfCurrentPage,
}: MutualFundsSectionProps) {
	const paginatedMutualFunds = useMemo(() => {
		const mfStart = mfCurrentPage * MF_PER_PAGE;
		const mfEnd = mfStart + MF_PER_PAGE;
		return mutualFunds.slice(mfStart, mfEnd);
	}, [mutualFunds, mfCurrentPage]);

	const totalPages = Math.ceil(mutualFunds.length / MF_PER_PAGE);
	const mfEnd = mfCurrentPage * MF_PER_PAGE + MF_PER_PAGE;

	return (
		<section className="space-y-6">
			<div className="flex items-end justify-between">
				<div>
					<h2 className="text-3xl font-bold text-slate-900">Mutual Fund Watch</h2>
				</div>
				<span className="text-xs text-slate-500">NAV in ₹</span>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{paginatedMutualFunds.map((fund) => (
					<div
						key={fund.schemeCode}
						className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
					>
						<div className="flex flex-col items-start justify-between">
							<p className="text-base font-semibold text-slate-900">
								{fund.schemeName}
							</p>
							<p className="text-xs text-slate-500">{fund.category}</p>
							<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								{fund.fundHouse.substring(0, 10)}
							</span>
						</div>
						<div className="mt-4 flex items-end justify-between">
							<div>
								<p className="text-sm text-slate-500">NAV</p>
								<p className="text-2xl font-semibold text-slate-900">
									₹{fund.nav.toFixed(2)}
								</p>
							</div>
						</div>
						<div className="py-2"></div>
						<div className="text-sm flex-col flex gap-2 text-slate-600">
							<p className="text-xs border shadow-md rounded-full px-2 py-1 w-fit">
								{fund.date}
							</p>
							<p className="text-xs border shadow-md rounded-full px-2 py-1 w-fit">
								{fund.type}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* Pagination Controls */}
			<div className="flex items-center justify-center space-x-4">
				<button
					onClick={() => setMfCurrentPage(Math.max(0, mfCurrentPage - 1))}
					disabled={mfCurrentPage === 0}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					Previous
				</button>
				<span className="text-sm text-slate-600">
					Page {mfCurrentPage + 1} of {totalPages}
				</span>
				<button
					onClick={() => {
						const nextPage = mfCurrentPage + 1;
						const nextPageStart = nextPage * MF_PER_PAGE;

						// Load more data if needed
						if (nextPageStart >= mutualFunds.length && mfHasMore && !mfLoading) {
							loadMutualFunds(mfOffset);
						}

						setMfCurrentPage(nextPage);
					}}
					disabled={mfEnd >= mutualFunds.length && !mfHasMore}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					{mfLoading ? "Loading..." : "Next"}
				</button>
			</div>
		</section>
	);
}
