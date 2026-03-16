"use client";

import { useEffect, useState } from "react";

type ExpertAdviceApiResponse = {
	advices?: string[];
};

export default function Sidebar() {
	const [advices, setAdvices] = useState<string[]>([]);
	const [isLoadingAdvices, setIsLoadingAdvices] = useState(true);

	useEffect(() => {
		let isMounted = true;

		const fetchTodayAdvices = async () => {
			try {
				const response = await fetch("/api/expert-advices/today", {
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error("Failed to fetch advices");
				}

				const payload = (await response.json()) as ExpertAdviceApiResponse;
				if (isMounted) {
					setAdvices(Array.isArray(payload.advices) ? payload.advices : []);
				}
			} catch (error) {
				console.error("Failed to load today advices:", error);
				if (isMounted) {
					setAdvices([]);
				}
			} finally {
				if (isMounted) {
					setIsLoadingAdvices(false);
				}
			}
		};

		void fetchTodayAdvices();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<aside className="lg:w-80">
			<div className="sticky top-5 space-y-6">
				{/* MoneyIQ Pulse Card */}
				<div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
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
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm gap-4 flex flex-col">
					<div className="flex flex-row justify-between">
						<h3 className="text-lg font-semibold text-slate-900">
							Today&apos;s Advice
						</h3>
						<a
							href="/advices"
							className="text-sm text-slate-900 underline flex flex-row gap-1.5 items-center"
						>
							<p className="w-fit shrink-0 grow">View All </p>
							<svg
								className="shrink-0 w-3.5 h-3.5"
								fill="#000000"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<g id="SVGRepo_bgCarrier" stroke-width="0"></g>
								<g
									id="SVGRepo_tracerCarrier"
									stroke-linecap="round"
									stroke-linejoin="round"
								></g>
								<g id="SVGRepo_iconCarrier">
									{" "}
									<path
										fill-rule="evenodd"
										d="M5,2 L7,2 C7.55228475,2 8,2.44771525 8,3 C8,3.51283584 7.61395981,3.93550716 7.11662113,3.99327227 L7,4 L5,4 C4.48716416,4 4.06449284,4.38604019 4.00672773,4.88337887 L4,5 L4,19 C4,19.5128358 4.38604019,19.9355072 4.88337887,19.9932723 L5,20 L19,20 C19.5128358,20 19.9355072,19.6139598 19.9932723,19.1166211 L20,19 L20,17 C20,16.4477153 20.4477153,16 21,16 C21.5128358,16 21.9355072,16.3860402 21.9932723,16.8833789 L22,17 L22,19 C22,20.5976809 20.75108,21.9036609 19.1762728,21.9949073 L19,22 L5,22 C3.40231912,22 2.09633912,20.75108 2.00509269,19.1762728 L2,19 L2,5 C2,3.40231912 3.24891996,2.09633912 4.82372721,2.00509269 L5,2 L7,2 L5,2 Z M21,2 L21.081,2.003 L21.2007258,2.02024007 L21.2007258,2.02024007 L21.3121425,2.04973809 L21.3121425,2.04973809 L21.4232215,2.09367336 L21.5207088,2.14599545 L21.5207088,2.14599545 L21.6167501,2.21278596 L21.7071068,2.29289322 L21.7071068,2.29289322 L21.8036654,2.40469339 L21.8036654,2.40469339 L21.8753288,2.5159379 L21.9063462,2.57690085 L21.9063462,2.57690085 L21.9401141,2.65834962 L21.9401141,2.65834962 L21.9641549,2.73400703 L21.9641549,2.73400703 L21.9930928,2.8819045 L21.9930928,2.8819045 L22,3 L22,3 L22,9 C22,9.55228475 21.5522847,10 21,10 C20.4477153,10 20,9.55228475 20,9 L20,5.414 L13.7071068,11.7071068 C13.3466228,12.0675907 12.7793918,12.0953203 12.3871006,11.7902954 L12.2928932,11.7071068 C11.9324093,11.3466228 11.9046797,10.7793918 12.2097046,10.3871006 L12.2928932,10.2928932 L18.584,4 L15,4 C14.4477153,4 14,3.55228475 14,3 C14,2.44771525 14.4477153,2 15,2 L21,2 Z"
									></path>{" "}
								</g>
							</svg>
							{/* <span>
							</span> */}
						</a>
					</div>
					<div className="flex flex-col gap-2">
						{isLoadingAdvices && (
							<p className="text-sm text-slate-500">
								Loading today&apos;s expert advice...
							</p>
						)}

						{!isLoadingAdvices && advices.length === 0 && (
							<p className="text-sm text-slate-500">
								No expert advice available for today.
							</p>
						)}

						{advices.map((advice, ind) => (
							<div
								key={`advice-${ind}`}
								className="rounded-sm bg-green-200 px-2 py-2 text-slate-900"
							>
								{advice}
							</div>
						))}
					</div>
				</div>
			</div>
		</aside>
	);
}
