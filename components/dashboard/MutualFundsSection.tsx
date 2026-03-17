import { useEffect, useMemo, useState } from "react";
import type { MutualFundResponse } from "@/types/dashboard";

interface MutualFundsSectionProps {
	mutualFunds: MutualFundResponse[];
	mfLoading: boolean;
	mfHasMore: boolean;
	mfOffset: number;
	loadMutualFunds: (offset?: number, reset?: boolean) => Promise<void>;
	mfCurrentPage: number;
	setMfCurrentPage: (page: number) => void;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
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
	searchQuery,
	setSearchQuery,
}: MutualFundsSectionProps) {
	const [pageInput, setPageInput] = useState(String(mfCurrentPage + 1));

	const filteredMutualFunds = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();
		if (!normalizedQuery) {
			return mutualFunds;
		}

		return mutualFunds.filter((fund) => {
			return (
				fund.schemeName.toLowerCase().includes(normalizedQuery) ||
				fund.fundHouse.toLowerCase().includes(normalizedQuery) ||
				fund.category.toLowerCase().includes(normalizedQuery)
			);
		});
	}, [mutualFunds, searchQuery]);

	const safeTotalPages = Math.max(1, Math.ceil(filteredMutualFunds.length / MF_PER_PAGE));

	useEffect(() => {
		if (mfCurrentPage > safeTotalPages - 1) {
			setMfCurrentPage(Math.max(0, safeTotalPages - 1));
		}
	}, [mfCurrentPage, safeTotalPages, setMfCurrentPage]);

	useEffect(() => {
		setPageInput(String(mfCurrentPage + 1));
	}, [mfCurrentPage]);

	const commitPageInput = (rawValue: string) => {
		if (!rawValue) {
			setPageInput(String(mfCurrentPage + 1));
			return;
		}

		const nextPageNumber = Number(rawValue);
		if (Number.isNaN(nextPageNumber)) {
			setPageInput(String(mfCurrentPage + 1));
			return;
		}

		const clampedPage = Math.min(safeTotalPages, Math.max(1, nextPageNumber));
		setMfCurrentPage(clampedPage - 1);
		setPageInput(String(clampedPage));
	};

	const paginatedMutualFunds = useMemo(() => {
		const mfStart = mfCurrentPage * MF_PER_PAGE;
		const mfEnd = mfStart + MF_PER_PAGE;
		return filteredMutualFunds.slice(mfStart, mfEnd);
	}, [filteredMutualFunds, mfCurrentPage]);

	const mfEnd = mfCurrentPage * MF_PER_PAGE + MF_PER_PAGE;

	return (
		<section className="space-y-6">
			<div className="flex items-end justify-between">
				<div>
					<h2 className="text-3xl font-bold text-slate-900">Mutual Fund Watch</h2>
				</div>
				<div className="w-full max-w-sm">
					<input
						type="text"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder="Search funds, categories, house"
						className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
					/>
				</div>
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

			{paginatedMutualFunds.length === 0 && (
				<p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
					No mutual funds found for this search.
				</p>
			)}

			{/* Pagination Controls */}
			<div className="flex items-center justify-center space-x-4">
				<button
					onClick={() => setMfCurrentPage(Math.max(0, mfCurrentPage - 1))}
					disabled={mfCurrentPage === 0}
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
					<span>of {safeTotalPages}</span>
				</div>
				<button
					onClick={() => {
						const nextPage = mfCurrentPage + 1;
						const nextPageStart = nextPage * MF_PER_PAGE;

						// Load more data if needed
						if (
							nextPageStart >= filteredMutualFunds.length &&
							mfHasMore &&
							!mfLoading
						) {
							loadMutualFunds(mfOffset);
						}

						setMfCurrentPage(Math.min(safeTotalPages - 1, nextPage));
					}}
					disabled={mfEnd >= filteredMutualFunds.length && !mfHasMore}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					{mfLoading ? "Loading..." : "Next"}
				</button>
			</div>
		</section>
	);
}
