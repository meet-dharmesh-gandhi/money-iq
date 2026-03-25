"use client";

import { useMemo, useState } from "react";

export default function SipCalculator() {
	const [amount, setAmount] = useState<number>(1000);
	const [years, setYears] = useState<number>(1);
	const [returnRate, setReturnRate] = useState<number>(12);

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

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-5 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
			{/* Input Section */}
			<div className="lg:col-span-3 space-y-8">
				<div>
					<div className="flex justify-between items-center mb-4">
						<label className="text-sm font-medium text-slate-700">Monthly Investment</label>
						<div className="bg-slate-100 px-4 py-1.5 rounded-lg text-slate-900 font-semibold border border-slate-200">
							{formatCurrency(amount)}
						</div>
					</div>
					<input
						type="range"
						min="500"
						max="100000"
						step="500"
						value={amount}
						onChange={(e) => setAmount(Number(e.target.value))}
						className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
					/>
					<div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
						<span>₹500</span>
						<span>₹1,00,000</span>
					</div>
				</div>

				<div>
					<div className="flex justify-between items-center mb-4">
						<label className="text-sm font-medium text-slate-700">Expected Return Rate (p.a)</label>
						<div className="bg-slate-100 px-4 py-1.5 rounded-lg text-slate-900 font-semibold border border-slate-200">
							{returnRate}%
						</div>
					</div>
					<input
						type="range"
						min="1"
						max="30"
						step="0.5"
						value={returnRate}
						onChange={(e) => setReturnRate(Number(e.target.value))}
						className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
					/>
					<div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
						<span>1%</span>
						<span>30%</span>
					</div>
				</div>

				<div>
					<div className="flex justify-between items-center mb-4">
						<label className="text-sm font-medium text-slate-700">Time Period</label>
						<div className="bg-slate-100 px-4 py-1.5 rounded-lg text-slate-900 font-semibold border border-slate-200">
							{years} {years === 1 ? "Yr" : "Yrs"}
						</div>
					</div>
					<input
						type="range"
						min="1"
						max="40"
						step="1"
						value={years}
						onChange={(e) => setYears(Number(e.target.value))}
						className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
					/>
					<div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
						<span>1 Yr</span>
						<span>40 Yrs</span>
					</div>
				</div>
			</div>

			{/* Results Section */}
			<div className="lg:col-span-2 bg-slate-900 text-white rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden">
				{/* Decorative Background Elements */}
				<div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl point-events-none"></div>
				<div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl point-events-none"></div>
				
				<div className="space-y-8 relative z-10">
					<div>
						<p className="text-sm text-slate-400 font-medium mb-1">Invested Amount</p>
						<p className="text-2xl font-semibold tracking-tight">{formatCurrency(investedAmount)}</p>
					</div>
					
					<div>
						<p className="text-sm text-slate-400 font-medium mb-1">Est. Returns</p>
						<p className="text-2xl font-semibold tracking-tight text-emerald-400">{formatCurrency(estimatedReturns)}</p>
					</div>

					<div className="pt-6 border-t border-slate-800">
						<p className="text-base text-slate-300 font-medium mb-2">Total Value</p>
						<p className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
							{formatCurrency(maturityAmount)}
						</p>
					</div>

					<button className="w-full mt-6 bg-white text-slate-900 font-semibold py-3 rounded-xl transition hover:bg-slate-100 active:scale-95">
						Invest Now
					</button>
				</div>
			</div>
		</div>
	);
}
