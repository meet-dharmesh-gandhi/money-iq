"use client";

import { useMemo, useState } from "react";

export default function SipCalculator() {
	const [amount, setAmount] = useState<number>(1000);
	const [years, setYears] = useState<number>(1);
	const [returnRate, setReturnRate] = useState<number>(12);
	const [amountInput, setAmountInput] = useState<string>(String(amount));
	const [returnRateInput, setReturnRateInput] = useState<string>(String(returnRate));
	const [yearsInput, setYearsInput] = useState<string>(String(years));

	const { maturityAmount, investedAmount, estimatedReturns } = useMemo(() => {
		const P = amount;
		const r = returnRate / 100;
		const n = years * 12;

		// The formula provided by user: Monthly Return = {(1 + Annual Return)^1/12} – 1
		const i = Math.pow(1 + r, 1 / 12) - 1;

		let M = 0;
		if (i > 0 && n > 0) {
			M = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
		} else if (n > 0) {
			M = P * n;
		}

		const invested = P * n;
		const estReturns = Math.max(0, M - invested);

		return {
			maturityAmount: Math.round(M),
			investedAmount: Math.round(invested),
			estimatedReturns: Math.round(estReturns),
		};
	}, [amount, years, returnRate]);

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat("en-IN", {
			style: "currency",
			currency: "INR",
			maximumFractionDigits: 0,
		}).format(val);
	};

	const clamp = (value: number, min: number, max: number) => {
		return Math.min(max, Math.max(min, value));
	};

	const snapToStep = (value: number, min: number, step: number) => {
		const snapped = Math.round((value - min) / step) * step + min;
		return Number(snapped.toFixed(2));
	};

	const commitAmount = (rawValue: string) => {
		const parsed = Number(rawValue);
		if (!Number.isFinite(parsed)) {
			setAmountInput(String(amount));
			return;
		}

		const normalized = clamp(snapToStep(parsed, 500, 500), 500, 100000);
		setAmount(normalized);
		setAmountInput(String(normalized));
	};

	const commitReturnRate = (rawValue: string) => {
		const parsed = Number(rawValue);
		if (!Number.isFinite(parsed)) {
			setReturnRateInput(String(returnRate));
			return;
		}

		const normalized = clamp(snapToStep(parsed, 1, 0.5), 1, 30);
		setReturnRate(normalized);
		setReturnRateInput(String(normalized));
	};

	const commitYears = (rawValue: string) => {
		const parsed = Number(rawValue);
		if (!Number.isFinite(parsed)) {
			setYearsInput(String(years));
			return;
		}

		const normalized = clamp(snapToStep(parsed, 1, 1), 1, 40);
		setYears(normalized);
		setYearsInput(String(normalized));
	};

	const handleEnterCommit = (
		e: React.KeyboardEvent<HTMLInputElement>,
		commitValue: (value: string) => void,
	) => {
		if (e.key !== "Enter") {
			return;
		}

		e.preventDefault();
		commitValue(e.currentTarget.value);
		e.currentTarget.blur();
	};

	return (
		<div className="mx-auto w-full max-w-6xl">
			<div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr]">
				<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
					<h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-slate-900">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
							1
						</div>
						SIP Inputs
					</h2>

					<div className="space-y-1">
						<div className="flex flex-col gap-3 border-b border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between">
							<label
								htmlFor="sip-monthly-investment"
								className="w-full text-sm font-medium text-slate-700 sm:w-1/2"
							>
								Monthly Investment
							</label>
							<div className="relative w-full sm:w-52">
								<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
									₹
								</span>
								<input
									id="sip-monthly-investment"
									type="number"
									min={500}
									max={100000}
									step={500}
									value={amountInput}
									onChange={(e) => setAmountInput(e.target.value)}
									onBlur={(e) => commitAmount(e.target.value)}
									onKeyDown={(e) => handleEnterCommit(e, commitAmount)}
									className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-3 text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
								/>
							</div>
						</div>

						<div className="flex flex-col gap-3 border-b border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between">
							<label
								htmlFor="sip-return-rate"
								className="w-full text-sm font-medium text-slate-700 sm:w-1/2"
							>
								Expected Return Rate
							</label>
							<div className="relative w-full sm:w-52">
								<input
									id="sip-return-rate"
									type="number"
									min={1}
									max={30}
									step={0.5}
									value={returnRateInput}
									onChange={(e) => setReturnRateInput(e.target.value)}
									onBlur={(e) => commitReturnRate(e.target.value)}
									onKeyDown={(e) => handleEnterCommit(e, commitReturnRate)}
									className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-12 text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
								/>
								<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
									% / yr
								</span>
							</div>
						</div>

						<div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
							<label
								htmlFor="sip-time-period"
								className="w-full text-sm font-medium text-slate-700 sm:w-1/2"
							>
								Time Period
							</label>
							<div className="relative w-full sm:w-52">
								<input
									id="sip-time-period"
									type="number"
									min={1}
									max={40}
									step={1}
									value={yearsInput}
									onChange={(e) => setYearsInput(e.target.value)}
									onBlur={(e) => commitYears(e.target.value)}
									onKeyDown={(e) => handleEnterCommit(e, commitYears)}
									className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-16 text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
								/>
								<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
									years
								</span>
							</div>
						</div>
					</div>
				</section>

				<div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-sm">
					<div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

					<div className="relative z-10 grid grid-rows-3 items-end gap-6 text-right">
						<div>
							<p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
								Invested Amount
							</p>
							<p className="text-2xl font-semibold tracking-tight">
								{formatCurrency(investedAmount)}
							</p>
						</div>

						<div>
							<p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
								Estimated Returns
							</p>
							<p className="text-2xl font-semibold tracking-tight text-emerald-400">
								{formatCurrency(estimatedReturns)}
							</p>
						</div>

						<div>
							<p className="mb-2 text-sm font-medium text-slate-300">Total Value</p>
							<p className="text-4xl font-bold tracking-tight text-white md:text-5xl">
								{formatCurrency(maturityAmount)}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
