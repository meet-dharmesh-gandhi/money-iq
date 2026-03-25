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
		<div className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
			<div className="grid gap-6 lg:grid-cols-5 lg:items-stretch">
				<div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:col-span-3 md:p-6">
					<div>
						<label
							htmlFor="sip-monthly-investment"
							className="mb-2 block text-sm font-medium text-slate-700"
						>
							Monthly Investment (INR)
						</label>
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
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-slate-900 focus:outline-none"
						/>
						<p className="mt-2 text-xs text-slate-500">Range: 500 to 1,00,000</p>
					</div>

					<div>
						<label
							htmlFor="sip-return-rate"
							className="mb-2 block text-sm font-medium text-slate-700"
						>
							Expected Return Rate (% p.a.)
						</label>
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
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-slate-900 focus:outline-none"
						/>
						<p className="mt-2 text-xs text-slate-500">Range: 1% to 30%</p>
					</div>

					<div>
						<label
							htmlFor="sip-time-period"
							className="mb-2 block text-sm font-medium text-slate-700"
						>
							Time Period (Years)
						</label>
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
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-slate-900 focus:outline-none"
						/>
						<p className="mt-2 text-xs text-slate-500">Range: 1 year to 40 years</p>
					</div>
				</div>

				<div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white lg:col-span-2">
					<div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

					<div className="relative z-10 grid gap-6 grid-rows-3 items-end text-right">
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
