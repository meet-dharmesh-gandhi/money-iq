"use client";

import { useMemo, useState } from "react";

type InputRowProps = {
	label: string;
	value: number;
	onChange: (value: number) => void;
	suffix?: string;
	prefix?: string;
	min?: number;
	max?: number;
	step?: number;
};

function InputRow({
	label,
	value,
	onChange,
	suffix,
	prefix,
	min,
	max,
	step = 0.01,
}: InputRowProps) {
	const inputId = `retirement-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
	const [draftValue, setDraftValue] = useState<string>(String(value));

	const commitValue = () => {
		let parsedValue = Number(draftValue);

		if (Number.isNaN(parsedValue)) {
			parsedValue = min ?? value;
		}

		if (typeof min === "number") {
			parsedValue = Math.max(min, parsedValue);
		}

		if (typeof max === "number") {
			parsedValue = Math.min(max, parsedValue);
		}

		onChange(parsedValue);
		setDraftValue(String(parsedValue));
	};

	return (
		<div className="flex flex-col gap-3 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
			<label
				htmlFor={inputId}
				className="w-full cursor-pointer text-sm font-medium text-slate-700 sm:w-1/2"
			>
				{label}
			</label>
			<div className="relative w-full sm:w-52">
				{prefix && (
					<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
						{prefix}
					</span>
				)}
				<input
					id={inputId}
					type="number"
					inputMode="decimal"
					step={step}
					value={draftValue}
					onChange={(e) => setDraftValue(e.target.value)}
					onBlur={commitValue}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.currentTarget.blur();
						}

						if (e.key === "Escape") {
							setDraftValue(String(value));
							e.currentTarget.blur();
						}
					}}
					min={min}
					max={max}
					className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-14" : "pr-3"}`}
				/>
				{suffix && (
					<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
						{suffix}
					</span>
				)}
			</div>
		</div>
	);
}

export default function RetirementCalculator() {
	// Main Settings
	const [currentAge, setCurrentAge] = useState<number>(35);
	const [plannedRetirementAge, setPlannedRetirementAge] = useState<number>(67);
	const [lifeExpectancy, setLifeExpectancy] = useState<number>(85);
	const [currentIncome, setCurrentIncome] = useState<number>(70000);

	// Assumptions
	const [incomeIncreaseRate, setIncomeIncreaseRate] = useState<number>(3);
	const [incomeNeededPercent, setIncomeNeededPercent] = useState<number>(75);
	const [investmentReturnRate, setInvestmentReturnRate] = useState<number>(6);
	const [inflationRate, setInflationRate] = useState<number>(3);

	// Optional
	const [otherIncomeMonthly, setOtherIncomeMonthly] = useState<number>(0);
	const [currentSavings, setCurrentSavings] = useState<number>(30000);
	const [futureSavingsPercent, setFutureSavingsPercent] = useState<number>(10);

	const clamp = (value: number, min: number, max: number) => {
		return Math.min(max, Math.max(min, value));
	};

	const handleCurrentAgeChange = (value: number) => {
		const maxAllowedCurrentAge = Math.max(0, plannedRetirementAge - 1);
		const nextValue = Math.round(value);
		setCurrentAge(clamp(nextValue, 0, maxAllowedCurrentAge));
	};

	const handlePlannedRetirementAgeChange = (value: number) => {
		const minAllowedRetirementAge = currentAge + 1;
		const maxAllowedRetirementAge = Math.max(minAllowedRetirementAge, lifeExpectancy - 1);
		const nextValue = Math.round(value);
		setPlannedRetirementAge(clamp(nextValue, minAllowedRetirementAge, maxAllowedRetirementAge));
	};

	const handleLifeExpectancyChange = (value: number) => {
		const minAllowedLifeExpectancy = plannedRetirementAge + 1;
		const nextValue = Math.round(value);
		setLifeExpectancy(clamp(nextValue, minAllowedLifeExpectancy, 130));
	};

	const { balanceAtRetirement, ageDepleted, finalBalance, firstYearIncomeNeeded } =
		useMemo(() => {
			let balance = currentSavings;
			let salary = currentIncome;
			const yearsToRetire = Math.max(0, plannedRetirementAge - currentAge);
			const retirementYears = Math.max(0, lifeExpectancy - plannedRetirementAge);

			// Pre-retirement phase
			for (let i = 0; i < yearsToRetire; i++) {
				const annualContribution = salary * (futureSavingsPercent / 100);
				balance = balance * (1 + investmentReturnRate / 100) + annualContribution;
				salary = salary * (1 + incomeIncreaseRate / 100);
			}

			const neededFirstYear = salary * (incomeNeededPercent / 100);

			let incomeNeededToWithdraw = neededFirstYear - otherIncomeMonthly * 12;
			if (incomeNeededToWithdraw < 0) incomeNeededToWithdraw = 0;

			let depletedAge: number | null = null;
			let isSuccess = true;

			let postRetirementBalance = balance;

			// Post-retirement phase
			for (let i = 0; i < retirementYears; i++) {
				postRetirementBalance =
					postRetirementBalance * (1 + investmentReturnRate / 100) -
					incomeNeededToWithdraw;

				if (postRetirementBalance <= 0 && isSuccess) {
					isSuccess = false;
					depletedAge = plannedRetirementAge + i;
					postRetirementBalance = 0;
				}

				incomeNeededToWithdraw = incomeNeededToWithdraw * (1 + inflationRate / 100);
			}

			return {
				balanceAtRetirement: balance,
				ageDepleted: depletedAge,
				finalBalance: postRetirementBalance,
				firstYearIncomeNeeded: neededFirstYear,
			};
		}, [
			currentAge,
			plannedRetirementAge,
			lifeExpectancy,
			currentIncome,
			incomeIncreaseRate,
			incomeNeededPercent,
			investmentReturnRate,
			inflationRate,
			otherIncomeMonthly,
			currentSavings,
			futureSavingsPercent,
		]);

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("en-IN", {
			style: "currency",
			currency: "INR",
			maximumFractionDigits: 0,
		}).format(value);
	};

	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
			<div className="text-center space-y-4">
				<h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
					How much do you need to retire?
				</h1>
				<p className="mx-auto max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
					This advanced calculator helps you plan the financial aspects of your
					retirement, giving you an idea of where you stand in terms of savings, your
					target, and what your retrievals will look like.
				</p>
			</div>

			<div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr]">
				<div className="space-y-6">
					{/* Section 1 */}
					<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
						<h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
								1
							</div>
							Basic Details
						</h2>
						<div className="space-y-1">
							<InputRow
								key={`current-age-${currentAge}`}
								label="Your current age"
								value={currentAge}
								onChange={handleCurrentAgeChange}
								min={0}
								max={Math.max(0, plannedRetirementAge - 1)}
								step={1}
							/>
							<InputRow
								key={`planned-retirement-age-${plannedRetirementAge}`}
								label="Your planned retirement age"
								value={plannedRetirementAge}
								onChange={handlePlannedRetirementAgeChange}
								min={currentAge + 1}
								max={Math.max(currentAge + 1, lifeExpectancy - 1)}
								step={1}
							/>
							<InputRow
								key={`life-expectancy-${lifeExpectancy}`}
								label="Your life expectancy"
								value={lifeExpectancy}
								onChange={handleLifeExpectancyChange}
								min={plannedRetirementAge + 1}
								max={130}
								step={1}
							/>
							<InputRow
								key={`current-income-${currentIncome}`}
								label="Your current pre-tax income"
								value={currentIncome}
								onChange={setCurrentIncome}
								prefix="₹"
								suffix="/ year"
								min={0}
							/>
						</div>
					</section>

					{/* Section 2 */}
					<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
						<h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
								2
							</div>
							Assumptions
						</h2>
						<div className="space-y-1">
							<InputRow
								key={`income-increase-rate-${incomeIncreaseRate}`}
								label="Your current income increase"
								value={incomeIncreaseRate}
								onChange={setIncomeIncreaseRate}
								suffix="% / yr"
								min={0}
							/>
							<InputRow
								key={`income-needed-percent-${incomeNeededPercent}`}
								label="Income needed after retirement"
								value={incomeNeededPercent}
								onChange={setIncomeNeededPercent}
								suffix="% of inc"
								min={0}
							/>
							<InputRow
								key={`investment-return-rate-${investmentReturnRate}`}
								label="Average investment return"
								value={investmentReturnRate}
								onChange={setInvestmentReturnRate}
								suffix="% / yr"
							/>
							<InputRow
								key={`inflation-rate-${inflationRate}`}
								label="Inflation rate"
								value={inflationRate}
								onChange={setInflationRate}
								suffix="% / yr"
								min={0}
							/>
						</div>
					</section>

					{/* Section 3 */}
					<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
						<h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
								3
							</div>
							Optional Details
						</h2>
						<div className="space-y-1">
							<InputRow
								key={`other-income-monthly-${otherIncomeMonthly}`}
								label="Other income after retirement (Social Security, etc.)"
								value={otherIncomeMonthly}
								onChange={setOtherIncomeMonthly}
								prefix="₹"
								suffix="/ mo"
								min={0}
							/>
							<InputRow
								key={`current-savings-${currentSavings}`}
								label="Your current retirement savings"
								value={currentSavings}
								onChange={setCurrentSavings}
								prefix="₹"
								min={0}
							/>
							<InputRow
								key={`future-savings-percent-${futureSavingsPercent}`}
								label="Future retirement savings"
								value={futureSavingsPercent}
								onChange={setFutureSavingsPercent}
								suffix="% of inc"
								min={0}
							/>
						</div>
					</section>
				</div>

				<aside className="sticky top-24 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-sm">
					<div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

					<div className="relative z-10">
						<div>
							<h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
								Portfolio at Retirement
							</h2>
							<div className="mb-2 text-4xl font-semibold tracking-tight text-white">
								{formatCurrency(balanceAtRetirement)}
							</div>
							<p className="text-sm text-slate-300">At age {plannedRetirementAge}</p>
						</div>

						<div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/70 p-5">
							<span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">
								Status Overview
							</span>
							{ageDepleted ? (
								<p className="text-lg font-semibold text-rose-300">
									Depletes at age {ageDepleted}
								</p>
							) : (
								<p className="text-lg font-semibold text-emerald-300">
									Lasts through life expectancy
								</p>
							)}

							<div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
								<div className="flex items-center justify-between py-1.5">
									<span className="text-sm text-slate-300">
										1st Year Est. Income
									</span>
									<span className="font-semibold text-white">
										{formatCurrency(firstYearIncomeNeeded)}
									</span>
								</div>
								<div className="flex items-center justify-between py-1.5">
									<span className="text-sm text-slate-300">
										Final Balance (Age {lifeExpectancy})
									</span>
									<span
										className={`font-semibold ${finalBalance > 0 ? "text-emerald-300" : "text-slate-300"}`}
									>
										{formatCurrency(finalBalance)}
									</span>
								</div>
							</div>
						</div>

						<div className="mt-5 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
							<p className="text-sm leading-6 text-slate-200">
								<span className="font-semibold">Analysis: </span>
								{ageDepleted
									? "Your current plan shows a shortfall before life expectancy. Consider increasing savings, delaying retirement, lowering living expenses, or finding additional income sources to bridge the gap."
									: "Your plan is on track to support you throughout your expected retirement given your current assumptions."}
							</p>
						</div>
					</div>
				</aside>
			</div>
		</main>
	);
}
