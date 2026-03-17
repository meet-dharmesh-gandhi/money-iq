import type { IpoSummary } from "@/types/dashboard";
import type { IpoFilter } from "@/hooks/useIPOData";
import { useEffect, useState } from "react";

interface IpoSectionProps {
	paginatedIpos: IpoSummary[];
	totalPages: number;
	ipoCurrentPage: number;
	setIpoCurrentPage: (page: number) => void;
	filter: IpoFilter;
	setFilter: (filter: IpoFilter) => void;
}

export default function IpoSection({
	paginatedIpos,
	totalPages,
	ipoCurrentPage,
	setIpoCurrentPage,
	filter,
	setFilter,
}: IpoSectionProps) {
	const safeTotalPages = Math.max(1, totalPages);
	const [pageInput, setPageInput] = useState(String(ipoCurrentPage + 1));

	useEffect(() => {
		setPageInput(String(ipoCurrentPage + 1));
	}, [ipoCurrentPage]);

	const commitPageInput = (rawValue: string) => {
		if (!rawValue) {
			setPageInput(String(ipoCurrentPage + 1));
			return;
		}

		const nextPageNumber = Number(rawValue);
		if (Number.isNaN(nextPageNumber)) {
			setPageInput(String(ipoCurrentPage + 1));
			return;
		}

		const clampedPage = Math.min(safeTotalPages, Math.max(1, nextPageNumber));
		setIpoCurrentPage(clampedPage - 1);
		setPageInput(String(clampedPage));
	};

	return (
		<section className="space-y-6">
			<div className="flex items-end justify-between">
				<div>
					<h2 className="text-3xl font-bold text-slate-900">IPO Radar</h2>
				</div>
				<div className="flex items-center gap-3">
					<select
						value={filter}
						onChange={(event) => setFilter(event.target.value as IpoFilter)}
						className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
					>
						<option value="all">All</option>
						<option value="current">Current</option>
						<option value="upcoming">Upcoming</option>
					</select>
					<span className="text-xs text-slate-500">Lot size incl. retail</span>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{paginatedIpos.map((ipo) => (
					<div
						key={ipo.id || ipo.name}
						className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
					>
						<div className="flex items-start justify-between">
							<div>
								<h3 className="text-lg font-semibold text-slate-900">{ipo.name}</h3>
								<p className="text-sm text-slate-600">{ipo.priceBand}</p>
								{ipo.sourceTag && (
									<span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
										{ipo.sourceTag}
									</span>
								)}
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
					onClick={() =>
						setIpoCurrentPage(Math.min(safeTotalPages - 1, ipoCurrentPage + 1))
					}
					disabled={ipoCurrentPage >= safeTotalPages - 1}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				>
					Next
				</button>
			</div>
		</section>
	);
}
